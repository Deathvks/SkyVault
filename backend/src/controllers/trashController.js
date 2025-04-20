// backend/src/controllers/trashController.js
const { Folder, File } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
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

// --- Restaurar un item ---
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
      const parentFolder = await Folder.findByPk(parentId); // No necesita paranoid: false aquí
      if (!parentFolder) {
        return res.status(409).json({
          message: `La carpeta contenedora original ya no existe. Mueve el item a otra ubicación.`,
        });
      }
    }

    // Comprobar conflicto de nombre en el destino
    // (Sequelize maneja deletedAt=null en where por defecto con paranoid: true)
    const conflictCheckCondition = {
      user_id: userId,
      name: item.name,
      [model === Folder ? "parent_folder_id" : "folder_id"]: parentId,
    };
    const conflictingItem = await model.findOne({
      where: conflictCheckCondition,
    });

    if (conflictingItem) {
      const modelName = model === Folder ? "una carpeta" : "un archivo";
      return res.status(409).json({
        message: `Ya existe ${modelName} con el nombre "${item.name}" en la ubicación original.`,
      });
    }

    // Restaurar el item
    await item.restore();
    const modelName = model === Folder ? "Carpeta" : "Archivo";
    res.status(200).json({ message: `${modelName} restaurada con éxito.` });
  } catch (error) {
    console.error("Error al restaurar item:", error);
    res.status(500).json({ message: "Error interno al restaurar." });
  }
};
exports.restoreFolder = (req, res) => {
  restoreItem(Folder, parseInt(req.params.folderId, 10), req.userId, res);
};
exports.restoreFile = (req, res) => {
  restoreItem(File, parseInt(req.params.fileId, 10), req.userId, res);
};

// --- Eliminar Permanentemente (Usando Utilidad) ---
exports.permanentlyDeleteFolder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  try {
    const deleted = await permanentlyDeleteItemAndContent(
      Folder,
      parseInt(req.params.folderId, 10),
      req.userId
    );
    if (deleted) {
      res.status(200).json({ message: `Carpeta eliminada permanentemente.` });
    } else {
      res.status(404).json({
        message:
          "Carpeta no encontrada en la papelera para eliminación permanente.",
      });
    }
  } catch (error) {
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
  try {
    const deleted = await permanentlyDeleteItemAndContent(
      File,
      parseInt(req.params.fileId, 10),
      req.userId
    );
    if (deleted) {
      res.status(200).json({ message: `Archivo eliminado permanentemente.` });
    } else {
      res.status(404).json({
        message:
          "Archivo no encontrado en la papelera para eliminación permanente.",
      });
    }
  } catch (error) {
    console.error("Error en endpoint permanentlyDeleteFile:", error);
    res
      .status(500)
      .json({ message: "Error interno durante la eliminación permanente." });
  }
};

// --- Vaciar Papelera ---
exports.emptyTrash = async (req, res) => {
  const userId = req.userId;
  console.log(`[API] Solicitud para vaciar papelera del usuario ${userId}`);
  let foldersPurged = 0;
  let filesPurged = 0;
  let errorsEncountered = 0;

  try {
    // Buscar todos los items en la papelera del usuario
    const foldersToDelete = await Folder.findAll({
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      attributes: ["id"],
      paranoid: false,
    });
    const filesToDelete = await File.findAll({
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      attributes: ["id"],
      paranoid: false,
    });

    const totalItems = foldersToDelete.length + filesToDelete.length;
    if (totalItems === 0) {
      console.log(`[API] Papelera del usuario ${userId} ya estaba vacía.`);
      return res.status(200).json({ message: "La papelera ya está vacía." });
    }

    console.log(
      `[API] Vaciando ${foldersToDelete.length} carpetas y ${filesToDelete.length} archivos para usuario ${userId}...`
    );

    // Eliminar carpetas permanentemente
    for (const folder of foldersToDelete) {
      try {
        const deleted = await permanentlyDeleteItemAndContent(
          Folder,
          folder.id,
          userId
        );
        if (deleted) foldersPurged++;
        else errorsEncountered++;
      } catch (error) {
        console.error(
          `[API] Error purgando carpeta ID ${folder.id} durante vaciado:`,
          error
        );
        errorsEncountered++;
      }
    }

    // Eliminar archivos permanentemente
    for (const file of filesToDelete) {
      try {
        const deleted = await permanentlyDeleteItemAndContent(
          File,
          file.id,
          userId
        );
        if (deleted) filesPurged++;
        else errorsEncountered++;
      } catch (error) {
        console.error(
          `[API] Error purgando archivo ID ${file.id} durante vaciado:`,
          error
        );
        errorsEncountered++;
      }
    }

    const successMessage = `Papelera vaciada. ${foldersPurged} carpetas y ${filesPurged} archivos eliminados permanentemente.`;
    const partialFailMessage =
      errorsEncountered > 0
        ? ` Se encontraron ${errorsEncountered} errores.`
        : "";
    console.log(
      `[API] Vaciado para usuario ${userId} completado. ${successMessage}${partialFailMessage}`
    );

    res.status(200).json({ message: `${successMessage}${partialFailMessage}` });
  } catch (error) {
    console.error(
      `[API] Error general al vaciar la papelera para usuario ${userId}:`,
      error
    );
    res
      .status(500)
      .json({ message: "Error interno al intentar vaciar la papelera." });
  }
};

// --- NUEVA FUNCIÓN: Mover Múltiples Items a la Papelera (Soft Delete) ---
exports.bulkMoveToTrash = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.userId;
  const { items } = req.body; // Array de { type: 'folder'/'file', id: number }

  console.log(
    `[API] Solicitud de borrado múltiple para usuario ${userId}, items:`,
    items.length
  );

  let movedCount = 0;
  const errorsList = [];

  try {
    // Usar Promise.all para procesar en paralelo (con moderación para no sobrecargar DB)
    await Promise.all(
      items.map(async (itemInfo) => {
        const model = itemInfo.type === "folder" ? Folder : File;
        const itemId = itemInfo.id;

        try {
          // Buscar el item ACTIVO que pertenezca al usuario
          const item = await model.findOne({
            where: { id: itemId, user_id: userId },
          }); // paranoid: true es default

          if (item) {
            await item.destroy(); // Soft delete
            movedCount++;
            console.log(
              `[API Bulk Delete] Item ${itemInfo.type} ID ${itemId} movido a papelera.`
            );
          } else {
            console.warn(
              `[API Bulk Delete] Item ${itemInfo.type} ID ${itemId} no encontrado o no pertenece al usuario ${userId}.`
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
        }
      })
    ); // Fin Promise.all

    const message = `${movedCount} elemento(s) movido(s) a la papelera.`;
    // Usar 207 (Multi-Status) si hubo algún error parcial
    const finalStatus = errorsList.length > 0 ? 207 : 200;

    console.log(
      `[API Bulk Delete] Finalizado para usuario ${userId}. Movidos: ${movedCount}, Errores: ${errorsList.length}`
    );

    res.status(finalStatus).json({
      message:
        message +
        (errorsList.length > 0
          ? ` ${errorsList.length} elemento(s) no se pudieron mover.`
          : ""),
      // Solo incluir la clave 'errors' si realmente hubo errores
      ...(errorsList.length > 0 && { errors: errorsList }),
    });
  } catch (error) {
    // Error inesperado general durante el Promise.all o antes/después
    console.error(
      `[API Bulk Delete] Error general para usuario ${userId}:`,
      error
    );
    res
      .status(500)
      .json({
        message: "Error interno del servidor durante la operación masiva.",
      });
  }
};
// --- FIN NUEVA FUNCIÓN ---
