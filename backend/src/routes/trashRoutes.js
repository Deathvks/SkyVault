// backend/src/routes/trashRoutes.js
const express = require("express");
const { param } = require("express-validator");
const trashController = require("../controllers/trashController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Proteger todas las rutas de la papelera
router.use(protect);

// --- Reglas de Validación ---
const folderIdParamValidation = [
  param("folderId")
    .isInt({ min: 1 })
    .withMessage("ID de carpeta inválido en URL."),
];
const fileIdParamValidation = [
  param("fileId")
    .isInt({ min: 1 })
    .withMessage("ID de archivo inválido en URL."),
];
// --------------------------

// GET /api/trash - Obtener contenido de la papelera
router.get("/", trashController.getTrashContents);

// PUT /api/trash/folders/:folderId/restore - Restaurar carpeta
router.put(
  "/folders/:folderId/restore",
  folderIdParamValidation,
  trashController.restoreFolder
);

// PUT /api/trash/files/:fileId/restore - Restaurar archivo
router.put(
  "/files/:fileId/restore",
  fileIdParamValidation,
  trashController.restoreFile
);

// DELETE /api/trash/folders/:folderId/permanent - Eliminar carpeta permanentemente
router.delete(
  "/folders/:folderId/permanent",
  folderIdParamValidation,
  trashController.permanentlyDeleteFolder
);

// DELETE /api/trash/files/:fileId/permanent - Eliminar archivo permanentemente
router.delete(
  "/files/:fileId/permanent",
  fileIdParamValidation,
  trashController.permanentlyDeleteFile
);

module.exports = router;
