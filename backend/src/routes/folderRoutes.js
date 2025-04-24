// backend/src/routes/folderRoutes.js
const express = require("express");
const { body, param } = require("express-validator");
const folderController = require("../controllers/folderController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect); // Proteger todas

// --- Reglas de Validación ---
const folderIdParamValidation = [
  param("folderId")
    .isInt({ min: 1 })
    .withMessage("ID de carpeta inválido en URL."),
];
const folderIdOrRootParamValidation = [
  param("folderId").custom((value) => {
    if (value === "root") return true;
    const isInt = Number.isInteger(Number(value)) && Number(value) > 0;
    if (!isInt)
      throw new Error(
        "ID de carpeta inválido en URL (debe ser positivo o 'root')."
      );
    return true;
  }),
];
const createFolderValidation = [
  body("name").trim().notEmpty().withMessage("Nombre de carpeta requerido."),
  body("parentFolderId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ID de carpeta padre inválido."),
];
const renameFolderValidation = [
  body("newName").trim().notEmpty().withMessage("Nuevo nombre requerido."),
];
const moveFolderValidation = [
  body("destinationFolderId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ID de carpeta destino inválido."),
];
// --------------------------

// --- NUEVA RUTA ---
// GET /api/folders/tree -> Obtener estructura de carpetas
router.get(
  "/tree",
  // No necesita validación específica aquí, usa el userId del token
  folderController.getFolderTree
);
// -----------------

// POST /api/folders/ -> Crear
router.post("/", createFolderValidation, folderController.createFolder);

// GET /api/folders/contents/:folderId -> Obtener contenido
router.get(
  "/contents/:folderId",
  folderIdOrRootParamValidation,
  folderController.getFolderContents
);

// PUT /api/folders/:folderId -> Renombrar
router.put(
  "/:folderId",
  folderIdParamValidation,
  renameFolderValidation,
  folderController.renameFolder
);

router.put(
  "/:folderId/move",
  folderIdParamValidation, // Middleware de validación 1
  moveFolderValidation,    // Middleware de validación 2

  // --- AÑADIR ESTE MIDDLEWARE DE LOG ---
  (req, res, next) => {
    console.log(`\n--- [folderRoutes LOG] Ruta /:folderId/move alcanzada ---`);
    console.log(`       folderId Param: ${req.params.folderId}`); // ID de la carpeta a mover
    console.log(`       req.body (destino):`, req.body);        // Debería contener { destinationFolderId: ID_o_null }
    console.log(`       userId Autenticado: ${req.userId}`);     // ID del usuario desde middleware 'protect' (asegúrate que 'protect' está antes si es necesario)
    console.log(`---------------------------------------------------\n`);
    next(); // MUY IMPORTANTE: Pasar al siguiente manejador (folderController.moveFolder)
  },
  // --- FIN MIDDLEWARE DE LOG ---

  folderController.moveFolder // El controlador que debería ejecutarse después del log
);

// DELETE /api/folders/:folderId -> Eliminar
router.delete(
  "/:folderId",
  folderIdParamValidation,
  folderController.deleteFolder
);

module.exports = router;
