// backend/src/utils/deleteUtils.js
const fsPromises = require("fs").promises;
const { Folder, File } = require("../models"); // Asegúrate que la ruta sea correcta

/**
 * Elimina recursivamente los archivos físicos dentro de una carpeta y sus subcarpetas.
 * @param {number} folderId - ID de la carpeta a limpiar.
 * @param {number} userId - ID del usuario propietario.
 */
const deletePhysicalFilesRecursive = async (folderId, userId) => {
  // Encuentra archivos directamente en esta carpeta (incluyendo borrados por si acaso)
  const filesToDelete = await File.findAll({
    where: { folder_id: folderId, user_id: userId },
    paranoid: false, // Incluir archivos ya borrados suavemente por si acaso
  });

  for (const file of filesToDelete) {
    try {
      if (file.storage_path) {
        await fsPromises.unlink(file.storage_path);
        console.log(
          `[Util] Archivo físico permanente eliminado: ${file.storage_path}`
        );
      }
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") {
        // Ignorar si no existe
        console.error(
          `[Util] Error eliminando archivo físico ${file.storage_path}:`,
          unlinkError
        );
      }
    }
  }

  // Encuentra subcarpetas (incluyendo borradas por si acaso)
  const subFolders = await Folder.findAll({
    where: { parent_folder_id: folderId, user_id: userId },
    paranoid: false,
  });

  // Llamada recursiva para cada subcarpeta
  for (const subFolder of subFolders) {
    await deletePhysicalFilesRecursive(subFolder.id, userId);
  }
};

/**
 * Elimina permanentemente un item (Archivo o Carpeta) y su contenido físico si aplica.
 * @param {Sequelize.Model} model - El modelo de Sequelize (File o Folder).
 * @param {number} itemId - ID del item a eliminar.
 * @param {number} userId - ID del usuario (para verificación y borrado físico recursivo).
 * @returns {Promise<boolean>} - True si se eliminó, false si no se encontró o no pertenecía.
 * @throws {Error} - Si ocurre un error durante la eliminación.
 */
const permanentlyDeleteItemAndContent = async (model, itemId, userId) => {
  // Encontrar el item (incluso si ya está borrado suavemente)
  const item = await model.findByPk(itemId, { paranoid: false });

  // Verificar si existe y pertenece al usuario
  if (!item || item.user_id !== userId) {
    console.warn(
      `[Util] Item ${model.name} ID:${itemId} no encontrado o no pertenece al usuario ${userId} para eliminación permanente.`
    );
    return false; // No encontrado o no autorizado
  }

  const itemName = item.name; // Guardar nombre para logs

  console.log(
    `[Util] Iniciando eliminación permanente de ${model.name}: ${itemName} (ID: ${itemId})`
  );

  try {
    // Si es una carpeta, eliminar contenido físico recursivamente PRIMERO
    if (model === Folder) {
      await deletePhysicalFilesRecursive(itemId, userId);
    } else if (model === File && item.storage_path) {
      // Si es un archivo, eliminar su archivo físico
      try {
        await fsPromises.unlink(item.storage_path);
        console.log(
          `[Util] Archivo físico permanente eliminado: ${item.storage_path}`
        );
      } catch (unlinkError) {
        if (unlinkError.code !== "ENOENT") {
          console.error(
            `[Util] Error eliminando archivo físico ${item.storage_path}:`,
            unlinkError
          );
          // Considerar si lanzar el error o solo loguearlo
        }
      }
    }

    // Finalmente, eliminar el registro de la base de datos (y cascada si es carpeta)
    await item.destroy({ force: true });
    console.log(
      `[Util] Registro de ${model.name}: ${itemName} (ID: ${itemId}) eliminado de la BD.`
    );
    return true;
  } catch (dbError) {
    console.error(
      `[Util] Error de BD eliminando permanentemente ${model.name} ID:${itemId}:`,
      dbError
    );
    throw dbError; // Re-lanzar para manejo superior
  }
};

module.exports = {
  permanentlyDeleteItemAndContent,
};
