// Dentro de backend/src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { User } = require("../models"); // Podrías necesitar User si quieres adjuntar el objeto usuario completo

const protect = async (req, res, next) => {
  let token;

  // Buscar el token en el header Authorization: Bearer TOKEN
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extraer el token (quita 'Bearer ')
      token = req.headers.authorization.split(" ")[1];

      // Verificar el token usando el secreto
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // --- MODIFICACIÓN: Añadir userId y userRole a la request ---
      req.userId = decoded.userId;
      req.userRole = decoded.role; // <-- Guardar el rol decodificado
      // -----------------------------------------------------------

      // Opcional: Buscar usuario completo (ahora podría ser útil si necesitas el objeto User en otros lugares)
      /*
      req.user = await User.findByPk(decoded.userId, { attributes: { exclude: ['password_hash'] } });
      if (!req.user) {
          // Si el usuario fue eliminado después de emitir el token
          return res.status(401).json({ message: 'Usuario asociado al token no encontrado.' });
      }
      // Podrías verificar si req.user.role coincide con decoded.role por seguridad extra
      if (req.user.role !== decoded.role) {
           console.warn(`Discrepancia de rol para usuario ${decoded.userId}: Token dice ${decoded.role}, DB dice ${req.user.role}`);
           // Decide cómo manejar esto, ¿invalidar token? ¿usar rol de DB? Por ahora, logueamos.
           // Podrías forzar el uso del rol de la DB: req.userRole = req.user.role;
      }
      */

      next(); // El token es válido, continuar
    } catch (error) {
      console.error("Error de autenticación:", error.message);
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({
            message: "Token expirado. Por favor, inicia sesión de nuevo.",
          });
      }
      // Capturar específicamente JsonWebTokenError para tokens malformados/inválidos
      if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ message: "Token inválido o mal formado." });
      }
      // Otros errores durante la verificación
      return res
        .status(401)
        .json({ message: "No autorizado, problema con el token." });
    }
  }

  if (!token) {
    res
      .status(401)
      .json({ message: "No autorizado, no se proporcionó token." });
  }
};

module.exports = { protect };
