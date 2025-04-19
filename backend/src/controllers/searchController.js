// backend/src/controllers/searchController.js
const { Folder, File } = require("../models");
const { Op } = require("sequelize"); // Importar Op para búsquedas LIKE
const { validationResult } = require("express-validator");

exports.searchItems = async (req, res) => {
  // --- Validar entrada ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { term } = req.query; // Obtener término de búsqueda de query params
    const userId = req.userId; // Obtenido del middleware protect

    // Buscar carpetas que coincidan para este usuario
    const foundFolders = await Folder.findAll({
      where: {
        user_id: userId,
        name: {
          [Op.like]: `%${term}%`, // Busca nombres que contengan el término
        },
      },
      order: [["name", "ASC"]], // Ordenar resultados
    });

    // Buscar archivos que coincidan para este usuario
    const foundFiles = await File.findAll({
      where: {
        user_id: userId,
        name: {
          [Op.like]: `%${term}%`, // Busca nombres que contengan el término
        },
      },
      order: [["name", "ASC"]], // Ordenar resultados
    });

    res.status(200).json({ folders: foundFolders, files: foundFiles });

  } catch (error) {
    console.error("Error en la búsqueda:", error);
    res.status(500).json({ message: "Error interno al realizar la búsqueda." });
  }
};