// Dentro de backend/src/utils/deleteUtils.js
const fsPromises = require("fs").promises;
const { Folder, File, User, sequelize } = require("../models"); // <-- Importar User y sequelize
const { Op } = require("sequelize"); // <-- Importar Op si es necesario para calcular tamaño

/**
 * Calcula el tamaño total de los archivos dentro de una carpeta y sus subcarpetas.
 * @param {number} folderId - ID de la carpeta raíz.
 * @param {number} userId - ID del usuario propietario.
 * @param {Sequelize.Transaction} transaction - La transacción Sequelize.
 * @returns {Promise<number>} - Tamaño total en bytes.
 */
const calculateFolderSizeRecursive = async (folderId, userId, transaction) => {
  let totalSize = 0;

  // Sumar tamaño de archivos en la carpeta actual
  const filesSize = await File.sum("size", {
    where: { folder_id: folderId, user_id: userId },
    transaction,
    paranoid: false, // Incluir archivos soft-deleted por si acaso al calcular tamaño a liberar
  });
  totalSize += filesSize || 0;

  // Encontrar subcarpetas
  const subFolders = await Folder.findAll({
    where: { parent_folder_id: folderId, user_id: userId },
    attributes: ["id"],
    transaction,
    paranoid: false, // Incluir carpetas soft-deleted
  });

  // Sumar recursivamente el tamaño de las subcarpetas
  for (const subFolder of subFolders) {
    totalSize += await calculateFolderSizeRecursive(
      subFolder.id,
      userId,
      transaction
    );
  }

  return totalSize;
};

// Modificar deletePhysicalFilesRecursive para aceptar transacción (aunque no la use directamente para fs)
const deletePhysicalFilesRecursive = async (
  folderId,
  userId /*, transaction - no necesaria aquí */
) => {
  // ... (lógica existente para borrar archivos físicos con fsPromises.unlink)
  // Esta parte no necesita la transacción de BD directamente.
  // Encuentra archivos directamente en esta carpeta (incluyendo borrados por si acaso)
  const filesToDelete = await File.findAll({
    where: { folder_id: folderId, user_id: userId },
    paranoid: false, // Incluir archivos ya borrados suavemente por si acaso
    // transaction: transaction // No es necesario para buscar paths
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
    attributes: ["id"], // Solo necesitamos el id
    // transaction: transaction // No es necesario para la recursión física
  });

  // Llamada recursiva para cada subcarpeta
  for (const subFolder of subFolders) {
    await deletePhysicalFilesRecursive(subFolder.id, userId);
  }
};

/**
 * Elimina permanentemente un item (Archivo o Carpeta) y su contenido físico si aplica.
 * Actualiza el espacio usado por el usuario. ¡Debe llamarse DENTRO de una transacción!
 * @param {Sequelize.Model} model - El modelo de Sequelize (File o Folder).
 * @param {number} itemId - ID del item a eliminar.
 * @param {number} userId - ID del usuario (para verificación y borrado físico recursivo).
 * @param {Sequelize.Transaction} transaction - La transacción Sequelize activa.
 * @returns {Promise<boolean>} - True si se eliminó, false si no se encontró o no pertenecía.
 * @throws {Error} - Si ocurre un error durante la eliminación.
 */
const permanentlyDeleteItemAndContent = async (
  model,
  itemId,
  userId,
  transaction
) => {
  // Encontrar el item (incluso si ya está borrado suavemente) DENTRO de la transacción
  const item = await model.findByPk(itemId, { paranoid: false, transaction });

  // Verificar si existe y pertenece al usuario
  if (!item || item.user_id !== userId) {
    console.warn(
      `[Util] Item ${model.name} ID:${itemId} no encontrado o no pertenece al usuario ${userId} para eliminación permanente.`
    );
    return false; // No encontrado o no autorizado
  }

  const itemName = item.name; // Guardar nombre para logs
  let sizeToFree = 0;

  console.log(
    `[Util] Iniciando eliminación permanente de ${model.name}: ${itemName} (ID: ${itemId})`
  );

  try {
    // --- Calcular tamaño a liberar y borrar físico ANTES de borrar registro ---
    if (model === Folder) {
      sizeToFree = await calculateFolderSizeRecursive(
        itemId,
        userId,
        transaction
      ); // <-- Calcular tamaño
      await deletePhysicalFilesRecursive(itemId, userId); // Borrar físico (no necesita tx)
    } else if (model === File) {
      sizeToFree = item.size || 0; // <-- Usar tamaño del archivo
      if (item.storage_path) {
        try {
          await fsPromises.unlink(item.storage_path);
          console.log(
            `[Util] Archivo físico permanente eliminado: ${item.storage_path}`
          );
        } catch (unlinkError) {
          if (unlinkError.code !== "ENOENT") {
            console.error(/*...*/);
          }
        }
      }
    }

    // --- Borrar el registro de la BD (y cascada si es carpeta) ---
    await item.destroy({ force: true, transaction }); // <-- Forzar borrado y usar transacción
    console.log(
      `[Util] Registro de ${model.name}: ${itemName} (ID: ${itemId}) eliminado de la BD.`
    );

    // --- Actualizar uso del usuario SI liberamos espacio ---
    if (sizeToFree > 0) {
      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE, // Bloquear fila para evitar condiciones de carrera
      });
      if (user) {
        user.storage_used_bytes = Math.max(
          0,
          user.storage_used_bytes - sizeToFree
        ); // Asegurar que no sea negativo
        await user.save({ transaction }); // Guardar dentro de la transacción
        console.log(
          `[Util] Uso de almacenamiento actualizado para usuario ${userId}. Liberado: ${sizeToFree} bytes.`
        );
      } else {
        console.warn(
          `[Util] Usuario ${userId} no encontrado para actualizar uso tras borrado.`
        );
        // Considerar si lanzar un error aquí para revertir la transacción si el usuario DEBERÍA existir
      }
    }
    // Si todo va bien, la transacción se confirmará fuera de esta función.
    return true;
  } catch (dbError) {
    console.error(
      `[Util] Error durante eliminación permanente de ${model.name} ID:${itemId}:`,
      dbError
    );
    // No hacemos rollback aquí, se hará fuera si es necesario.
    throw dbError; // Re-lanzar para manejo superior (importante para rollback)
  }
};

module.exports = {
  permanentlyDeleteItemAndContent,
  // calculateFolderSizeRecursive, // Exportar si se necesita en otro lugar
};
