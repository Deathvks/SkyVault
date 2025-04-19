// backend/src/controllers/trashController.js
const { Folder, File } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const { permanentlyDeleteItemAndContent } = require("../utils/deleteUtils"); // <-- Importar utilidad

// --- Obtener contenido de la papelera ---
exports.getTrashContents = async (req, res) => {
  // ... (código existente sin cambios)
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
  // ... (código existente sin cambios) ...
  try {
    const item = await model.findByPk(itemId, { paranoid: false });
    if (!item || item.user_id !== userId || !item.deletedAt) {
      /*...*/
    } // Validación
    // Comprobación Conflicto Nombre
    const conflictCheckCondition = {
      /*...*/
    };
    const conflictingItem = await model.findOne({
      where: conflictCheckCondition,
    });
    if (conflictingItem) {
      /*...*/
    }
    // Comprobación Carpeta Padre
    const parentId = item[model === Folder ? "parent_folder_id" : "folder_id"];
    if (parentId) {
      /*...*/
    } // Lógica de carpeta padre no encontrada...

    await item.restore();
    const modelName = model === Folder ? "Carpeta" : "Archivo";
    res.status(200).json({ message: `${modelName} restaurada con éxito.` });
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
