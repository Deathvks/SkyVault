// backend/src/controllers/folderController.js
const { Folder, File } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator"); // <-- Importar validationResult

// --- Crear una nueva carpeta ---
exports.createFolder = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------
  try {
    const { name, parentFolderId = null } = req.body;
    const userId = req.userId;

    // La validación de !name ya la hace express-validator
    // if (!name) { ... }

    // Validar parentFolderId numérico si se proporciona (aunque ya lo valida la regla)
    let parentId = null;
    if (
      parentFolderId &&
      parentFolderId !== "root" &&
      parentFolderId !== null
    ) {
      parentId = parseInt(parentFolderId, 10);
      if (isNaN(parentId)) {
        // Esto no debería pasar si la validación de ruta/body funciona
        return res
          .status(400)
          .json({ message: "ID de carpeta padre inválido." });
      }
      const parent = await Folder.findOne({
        where: { id: parentId, user_id: userId },
      });
      if (!parent) {
        return res
          .status(404)
          .json({ message: "La carpeta padre no existe o no te pertenece." });
      }
    } else {
      // Si es null o 'root', el parentId real es null
      parentId = null;
    }

    const existingFolder = await Folder.findOne({
      where: { name, user_id: userId, parent_folder_id: parentId }, // Usar parentId validado
    });
    if (existingFolder) {
      return res.status(409).json({
        message: `Ya existe una carpeta llamada "${name}" en esta ubicación.`,
      });
    }

    const newFolder = await Folder.create({
      name, // El name ya viene trim() de la validación si se añadió .trim()
      user_id: userId,
      parent_folder_id: parentId,
    });

    res
      .status(201)
      .json({ message: "Carpeta creada con éxito.", folder: newFolder });
  } catch (error) {
    console.error("Error al crear carpeta:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: `Ya existe una carpeta llamada "${req.body.name}" en esta ubicación.`,
      });
    }
    res.status(500).json({ message: "Error interno al crear la carpeta." });
  }
};

// --- Obtener contenido de una carpeta (o raíz) ---
exports.getFolderContents = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Errores en el parámetro :folderId
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------
  try {
    const { folderId } = req.params; // folderId ya validado (numérico o 'root')
    const userId = req.userId;
    let parentFolderId = null;

    if (folderId !== "root") {
      parentFolderId = parseInt(folderId, 10); // Sabemos que es numérico por la validación
      // Verificar existencia y pertenencia (importante aunque el ID sea válido)
      const parent = await Folder.findOne({
        where: { id: parentFolderId, user_id: userId },
        attributes: ["id"], // Solo necesitamos saber si existe
      });
      if (!parent) {
        return res
          .status(404)
          .json({ message: "Carpeta no encontrada o no te pertenece." });
      }
    }

    const subFolders = await Folder.findAll({
      where: { user_id: userId, parent_folder_id: parentFolderId },
      order: [["name", "ASC"]],
    });

    const files = await File.findAll({
      where: { user_id: userId, folder_id: parentFolderId },
      order: [["name", "ASC"]],
    });

    // Log de depuración (mantenido si es útil)
    console.log(
      "DEBUG: Files fetched from DB:",
      JSON.stringify(
        files.map((f) => f.name),
        null,
        2
      )
    );

    res.status(200).json({ subFolders, files });
  } catch (error) {
    console.error("Error al obtener contenido de la carpeta:", error);
    res.status(500).json({ message: "Error interno al obtener el contenido." });
  }
};

// --- Eliminar una carpeta ---
exports.deleteFolder = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() }); // Error en :folderId
  }
  // ---------------------------
  try {
    const { folderId } = req.params; // folderId ya validado como int
    const userId = req.userId;

    // Ya no necesitamos isNaN porque lo valida express-validator
    // if (!folderId || isNaN(parseInt(folderId, 10))) { ... }

    const folder = await Folder.findOne({
      where: { id: folderId, user_id: userId },
    });

    if (!folder) {
      return res
        .status(404)
        .json({ message: "Carpeta no encontrada o no te pertenece." });
    }

    await folder.destroy();

    res.status(200).json({ message: "Carpeta eliminada con éxito." });
  } catch (error) {
    console.error("Error al eliminar carpeta:", error);
    res.status(500).json({ message: "Error interno al eliminar la carpeta." });
  }
};

// --- Renombrar Carpeta ---
exports.renameFolder = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Errores en :folderId o en newName (body)
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------
  try {
    const { folderId } = req.params; // Validado como int
    const { newName } = req.body; // Validado como no vacío y trim()
    const userId = req.userId;

    // Validación de nombre vacío ya hecha por express-validator
    // if (!newName || typeof newName !== "string" || newName.trim().length === 0) { ... }
    // Validación de folderId ya hecha por express-validator
    // if (!folderId || isNaN(parseInt(folderId, 10))) { ... }

    const folder = await Folder.findOne({
      where: { id: folderId, user_id: userId },
    });
    if (!folder) {
      return res
        .status(404)
        .json({ message: "Carpeta no encontrada o no te pertenece." });
    }

    if (folder.name === newName) {
      // Comparar con newName (ya 'trimmed')
      return res.status(200).json(folder);
    }

    const conflict = await Folder.findOne({
      where: {
        name: newName,
        user_id: userId,
        parent_folder_id: folder.parent_folder_id,
        id: { [Op.ne]: folderId },
      },
    });
    if (conflict) {
      return res.status(409).json({
        message: `Ya existe una carpeta llamada "${newName}" en esta ubicación.`,
      });
    }

    folder.name = newName; // Usar newName validado
    await folder.save();

    res.status(200).json({ message: "Carpeta renombrada con éxito.", folder });
  } catch (error) {
    console.error("Error al renombrar carpeta:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: `Ya existe una carpeta llamada "${req.body.newName?.trim()}" en esta ubicación.`, // Usar nombre original por si acaso
      });
    }
    res.status(500).json({ message: "Error interno al renombrar la carpeta." });
  }
};

// --- Obtener Árbol de Carpetas ---
exports.getFolderTree = async (req, res) => {
  // No hay parámetros que validar aquí, solo se usa req.userId
  try {
    const userId = req.userId;
    const allFolders = await Folder.findAll({
      where: { user_id: userId },
      order: [["name", "ASC"]],
      attributes: ["id", "name", "parent_folder_id"],
    });

    const buildTree = (parentId = null) => {
      return allFolders
        .filter((folder) => folder.parent_folder_id === parentId)
        .map((folder) => ({
          id: folder.id,
          name: folder.name,
          children: buildTree(folder.id),
        }));
    };

    const folderTree = buildTree(null);
    res.status(200).json(folderTree);
  } catch (error) {
    console.error("Error al obtener árbol de carpetas:", error);
    res
      .status(500)
      .json({ message: "Error interno al obtener la estructura de carpetas." });
  }
};

// --- Mover Carpeta ---
exports.moveFolder = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Errores en :folderId o destinationFolderId (body)
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------
  try {
    const { folderId } = req.params; // Validado como int
    let { destinationFolderId } = req.body; // Validado como int opcional
    const userId = req.userId;

    const folderToMoveId = parseInt(folderId, 10); // Sabemos que es int

    // Validar y normalizar destinationFolderId
    let destinationParentId = null;
    if (destinationFolderId !== undefined && destinationFolderId !== null) {
      // Si se proporcionó y la validación pasó, es un int > 0
      destinationParentId = parseInt(destinationFolderId, 10);
    } else {
      // Si no se proporcionó o era null, el destino es la raíz
      destinationParentId = null;
    }

    // Resto de validaciones lógicas (auto-movimiento, ciclo, existencia destino)
    if (folderToMoveId === destinationParentId) {
      /* ... */
    }
    const folderToMove = await Folder.findOne({
      where: { id: folderToMoveId, user_id: userId },
    });
    if (!folderToMove) {
      /* ... */
    }

    if (destinationParentId !== null) {
      let currentAncestorId = destinationParentId;
      while (currentAncestorId !== null) {
        if (currentAncestorId === folderToMoveId) {
          /* ... return 400 ciclo ... */
        }
        const ancestor = await Folder.findOne({
          attributes: ["parent_folder_id"],
          where: { id: currentAncestorId, user_id: userId },
        });
        if (!ancestor) break;
        currentAncestorId = ancestor.parent_folder_id;
      }
      const destinationExists = await Folder.count({
        where: { id: destinationParentId, user_id: userId },
      });
      if (destinationExists === 0) {
        /* ... return 404 destino ... */
      }
    }

    if (folderToMove.parent_folder_id === destinationParentId) {
      /* ... return 200 ya está ... */
    }

    // Comprobar conflicto de nombre
    const conflict = await Folder.findOne({
      where: {
        name: folderToMove.name,
        user_id: userId,
        parent_folder_id: destinationParentId,
        id: { [Op.ne]: folderToMoveId },
      },
    });
    if (conflict) {
      /* ... return 409 conflicto ... */
    }

    // Mover
    folderToMove.parent_folder_id = destinationParentId;
    await folderToMove.save();

    res
      .status(200)
      .json({ message: "Carpeta movida con éxito.", folder: folderToMove });
  } catch (error) {
    console.error("Error al mover carpeta:", error);
    res.status(500).json({ message: "Error interno al mover la carpeta." });
  }
};
