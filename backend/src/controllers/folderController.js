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
    const { folderId } = req.params; // Carpeta a mover (validado int)
    let { destinationFolderId } = req.body; // Carpeta destino (validado int opcional o null/undefined)
    const userId = req.userId;

    const folderToMoveId = parseInt(folderId, 10);

    // --- Log Inicial ---
    console.log(`[moveFolder Debug] START - folderToMoveId: ${folderToMoveId}, destinationFolderId: ${destinationFolderId}, userId: ${userId}`);

    // --- Normalizar y Validar Destino ---
    let destinationParentId = null; // Representa la raíz en la BD
    if (destinationFolderId !== undefined && destinationFolderId !== null) {
      destinationParentId = parseInt(destinationFolderId, 10);
      console.log(`[moveFolder Debug] Normalized destinationParentId: ${destinationParentId}`); // Log añadido

      // *** Comprobar si el destino es la propia carpeta que se mueve ***
      if (folderToMoveId === destinationParentId) {
          console.warn(`[moveFolder Debug] ABORT: Cannot move folder into itself (ID: ${folderToMoveId}).`);
          return res.status(400).json({ message: "No puedes mover una carpeta dentro de sí misma." });
      }

      // Verificar que la carpeta destino existe y pertenece al usuario
      const destFolder = await Folder.findOne({ where: { id: destinationParentId, user_id: userId } }); // Usar columna DB 'user_id'
      // --- Log Dest Folder ---
      console.log(`[moveFolder Debug] Destination folder check result:`, destFolder ? `Found ID ${destFolder.id}` : 'Not Found');
      if (!destFolder) {
          console.warn(`[moveFolder Debug] ABORT: Destination folder ${destinationParentId} not found or invalid.`); // Log añadido
          return res.status(404).json({ message: "La carpeta de destino no existe o no te pertenece." });
      }

      // *** Comprobar si el destino es una subcarpeta de la carpeta que se mueve ***
      // (Esta es la lógica anti-recursividad)
      let currentParent = destFolder;
      while (currentParent) {
          // Usa el alias camelCase 'parentFolderId' definido en models/index.js para el modelo
          console.log(`[moveFolder Debug] Checking ancestor: currentParent.id=${currentParent.id}, currentParent.parentFolderId=${currentParent.parentFolderId}`);
          if (currentParent.id === folderToMoveId) {
               console.warn(`[moveFolder Debug] ABORT: Cannot move folder (ID: ${folderToMoveId}) into its own subfolder (ID: ${destinationParentId}).`);
               // ESTE ES PROBABLEMENTE EL ERROR QUE VES
               return res.status(400).json({ message: "No puedes mover una carpeta dentro de sí misma o a una de sus subcarpetas." });
          }
          if (!currentParent.parentFolderId) break; // Llegamos a la raíz
          // ¡OJO! Asume que parentFolderId es el alias correcto en tu modelo Folder
          currentParent = await Folder.findByPk(currentParent.parentFolderId);
      }
      console.log(`[moveFolder Debug] Recursive check passed.`); // Log añadido

    } else {
       console.log(`[moveFolder Debug] Destination is root (destinationParentId: ${destinationParentId})`); // Log añadido
    }
    // --- Fin Validación Destino ---


    // --- Encontrar Carpeta a Mover ---
    const folderToMove = await Folder.findOne({ where: { id: folderToMoveId, user_id: userId } }); // Usar columna DB 'user_id'
     // --- Log Folder Found ---
    console.log(`[moveFolder Debug] Folder to move check result:`, folderToMove ? `Found ID ${folderToMove.id}` : 'Not Found');
    if (!folderToMove) {
         console.warn(`[moveFolder Debug] ABORT: Folder to move ${folderToMoveId} not found or invalid.`); // Log añadido
        return res.status(404).json({ message: "Carpeta a mover no encontrada o no te pertenece." });
    }
     // Asegúrate que usas el alias correcto (parentFolderId vs parent_folder_id) del modelo
    console.log(`[moveFolder Debug] Current parentFolderId of folder: ${folderToMove.parentFolderId}`); // Log añadido


    // --- Comprobar si ya está en destino ---
    const currentParentId = folderToMove.parentFolderId ?? null; // Usar alias camelCase
    console.log(`[moveFolder Debug] Checking if already moved: current=${currentParentId}, destination=${destinationParentId}`); // Log añadido
    if (currentParentId === destinationParentId) {
        console.log(`[moveFolder Debug] SUCCESS (No change): Already in destination.`); // Log añadido
        return res.status(200).json({ message: "La carpeta ya está en la ubicación de destino.", folder: folderToMove });
    }


    // --- Comprobar conflicto de nombre en destino ---
    console.log(`[moveFolder Debug] Checking conflict for name: ${folderToMove.name} in destination parent_folder_id: ${destinationParentId}`); // Log añadido
    const conflict = await Folder.findOne({
        where: {
            name: folderToMove.name,
            user_id: userId, // Columna DB
            parent_folder_id: destinationParentId, // Columna DB (null para raíz)
            id: { [Op.ne]: folderToMoveId }, // Excluirse a sí misma
        },
         // paranoid: true es default, busca solo carpetas activas
    });
    // --- Log Conflict ---
    console.log(`[moveFolder Debug] Conflict check result:`, conflict ? `Conflict Found (ID ${conflict.id})` : 'No Conflict');
    if (conflict) {
        console.warn(`[moveFolder Debug] ABORT: Name conflict found with folder ID ${conflict.id}.`); // Log añadido
        return res.status(409).json({ message: `Ya existe una carpeta activa llamada "${folderToMove.name}" en la ubicación de destino.` });
    }


    // --- Mover ---
    console.log(`[moveFolder Debug] Attempting to set parentFolderId to ${destinationParentId} and save.`); // Log añadido
    // Asegúrate que usas el alias correcto (parentFolderId vs parent_folder_id) del modelo
    folderToMove.parentFolderId = destinationParentId; // Asignar nuevo ID de carpeta padre (o null para raíz)
    await folderToMove.save();
    console.log(`[moveFolder Debug] SUCCESS: Save completed.`); // Log añadido
    res.status(200).json({ message: "Carpeta movida con éxito.", folder: folderToMove });


  } catch (error) {
    console.error("[moveFolder Debug] ERROR during move operation:", error); // Log añadido
    // Manejo de error de constraint (si falla la comprobación por concurrencia)
    if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ message: `Conflicto DB: Ya existe una carpeta con ese nombre en la ubicación de destino.` });
    }
    // Error genérico
    res.status(500).json({ message: "Error interno al mover la carpeta." });
  }
};