const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { File, Folder } = require("../models");
const { Op } = require("sequelize"); // Asegurar importación de Op
const { validationResult } = require("express-validator"); // Importar validationResult

// --- Subir un archivo ---
exports.uploadFile = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN (para folderId en body) ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file && req.file.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error(
          "Error al borrar archivo temporal tras fallo de validación:",
          unlinkError
        );
      }
    }
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------------------------------
  try {
    // Multer fileFilter ya valida el tipo MIME (si se añadió)
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Archivo no subido, vacío o tipo no permitido." });
    }

    console.log("DEBUG: Received originalname:", req.file.originalname);
    let originalname = req.file.originalname;

    // Bloque de decodificación (workaround ñ)
    try {
      const hasUtf8CorruptionPattern =
        /Ã[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(
          originalname
        );
      if (hasUtf8CorruptionPattern && !originalname.includes("ñ")) {
        // Add more checks if needed
        console.log(
          "DEBUG: Detectado posible problema de codificación. Intentando decodificar Latin1 -> UTF8..."
        );
        const buffer = Buffer.from(originalname, "latin1");
        const decodedName = buffer.toString("utf8");
        console.log("DEBUG: Nombre decodificado:", decodedName);
        if (decodedName.includes("ñ")) {
          originalname = decodedName;
        } else {
          console.log(
            "DEBUG: La decodificación no produjo el caracter esperado."
          );
        }
      }
    } catch (decodeError) {
      console.error("Error decodificación manual:", decodeError);
    }
    // Fin bloque

    const userId = req.userId;
    const { folderId: rawFolderId = null } = req.body; // Validado int opcional

    let parentFolderId = null;
    if (rawFolderId && rawFolderId !== "root") {
      parentFolderId = parseInt(rawFolderId, 10); // Sabemos que es int
      const parentFolder = await Folder.findOne({
        where: { id: parentFolderId, user_id: userId },
        attributes: ["id"],
      });
      if (!parentFolder) {
        await fsPromises.unlink(req.file.path);
        return res
          .status(404)
          .json({
            message: "La carpeta de destino no existe o no te pertenece.",
          });
      }
    }

    const { mimetype, size, path: tempPath } = req.file;

    const existingFile = await File.findOne({
      where: { name: originalname, user_id: userId, folder_id: parentFolderId },
    });
    if (existingFile) {
      await fsPromises.unlink(tempPath);
      return res
        .status(409)
        .json({
          message: `Ya existe un archivo llamado "${originalname}" en esta ubicación.`,
        });
    }

    const newFile = await File.create({
      name: originalname,
      storage_path: tempPath,
      mime_type: mimetype,
      size: size,
      user_id: userId,
      folder_id: parentFolderId,
    });

    res
      .status(201)
      .json({ message: "Archivo subido con éxito.", file: newFile });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    if (req.file && req.file.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error(
          "Error al borrar archivo temporal tras fallo:",
          unlinkError
        );
      }
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({
          message: `Ya existe un archivo llamado "${
            req.file?.originalname || "desconocido"
          }" en esta ubicación.`,
        });
    }
    res.status(500).json({ message: "Error interno al subir el archivo." });
  }
};

// --- Descargar un archivo ---
exports.downloadFile = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN (param :fileId) ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // -------------------------------------------
  try {
    const { fileId } = req.params; // Ya validado como int
    const userId = req.userId;
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    if (!file) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }
    try {
      await fsPromises.access(file.storage_path);
    } catch (accessError) {
      console.error(
        `Error de acceso al archivo físico ${file.storage_path}:`,
        accessError
      );
      return res
        .status(404)
        .json({ message: "Archivo no encontrado en almacenamiento." });
    }
    res.download(file.storage_path, file.name, (err) => {
      if (err) {
        if (!res.headersSent) {
          console.error("Error al enviar archivo:", err);
          res.status(500).json({ message: "No se pudo descargar." });
        } else {
          console.error("Error transmisión:", err);
        }
      }
    });
  } catch (error) {
    console.error("Error general descarga:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error interno descarga." });
    }
  }
};

// --- Eliminar un archivo ---
exports.deleteFile = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN (param :fileId) ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // -------------------------------------------
  try {
    const { fileId } = req.params; // Ya validado como int
    const userId = req.userId;
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    if (!file) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }
    const filePath = file.storage_path;
    await file.destroy();
    try {
      await fsPromises.unlink(filePath);
      console.log(`Archivo físico eliminado: ${filePath}`);
    } catch (unlinkError) {
      console.error(
        `Error al eliminar archivo físico ${filePath}:`,
        unlinkError
      );
    }
    res.status(200).json({ message: "Archivo eliminado con éxito." });
  } catch (error) {
    console.error("Error al eliminar archivo:", error);
    res.status(500).json({ message: "Error interno al eliminar." });
  }
};

// --- Servir un archivo para visualización ---
exports.viewFile = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN (param :fileId) ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.sendStatus(400);
  }
  // -------------------------------------------
  try {
    const { fileId } = req.params; // Ya validado como int
    const userId = req.userId;
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    if (!file || !file.storage_path) {
      return res.sendStatus(404);
    }
    const absolutePath = file.storage_path; // Path ya es absoluto
    if (!fs.existsSync(absolutePath)) {
      console.error(`Archivo no encontrado: ${absolutePath}`);
      return res.sendStatus(404);
    }
    res.sendFile(absolutePath, (err) => {
      if (err) {
        if (!res.headersSent) {
          console.error(`Error al enviar ${absolutePath}:`, err);
          res.sendStatus(500);
        }
      }
    });
  } catch (error) {
    console.error("Error visualizar archivo:", error);
    if (!res.headersSent) {
      res.sendStatus(500);
    }
  }
};

// --- Renombrar Archivo ---
exports.renameFile = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN (param :fileId y body newName) ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------------------------------------
  try {
    const { fileId } = req.params; // Validado int
    const { newName } = req.body; // Validado no vacío y trim()
    const userId = req.userId;

    // Decodificación...
    let trimmedNewName = newName;
    try {
      const hasUtf8CorruptionPattern =
        /Ã[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(
          trimmedNewName
        );
      if (hasUtf8CorruptionPattern && !trimmedNewName.includes("ñ")) {
        const buffer = Buffer.from(trimmedNewName, "latin1");
        const decoded = buffer.toString("utf8");
        if (decoded.includes("ñ")) {
          trimmedNewName = decoded;
        }
      }
    } catch (e) {
      /* Ignorar */
    }
    // Fin decodificación

    const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    if (!file) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }

    // Preservar extensión...
    const originalExtension = path.extname(file.name);
    let userInputBaseName = path.basename(
      trimmedNewName,
      path.extname(trimmedNewName)
    );
    if (!userInputBaseName) {
      return res
        .status(400)
        .json({ message: "El nombre base no puede estar vacío." });
    }
    const finalNewName = userInputBaseName + originalExtension;
    // Fin preservar extensión

    if (file.name === finalNewName) {
      return res.status(200).json(file);
    }

    const conflict = await File.findOne({
      where: {
        name: finalNewName,
        user_id: userId,
        folder_id: file.folder_id,
        id: { [Op.ne]: fileId },
      },
    });
    if (conflict) {
      return res
        .status(409)
        .json({
          message: `Ya existe un archivo llamado "${finalNewName}" en esta ubicación.`,
        });
    }

    file.name = finalNewName;
    await file.save();
    res.status(200).json({ message: "Archivo renombrado con éxito.", file });
  } catch (error) {
    console.error("Error renombrar archivo:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ message: `Ya existe archivo con ese nombre.` });
    }
    res.status(500).json({ message: "Error interno al renombrar." });
  }
};

// --- Mover Archivo ---
exports.moveFile = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN (param :fileId y body destinationFolderId) ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------------------------------------------------
  try {
    const { fileId } = req.params; // Validado int
    let { destinationFolderId } = req.body; // Validado int opcional
    const userId = req.userId;

    const fileToMoveId = parseInt(fileId, 10); // Sabemos que es int

    let destinationParentId = null;
    if (destinationFolderId !== undefined && destinationFolderId !== null) {
      destinationParentId = parseInt(destinationFolderId, 10);
      const destFolder = await Folder.findOne({
        where: { id: destinationParentId, user_id: userId },
      });
      if (!destFolder) {
        return res.status(404).json({ message: "Carpeta destino no existe." });
      }
    } else {
      destinationParentId = null;
    }

    const fileToMove = await File.findOne({
      where: { id: fileToMoveId, user_id: userId },
    });
    if (!fileToMove) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    if (fileToMove.folder_id === destinationParentId) {
      return res.status(200).json(fileToMove);
    }

    const conflict = await File.findOne({
      where: {
        name: fileToMove.name,
        user_id: userId,
        folder_id: destinationParentId,
        id: { [Op.ne]: fileToMoveId },
      },
    });
    if (conflict) {
      return res
        .status(409)
        .json({
          message: `Ya existe archivo "${fileToMove.name}" en destino.`,
        });
    }

    fileToMove.folder_id = destinationParentId;
    await fileToMove.save();
    res.status(200).json({ message: "Archivo movido.", file: fileToMove });
  } catch (error) {
    console.error("Error mover archivo:", error);
    res.status(500).json({ message: "Error interno al mover." });
  }
};
