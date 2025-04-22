// backend/src/controllers/folderController.js
const { Folder, File } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator"); // <-- Importar validationResult

// --- Crear una nueva carpeta (Versión con Alias en Create) ---
exports.createFolder = async (req, res) => {
  // --- COMPROBAR VALIDACIÓN ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------
  try {
    // Obtener name del body, userId del middleware (req.userId)
    const { name, parentFolderId = null } = req.body;
    const userId = req.userId;

    // Determinar el parentId real (null para raíz, o el número entero)
    let parentId = null;
    if (
      parentFolderId &&
      parentFolderId !== "root" &&
      parentFolderId !== null
    ) {
      // Validar que parentFolderId sea un entero positivo
      const parsedParentId = parseInt(parentFolderId, 10);
      if (isNaN(parsedParentId) || parsedParentId <= 0) {
         // Esta validación también está en la ruta, pero doble check no hace daño
         return res
          .status(400)
          .json({ message: "ID de carpeta padre inválido en body." });
      }
      parentId = parsedParentId; // Usar el ID numérico

      // Verificar existencia y pertenencia de la carpeta padre
      const parent = await Folder.findOne({
        where: { id: parentId, user_id: userId }, // Usa user_id (columna DB) para buscar
      });
      if (!parent) {
        return res
          .status(404)
          .json({ message: "La carpeta padre no existe o no te pertenece." });
      }
    }
    // Si no se proporcionó parentFolderId o era 'root', parentId se queda como null

    // Log antes de crear
    console.log(`DEBUG [createFolder] Intentando crear carpeta para userId: ${userId}, parentId: ${parentId}`);

    // Verificar conflicto de nombre en la misma ubicación
    const existingFolder = await Folder.findOne({
      where: {
          name: name.trim(), // Usar nombre sin espacios extra
          user_id: userId, // Columna DB
          parent_folder_id: parentId // Columna DB
        },
    });
    if (existingFolder) {
      return res.status(409).json({
        message: `Ya existe una carpeta llamada "${name.trim()}" en esta ubicación.`,
      });
    }

    // *** USA LOS ALIAS de asociación ('userId', 'parentFolderId') para el objeto de creación ***
    const dataToCreate = {
        name: name.trim(), // Guarda el nombre sin espacios extra
        userId: userId,           // <-- ALIAS de la asociación User-Folder
        parentFolderId: parentId  // <-- ALIAS de la asociación Folder-Folder
    };
    // ****************************************************************************************

    console.log(`DEBUG [createFolder] Objeto pasado a Folder.create:`, JSON.stringify(dataToCreate));
    const newFolder = await Folder.create(dataToCreate);

    // Devuelve la respuesta exitosa con la nueva carpeta
    res
      .status(201)
      .json({ message: "Carpeta creada con éxito.", folder: newFolder });

  } catch (error) {
    // Loguea el error completo
    console.error("Error al crear carpeta:", error);
    // Loguea detalles del error de Sequelize si existen
    if (error.sql) {
        console.error("SQL con error:", error.sql);
        console.error("Parámetros SQL:", error.parameters);
    }
    // Manejo específico para violación de unicidad (aunque la comprobación previa debería evitarlo)
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: `Ya existe una carpeta llamada "${req.body.name?.trim()}" en esta ubicación (conflicto DB).`,
      });
    }
     // Error genérico para otros fallos
    res.status(500).json({ message: "Error interno al crear la carpeta." });
  }
};

// --- Obtener contenido de una carpeta (o raíz) ---
exports.getFolderContents = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { folderId } = req.params;
    const userId = req.userId;
    let parentFolderId = null; // ID para filtrar en la DB (null para raíz)

    // Determina el ID numérico del padre si no es la raíz
    if (folderId !== "root") {
      parentFolderId = parseInt(folderId, 10); // Asume que la validación ya aseguró que es int
      // Verificar existencia y pertenencia de la carpeta padre
      const parentFolder = await Folder.findOne({
        where: { id: parentFolderId, user_id: userId },
        attributes: ['id'] // Solo necesitamos saber si existe
      });
      if (!parentFolder) {
        return res
          .status(404)
          .json({ message: "Carpeta no encontrada o no te pertenece." });
      }
    }

    // Busca las subcarpetas DENTRO de la carpeta actual (parentFolderId)
    const subFolders = await Folder.findAll({ // <-- Renombrado a subFolders
      where: {
        user_id: userId,
        parent_folder_id: parentFolderId // <-- Condición WHERE correcta
      },
      order: [["name", "ASC"]],
      // attributes: [...] // Opcional: Si solo quieres campos específicos
    });

    // Busca los archivos DENTRO de la carpeta actual (parentFolderId)
    const files = await File.findAll({
      where: {
        user_id: userId,
        folder_id: parentFolderId // <-- Condición WHERE correcta
      },
      order: [["name", "ASC"]],
      // attributes: [...] // Opcional: Si solo quieres campos específicos
    });

    // Logs de depuración (ahora usan 'subFolders')
    console.log("DEBUG [getFolderContents]: Files fetched:", files.length);
    console.log(
      "DEBUG [getFolderContents]: Folders fetched:",
      subFolders.length // <-- Usa la variable correcta
    );

    console.log(`[getFolderContents] Enviando respuesta para user ${userId}, folder ${parentFolderId}:`, { subFoldersCount: subFolders.length, filesCount: files.length }); // <-- Usa la variable correcta
    console.log("[getFolderContents] Nombres carpetas:", subFolders.map(f => f.name)); // <-- Usa la variable correcta
    console.log("[getFolderContents] Nombres archivos:", files.map(f => f.name));

    // Envía la respuesta correcta
    res.status(200).json({ subFolders, files }); // <-- Usa la variable correcta

  } catch (error) {
    console.error(
      "[getFolderContents] Error completo al obtener contenido:",
      error
    );
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

    // *** CORRECCIÓN AQUÍ: Asegurar que parent_folder_id sea null para la raíz ***
    const parentId = folder.parent_folder_id ?? null;

    // Comprobar conflicto (findOne usa paranoid: true por defecto)
    const conflict = await Folder.findOne({
      where: {
        name: trimmedNewName,
        user_id: userId,
        parent_folder_id: parentId, // <-- Usar la variable corregida
        id: { [Op.ne]: folderId }, // Excluir la carpeta actual
      },
    });
    // *** FIN CORRECCIÓN ***

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
    console.error("Error al renombrar carpeta:", error); // Aquí es donde ves el error original
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
// --- Obtener Árbol de Carpetas ---
// --- Obtener Árbol de Carpetas --- (Intento Final) ---
exports.getFolderTree = async (req, res) => {
  console.log("[getFolderTree] Iniciando obtención de árbol...");
  try {
    const userId = req.userId;
    console.log(`[getFolderTree] Buscando carpetas para user_id: ${userId}`);

    // *** CAMBIO: Eliminada la opción 'attributes' ***
    const allFolders = await Folder.findAll({
      where: { user_id: userId }, // Mantiene el filtro por usuario
      order: [["name", "ASC"]],
      // paranoid: true es implícito si está en el modelo
    });
    // *********************************************

    console.log(
      `[getFolderTree] Carpetas activas encontradas en BD: ${allFolders.length}`
    );
    // Log de muestra opcional
    // console.log("[getFolderTree] Muestra de carpetas:", JSON.stringify(allFolders.slice(0, 10).map(f => ({ id: f.id, name: f.name, parent: f.parentFolderId })), null, 2));


    // --- Función buildTree (Usando ALIAS 'parentFolderId') ---
    const buildTree = (parentId = null) => {
      // console.log(`[buildTree] Buscando hijos para parentId: ${parentId} (Tipo: ${typeof parentId})`); // Log opcional

      const children = allFolders
        .filter((folder) => {
          // *** USA EL ALIAS 'parentFolderId' OTRA VEZ ***
          // Al quitar 'attributes', Sequelize debería poblar este alias de la asociación
          const currentParentId = folder.parentFolderId;
          // *******************************************

          // console.log(`[buildTree Filter] Carpeta ID: ${folder.id}, parentFolderId (ALIAS): ${currentParentId} (Tipo: ${typeof currentParentId}), Comparando con: ${parentId}`); // Log opcional

          // Comparación estricta
          return currentParentId === parentId;
        })
        .map((folder) => ({
          id: folder.id,
          name: folder.name,
          children: buildTree(folder.id),
        }));

      // console.log(`[buildTree] Hijos encontrados para ${parentId}: ${children.length}`); // Log opcional
      return children;
    };
    // --- FIN buildTree ---

    const folderTree = buildTree(null);

    console.log(
      "[getFolderTree] Árbol construido:",
      JSON.stringify(folderTree, null, 2)
    );

    res.status(200).json(folderTree);

  } catch (error) {
    console.error(
      "[getFolderTree] Error completo al obtener árbol de carpetas:",
      error
    );
    res
      .status(500)
      .json({ message: "Error interno al obtener la estructura de carpetas." });
  }
}; // <-- Llave de cierre de exports.getFolderTree

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