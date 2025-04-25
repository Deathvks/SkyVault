// backend/src/controllers/trashController.js
const { Folder, File } = require("../models"); // Sigue importando modelos desde index
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
// Asegúrate que la ruta a deleteUtils sea correcta y la función esté exportada
const { permanentlyDeleteItemAndContent } = require("../utils/deleteUtils");

// --- Obtener contenido de la papelera ---
exports.getTrashContents = async (req, res) => {
  const userId = req.userId;
  try {
    const deletedFolders = await Folder.findAll({
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      order: [["deletedAt", "DESC"]],
      paranoid: false, // Incluir los borrados suavemente
    });
    const deletedFiles = await File.findAll({
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      order: [["deletedAt", "DESC"]],
      paranoid: false, // Incluir los borrados suavemente
    });
    res.status(200).json({ folders: deletedFolders, files: deletedFiles });
  } catch (error) {
    console.error("Error al obtener contenido de la papelera:", error);
    res.status(500).json({ message: "Error interno al obtener la papelera." });
  }
};

// --- Restaurar un item (Helper Interno - VERSIÓN CORREGIDA) ---
const restoreItem = async (model, itemId, userId, res) => {
  try {
    // Logs iniciales
    console.log(
      `[restoreItem Debug] Intentando restaurar ${model.name} ID ${itemId} para user ${userId}`
    );
    const item = await model.findByPk(itemId, { paranoid: false });
    console.log(
      `[restoreItem Debug] Item encontrado:`,
      item ? JSON.stringify(item.toJSON(), null, 2) : "null"
    );

    // Log de Tipos (usando item.userId)
    if (item) {
      // Usar item.userId (camelCase) según definición en models/index.js
      console.log(
        `[restoreItem Debug] Tipo de item.userId: ${typeof item.userId}, Valor: ${
          item.userId
        }`
      );
      console.log(
        `[restoreItem Debug] Tipo de userId (req.userId): ${typeof userId}, Valor: ${userId}`
      );
    }

    // Validar que existe, pertenece al usuario y está en la papelera
    // Usar item.userId (camelCase) y comparación estricta ( !== )
    if (!item || item.userId !== userId || !item.deletedAt) {
      // Log de fallo actualizado para reflejar item.userId !== userId
      console.warn(
        `[restoreItem Debug] Falló la comprobación: item encontrado=${!!item}, ¿Pertenece al usuario (comparando ${
          item?.userId
        } !== ${userId})?=${
          item ? item.userId === userId : "N/A"
        }, ¿Está en papelera (deletedAt no es null)?=${
          item ? !!item.deletedAt : "N/A"
        }`
      );
      const modelName = model === Folder ? "Carpeta" : "Archivo";
      return res.status(404).json({
        message: `${modelName} no encontrada en la papelera o no te pertenece.`,
      });
    }

    // Comprobar si el padre existe (si no es raíz)
    // Usar el alias 'folderId' (camelCase) definido en models/index.js para File<->Folder
    // Usar el alias 'parentFolderId' (camelCase) definido en models/index.js para Folder<->Folder
    const parentId = model === Folder ? item.parentFolderId : item.folderId;
    if (parentId) {
      const parentFolder = await Folder.findByPk(parentId); // Buscar carpeta padre activa
      if (!parentFolder) {
        return res.status(409).json({
          message: `La carpeta contenedora original ya no existe. Mueve el item a otra ubicación si deseas restaurarlo.`,
        });
      }
    }

    // Comprobar conflicto de nombre en el destino
    // --- AJUSTE: Usar el campo de parentesco correcto ---
    const parentLinkFieldName =
      model === Folder ? "parent_folder_id" : "folder_id"; // Nombre de COLUMNA DB
    const conflictCheckCondition = {
      user_id: userId, // Nombre de COLUMNA DB
      name: item.name,
      [parentLinkFieldName]: parentId, // Usar el nombre de campo dinámico (parentId puede ser null)
    };
    // --- FIN AJUSTE ---

    console.log(
      "[restoreItem Debug] Checking for conflict with condition:",
      conflictCheckCondition
    ); // Log adicional

    const conflictingItem = await model.findOne({
      where: conflictCheckCondition, // Busca items activos (paranoid: true por defecto)
    });

    if (conflictingItem) {
      const modelName = model === Folder ? "una carpeta" : "un archivo";
      return res.status(409).json({
        message: `Ya existe ${modelName} activa con el nombre "${item.name}" en la ubicación original. Renombra el elemento existente o el que intentas restaurar.`,
      });
    }

    // Restaurar el item (Sequelize pone deletedAt a null)
    await item.restore();
    const modelName = model === Folder ? "Carpeta" : "Archivo";
    res.status(200).json({ message: `${modelName} restaurada con éxito.` });
  } catch (error) {
    console.error(`Error al restaurar item ${model.name} ID ${itemId}:`, error); // Mejor log de error
    res.status(500).json({ message: "Error interno al restaurar." });
  }
};
// --- FIN restoreItem ---

// --- Endpoints Públicos para Restaurar ---
exports.restoreFolder = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  restoreItem(Folder, parseInt(req.params.folderId, 10), req.userId, res);
};

exports.restoreFile = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  restoreItem(File, parseInt(req.params.fileId, 10), req.userId, res);
};

// --- Eliminar Permanentemente (Usando Utilidad y Transacción) ---
exports.permanentlyDeleteFolder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const folderId = parseInt(req.params.folderId, 10);
  const userId = req.userId;
  const transaction = await sequelize.transaction();

  try {
    const deleted = await permanentlyDeleteItemAndContent(
      Folder,
      folderId,
      userId,
      transaction
    );

    if (deleted) {
      await transaction.commit();
      res.status(200).json({ message: `Carpeta eliminada permanentemente.` });
    } else {
      await transaction.rollback();
      res.status(404).json({
        message:
          "Carpeta no encontrada en la papelera para eliminación permanente o no te pertenece.",
      });
    }
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error en endpoint permanentlyDeleteFolder:", error);
    res
      .status(500)
      .json({ message: "Error interno durante la eliminación permanente." });
  }
};

exports.permanentlyDeleteFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const fileId = parseInt(req.params.fileId, 10);
  const userId = req.userId;
  const transaction = await sequelize.transaction();

  try {
    const deleted = await permanentlyDeleteItemAndContent(
      File,
      fileId,
      userId,
      transaction
    );

    if (deleted) {
      await transaction.commit();
      res.status(200).json({ message: `Archivo eliminado permanentemente.` });
    } else {
      await transaction.rollback();
      res.status(404).json({
        message:
          "Archivo no encontrado en la papelera para eliminación permanente o no te pertenece.",
      });
    }
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    // El error ya debería loguearse dentro de permanentlyDeleteItemAndContent si usamos throw
    console.error("Error en endpoint permanentlyDeleteFile:", error); // Puede ser redundante si deleteUtils ya lo loguea y lanza
    res
      .status(500)
      .json({ message: "Error interno durante la eliminación permanente." });
  }
};

// --- Vaciar Papelera (CON TRANSACCIÓN) ---
exports.emptyTrash = async (req, res) => {
  const userId = req.userId;
  console.log(`[API] Solicitud para vaciar papelera del usuario ${userId}`);
  let foldersPurged = 0;
  let filesPurged = 0;
  let errorsEncountered = 0;

  const transaction = await sequelize.transaction(); // Corregido: usar sequelize importado

  try {
    // Buscar todos los items en la papelera del usuario (dentro de la transacción)
    const findOptions = {
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      attributes: ["id"], // Solo necesitamos IDs
      paranoid: false,
      transaction, // <-- Usar transacción para lectura consistente
    };
    const foldersToDelete = await Folder.findAll(findOptions);
    const filesToDelete = await File.findAll(findOptions);

    const totalItems = foldersToDelete.length + filesToDelete.length;
    if (totalItems === 0) {
      await transaction.rollback(); // Revertir aunque no hubo cambios
      console.log(`[API] Papelera del usuario ${userId} ya estaba vacía.`);
      return res.status(200).json({ message: "La papelera ya está vacía." });
    }

    console.log(
      `[API] Vaciando ${foldersToDelete.length} carpetas y ${filesToDelete.length} archivos para usuario ${userId}...`
    );

    // Eliminar carpetas permanentemente
    for (const folder of foldersToDelete) {
      const deleted = await permanentlyDeleteItemAndContent(
        Folder,
        folder.id,
        userId,
        transaction
      );
      if (deleted) foldersPurged++;
      else errorsEncountered++;
    }

    // Eliminar archivos permanentemente
    for (const file of filesToDelete) {
      const deleted = await permanentlyDeleteItemAndContent(
        File,
        file.id,
        userId,
        transaction
      );
      if (deleted) filesPurged++;
      else errorsEncountered++;
    }

    // Si hubo algún error en CUALQUIER eliminación individual, revierte TODO
    // Nota: permanentlyDeleteItemAndContent debería lanzar error si algo falla críticamente
    if (errorsEncountered > 0) {
      console.error(
        `[API] Errores encontrados (${errorsEncountered}) durante vaciado para ${userId} (elementos no encontrados/no pertenecían). Revirtiendo.`
      );
      // Aunque no se lanzó error, si `deleted` fue false, revertimos por precaución.
      await transaction.rollback();
      return res
        .status(500) // O 404 si prefieres indicar que algunos no se encontraron
        .json({
          message: `Error: No se pudieron eliminar ${errorsEncountered} elemento(s) (no encontrados). Operación cancelada.`,
        });
    }

    await transaction.commit();

    const successMessage = `Papelera vaciada. ${foldersPurged} carpetas y ${filesPurged} archivos eliminados permanentemente.`;
    console.log(
      `[API] Vaciado para usuario ${userId} completado. ${successMessage}`
    );
    res.status(200).json({ message: successMessage });
  } catch (error) {
    // Si permanentlyDeleteItemAndContent lanza un error, entra aquí
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      console.log(
        "[API EmptyTrash] Rollback ejecutado por error general durante permanentlyDeleteItemAndContent."
      );
    }
    console.error(
      `[API] Error general al vaciar la papelera para usuario ${userId}:`,
      error
    );
    res
      .status(500)
      .json({
        message: "Error interno crítico al intentar vaciar la papelera.",
      });
  }
};

// --- Mover Múltiples Items a la Papelera (Soft Delete) ---
exports.bulkMoveToTrash = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.userId;
  const { items } = req.body;

  console.log(
    `[API] Solicitud de borrado múltiple (soft) para usuario ${userId}, items:`,
    items?.length || 0
  );

  if (!Array.isArray(items)) {
    return res.status(400).json({
      message: "El cuerpo de la petición debe contener un array 'items'.",
    });
  }

  let movedCount = 0;
  const errorsList = [];
  const transaction = await sequelize.transaction(); // Corregido: usar sequelize importado

  try {
    await Promise.all(
      items.map(async (itemInfo) => {
        if (
          !itemInfo ||
          !["folder", "file"].includes(itemInfo.type) ||
          !Number.isInteger(itemInfo.id) ||
          itemInfo.id < 1
        ) {
          console.warn(
            "[API Bulk Delete] Item inválido en la petición:",
            itemInfo
          );
          errorsList.push({
            id: itemInfo?.id || "?",
            type: itemInfo?.type || "?",
            error: "Formato de item inválido.",
          });
          return; // Saltar este item inválido
        }

        const model = itemInfo.type === "folder" ? Folder : File;
        const itemId = itemInfo.id;

        try {
          const item = await model.findOne({
            where: { id: itemId, user_id: userId }, // Buscar item activo del usuario
            transaction, // Usar transacción
          });

          if (item) {
            await item.destroy({ transaction }); // Soft delete dentro de la transacción
            movedCount++;
            console.log(
              `[API Bulk Delete] Item ${itemInfo.type} ID ${itemId} marcado para mover a papelera.`
            );
          } else {
            console.warn(
              `[API Bulk Delete] Item activo ${itemInfo.type} ID ${itemId} no encontrado o no pertenece al usuario ${userId}.`
            );
            // No lanzar error aquí, solo registrar que no se encontró
            errorsList.push({
              id: itemId,
              type: itemInfo.type,
              error: "No encontrado o sin permisos.",
            });
          }
        } catch (error) {
          // Si hay un error REAL (no 'no encontrado'), sí lanzar para rollback
          console.error(
            `[API Bulk Delete] Error procesando ${itemInfo.type} ID ${itemId}:`,
            error
          );
          errorsList.push({
            id: itemId,
            type: itemInfo.type,
            error: "Error interno al procesar.",
          });
          throw error; // Lanzar error para que Promise.all falle y se haga rollback
        }
      })
    ); // Fin Promise.all

    // Si llegamos aquí sin error lanzado, hacemos commit
    await transaction.commit();

    const message = `${movedCount} elemento(s) movido(s) a la papelera.`;
    // Si hubo errores de "no encontrado" pero no errores críticos, responder 207 Multi-Status
    const finalStatus = errorsList.some(
      (e) => e.error !== "No encontrado o sin permisos."
    )
      ? 500
      : errorsList.length > 0
      ? 207
      : 200;

    console.log(
      `[API Bulk Delete] Finalizado para usuario ${userId}. Movidos: ${movedCount}, Errores "no encontrado": ${
        errorsList.filter((e) => e.error === "No encontrado o sin permisos.")
          .length
      }`
    );

    res.status(finalStatus).json({
      message:
        message +
        (errorsList.length > 0
          ? ` ${errorsList.length} elemento(s) no se pudieron procesar (ver detalles).`
          : ""),
      ...(errorsList.length > 0 && { errors: errorsList }), // Incluir detalles de errores si hubo
    });
  } catch (error) {
    // Si se lanzó error desde el map/Promise.all
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      console.log(
        "[API Bulk Delete] Rollback ejecutado por error crítico durante procesamiento."
      );
    }
    console.error(
      `[API Bulk Delete] Error general para usuario ${userId}:`,
      error
    );
    res.status(500).json({
      message:
        "Error interno del servidor durante la operación masiva. No se movieron elementos.",
      // Podrías incluir detalles del error si es seguro hacerlo
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
