// backend/src/routes/userRoutes.js
const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit"); // <-- Importar rate-limit
const userController = require("../controllers/userController");

const router = express.Router();

// --- Rate Limiter para Autenticación ---
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // Límite de intentos
  message: {
    message:
      "Demasiados intentos de autenticación desde esta IP, por favor intenta más tarde.",
  }, // Enviar objeto JSON
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip, // Asegurar que usa IP
});
// ------------------------------------

// --- Reglas de Validación ---
const registerValidationRules = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username requerido.")
    .isLength({ min: 3 })
    .withMessage("Username min 3 chars.")
    .isAlphanumeric()
    .withMessage("Username solo letras/números."),
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
    .withMessage("Password min 6 chars."),
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
// --------------------------

// Ruta Registro: Aplicar limiter y validación
router.post(
  "/register",
  authLimiter, // Aplicar limiter específico
  registerValidationRules,
  userController.register
);

// Ruta Login: Aplicar limiter y validación
router.post(
  "/login",
  authLimiter, // Aplicar limiter específico
  loginValidationRules, // Aplicar reglas de login
  userController.login
);

module.exports = router;
