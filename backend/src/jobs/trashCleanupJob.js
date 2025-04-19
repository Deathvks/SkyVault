// backend/src/jobs/trashCleanupJob.js
const cron = require("node-cron");
const { Folder, File } = require("../models"); // Ajusta la ruta según sea necesario
const { Op } = require("sequelize");
const { permanentlyDeleteItemAndContent } = require("../utils/deleteUtils"); // Importa la utilidad

const PURGE_AFTER_HOURS = 24; // Configura el tiempo aquí (24 horas)

/**
 * Busca y elimina permanentemente los items de la papelera que superen la antigüedad definida.
 */
const purgeOldTrashItems = async () => {
  console.log(
    `[Cron Job] Iniciando limpieza de papelera... (Antigüedad > ${PURGE_AFTER_HOURS}h)`
  );
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - PURGE_AFTER_HOURS);

  try {
    // Buscar items borrados suavemente y más viejos que la fecha de corte
    const findOptions = {
      where: {
        deletedAt: {
          [Op.ne]: null, // Que tengan fecha de borrado
          [Op.lt]: cutoffDate, // Y que sea anterior a la fecha de corte
        },
      },
      paranoid: false, // MUY IMPORTANTE: para encontrar los items borrados suavemente
      attributes: ["id", "user_id", "name"], // Solo necesitamos el ID y user_id para borrar
      limit: 100, // Opcional: Limitar el número de items por ejecución para evitar sobrecarga
    };

    const oldFolders = await Folder.findAll(findOptions);
    const oldFiles = await File.findAll(findOptions);

    if (oldFolders.length === 0 && oldFiles.length === 0) {
      console.log(
        "[Cron Job] No hay items antiguos en la papelera para purgar."
      );
      return;
    }

    console.log(
      `[Cron Job] Encontrados ${oldFolders.length} carpetas y ${oldFiles.length} archivos para purgar.`
    );

    // Eliminar permanentemente (usando la utilidad)
    let foldersPurged = 0;
    for (const folder of oldFolders) {
      try {
        const deleted = await permanentlyDeleteItemAndContent(
          Folder,
          folder.id,
          folder.user_id
        );
        if (deleted) foldersPurged++;
      } catch (error) {
        console.error(
          `[Cron Job] Error purgando carpeta ID ${folder.id}:`,
          error
        );
        // Continuar con el siguiente item
      }
    }

    let filesPurged = 0;
    for (const file of oldFiles) {
      try {
        const deleted = await permanentlyDeleteItemAndContent(
          File,
          file.id,
          file.user_id
        );
        if (deleted) filesPurged++;
      } catch (error) {
        console.error(
          `[Cron Job] Error purgando archivo ID ${file.id}:`,
          error
        );
        // Continuar con el siguiente item
      }
    }

    console.log(
      `[Cron Job] Finalizado. Carpetas purgadas: ${foldersPurged}. Archivos purgados: ${filesPurged}.`
    );
  } catch (error) {
    console.error(
      "[Cron Job] Error general durante la ejecución de limpieza de papelera:",
      error
    );
  }
};

/**
 * Inicia la tarea programada para limpiar la papelera.
 */
const scheduleTrashCleanup = () => {
  // Programar para ejecutarse una vez al día a las 3:00 AM (ajusta la hora como prefieras)
  // Formato cron: minuto hora dia-mes mes dia-semana
  // '0 3 * * *' = Todos los días a las 3:00 AM
  cron.schedule(
    "0 3 * * *",
    () => {
      console.log(
        "[Cron Job] Ejecutando tarea programada de limpieza de papelera..."
      );
      purgeOldTrashItems();
    },
    {
      scheduled: true,
      timezone: "Europe/Madrid", // O la zona horaria de tu servidor/preferencia
    }
  );

  console.log(
    `[Scheduler] Tarea de limpieza de papelera programada para ejecutarse diariamente a las 3:00 AM (Europe/Madrid).`
  );

  // Opcional: Ejecutar una vez al iniciar para pruebas (comentar en producción)
  // console.log('[Scheduler] Ejecutando limpieza inicial de papelera...');
  // purgeOldTrashItems();
};

module.exports = {
  scheduleTrashCleanup,
  purgeOldTrashItems, // Exportar por si se quiere llamar manualmente
};
