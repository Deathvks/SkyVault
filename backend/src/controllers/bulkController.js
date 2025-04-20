// backend/src/controllers/bulkController.js
const { Folder, File, sequelize } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");

/**
 * Mueve múltiples carpetas y/o archivos a una nueva carpeta destino.
 */
exports.bulkMove = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.userId;
  // items: Array de { type: 'folder' | 'file', id: number }
  // destinationFolderId: string | null (viene del JSON, puede ser string si es ID)
  const { items, destinationFolderId: rawDestinationFolderId } = req.body;

  console.log(
    `[API Bulk Move] Solicitud de movimiento múltiple para usuario ${userId}, items: ${items.length}, destino recibido: ${rawDestinationFolderId}`
  );

  let movedCount = 0;
  const errorsList = [];
  const processedIds = { folder: new Set(), file: new Set() }; // Para evitar procesar duplicados

  // Iniciar transacción
  const transaction = await sequelize.transaction();

  try {
    // 1. Determinar y Validar Carpeta Destino
    let destinationParentId = null; // ID real para la BD, null por defecto (raíz)

    // CORRECCIÓN: Convertir a número solo si no es null. La validación ya aseguró que es un string numérico >= 1 si no es null.
    if (rawDestinationFolderId !== null) {
      destinationParentId = parseInt(rawDestinationFolderId, 10);
      // Comprobar si el parseo falló (aunque la validación debería prevenirlo)
      if (isNaN(destinationParentId)) {
        await transaction.rollback();
        console.error(
          `[API Bulk Move] Error interno: destinationFolderId recibido como '${rawDestinationFolderId}' no es un número válido tras validación.`
        );
        return res.status(400).json({ message: "ID de destino inválido." });
      }

      // Validar existencia de la carpeta destino
      const destFolder = await Folder.findOne({
        where: { id: destinationParentId, user_id: userId },
        transaction, // Usar transacción para lectura consistente
        attributes: ["id"], // Solo necesitamos saber si existe
      });
      if (!destFolder) {
        await transaction.rollback();
        console.warn(
          `[API Bulk Move] Carpeta destino ID ${destinationParentId} no encontrada para usuario ${userId}.`
        );
        return res.status(404).json({
          message: "La carpeta de destino no existe o no te pertenece.",
        });
      }
    }
    // Si rawDestinationFolderId era null, destinationParentId se queda como null (representa la raíz)

    console.log(
      `[API Bulk Move] ID de destino procesado: ${destinationParentId}`
    );

    // 2. Procesar cada item
    for (const itemInfo of items) {
      const { type, id } = itemInfo;
      const model = type === "folder" ? Folder : File;
      const idSet = processedIds[type];

      // Evitar procesar duplicados en la petición
      if (idSet.has(id)) {
        console.log(
          `[API Bulk Move] Saltando item duplicado: ${type} ID ${id}`
        );
        continue;
      }

      // Buscar el item (ACTIVO y perteneciente al usuario)
      const item = await model.findOne({
        where: { id: id, user_id: userId }, // paranoid: true es default
        transaction,
      });

      if (!item) {
        errorsList.push({ id, type, error: "No encontrado o sin permisos." });
        console.warn(
          `[API Bulk Move] Item ${type} ID ${id} no encontrado/sin permisos.`
        );
        continue; // Pasar al siguiente item
      }

      // --- Validaciones Específicas ---
      const currentParentId =
        (type === "folder" ? item.parent_folder_id : item.folder_id) ?? null;

      // a) Mover a la misma carpeta?
      if (currentParentId === destinationParentId) {
        // No es un error, simplemente no hacemos nada y contamos como "movido" (ya está ahí)
        movedCount++;
        idSet.add(id);
        console.log(
          `[API Bulk Move] Item ${type} ID ${id} ya está en destino.`
        );
        continue;
      }

      // b) Conflicto de Nombre en Destino?
      const conflictCheckCondition = {
        user_id: userId,
        name: item.name,
        id: { [Op.ne]: id }, // Excluirse a sí mismo
      };
      if (type === "folder") {
        conflictCheckCondition.parent_folder_id = destinationParentId;
      } else {
        conflictCheckCondition.folder_id = destinationParentId;
      }
      const conflictingItem = await model.findOne({
        where: conflictCheckCondition,
        transaction,
        attributes: ["id"],
      });

      if (conflictingItem) {
        errorsList.push({
          id,
          type,
          error: `Ya existe un ${type} llamado "${item.name}" en el destino.`,
        });
        console.warn(
          `[API Bulk Move] Conflicto de nombre para ${type} ID ${id} en destino ${destinationParentId}.`
        );
        continue;
      }

      // c) Mover Carpeta dentro de sí misma o descendiente?
      if (type === "folder" && destinationParentId !== null) {
        if (item.id === destinationParentId) {
          errorsList.push({
            id,
            type,
            error: "No se puede mover una carpeta dentro de sí misma.",
          });
          console.warn(
            `[API Bulk Move] Intento de mover carpeta ID ${id} dentro de sí misma.`
          );
          continue;
        }
        // Chequeo de descendencia (simplificado, un chequeo más robusto podría ser necesario)
        let currentAncestorId = destinationParentId;
        let isDescendant = false;
        while (currentAncestorId !== null) {
          if (currentAncestorId === item.id) {
            isDescendant = true;
            break;
          }
          const ancestor = await Folder.findOne({
            attributes: ["parent_folder_id"],
            where: { id: currentAncestorId, user_id: userId },
            transaction,
            paranoid: true, // Solo ancestros activos
          });
          // Si el ancestro no existe o no pertenece al usuario, paramos la búsqueda
          if (!ancestor) break;
          currentAncestorId = ancestor.parent_folder_id;
        }
        if (isDescendant) {
          errorsList.push({
            id,
            type,
            error: "No se puede mover una carpeta a una de sus subcarpetas.",
          });
          console.warn(
            `[API Bulk Move] Intento de mover carpeta ID ${id} a una subcarpeta.`
          );
          continue;
        }
      }

      // --- Actualizar Parent ID ---
      if (type === "folder") {
        item.parent_folder_id = destinationParentId;
      } else {
        item.folder_id = destinationParentId;
      }
      await item.save({ transaction });
      movedCount++;
      idSet.add(id);
      console.log(
        `[API Bulk Move] Item ${type} ID ${id} movido a destino ${destinationParentId}.`
      );
    } // Fin del bucle for

    // Si no hubo errores irrecuperables (como destino inválido), confirmar transacción
    await transaction.commit();
    console.log(
      `[API Bulk Move] Transacción confirmada. Movidos: ${movedCount}, Errores parciales: ${errorsList.length}`
    );

    const finalStatus = errorsList.length === 0 ? 200 : 207; // 207 Multi-Status si hubo errores
    const baseMessage = `${movedCount} elemento(s) movido(s) con éxito.`;
    const errorMessage =
      errorsList.length > 0
        ? ` ${errorsList.length} elemento(s) no se pudieron mover.`
        : "";

    res.status(finalStatus).json({
      message: `${baseMessage}${errorMessage}`,
      // Solo incluir clave 'errors' si hubo errores
      ...(errorsList.length > 0 && { errors: errorsList }),
    });
  } catch (error) {
    // Error inesperado durante el proceso, revertir transacción
    // Asegurarse que la transacción no esté ya finalizada
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      console.log("[API Bulk Move] Rollback ejecutado por error general.");
    }
    console.error(`[API Bulk Move] Error general:`, error);
    res.status(500).json({
      message: "Error interno del servidor durante el movimiento múltiple.",
    });
  }
};
