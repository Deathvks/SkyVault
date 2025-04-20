// backend/src/routes/searchRoutes.js
const express = require("express");
const { query } = require("express-validator"); // Usar query para validar query params
const searchController = require("../controllers/searchController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// --- Reglas de Validación para Búsqueda ---
const searchValidationRules = [
  query("term") // Validar el query parameter 'term'
    .trim()
    .notEmpty()
    .withMessage("El término de búsqueda no puede estar vacío.")
    .isLength({ min: 1 }) // Opcional: longitud mínima
    .withMessage("El término debe tener al menos 1 caracter."),
    // Puedes añadir .escape() si quieres sanear la entrada
];

// Proteger la ruta de búsqueda
router.use(protect);

// GET /api/search?term=miArchivo -> Realizar búsqueda
router.get("/", searchValidationRules, searchController.searchItems);

module.exports = router;