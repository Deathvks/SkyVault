// backend/src/routes/userRoutes.js
const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware"); // Importar protect

const router = express.Router();

// --- Rate Limiter para Autenticación ---
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // Límite de intentos
  message: {
    message:
      "Demasiados intentos de autenticación desde esta IP, por favor intenta más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip,
});
// --- Fin Rate Limiter ---

// --- Reglas de Validación ---
const registerValidationRules = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username requerido.")
    .isLength({ min: 3 })
    .withMessage("Username debe tener al menos 3 caracteres.")
    .isAlphanumeric()
    .withMessage("Username solo puede contener letras y números."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email requerido.")
    .isEmail()
    .withMessage("Email inválido.")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password requerido.")
    .isLength({ min: 6 })
    .withMessage("Password debe tener al menos 6 caracteres."),
];

const loginValidationRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email requerido.")
    .isEmail()
    .withMessage("Email inválido.")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password requerido."),
];

// --- NUEVAS REGLAS DE VALIDACIÓN PARA PERFIL ---
const updateProfileValidationRules = [
  // El username es opcional, pero si se envía, debe ser válido
  body("username")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Username no puede estar vacío si se modifica.")
    .isLength({ min: 3 })
    .withMessage("Username debe tener al menos 3 caracteres.")
    .isAlphanumeric()
    .withMessage("Username solo puede contener letras y números."),
  // El email es opcional, pero si se envía, debe ser válido
  body("email")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Email no puede estar vacío si se modifica.")
    .isEmail()
    .withMessage("Email inválido.")
    .normalizeEmail(),
];

const changePasswordValidationRules = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Contraseña actual requerida."),
  body("newPassword")
    .notEmpty()
    .withMessage("Nueva contraseña requerida.")
    .isLength({ min: 6 })
    .withMessage("La nueva contraseña debe tener al menos 6 caracteres."),
];
// --- FIN NUEVAS REGLAS ---

// --- Rutas Públicas ---
router.post(
  "/register",
  authLimiter,
  registerValidationRules,
  userController.register
);
router.post("/login", authLimiter, loginValidationRules, userController.login);

// --- NUEVAS RUTAS PROTEGIDAS ---
// Todas las rutas de perfil requieren autenticación
router.use(protect); // Aplicar middleware protect a las siguientes rutas

// GET /api/users/profile - Obtener perfil del usuario actual
router.get("/profile", userController.getProfile);

// PUT /api/users/profile - Actualizar perfil (email/username)
router.put(
  "/profile",
  updateProfileValidationRules,
  userController.updateProfile
);

// PUT /api/users/password - Cambiar contraseña
router.put(
  "/password",
  changePasswordValidationRules,
  userController.changePassword
);
// --- FIN NUEVAS RUTAS ---

module.exports = router;
