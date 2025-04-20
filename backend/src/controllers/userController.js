// backend/src/controllers/userController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models"); // Importa el modelo User (que ahora tiene campos de cuota)
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");

const SALT_ROUNDS = 10;

// --- Registro de Usuario ---
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password } = req.body;

    // Comprobar usuario/email existente (sin cambios)
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

    // Hashear contraseña (sin cambios)
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Crear usuario
    // El hook beforeCreate en el modelo User.js asignará la cuota por defecto
    // y el defaultValue pondrá storage_used_bytes a 0.
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      // role por defecto será 'user'
      // storage_quota_bytes se asignará por el hook si es 'user'
      // storage_used_bytes por defecto será 0
    });

    // Preparar respuesta (excluyendo datos sensibles y cuota si no se quiere mostrar en registro)
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role, // Devolver rol es útil
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      // Opcional: podrías devolver la cuota aquí también si lo necesitas en el frontend tras registrar
      // storageQuotaBytes: newUser.storage_quota_bytes,
    };

    res
      .status(201)
      .json({ message: "Usuario registrado con éxito.", user: userResponse });
  } catch (error) {
    // Manejo de errores (sin cambios)
    console.error("Error en el registro:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      // Error específico si falla la constraint única (aunque ya lo comprobamos antes)
      return res.status(409).json({
          message: "Error: El email o el nombre de usuario ya existen.",
        });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor al registrar el usuario." });
  }
};

// --- Login de Usuario ---
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Buscar usuario por email (sin cambios)
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas." }); // Mensaje genérico
    }

    // Comparar contraseña (sin cambios)
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas." }); // Mensaje genérico
    }

    // Crear payload para JWT (incluye rol)
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role, // Incluir rol en el token
    };

    // Firmar el token (sin cambios)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h", // O el tiempo que prefieras
    });

    // Devolver token (no se devuelve info de cuota aquí, se pide con getProfile)
    res.status(200).json({ message: "Login exitoso.", token });

  } catch (error) {
    // Manejo de errores (sin cambios)
    console.error("Error en el login:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor durante el login." });
  }
};


// --- Obtener Perfil del Usuario ---
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // Obtenido del middleware 'protect'

    // --- Modificado para incluir campos de cuota ---
    const user = await User.findByPk(userId, {
      attributes: [
          "id",
          "username",
          "email",
          "role",
          "createdAt",
          "updatedAt",
          "storage_used_bytes",     // <-- Devolver uso
          "storage_quota_bytes"     // <-- Devolver cuota (puede ser null para admin)
      ],
    });
    // --------------------------------------------

    if (!user) {
      // Esto podría ocurrir si el usuario es eliminado después de generar el token
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Devolver el objeto usuario completo (con cuota)
    res.status(200).json(user);

  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error interno al obtener el perfil." });
  }
};


// --- Actualizar Perfil (Username y Email solamente) ---
// NO se permite actualizar rol, contraseña o cuota aquí.
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.userId;
    const { username, email } = req.body; // Solo estos campos permitidos

    // Validar que al menos uno se envía (aunque las reglas ya lo hacen opcional)
    if (!username && !email) {
      return res
        .status(400)
        .json({
          message: "Debe proporcionar al menos un campo (username o email) para actualizar.",
        });
    }

    // Encontrar usuario actual
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const updateData = {};
    let changed = false;

    // Validar y preparar actualización de username (si cambió y es diferente)
    if (username && username.trim() !== user.username) {
      const trimmedUsername = username.trim();
      // Comprobar si nuevo username ya está en uso por OTRO usuario
      const existingUsername = await User.findOne({
        where: { username: trimmedUsername, id: { [Op.ne]: userId } }, // Op.ne = Not Equal
      });
      if (existingUsername) {
        return res
          .status(409) // Conflict
          .json({ message: "El nombre de usuario ya está en uso por otro usuario." });
      }
      updateData.username = trimmedUsername;
      changed = true;
    }

    // Validar y preparar actualización de email (si cambió y es diferente)
    if (email && email.trim() !== user.email) {
       const trimmedEmail = email.trim();
       // Comprobar si nuevo email ya está en uso por OTRO usuario
      const existingEmail = await User.findOne({
        where: { email: trimmedEmail, id: { [Op.ne]: userId } },
      });
      if (existingEmail) {
        return res
          .status(409) // Conflict
          .json({ message: "El email ya está registrado por otro usuario." });
      }
      updateData.email = trimmedEmail;
      changed = true;
    }

    // Si no hubo cambios válidos, informar y devolver datos actuales
    if (!changed) {
      // Devolver usuario actual (incluyendo rol y cuota para consistencia)
       const currentUserResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            storageUsedBytes: user.storage_used_bytes,
            storageQuotaBytes: user.storage_quota_bytes
       };
      return res.status(200).json({
        message: "No se realizaron cambios en el perfil.",
        user: currentUserResponse
      });
    }

    // Aplicar los cambios
    await user.update(updateData);

    // Devolver usuario actualizado (incluyendo campos no modificables como rol y cuota)
    const updatedUserResponse = {
      id: user.id,
      username: user.username, // Nombre actualizado
      email: user.email,       // Email actualizado
      role: user.role,         // Rol (no cambió)
      storageUsedBytes: user.storage_used_bytes, // Cuota (no cambió)
      storageQuotaBytes: user.storage_quota_bytes // Cuota (no cambió)
    };

    res
      .status(200)
      .json({
        message: "Perfil actualizado con éxito.",
        user: updatedUserResponse,
      });

  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    // Manejo de error de constraint único (si fallan las comprobaciones por concurrencia)
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({
          message: "Error de conflicto: El email o el nombre de usuario ya existen.",
        });
    }
    // Error genérico
    res.status(500).json({ message: "Error interno al actualizar el perfil." });
  }
};


// --- Cambiar Contraseña ---
// Esta función no interactúa con la cuota.
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    // Encontrar usuario
    const user = await User.findByPk(userId);
    if (!user) {
      // No debería pasar si el token es válido
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res
        .status(401) // Unauthorized
        .json({ message: "La contraseña actual es incorrecta." });
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Actualizar hash en la base de datos
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