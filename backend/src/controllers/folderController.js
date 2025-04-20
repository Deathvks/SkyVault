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
      // Verificar existencia y pertenencia (Sequelize usa paranoid:true por defecto aquí)
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

    // Verificar conflicto (Sequelize usa paranoid:true por defecto aquí)
    const existingFolder = await Folder.findOne({
      where: { name, user_id: userId, parent_folder_id: parentId },
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
  // ... (Validación existente)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { folderId } = req.params;
    const userId = req.userId;
    let parentFolderId = null;

    if (folderId !== "root") {
      parentFolderId = parseInt(folderId, 10);
      // Verificar existencia (paranoid:true es default)
      const parentFolder = await Folder.findOne({
        where: { id: parentFolderId, user_id: userId },
      });
      if (!parentFolder) {
        return res
          .status(404)
          .json({ message: "Carpeta no encontrada o no te pertenece." });
      }
    }

    // Usar el filtrado implícito de paranoid: true
    const subFolders = await Folder.findAll({
      where: {
        user_id: userId,
        parent_folder_id: parentFolderId,
      },
      order: [["name", "ASC"]],
    });

    const files = await File.findAll({
      where: {
        user_id: userId,
        folder_id: parentFolderId,
      },
      order: [["name", "ASC"]],
    });

    console.log("DEBUG [getFolderContents]: Files fetched:", files.length);
    console.log(
      "DEBUG [getFolderContents]: Folders fetched:",
      subFolders.length
    );

    res.status(200).json({ subFolders, files });
  } catch (error) {
    console.error(
      "[getFolderContents] Error completo al obtener contenido:",
      error
    ); // Log más detallado
    res.status(500).json({ message: "Error interno al obtener el contenido." });
  }
};

// --- Eliminar una carpeta (Soft Delete) ---
exports.deleteFolder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { folderId } = req.params;
    const userId = req.userId;

    const folder = await Folder.findOne({
      where: { id: folderId, user_id: userId },
    }); // paranoid:true default
    if (!folder) {
      return res
        .status(404)
        .json({ message: "Carpeta no encontrada o no te pertenece." });
    }

    // destroy() con paranoid: true hará soft delete
    await folder.destroy();

    res.status(200).json({ message: "Carpeta movida a la papelera." }); // Mensaje actualizado
  } catch (error) {
    console.error("Error al mover carpeta a la papelera:", error);
    res.status(500).json({ message: "Error interno al eliminar la carpeta." });
  }
};

// --- Renombrar Carpeta ---
exports.renameFolder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { folderId } = req.params;
    const { newName } = req.body;
    const userId = req.userId;

    const folder = await Folder.findOne({
      where: { id: folderId, user_id: userId },
    }); // paranoid: true default
    if (!folder) {
      return res
        .status(404)
        .json({ message: "Carpeta no encontrada o no te pertenece." });
    }

    const trimmedNewName = newName.trim();
    if (folder.name === trimmedNewName) {
      return res.status(200).json(folder); // Devolver la carpeta sin cambios
    }

    // Comprobar conflicto (findOne usa paranoid: true por defecto)
    const conflict = await Folder.findOne({
      where: {
        name: trimmedNewName,
        user_id: userId,
        parent_folder_id: folder.parent_folder_id,
        id: { [Op.ne]: folderId }, // Excluir la carpeta actual
      },
    });
    if (conflict) {
      return res
        .status(409)
        .json({
          message: `Ya existe una carpeta activa llamada "${trimmedNewName}" en esta ubicación.`,
        });
    }

    folder.name = trimmedNewName;
    await folder.save();

    res.status(200).json({ message: "Carpeta renombrada con éxito.", folder });
  } catch (error) {
    console.error("Error al renombrar carpeta:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({
          message: `Ya existe una carpeta llamada "${req.body.newName?.trim()}" en esta ubicación (conflicto DB).`,
        });
    }
    res.status(500).json({ message: "Error interno al renombrar la carpeta." });
  }
};

// --- Obtener Árbol de Carpetas ---
exports.getFolderTree = async (req, res) => {
  console.log("[getFolderTree] Iniciando obtención de árbol..."); // <-- Log inicio
  try {
    const userId = req.userId;
    console.log(`[getFolderTree] Buscando carpetas para user_id: ${userId}`); // <-- Log userId

    // Fetches ONLY active folders for the user (paranoid: true is default)
    const allFolders = await Folder.findAll({
      where: { user_id: userId },
      order: [["name", "ASC"]],
      attributes: ["id", "name", "parent_folder_id"],
    });

    // --- Log detallado de las carpetas encontradas ---
    console.log(
      `[getFolderTree] Carpetas activas encontradas en BD: ${allFolders.length}`
    );
    console.log(
      "[getFolderTree] Muestra de carpetas:",
      JSON.stringify(
        allFolders
          .slice(0, 10)
          .map((f) => ({ id: f.id, name: f.name, parent: f.parent_folder_id })),
        null,
        2
      )
    );
    // ------------------------------------------------

    // Recursive function to build the tree structure
    const buildTree = (parentId = null) => {
      const children = allFolders
        .filter((folder) => {
          // Asegurar comparación estricta con null
          return folder.parent_folder_id === parentId;
        })
        .map((folder) => ({
          id: folder.id,
          name: folder.name,
          children: buildTree(folder.id), // Recursive call for children
        }));
      return children;
    };

    // Build the tree starting from root (parentId = null)
    const folderTree = buildTree(null);

    // --- Log detallado del árbol construido ---
    console.log(
      "[getFolderTree] Árbol construido:",
      JSON.stringify(folderTree, null, 2)
    );
    // -----------------------------------------

    // Send the result as JSON
    res.status(200).json(folderTree); // Enviar el array construido
  } catch (error) {
    console.error(
      "[getFolderTree] Error completo al obtener árbol de carpetas:",
      error
    ); // <-- Log del error
    res
      .status(500)
      .json({ message: "Error interno al obtener la estructura de carpetas." });
  }
};

// --- Mover Carpeta ---
exports.moveFolder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { folderId } = req.params;
    let { destinationFolderId } = req.body;
    const userId = req.userId;
    const folderToMoveId = parseInt(folderId, 10);

    let destinationParentId = null;
    if (destinationFolderId !== undefined && destinationFolderId !== null) {
      destinationParentId = parseInt(destinationFolderId, 10);
    }

    // Validaciones lógicas (auto-movimiento, ciclo, existencia destino)
    if (folderToMoveId === destinationParentId) {
      return res
        .status(400)
        .json({ message: "No se puede mover una carpeta dentro de sí misma." });
    }

    const folderToMove = await Folder.findOne({
      where: { id: folderToMoveId, user_id: userId },
    }); // paranoid: true default
    if (!folderToMove) {
      return res
        .status(404)
        .json({ message: "Carpeta a mover no encontrada o no te pertenece." });
    }

    // Validar ciclo y existencia destino (findOne usa paranoid: true)
    if (destinationParentId !== null) {
      let currentAncestorId = destinationParentId;
      while (currentAncestorId !== null) {
        if (currentAncestorId === folderToMoveId) {
          return res
            .status(400)
            .json({
              message:
                "No se puede mover una carpeta a una de sus subcarpetas.",
            });
        }
        const ancestor = await Folder.findOne({
          attributes: ["parent_folder_id"],
          where: { id: currentAncestorId, user_id: userId },
        }); // paranoid: true default
        if (!ancestor) break;
        currentAncestorId = ancestor.parent_folder_id;
      }
      const destinationExists = await Folder.count({
        where: { id: destinationParentId, user_id: userId },
      }); // paranoid: true default
      if (destinationExists === 0) {
        return res
          .status(404)
          .json({
            message: "La carpeta de destino no existe o no te pertenece.",
          });
      }
    }

    // Comprobar si ya está en el destino
    // Comparar null explícitamente vs undefined/null
    const currentParentId =
      folderToMove.parent_folder_id === null
        ? null
        : folderToMove.parent_folder_id;
    if (currentParentId === destinationParentId) {
      return res
        .status(200)
        .json({
          message: "La carpeta ya está en la ubicación de destino.",
          folder: folderToMove,
        });
    }

    // Comprobar conflicto de nombre en el destino (findOne usa paranoid: true)
    const conflict = await Folder.findOne({
      where: {
        name: folderToMove.name,
        user_id: userId,
        parent_folder_id: destinationParentId,
        id: { [Op.ne]: folderToMoveId },
      },
    });
    if (conflict) {
      return res
        .status(409)
        .json({
          message: `Ya existe una carpeta activa llamada "${folderToMove.name}" en la ubicación de destino.`,
        });
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
