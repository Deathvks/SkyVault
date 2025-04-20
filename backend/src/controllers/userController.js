// backend/src/controllers/userController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password } = req.body;

    // Check for existing user (code unchanged)
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

    // Create user (role will default to 'user' based on DB/model default)
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      // No es necesario especificar role: 'user' aquí si el default está bien configurado
    });

    // Response object (no changes needed here for role)
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      // role: newUser.role, // Opcional: devolver rol en registro? Por ahora no.
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    res
      .status(201)
      .json({ message: "Usuario registrado con éxito.", user: userResponse });
  } catch (error) {
    // Error handling (code unchanged)
    console.error("Error en el registro:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({
          message: "Error: El email o el nombre de usuario ya existen.",
        });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor al registrar el usuario." });
  }
};

exports.login = async (req, res) => {
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

    // --- MODIFICACIÓN: Añadir Rol al Payload ---
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role, // <--- Añadir el rol del usuario
    };
    // ------------------------------------------

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h", // O el tiempo que prefieras
    });

    res.status(200).json({ message: "Login exitoso.", token });
  } catch (error) {
    // Error handling (code unchanged)
    console.error("Error en el login:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor durante el login." });
  }
};

// Obtener Perfil: Devolver también el rol
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    // --- MODIFICACIÓN: Incluir rol ---
    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email", "role", "createdAt", "updatedAt"], // <-- Añadir 'role'
    });
    // -------------------------------

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error interno al obtener el perfil." });
  }
};

// Actualizar Perfil: NO permitir cambiar el rol aquí
exports.updateProfile = async (req, res) => {
  // ... (código existente sin cambios, no debe permitir actualizar 'role') ...
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.userId;
    const { username, email } = req.body; // Solo estos campos se permiten actualizar aquí

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

    // Verificar username (código sin cambios)
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({
        where: { username, id: { [Op.ne]: userId } },
      });
      if (existingUsername) {
        return res
          .status(409)
          .json({ message: "El nombre de usuario ya está en uso." });
      }
      updateData.username = username;
    }

    // Verificar email (código sin cambios)
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: { email, id: { [Op.ne]: userId } },
      });
      if (existingEmail) {
        return res
          .status(409)
          .json({ message: "El email ya está registrado por otro usuario." });
      }
      updateData.email = email;
    }

    if (Object.keys(updateData).length === 0) {
      // Devolver incluyendo el rol actual si no hay cambios
      return res.status(200).json({
        message: "No se realizaron cambios en el perfil.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    }

    await user.update(updateData);

    // Devolver usuario actualizado incluyendo el rol
    const updatedUserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role, // <-- Incluir rol en la respuesta
    };

    res
      .status(200)
      .json({
        message: "Perfil actualizado con éxito.",
        user: updatedUserResponse,
      });
  } catch (error) {
    // Error handling (código sin cambios)
    console.error("Error al actualizar perfil:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({
          message: "Error: El email o el nombre de usuario ya existen.",
        });
    }
    res.status(500).json({ message: "Error interno al actualizar el perfil." });
  }
};

// Cambiar Contraseña: Sin cambios necesarios para rol
exports.changePassword = async (req, res) => {
  // ... (código existente sin cambios) ...
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

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "La contraseña actual es incorrecta." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

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
