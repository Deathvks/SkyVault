// backend/src/controllers/trashController.js
const { Folder, File } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const { permanentlyDeleteItemAndContent } = require("../utils/deleteUtils"); // <-- Importar utilidad

// --- Obtener contenido de la papelera ---
exports.getTrashContents = async (req, res) => {
  // ... (código existente sin cambios) ...
  const userId = req.userId;
  try {
    const deletedFolders = await Folder.findAll({
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      order: [["deletedAt", "DESC"]],
      paranoid: false,
    });
    const deletedFiles = await File.findAll({
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      order: [["deletedAt", "DESC"]],
      paranoid: false,
    });
    res.status(200).json({ folders: deletedFolders, files: deletedFiles });
  } catch (error) {
    console.error("Error al obtener contenido de la papelera:", error);
    res.status(500).json({ message: "Error interno al obtener la papelera." });
  }
};

// --- Restaurar un item ---
const restoreItem = async (model, itemId, userId, res) => {
  // ... (código de restoreItem existente sin cambios) ...
  try {
    const item = await model.findByPk(itemId, { paranoid: false });

    if (!item || item.user_id !== userId || !item.deletedAt) {
      const modelName = model === Folder ? "Carpeta" : "Archivo";
      return res
        .status(404)
        .json({
          message: `${modelName} no encontrada en la papelera o no te pertenece.`,
        });
    }

    // Comprobar si el padre existe (si no es raíz)
    const parentId = model === Folder ? item.parent_folder_id : item.folder_id;
    if (parentId) {
      const parentFolder = await Folder.findByPk(parentId); // No necesita paranoid: false aquí
      if (!parentFolder) {
        return res
          .status(409)
          .json({
            message: `La carpeta contenedora original ya no existe. Mueve el item a otra ubicación.`,
          });
      }
    }

    // Comprobar conflicto de nombre en el destino
    const conflictCheckCondition = {
      user_id: userId,
      name: item.name,
      [model === Folder ? "parent_folder_id" : "folder_id"]: parentId,
      // deletedAt: null, // <- Sequelize lo maneja con paranoid: true por defecto
    };
    const conflictingItem = await model.findOne({
      where: conflictCheckCondition,
    });

    if (conflictingItem) {
      const modelName = model === Folder ? "una carpeta" : "un archivo";
      return res
        .status(409)
        .json({
          message: `Ya existe <span class="math-inline">\{modelName\} con el nombre "</span>{item.name}" en la ubicación original.`,
        });
    }

    await item.restore();
    const modelName = model === Folder ? "Carpeta" : "Archivo";
    res.status(200).json({ message: `${modelName} restaurado con éxito.` });
  } catch (error) {
    console.error("Error al restaurar item:", error);
    res.status(500).json({ message: "Error interno al restaurar." });
  }
};
exports.restoreFolder = (req, res) => {
  /* ... */ restoreItem(
    Folder,
    parseInt(req.params.folderId, 10),
    req.userId,
    res
  );
};
exports.restoreFile = (req, res) => {
  /* ... */ restoreItem(File, parseInt(req.params.fileId, 10), req.userId, res);
};

// --- Eliminar Permanentemente (Individual - Usando Utilidad) ---
exports.permanentlyDeleteFolder = async (req, res) => {
  // ... (código existente sin cambios) ...
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
      res
        .status(404)
        .json({
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
  // ... (código existente sin cambios) ...
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
      res
        .status(404)
        .json({
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

// --- NUEVA FUNCIÓN: Vaciar Papelera ---
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
      attributes: ["id"], // Solo necesitamos el ID para borrar
      paranoid: false,
    });
    const filesToDelete = await File.findAll({
      where: { user_id: userId, deletedAt: { [Op.ne]: null } },
      attributes: ["id"], // Solo necesitamos el ID para borrar
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
        else errorsEncountered++; // Contar si la utilidad devuelve false (inesperado aquí)
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
        else errorsEncountered++; // Contar si la utilidad devuelve false
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
      `[API] Vaciado para usuario ${userId} completado. <span class="math-inline">\{successMessage\}</span>{partialFailMessage}`
    );

    res
      .status(200)
      .json({
        message: `<span class="math-inline">\{successMessage\}</span>{partialFailMessage}`,
      });
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
// --- FIN NUEVA FUNCIÓN ---
