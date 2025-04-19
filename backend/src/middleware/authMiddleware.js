// Dentro de backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Podrías necesitar User si quieres adjuntar el objeto usuario completo

const protect = async (req, res, next) => {
  let token;

  // Buscar el token en el header Authorization: Bearer TOKEN
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extraer el token (quita 'Bearer ')
      token = req.headers.authorization.split(' ')[1];

      // Verificar el token usando el secreto
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Añadir el id del usuario decodificado a la request (req.userId)
      // para que los siguientes controladores puedan usarlo
      req.userId = decoded.userId;

      // Opcional: Podrías buscar el usuario en la DB y adjuntarlo completo
      // req.user = await User.findByPk(decoded.userId, { attributes: { exclude: ['password_hash'] } });
      // if (!req.user) {
      //     return res.status(401).json({ message: 'Usuario no encontrado.' });
      // }

      next(); // El token es válido, continuar con la siguiente función/controlador

    } catch (error) {
      console.error('Error de autenticación:', error.message);
      // Diferenciar errores de token expirado vs inválido
      if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expirado. Por favor, inicia sesión de nuevo.' });
      }
      return res.status(401).json({ message: 'Token inválido o mal formado.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no se proporcionó token.' });
  }
};

module.exports = { protect };