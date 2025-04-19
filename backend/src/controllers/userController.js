// backend/src/controllers/userController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize"); // Importar Op

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
  // ... (código existente de register sin cambios) ...
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password } = req.body;

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: "El email ya está registrado." });
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res
        .status(409)
        .json({ message: "El nombre de usuario ya está en uso." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      username,
      email,
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
  // ... (código existente de login sin cambios) ...
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas." });
    }

    const payload = {
      userId: user.id,
      username: user.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h", // O el tiempo que prefieras
    });

    res.status(200).json({ message: "Login exitoso.", token });
  } catch (error) {
    console.error("Error en el login:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor durante el login." });
  }
};

// --- NUEVA FUNCIÓN: Obtener Perfil ---
exports.getProfile = async (req, res) => {
  try {
    // El ID del usuario viene del middleware 'protect'
    const userId = req.userId;
    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email", "createdAt", "updatedAt"], // Excluir password_hash
    });

    if (!user) {
      // Esto no debería pasar si el token es válido, pero por seguridad
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error interno al obtener el perfil." });
  }
};

// --- NUEVA FUNCIÓN: Actualizar Perfil ---
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.userId;
    const { username, email } = req.body; // Solo estos campos se permiten actualizar aquí

    // No se puede actualizar a un objeto vacío
    if (!username && !email) {
      return res
        .status(400)
        .json({
          message:
            "Debe proporcionar al menos un campo (username o email) para actualizar.",
        });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const updateData = {};

    // Verificar si el nuevo username ya está en uso por OTRO usuario
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({
        where: {
          username,
          id: { [Op.ne]: userId }, // Op.ne significa "not equal"
        },
      });
      if (existingUsername) {
        return res
          .status(409)
          .json({ message: "El nombre de usuario ya está en uso." });
      }
      updateData.username = username;
    }

    // Verificar si el nuevo email ya está en uso por OTRO usuario
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: userId },
        },
      });
      if (existingEmail) {
        return res
          .status(409)
          .json({ message: "El email ya está registrado por otro usuario." });
      }
      updateData.email = email;
    }

    // Si no hay cambios válidos para hacer
    if (Object.keys(updateData).length === 0) {
      return res
        .status(200)
        .json({
          message: "No se realizaron cambios en el perfil.",
          user: { id: user.id, username: user.username, email: user.email },
        });
    }

    // Actualizar el usuario
    await user.update(updateData);

    // Devolver el usuario actualizado (sin hash)
    const updatedUserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      // Podrías incluir createdAt/updatedAt si lo deseas
    };

    res
      .status(200)
      .json({
        message: "Perfil actualizado con éxito.",
        user: updatedUserResponse,
      });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      // Por si acaso la comprobación anterior falla
      return res
        .status(409)
        .json({
          message: "Error: El email o el nombre de usuario ya existen.",
        });
    }
    res.status(500).json({ message: "Error interno al actualizar el perfil." });
  }
};

// --- NUEVA FUNCIÓN: Cambiar Contraseña ---
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Verificar la contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "La contraseña actual es incorrecta." });
    }

    // Hashear la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Actualizar la contraseña en la base de datos
    user.password_hash = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res
      .status(500)
      .json({ message: "Error interno al cambiar la contraseña." });
  }
};
// --- FIN NUEVAS FUNCIONES ---
