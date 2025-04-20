// backend/src/routes/bulkRoutes.js
const express = require("express");
const { body } = require("express-validator");
const trashController = require("../controllers/trashController"); // Mantenemos para /trash
const bulkController = require("../controllers/bulkController"); // <--- Nuevo controlador
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Proteger todas las rutas masivas
router.use(protect);

// --- Reglas de Validación para Borrado Múltiple ---
const bulkTrashValidationRules = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Se requiere un array de 'items' con al menos un elemento."),
  body("items.*.type") // Validar cada 'type' dentro del array
    .isIn(["folder", "file"])
    .withMessage("Cada item debe tener un 'type' válido ('folder' o 'file')."),
  body("items.*.id") // Validar cada 'id' dentro del array
    .isInt({ min: 1 })
    .withMessage("Cada item debe tener un 'id' numérico positivo."),
];

// --- NUEVAS Reglas de Validación para Movimiento Múltiple ---
const bulkMoveValidationRules = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Se requiere un array de 'items' con al menos un elemento."),
  body("items.*.type")
    .isIn(["folder", "file"])
    .withMessage("Cada item debe tener un 'type' válido ('folder' o 'file')."),
  body("items.*.id")
    .isInt({ min: 1 })
    .withMessage("Cada item debe tener un 'id' numérico positivo."),
  body("destinationFolderId").custom((value) => {
    // Permite null (para la raíz) o un entero positivo
    // La validación custom ya asegura que si no es null, es un número >= 1
    if (
      value === null ||
      (Number.isInteger(Number(value)) && Number(value) >= 1)
    ) {
      return true;
    }
    throw new Error(
      "destinationFolderId debe ser null o un ID numérico positivo."
    );
  }),
  // .toInt() // <-- ELIMINADO: No convertir null a NaN
];
// --- FIN NUEVAS Reglas ---

// POST /api/bulk/trash - Mover múltiples items a la papelera
router.post(
  "/trash",
  bulkTrashValidationRules,
  trashController.bulkMoveToTrash // Usar la función del controlador de papelera
);

// --- NUEVA RUTA ---
// POST /api/bulk/move - Mover múltiples items a una carpeta
router.post(
  "/move",
  bulkMoveValidationRules,
  bulkController.bulkMove // Usar la nueva función del controlador masivo
);
// --- FIN NUEVA RUTA ---

module.exports = router;
