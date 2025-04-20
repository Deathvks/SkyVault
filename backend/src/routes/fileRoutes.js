// backend/src/routes/fileRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require('fs'); // Importar fs
const { body, param } = require("express-validator");
const fileController = require("../controllers/fileController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// --- Configuración Multer ---

// Definir la ruta absoluta al directorio de subidas
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

// Asegurarse de que el directorio de subidas exista al iniciar
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`✅ Directorio de subidas creado en: ${UPLOADS_DIR}`);
  } else {
    console.log(`✅ Directorio de subidas ya existe en: ${UPLOADS_DIR}`);
  }
} catch (err) {
  console.error(`❌ Error al verificar/crear directorio de subidas (${UPLOADS_DIR}):`, err);
  // Considera detener la aplicación si el directorio es esencial y no se puede crear
  // process.exit(1);
}

// Configuración de almacenamiento en disco para Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

// Lista de tipos MIME permitidos (AJUSTA SEGÚN NECESITES)
const ALLOWED_MIME_TYPES = [
  // Imágenes
  "image/jpeg", // .jpg, .jpeg
  "image/png",  // .png
  "image/gif",  // .gif
  "image/webp", // .webp  <-- AÑADIDO
  "image/svg+xml", // .svg (Opcional)
  "image/avif", // .avif (Opcional, más moderno)

  // Documentos
  "application/pdf", // .pdf
  "text/plain", // .txt
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx

  // Comprimidos y otros
  "application/zip", // .zip
  "application/x-rar-compressed", // .rar
  "application/octet-stream", // Genérico, puede cubrir otros formatos no específicos
];

// Configuración de Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB (ajusta si es necesario)
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true); // Aceptar archivo
    } else {
      console.warn(`Archivo rechazado: ${file.originalname}, tipo MIME no permitido: ${file.mimetype}`);
      cb(
        new Error(
          "Tipo de archivo no permitido." // Mensaje más genérico para el usuario
          // Podrías añadir los tipos permitidos si quieres: + ALLOWED_MIME_TYPES.join(", ")
        ),
        false // Rechazar archivo
      );
    }
  },
});
// --- FIN Configuración Multer ---

// --- Reglas de Validación ---
const fileIdParamValidation = [
  param("fileId")
    .isInt({ min: 1 })
    .withMessage("ID de archivo inválido en URL."),
];
const renameFileValidation = [
  body("newName").trim().notEmpty().withMessage("Nuevo nombre requerido."),
];
const moveFileValidation = [
  body("destinationFolderId")
    .optional({ nullable: true })
    .custom((value) => {
        if (value === null || value === undefined) return true;
        if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error('ID de carpeta destino inválido (debe ser número positivo o nulo).');
        }
        return true;
    })
];
const uploadValidation = [
  body("folderId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ID de carpeta inválido en body."),
];
// --------------------------

// Aplicar protección a todas las rutas de este router
router.use(protect);

// POST /api/files/upload -> Subir Archivo
router.post(
  "/upload",
  (req, res, next) => {
      upload.single("file")(req, res, function (err) {
          if (err instanceof multer.MulterError) {
              console.error("Error de Multer:", err.message);
              return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
          } else if (err) {
              console.error("Error en filtro de archivo o destino:", err.message);
              return res.status(400).json({ message: err.message || "Error al procesar el archivo." });
          }
          next();
      });
  },
  uploadValidation,
  fileController.uploadFile
);

// GET /api/files/:fileId/download -> Descargar Archivo
router.get(
  "/:fileId/download",
  fileIdParamValidation,
  fileController.downloadFile
);

// GET /api/files/:fileId/view -> Visualizar Archivo (ej. imágenes)
router.get(
    "/:fileId/view",
    fileIdParamValidation,
    fileController.viewFile
);

// PUT /api/files/:fileId -> Renombrar Archivo
router.put(
  "/:fileId",
  fileIdParamValidation,
  renameFileValidation,
  fileController.renameFile
);

// PUT /api/files/:fileId/move -> Mover Archivo
router.put(
  "/:fileId/move",
  fileIdParamValidation,
  moveFileValidation,
  fileController.moveFile
);

// DELETE /api/files/:fileId -> Eliminar Archivo
router.delete(
    "/:fileId",
    fileIdParamValidation,
    fileController.deleteFile
);

module.exports = router;