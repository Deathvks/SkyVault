// backend/src/utils/deleteUtils.js
const fs = require("fs").promises;
const path = require("path");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database"); // Importa sequelize desde la config [cite: 1]
const File = require("../models/File"); // Importa el modelo File [cite: 13]
const Folder = require("../models/Folder"); // Importa el modelo Folder [cite: 12]
const User = require("../models/User"); // Importa el modelo User [cite: 10]

/**
 * Elimina permanentemente un item (archivo o carpeta) de la base de datos
 * y su contenido físico asociado (en caso de ser un archivo).
 * Actualiza la cuota del usuario si se elimina un archivo.
 * Debe ejecutarse dentro de una transacción de Sequelize.
 *
 * @param {Sequelize.Model} model El modelo Sequelize (File o Folder).
 * @param {number} itemId El ID del item a eliminar.
 * @param {number} userId El ID del usuario propietario.
 * @param {Sequelize.Transaction} transaction La transacción activa.
 * @returns {Promise<boolean>} True si se eliminó con éxito, False si no se encontró o no pertenecía al usuario.
 * @throws {Error} Si ocurre un error durante la eliminación física o de la base de datos.
 */
async function permanentlyDeleteItemAndContent(
  model,
  itemId,
  userId,
  transaction
) {
  // 1. Buscar el item en la papelera, asegurándose que pertenece al usuario
  const item = await model.findOne({
    where: {
      id: itemId,
      user_id: userId,
      deletedAt: { [Op.ne]: null }, // Asegurarse que está en la papelera (soft deleted)
    },
    paranoid: false, // Incluir los soft-deleted en la búsqueda
    transaction, // Ejecutar dentro de la transacción
  });

  // Si no se encuentra o no pertenece al usuario, no hacer nada y devolver false
  if (!item) {
    console.warn(
      `[DeleteUtil] Item ${model.name} ID ${itemId} no encontrado en papelera o no pertenece al usuario ${userId} para eliminación permanente.`
    );
    return false;
  }

  console.log(
    `[DeleteUtil] Iniciando eliminación permanente para ${model.name} ID ${itemId} del usuario ${userId}.`
  );

  // 2. Si es un Archivo, intentar eliminar el archivo físico y actualizar cuota
  if (model === File && item.storage_path) {
    // [cite: 13]
    // Construir la ruta absoluta al archivo físico
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      item.storage_path
    );
    try {
      console.log(
        `[DeleteUtil] Intentando eliminar archivo físico: ${filePath}`
      );
      await fs.unlink(filePath);
      console.log(
        `[DeleteUtil] Archivo físico eliminado con éxito: ${filePath}`
      );

      // --- ACTUALIZAR ESPACIO USADO POR EL USUARIO ---
      // --- ACTUALIZAR ESPACIO USADO POR EL USUARIO ---
      try {
        // <--- DENTRO DE ESTE TRY
        const user = await User.findByPk(userId, { transaction });
        if (user && item.size) {
          // ¡¡VOLVER A ESTO!!
          user.storage_used_bytes = Math.max(
            0,
            (user.storage_used_bytes || 0) - item.size
          );
          await user.save({ transaction }); // <-- El error podría estar aquí
          console.log(
            `[DeleteUtil] Espacio del usuario ${userId} actualizado (reducido en ${item.size} bytes).`
          );
        }
      } catch (userUpdateError) {
        // <--- EN ESTE CATCH
        console.error(
          `[DeleteUtil] Error al actualizar el espacio del usuario ${userId} tras eliminar archivo ID ${itemId}:`,
          userUpdateError
        );
        throw userUpdateError;
        // !!! AQUÍ FALTA ALGO IMPORTANTE !!!
        // Si la actualización del usuario falla, deberíamos probablemente
        // detener todo y revertir la transacción.
        // Por ahora, solo lo estamos registrando en la consola.
      }
      // --- FIN ACTUALIZAR ESPACIO ---
    } catch (err) {
      // Si el archivo no existe (ENOENT), lo ignoramos
      // pero continuamos para borrar el registro de la DB.
      // Si es otro error (ej. permisos), lanzamos para causar rollback.
      if (err.code !== "ENOENT") {
        console.error(
          `[DeleteUtil] Error CRÍTICO eliminando archivo físico ${filePath}:`,
          err
        );
        throw new Error(
          `Error al eliminar archivo físico ${item.storage_path} para ${model.name} ID ${itemId}.`
        ); // [cite: 13]
      } else {
        console.warn(
          `[DeleteUtil] Archivo físico no encontrado (${filePath}), pero se procederá a eliminar el registro de la DB.`
        );
      }
    }
  } else if (model === Folder) {
    // [cite: 12]
    // --- IMPORTANTE: Eliminación de contenido de Carpetas ---
    // Esta función *actualmente* solo borra el registro de la carpeta.
    // Para una eliminación completa y actualización de cuota, necesitarías implementar
    // lógica *recursiva* aquí que llame a `permanentlyDeleteItemAndContent`
    // para todos los archivos y subcarpetas *dentro* de esta carpeta.
    console.log(
      `[DeleteUtil] Procesando eliminación permanente de registro de Carpeta ID ${itemId}. La lógica de eliminación recursiva de contenido y actualización de cuota debe implementarse por separado.`
    ); // [cite: 12]
  }

  // 3. Eliminar el registro de la base de datos permanentemente (force: true)
  try {
    await item.destroy({ force: true, transaction });
    console.log(
      `[DeleteUtil] Registro ${model.name} ID ${itemId} eliminado permanentemente de la DB.`
    );
    return true; // Indicar éxito
  } catch (dbError) {
    console.error(
      `[DeleteUtil] Error CRÍTICO eliminando registro ${model.name} ID ${itemId} de la DB:`,
      dbError
    );
    throw new Error(
      `Error al eliminar registro ${model.name} ID ${itemId} de la base de datos.`
    ); // Lanzar para rollback
  }
}

// Exportar la función para que pueda ser usada por los controladores
module.exports = {
  permanentlyDeleteItemAndContent,
  // Puedes añadir aquí otras funciones de utilidad relacionadas si las necesitas
};
