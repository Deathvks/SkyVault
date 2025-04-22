// backend/src/controllers/fileController.js
const fs = require("fs");
const fsPromises = require("fs").promises; // Necesario para borrar archivo temporal
const path = require("path");
const { File, Folder, User } = require("../models"); // <-- Importar User
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

// Define la cuota estándar en bytes (2 GB) - puede importarse de una config si prefieres
const STANDARD_USER_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

// --- Subir un archivo (Versión con Alias en Create) ---
exports.uploadFile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Borrar archivo temporal si la validación de express-validator falla ANTES de empezar
    if (req.file && req.file.path) {
      try {
        await fsPromises.unlink(req.file.path);
        console.log(
          `Archivo temporal ${req.file.path} borrado por fallo de validación.`
        );
      } catch (unlinkError) {
        if (unlinkError.code !== "ENOENT") {
          console.error(
            "Error al borrar archivo temporal tras fallo de validación:",
            unlinkError
          );
        }
      }
    }
    return res.status(400).json({ errors: errors.array() });
  }

  // --- Verificar si hay archivo (Multer lo pone en req.file) ---
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "Archivo no subido, vacío o tipo no permitido." });
  }

  // --- OBTENER DATOS NECESARIOS ---
  const userId = req.userId;
  const userRole = req.userRole; // Obtenido del middleware protect
  const newFileSize = req.file.size;
  const tempPath = req.file.path; // Ruta completa donde Multer guardó temporalmente (aún necesaria para limpieza)
  const generatedFilename = req.file.filename; // Nombre relativo generado por Multer (¡NUEVO USO!)
  let originalname = req.file.originalname; // Nombre original
  const mimetype = req.file.mimetype;
  const { folderId: rawFolderId = null } = req.body; // ID de carpeta del cuerpo de la petición

  // Workaround para posible problema de codificación UTF-8/Latin1 (mantener si es necesario)
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
        // Solo cambiar si la decodificación parece tener sentido
        originalname = decodedName;
      }
    }
  } catch (decodeError) {
    /* Ignorar error de decodificación */
  }

  try {
    // --- VALIDACIÓN DE CUOTA (ANTES DE OPERACIONES DE BD) ---
    if (userRole !== "admin") {
      // Los admins no tienen límite (quota_bytes es null)
      const user = await User.findByPk(userId, {
        attributes: ["storage_used_bytes", "storage_quota_bytes"], // CAMBIO: Usar 'storage_used' si renombraste columna
      });

      if (!user) {
        // Esto no debería pasar si el token es válido, pero por si acaso
        await fsPromises.unlink(tempPath); // Borrar archivo temporal
        return res.status(404).json({ message: "Usuario no encontrado." });
      }

      const userQuota = user.storage_quota_bytes ?? STANDARD_USER_QUOTA_BYTES;
      const currentUsage = user.storage_used; // CAMBIO: Usar 'storage_used'

      // Comprobar si el nuevo archivo excedería la cuota
      if (currentUsage + newFileSize > userQuota) {
        console.warn(
          `Usuario ${userId} excede cuota: ${
            currentUsage + newFileSize
          } > ${userQuota}`
        );
        await fsPromises.unlink(tempPath); // ¡Importante! Borrar archivo temporal porque excede cuota
        return res.status(413).json({
          message: `No se puede subir el archivo. Excederías tu cuota de almacenamiento (${(
            userQuota /
            (1024 * 1024 * 1024)
          ).toFixed(1)} GB). Libera espacio o contacta al administrador.`,
        });
      }
    }
    // --- FIN VALIDACIÓN DE CUOTA ---

    // --- Lógica para validar carpeta padre ---
    let parentFolderId = null; // ID numérico para la BD (null si es raíz)
    if (rawFolderId && rawFolderId !== "root" && rawFolderId !== null) {
      parentFolderId = parseInt(rawFolderId, 10);
      const parentFolder = await Folder.findOne({
        where: { id: parentFolderId, user_id: userId }, // Columna DB 'user_id'
        attributes: ["id"],
      });
      if (!parentFolder) {
        await fsPromises.unlink(tempPath);
        return res.status(404).json({
          message: "La carpeta de destino no existe o no te pertenece.",
        });
      }
    }
    // --- Fin lógica carpeta padre ---

    // --- Lógica para comprobar conflicto de nombre ---
    const existingFile = await File.findOne({
      where: {
        name: originalname,
        user_id: userId, // Columna DB 'user_id'
        folder_id: parentFolderId, // Columna DB 'folder_id' (null para raíz)
      },
    });
    if (existingFile) {
      await fsPromises.unlink(tempPath);
      return res.status(409).json({
        message: `Ya existe un archivo activo llamado "${originalname}" en esta ubicación.`,
      });
    }
    // --- Fin lógica conflicto ---

    // --- CREAR REGISTRO DE ARCHIVO Y ACTUALIZAR USO ---

    const dataToCreate = {
      name: originalname,
      // ***** CAMBIO IMPORTANTE AQUÍ *****
      storage_path: generatedFilename, // Guardar solo el nombre relativo generado
      // *********************************
      mime_type: mimetype,
      size: newFileSize,
      userId: userId, // <-- ALIAS de la asociación User-File
      folderId: parentFolderId, // <-- ALIAS de la asociación Folder-File (puede ser null)
    };

    console.log(
      `DEBUG [uploadFile] Objeto pasado a File.create:`,
      JSON.stringify(dataToCreate)
    );
    const newFile = await File.create(dataToCreate); // Sequelize mapeará alias a columnas DB

    // Incrementar el uso del usuario DESPUÉS de crear el archivo exitosamente
    // Incrementar el uso del usuario DESPUÉS de crear el archivo exitosamente
    // Incrementar el uso del usuario DESPUÉS de crear el archivo exitosamente
    const userToUpdate = await User.findByPk(userId);
    if (userToUpdate) {
      try {
        // Verifica que 'storage_used' sea el nombre correcto de tu campo
        userToUpdate.storage_used_bytes =
          (userToUpdate.storage_used_bytes || 0) + newFileSize;

        // --- NUEVOS LOGS ---
        console.log(`[UploadQuota Debug] Valor ANTES de save() para user ${userId}: ${userToUpdate.storage_used}`);
        await userToUpdate.save(); // <-- Intenta guardar
        // Recargar el usuario desde la BD para verificar el valor persistido
        await userToUpdate.reload();
        console.log(`[UploadQuota Debug] Valor DESPUÉS de save() y reload() para user ${userId}: ${userToUpdate.storage_used}`);
        // --- FIN NUEVOS LOGS ---

        // Log original (ahora debería coincidir con el log de arriba si todo va bien)
        console.log(
          `Uso actualizado para usuario ${userId}: ${userToUpdate.storage_used} bytes`
        );
      } catch (saveError) {
        console.error(
          `Error CRÍTICO al guardar actualización de cuota para usuario ${userId} tras subir archivo ${newFile?.id || '?'}:`, // Añadido newFile.id opcional
          saveError
        );
        // Considerar si este error debería causar alguna acción adicional
      }
    } else {
        console.error(
            `Usuario ${userId} no encontrado para actualizar uso después de subir archivo ${newFile?.id || '?'}` // Añadido newFile.id opcional
        );
    }

    // --- FIN CREACIÓN Y ACTUALIZACIÓN ---

    res
      .status(201)
      .json({ message: "Archivo subido con éxito.", file: newFile });
  } catch (error) {
    console.error("Error detallado al subir archivo:", error);
    // Asegurarse de borrar el archivo temporal si aún existe y hubo cualquier error
    try {
      // Usar tempPath (la ruta completa original) para la limpieza
      // Comprobar si aún existe, ya que pudo borrarse por validaciones previas
      if (tempPath && fs.existsSync(tempPath)) {
        await fsPromises.unlink(tempPath);
        console.log(
          `Archivo temporal ${tempPath} borrado por error durante el procesamiento.`
        );
      }
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") {
        console.error(
          "Error al intentar borrar archivo temporal tras fallo:",
          unlinkError
        );
      }
    }

    // Manejo de errores específicos y genéricos
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: `Conflicto: Ya existe un archivo llamado "${originalname}" en esta ubicación.`,
      });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor al subir el archivo." });
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
    if (!file || !file.storage_path) {
      // Añadida comprobación de storage_path
      return res
        .status(404)
        .json({
          message:
            "Archivo no encontrado, no te pertenece o no tiene ruta de almacenamiento.",
        });
    }

    // ***** CAMBIO: Construir ruta absoluta desde la relativa *****
    const absolutePath = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      file.storage_path
    );
    // ************************************************************

    // Comprobar si el archivo físico existe antes de intentar descargar
    try {
      await fsPromises.access(absolutePath); // Usar absolutePath
    } catch (accessError) {
      console.error(
        `Error de acceso al archivo físico ${absolutePath} (ID: ${fileId}):`,
        accessError
      );
      return res
        .status(404)
        .json({ message: "Archivo no encontrado en almacenamiento." });
    }

    // Intentar descargar (res.download fuerza Content-Disposition: attachment)
    res.download(absolutePath, file.name, (err) => {
      // Usar absolutePath
      if (err) {
        // Manejar errores durante el envío (ej. conexión cerrada)
        if (!res.headersSent) {
          // Si no se han enviado headers, podemos enviar una respuesta JSON
          console.error("Error al enviar archivo para descarga:", err);
          res.status(500).json({ message: "No se pudo iniciar la descarga." });
        } else {
          // Si ya se enviaron headers, solo podemos loguear el error
          console.error("Error durante la transmisión de descarga:", err);
        }
      } else {
        console.log(`Archivo ${file.name} descargado por usuario ${userId}.`);
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

    // Encontrar el archivo ACTIVO (paranoid: true por defecto)
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });

    if (!file) {
      // Si no se encuentra activo, no se puede mover a la papelera
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }

    // Solo marcar como borrado en la BD (Sequelize se encarga con paranoid: true en el modelo)
    await file.destroy(); // Esto hace SOFT delete porque paranoid=true en el modelo

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
    // Para view, quizás es mejor solo enviar status y no JSON
    return res.sendStatus(400);
  }
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    // Buscar archivo ACTIVO
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });

    // Validar si existe el registro y si tiene ruta
    if (!file || !file.storage_path) {
      // Asegurar que storage_path existe
      return res.sendStatus(404); // Not Found
    }

    // ***** CAMBIO: Construir ruta absoluta desde la relativa *****
    const absolutePath = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      file.storage_path
    );
    // ************************************************************

    // Validar si el archivo físico existe
    try {
      await fsPromises.access(absolutePath); // Usar absolutePath
    } catch (accessError) {
      console.error(
        `Archivo físico no encontrado o sin permisos en ${absolutePath} (ID: ${fileId})`
      );
      return res.sendStatus(404); // Not Found
    }

    // --- Establecer Content-Disposition a 'inline' ---
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`
    );

    // Opcional: Establecer Content-Type explícitamente si confías en el mime_type guardado.
    if (file.mime_type) {
      res.setHeader("Content-Type", file.mime_type);
    }

    // Usar res.sendFile para enviar el archivo para visualización/incrustación
    res.sendFile(absolutePath, (err) => {
      // Usar absolutePath
      if (err) {
        if (!res.headersSent) {
          console.error(
            `Error al intentar enviar archivo ${absolutePath} para visualización:`,
            err
          );
          res.sendStatus(500); // Internal Server Error si falla antes de enviar
        } else {
          console.error(
            "Error durante transmisión de archivo para visualización:",
            err
          );
        }
      } else {
        console.log(
          `Archivo ${absolutePath} enviado correctamente para visualización (inline).`
        );
      }
    });
  } catch (error) {
    console.error("Error general al visualizar archivo:", error);
    if (!res.headersSent) {
      res.sendStatus(500); // Internal Server Error
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
    let newName = req.body.newName; // Validado no vacío y trim() en ruta
    const userId = req.userId;

    // Workaround Codificación (opcional, si sigue siendo necesario)
    try {
      const hasUtf8CorruptionPattern =
        /Ã[€ ‚ƒ„…†‡ˆ‰Š‹Œ Ž  ‘’“”•–—˜™š›œ žŸ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(
          newName
        );
      if (hasUtf8CorruptionPattern && !newName.includes("ñ")) {
        const buffer = Buffer.from(newName, "latin1");
        const decoded = buffer.toString("utf8");
        if (decoded.includes("ñ")) {
          newName = decoded;
        }
      }
    } catch (e) {
      /* Ignorar error de decodificación */
    }

    // Encontrar archivo ACTIVO
    const file = await File.findOne({ where: { id: fileId, user_id: userId } }); // paranoid: true default
    if (!file) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no te pertenece." });
    }

    // --- Lógica para Preservar Extensión ---
    const originalExtension = path.extname(file.name); // Obtener extensión original ".pdf"
    // Obtener base del nuevo nombre (sin extensión si la puso el usuario)
    let userInputBaseName = path.basename(newName, path.extname(newName));

    // Si el usuario borra todo o solo pone extensión, usar base original o fallback
    if (!userInputBaseName || userInputBaseName === ".") {
      userInputBaseName = path.basename(file.name, originalExtension);
      if (!userInputBaseName)
        userInputBaseName = `archivo_renombrado_${Date.now()}`; // Fallback extremo
    }

    // Unir base nueva + extensión original
    const finalNewName = userInputBaseName + originalExtension;
    // --- Fin Lógica Extensión ---

    // Comprobar si el nombre final es igual al actual
    if (file.name === finalNewName) {
      return res
        .status(200)
        .json({ message: "No se realizaron cambios en el nombre.", file }); // Devolver sin cambios
    }

    // *** CORRECCIÓN AQUÍ: Asegurar que parentFolderId sea null para la raíz ***
    const parentFolderId = file.folder_id ?? null;

    // Comprobar conflicto de nombre en la misma carpeta (archivos activos)
    const conflict = await File.findOne({
      where: {
        name: finalNewName, // Usar el nombre final con extensión
        user_id: userId,
        folder_id: parentFolderId, // <-- Usar la variable corregida
        id: { [Op.ne]: fileId }, // Excluirse a sí mismo
      },
      // paranoid: true es default
    });
    // *** FIN CORRECCIÓN ***

    if (conflict) {
      return res.status(409).json({
        // 409 Conflict
        message: `Ya existe un archivo activo llamado "${finalNewName}" en esta ubicación.`,
      });
    }

    // Actualizar y guardar
    file.name = finalNewName; // Guardar nombre con extensión preservada
    await file.save();
    res.status(200).json({ message: "Archivo renombrado con éxito.", file });
  } catch (error) {
    console.error("Error al renombrar archivo:", error); // Aquí es donde ves el error original
    // Manejo de error de constraint único (si la comprobación anterior falla por concurrencia)
    if (error.name === "SequelizeUniqueConstraintError") {
      // Intentar construir el nombre final para el mensaje de error
      // CORRECCIÓN: Acceder a file.name solo si file existe
      const originalExt = file ? path.extname(file.name) : "";
      const finalNameAttempt = req.body.newName
        ? path.basename(
            req.body.newName.trim(),
            path.extname(req.body.newName.trim())
          ) + originalExt
        : "desconocido";
      return res.status(409).json({
        message: `Conflicto DB: Ya existe un archivo llamado "${finalNameAttempt}" en esta ubicación.`,
      });
    }
    // Error genérico
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
    let { destinationFolderId } = req.body; // Validado int opcional o null/undefined
    const userId = req.userId;

    const fileToMoveId = parseInt(fileId, 10); // Sabemos que es int

    // --- Validar y normalizar destinationFolderId ---
    let destinationParentId = null; // Representa la raíz en la BD
    // Si se proporciona y no es null/undefined (la validación ya aseguró que es numérico > 0 si existe)
    if (destinationFolderId !== undefined && destinationFolderId !== null) {
      destinationParentId = parseInt(destinationFolderId, 10);

      // Verificar que la carpeta destino existe y pertenece al usuario (solo carpetas activas)
      const destFolder = await Folder.findOne({
        where: { id: destinationParentId, user_id: userId },
        // paranoid: true default
      });
      if (!destFolder) {
        return res.status(404).json({
          message: "La carpeta de destino no existe o no te pertenece.",
        });
      }
    } // Si era null o undefined, destinationParentId se queda como null (mover a la raíz)
    // --- Fin Validación Destino ---

    // Encontrar archivo a mover (activo)
    const fileToMove = await File.findOne({
      where: { id: fileToMoveId, user_id: userId },
      // paranoid: true default
    });
    if (!fileToMove) {
      return res
        .status(404)
        .json({ message: "Archivo a mover no encontrado o no te pertenece." });
    }

    // Comprobar si ya está en el destino
    const currentFolderId = fileToMove.folder_id ?? null; // Convertir null de BD a null explícito
    if (currentFolderId === destinationParentId) {
      return res.status(200).json({
        message: "El archivo ya está en la ubicación de destino.",
        file: fileToMove,
      });
    }

    // Comprobar conflicto de nombre en el destino (archivos activos)
    const conflict = await File.findOne({
      where: {
        name: fileToMove.name, // Mismo nombre
        user_id: userId,
        folder_id: destinationParentId, // En la carpeta destino
        id: { [Op.ne]: fileToMoveId }, // Que no sea él mismo
      },
      // paranoid: true default
    });
    if (conflict) {
      return res.status(409).json({
        // 409 Conflict
        message: `Ya existe un archivo activo llamado "${fileToMove.name}" en la ubicación de destino.`,
      });
    }

    // Mover actualizando folder_id
    fileToMove.folder_id = destinationParentId; // Asignar nuevo ID de carpeta (o null para raíz)
    await fileToMove.save();
    res
      .status(200)
      .json({ message: "Archivo movido con éxito.", file: fileToMove });
  } catch (error) {
    console.error("Error al mover archivo:", error);
    // Manejo de error de constraint (si falla la comprobación por concurrencia)
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: `Conflicto DB: Ya existe un archivo con ese nombre en la ubicación de destino.`,
      });
    }
    // Error genérico
    res.status(500).json({ message: "Error interno al mover el archivo." });
  }
};
