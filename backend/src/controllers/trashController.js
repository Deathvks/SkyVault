// backend/src/controllers/trashController.js
const { Folder, File, sequelize } = require("../models"); // <-- Asegurarse que sequelize está importado
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const { permanentlyDeleteItemAndContent } = require("../utils/deleteUtils"); // Importa la utilidad actualizada

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

// --- Restaurar un item (Helper Interno) ---
const restoreItem = async (model, itemId, userId, res) => {
  try {
    // Buscar el item incluso si está borrado suavemente
    const item = await model.findByPk(itemId, { paranoid: false });

    // Validar que existe, pertenece al usuario y está en la papelera
    if (!item || item.user_id !== userId || !item.deletedAt) {
      const modelName = model === Folder ? "Carpeta" : "Archivo";
      return res.status(404).json({
        message: `${modelName} no encontrada en la papelera o no te pertenece.`,
      });
    }

    // Comprobar si el padre existe (si no es raíz)
    const parentId = model === Folder ? item.parent_folder_id : item.folder_id;
    if (parentId) {
      // Buscar padre ACTIVO (no necesita paranoid: false aquí)
      const parentFolder = await Folder.findByPk(parentId);
      if (!parentFolder) {
        return res.status(409).json({
          message: `La carpeta contenedora original ya no existe. Mueve el item a otra ubicación si deseas restaurarlo.`,
          // Podrías ofrecer mover a raíz o a otra carpeta como alternativa
        });
      }
    }

    // Comprobar conflicto de nombre en el destino
    // Sequelize maneja deletedAt=null en where por defecto con paranoid: true
    const conflictCheckCondition = {
      user_id: userId,
      name: item.name,
      [model === Folder ? "parent_folder_id" : "folder_id"]: parentId,
      // No necesitamos 'deletedAt: null' aquí explícitamente si paranoid es true en el modelo
    };
    const conflictingItem = await model.findOne({
      where: conflictCheckCondition,
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
    console.error("Error al restaurar item:", error);
    res.status(500).json({ message: "Error interno al restaurar." });
  }
};

// --- Endpoints Públicos para Restaurar ---
exports.restoreFolder = (req, res) => {
  // Puedes añadir validación de ID aquí si no está en las rutas
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  restoreItem(Folder, parseInt(req.params.folderId, 10), req.userId, res);
};

exports.restoreFile = (req, res) => {
  // Puedes añadir validación de ID aquí si no está en las rutas
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
  const transaction = await sequelize.transaction(); // <-- Iniciar transacción

  try {
    const deleted = await permanentlyDeleteItemAndContent(
      Folder,
      folderId,
      userId,
      transaction // <-- Pasar transacción
    );

    if (deleted) {
      await transaction.commit(); // <-- Confirmar si todo OK
      res.status(200).json({ message: `Carpeta eliminada permanentemente.` });
    } else {
      await transaction.rollback(); // <-- Revertir si no se encontró/pertenecía
      res.status(404).json({
        message:
          "Carpeta no encontrada en la papelera para eliminación permanente o no te pertenece.",
      });
    }
  } catch (error) {
    await transaction.rollback(); // <-- Revertir en caso de error interno
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
  const transaction = await sequelize.transaction(); // <-- Iniciar transacción

  try {
    const deleted = await permanentlyDeleteItemAndContent(
      File,
      fileId,
      userId,
      transaction // <-- Pasar transacción
    );

    if (deleted) {
      await transaction.commit(); // <-- Confirmar si todo OK
      res.status(200).json({ message: `Archivo eliminado permanentemente.` });
    } else {
      await transaction.rollback(); // <-- Revertir si no se encontró/pertenecía
      res.status(404).json({
        message:
          "Archivo no encontrado en la papelera para eliminación permanente o no te pertenece.",
      });
    }
  } catch (error) {
    await transaction.rollback(); // <-- Revertir en caso de error interno
    console.error("Error en endpoint permanentlyDeleteFile:", error);
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
  let errorsEncountered = 0; // Contador de errores inesperados o items no encontrados

  const transaction = await sequelize.transaction(); // <-- INICIAR TRANSACCIÓN ÚNICA

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
      // No hay nada que hacer, revertir transacción (aunque no hizo cambios)
      await transaction.rollback();
      console.log(`[API] Papelera del usuario ${userId} ya estaba vacía.`);
      return res.status(200).json({ message: "La papelera ya está vacía." });
    }

    console.log(
      `[API] Vaciando ${foldersToDelete.length} carpetas y ${filesToDelete.length} archivos para usuario ${userId}...`
    );

    // Eliminar carpetas permanentemente
    for (const folder of foldersToDelete) {
      // La utilidad ya maneja la lógica interna y lanza error si falla
      const deleted = await permanentlyDeleteItemAndContent(
        Folder,
        folder.id,
        userId,
        transaction
      );
      if (deleted) foldersPurged++;
      else errorsEncountered++; // Contar si no se encontró (raro si se acaba de buscar)
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

    // Si hubo algún error inesperado (item no encontrado después de buscarlo), revertir todo.
    // La utilidad permanentlyDeleteItemAndContent lanzará un error si algo falla internamente,
    // lo cual será capturado por el catch general y hará rollback.
    // Si errorsEncountered > 0 significa que findByPk falló para algún item (muy raro).
    if (errorsEncountered > 0) {
      await transaction.rollback();
      console.error(
        `[API] Errores encontrados (${errorsEncountered}) durante vaciado para ${userId}. Revirtiendo.`
      );
      // Informar al usuario que algo falló
      return res
        .status(500)
        .json({
          message:
            "Error: No se pudieron eliminar todos los elementos. Inténtalo de nuevo.",
        });
    }

    // Si todo fue bien (no hubo errores lanzados ni items no encontrados), confirmar la transacción
    await transaction.commit();

    const successMessage = `Papelera vaciada. ${foldersPurged} carpetas y ${filesPurged} archivos eliminados permanentemente.`;
    console.log(
      `[API] Vaciado para usuario ${userId} completado. ${successMessage}`
    );
    res.status(200).json({ message: successMessage });
  } catch (error) {
    // Error general durante el proceso, asegurar rollback
    // Comprobar si la transacción ya fue finalizada antes de intentar revertir
    if (!transaction.finished) {
      await transaction.rollback();
      console.log("[API EmptyTrash] Rollback ejecutado por error general.");
    }
    console.error(
      `[API] Error general al vaciar la papelera para usuario ${userId}:`,
      error
    );
    res
      .status(500)
      .json({ message: "Error interno al intentar vaciar la papelera." });
  }
};

// --- Mover Múltiples Items a la Papelera (Soft Delete) ---
exports.bulkMoveToTrash = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.userId;
  const { items } = req.body; // Array de { type: 'folder'/'file', id: number }

  console.log(
    `[API] Solicitud de borrado múltiple (soft) para usuario ${userId}, items:`,
    items?.length || 0
  );

  // Validar que items sea un array
  if (!Array.isArray(items)) {
    return res
      .status(400)
      .json({
        message: "El cuerpo de la petición debe contener un array 'items'.",
      });
  }

  let movedCount = 0;
  const errorsList = [];
  const transaction = await sequelize.transaction(); // Usar transacción para soft delete múltiple

  try {
    // Usar Promise.all para procesar en paralelo (con moderación) dentro de la transacción
    await Promise.all(
      items.map(async (itemInfo) => {
        // Validar estructura de cada item
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
          // Buscar el item ACTIVO que pertenezca al usuario (dentro de la transacción)
          const item = await model.findOne({
            where: { id: itemId, user_id: userId },
            transaction, // Usar transacción
            // paranoid: true es default
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
            errorsList.push({
              id: itemId,
              type: itemInfo.type,
              error: "No encontrado o sin permisos.",
            });
          }
        } catch (error) {
          console.error(
            `[API Bulk Delete] Error procesando ${itemInfo.type} ID ${itemId}:`,
            error
          );
          errorsList.push({
            id: itemId,
            type: itemInfo.type,
            error: "Error interno al procesar.",
          });
          // Lanzar error para que Promise.all falle y se haga rollback general
          throw error;
        }
      })
    ); // Fin Promise.all

    // Si Promise.all se completó sin errores (ninguna promesa rechazó), hacer commit
    await transaction.commit();

    const message = `${movedCount} elemento(s) movido(s) a la papelera.`;
    // Usar 207 (Multi-Status) si hubo errores de "no encontrado" pero la operación general tuvo éxito
    const finalStatus = errorsList.length > 0 ? 207 : 200;

    console.log(
      `[API Bulk Delete] Finalizado para usuario ${userId}. Movidos: ${movedCount}, Errores "no encontrado": ${errorsList.length}`
    );

    res.status(finalStatus).json({
      message:
        message +
        (errorsList.length > 0
          ? ` ${errorsList.length} elemento(s) no se pudieron encontrar o no te pertenecen.`
          : ""),
      // Solo incluir la clave 'errors' si realmente hubo errores de "no encontrado"
      ...(errorsList.length > 0 && { errors: errorsList }),
    });
  } catch (error) {
    // Captura errores lanzados desde el map o Promise.all
    // Si hubo cualquier error real (no solo "no encontrado"), revertir la transacción
    if (!transaction.finished) {
      await transaction.rollback();
      console.log(
        "[API Bulk Delete] Rollback ejecutado por error durante procesamiento."
      );
    }
    console.error(
      `[API Bulk Delete] Error general para usuario ${userId}:`,
      error
    );
    res.status(500).json({
      message:
        "Error interno del servidor durante la operación masiva. No se movieron elementos.",
    });
  }
};
// --- FIN NUEVA FUNCIÓN ---
