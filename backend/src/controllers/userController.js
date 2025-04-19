// backend/src/controllers/userController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { validationResult } = require("express-validator"); // Asegúrate que esté importado

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
  // --- COMPROBAR ERRORES DE VALIDACIÓN PRIMERO ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Si hay errores, devolver 400 con los errores
    return res.status(400).json({ errors: errors.array() });
  }
  // ---------------------------------------------

  try {
    // Ya no necesitamos la validación básica de !username || !email || !password
    // porque express-validator ya lo cubre con notEmpty()
    const { username, email, password } = req.body;

    // Verificar si el email ya existe (mantenemos esta lógica)
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: "El email ya está registrado." });
    }

    // Verificar si el username ya existe (mantenemos esta lógica)
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res
        .status(409)
        .json({ message: "El nombre de usuario ya está en uso." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      username, // Ya está trim() por la validación/sanitización
      email, // Ya está normalizeEmail()
      password_hash: hashedPassword,
    });

    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    res
      .status(201)
      .json({ message: "Usuario registrado con éxito.", user: userResponse });
  } catch (error) {
    console.error("Error en el registro:", error);

    // El error de constraint único no debería ocurrir si las búsquedas previas funcionan,
    // pero lo dejamos por seguridad.
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Error: El email o el nombre de usuario ya existen.",
      });
    }

    res
      .status(500)
      .json({ message: "Error interno del servidor al registrar el usuario." });
  }
};

exports.login = async (req, res) => {
  // --- AÑADIDO: COMPROBAR VALIDACIÓN ---
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Errores de validación para email o password del body
    return res.status(400).json({ errors: errors.array() });
  }
  // ------------------------------------

  try {
    // Ya no necesitamos la comprobación manual !email || !password
    // const { email, password } = req.body;
    // Los obtenemos directamente del body (email ya viene normalizado por la regla)
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Respuesta genérica
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Respuesta genérica
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    const payload = {
      userId: user.id,
      username: user.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login exitoso.", token });
  } catch (error) {
    console.error("Error en el login:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor durante el login." });
  }
};
