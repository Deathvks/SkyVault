// backend/src/controllers/fileController.js
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { File, Folder } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

// --- Subir un archivo ---
exports.uploadFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file && req.file.path) {
      try {
        await fsPromises.unlink(req.file.path); // Limpiar archivo si validación falla
      } catch (unlinkError) {
        console.error(
          "Error al borrar archivo temporal tras fallo de validación:",
          unlinkError
        );
      }
    }
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Archivo no subido, vacío o tipo no permitido." });
    }

    let originalname = req.file.originalname;
    // Workaround para posible problema de codificación (mantener si es necesario)
    try {
      const hasUtf8CorruptionPattern =
        /Ã[€ ‚ƒ„…†‡ˆ‰Š‹Œ Ž  ‘’“”•–—˜™š›œ žŸ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(
          originalname
        );
      if (hasUtf8CorruptionPattern && !originalname.includes("ñ")) {
        console.log(
          "DEBUG: Detectado posible problema de codificación. Intentando decodificar Latin1 -> UTF8..."
        );
        const buffer = Buffer.from(originalname, "latin1");
        const decodedName = buffer.toString("utf8");
        if (decodedName.includes("ñ")) {
          originalname = decodedName;
        }
      }
    } catch (decodeError) {
      /* Ignorar error de decodificación */
    }

    const userId = req.userId;
    const { folderId: rawFolderId = null } = req.body; // folderId validado

    let parentFolderId = null;
    if (rawFolderId && rawFolderId !== "root") {
      parentFolderId = parseInt(rawFolderId, 10);
      const parentFolder = await Folder.findOne({
        where: { id: parentFolderId, user_id: userId },
        attributes: ["id"],
      });
      if (!parentFolder) {
        await fsPromises.unlink(req.file.path); // Limpiar archivo subido
        return res
          .status(404)
          .json({
            message: "La carpeta de destino no existe o no te pertenece.",
          });
      }
    }

    const { mimetype, size, path: tempPath } = req.file;

    // Comprobar conflicto de nombre (findOne es paranoid: true por defecto)
    const existingFile = await File.findOne({
      where: { name: originalname, user_id: userId, folder_id: parentFolderId },
    });
    if (existingFile) {
      await fsPromises.unlink(tempPath); // Limpiar archivo subido
      return res
        .status(409)
        .json({
          message: `Ya existe un archivo llamado "${originalname}" en esta ubicación.`,
        });
    }

    const newFile = await File.create({
      name: originalname,
      storage_path: tempPath, // Guardar ruta completa devuelta por Multer
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
    // Limpiar archivo si aún existe y ocurrió un error inesperado
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { fileId } = req.params; // Ya validado como int
    const userId = req.userId;

    // Buscar archivo ACTIVO (paranoid: true es default)
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    if (!file) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }

    // Comprobar si el archivo físico existe antes de intentar descargar
    try {
      await fsPromises.access(file.storage_path);
    } catch (accessError) {
      console.error(
        `Error de acceso al archivo físico ${file.storage_path} (ID: ${fileId}):`,
        accessError
      );
      return res
        .status(404)
        .json({ message: "Archivo no encontrado en almacenamiento." });
    }

    // Intentar descargar
    res.download(file.storage_path, file.name, (err) => {
      if (err) {
        if (!res.headersSent) {
          console.error("Error al enviar archivo para descarga:", err);
          res.status(500).json({ message: "No se pudo iniciar la descarga." });
        } else {
          console.error("Error durante la transmisión de descarga:", err);
          // No se puede enviar otra respuesta si ya se enviaron headers
        }
      }
    });
  } catch (error) {
    console.error("Error general en la descarga:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error interno durante la descarga." });
    }
  }
};

// --- Eliminar un archivo (Ahora Soft Delete) ---
exports.deleteFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { fileId } = req.params; // Ya validado como int
    const userId = req.userId;

    // Encontrar el archivo (paranoid: true por defecto, solo encuentra activos)
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });

    if (!file) {
      // Si no se encuentra activo, no se puede mover a la papelera
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }

    // --- NO BORRAR ARCHIVO FÍSICO AQUÍ ---
    // const filePath = file.storage_path; // Ya no necesario
    // await fsPromises.unlink(filePath); // ¡¡¡LÍNEA ELIMINADA!!!
    // ------------------------------------

    // Solo marcar como borrado en la BD (Sequelize se encarga con paranoid: true)
    await file.destroy();

    res.status(200).json({ message: "Archivo movido a la papelera." }); // Mensaje actualizado
  } catch (error) {
    console.error("Error al mover archivo a la papelera:", error);
    res.status(500).json({ message: "Error interno al eliminar el archivo." });
  }
};

// --- Servir un archivo para visualización ---
exports.viewFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.sendStatus(400);
  } // Enviar solo status en fallo de param
  try {
    const { fileId } = req.params; // Ya validado como int
    const userId = req.userId;

    // Buscar archivo ACTIVO (paranoid: true por defecto)
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });

    if (!file || !file.storage_path) {
      // Si no existe el registro o no tiene ruta, 404
      return res.sendStatus(404);
    }

    const absolutePath = file.storage_path; // Ya debería ser absoluto

    // Comprobar si el archivo físico existe ANTES de intentar enviarlo
    try {
      await fsPromises.access(absolutePath); // Comprueba existencia y permisos lectura
    } catch (accessError) {
      console.error(
        `Archivo físico no encontrado o sin permisos en ${absolutePath} (ID: ${fileId})`
      );
      return res.sendStatus(404); // Devolver 404 si el archivo físico no está o no se puede leer
    }

    // Si existe, intentar enviarlo
    res.sendFile(absolutePath, (err) => {
      // Callback para errores durante el envío
      if (err) {
        if (!res.headersSent) {
          console.error(
            `Error al intentar enviar archivo ${absolutePath}:`,
            err
          );
          // Evitar enviar JSON si es error de sendFile, enviar solo status
          res.sendStatus(500);
        } else {
          console.error(
            "Error durante transmisión de archivo para visualización:",
            err
          );
          // No hacer nada si ya se enviaron headers
        }
      } else {
        console.log(
          `Archivo ${absolutePath} enviado correctamente para visualización.`
        );
      }
    });
  } catch (error) {
    // Error general (ej. DB falló)
    console.error("Error general al visualizar archivo:", error);
    if (!res.headersSent) {
      res.sendStatus(500);
    }
  }
};

// --- Renombrar Archivo ---
exports.renameFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { fileId } = req.params; // Validado int
    const { newName } = req.body; // Validado no vacío y trim()
    const userId = req.userId;

    // Workaround Codificación (mantener si fue necesario)
    let trimmedNewName = newName;
    try {
      const hasUtf8CorruptionPattern =
        /Ã[€ ‚ƒ„…†‡ˆ‰Š‹Œ Ž  ‘’“”•–—˜™š›œ žŸ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(
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

    const file = await File.findOne({ where: { id: fileId, user_id: userId } }); // paranoid: true default
    if (!file) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }

    // Preservar extensión original del archivo
    const originalExtension = path.extname(file.name);
    let userInputBaseName = path.basename(
      trimmedNewName,
      path.extname(trimmedNewName)
    );
    if (!userInputBaseName) {
      return res
        .status(400)
        .json({ message: "El nombre base del archivo no puede estar vacío." });
    }
    const finalNewName = userInputBaseName + originalExtension; // Concatenar nombre base + extensión original

    if (file.name === finalNewName) {
      return res.status(200).json(file);
    } // Sin cambios

    // Comprobar conflicto (paranoid: true default)
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
          message: `Ya existe un archivo activo llamado "${finalNewName}" en esta ubicación.`,
        });
    }

    file.name = finalNewName; // Guardar nombre con extensión preservada
    await file.save();
    res.status(200).json({ message: "Archivo renombrado con éxito.", file });
  } catch (error) {
    console.error("Error al renombrar archivo:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      // Usar finalNewName si está disponible
      const finalNameAttempt = req.body.newName
        ? path.basename(
            req.body.newName.trim(),
            path.extname(req.body.newName.trim())
          ) + path.extname(req.body.newName.trim())
        : "desconocido";
      return res
        .status(409)
        .json({
          message: `Ya existe un archivo llamado "${finalNameAttempt}" en esta ubicación (conflicto DB).`,
        });
    }
    res.status(500).json({ message: "Error interno al renombrar el archivo." });
  }
};

// --- Mover Archivo ---
exports.moveFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { fileId } = req.params; // Validado int
    let { destinationFolderId } = req.body; // Validado int opcional o null
    const userId = req.userId;

    const fileToMoveId = parseInt(fileId, 10); // Sabemos que es int

    // Validar y normalizar destinationFolderId
    let destinationParentId = null;
    if (destinationFolderId !== undefined && destinationFolderId !== null) {
      destinationParentId = parseInt(destinationFolderId, 10); // Sabemos que es int > 0 por la validación
      const destFolder = await Folder.findOne({
        where: { id: destinationParentId, user_id: userId },
      }); // paranoid: true default
      if (!destFolder) {
        return res
          .status(404)
          .json({
            message: "La carpeta de destino no existe o no te pertenece.",
          });
      }
    } else {
      destinationParentId = null; // Mover a la raíz
    }

    const fileToMove = await File.findOne({
      where: { id: fileToMoveId, user_id: userId },
    }); // paranoid: true default
    if (!fileToMove) {
      return res
        .status(404)
        .json({ message: "Archivo a mover no encontrado o no te pertenece." });
    }

    // Comprobar si ya está en el destino
    const currentFolderId =
      fileToMove.folder_id === null ? null : fileToMove.folder_id;
    if (currentFolderId === destinationParentId) {
      return res
        .status(200)
        .json({
          message: "El archivo ya está en la ubicación de destino.",
          file: fileToMove,
        });
    }

    // Comprobar conflicto de nombre en el destino (paranoid: true default)
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
          message: `Ya existe un archivo activo llamado "${fileToMove.name}" en la ubicación de destino.`,
        });
    }

    // Mover
    fileToMove.folder_id = destinationParentId;
    await fileToMove.save();
    res
      .status(200)
      .json({ message: "Archivo movido con éxito.", file: fileToMove });
  } catch (error) {
    console.error("Error al mover archivo:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      // Esto no debería pasar si la comprobación de conflicto funciona, pero por si acaso
      return res
        .status(409)
        .json({
          message: `Ya existe un archivo con ese nombre en la ubicación de destino (conflicto DB).`,
        });
    }
    res.status(500).json({ message: "Error interno al mover el archivo." });
  }
};
