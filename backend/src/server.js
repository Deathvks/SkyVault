// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet"); // <-- Importar helmet
const rateLimit = require("express-rate-limit"); // <-- Importar express-rate-limit
const { connectDB } = require("./config/database");
// const { syncDatabase } = require('./models'); // sync desactivado
const userRoutes = require("./routes/userRoutes");
const folderRoutes = require("./routes/folderRoutes");
const fileRoutes = require("./routes/fileRoutes");
const searchRoutes = require("./routes/searchRoutes");

connectDB();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// --- Middlewares de Seguridad ---

// Helmet (cabeceras de seguridad) - ¡Importante ponerlo al principio!
app.use(helmet());

// CORS (ya lo teníamos)
const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate Limiter Básico (aplicar a todas las rutas API)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 peticiones por ventana
  message:
    "Demasiadas peticiones desde esta IP, por favor intenta de nuevo después de 15 minutos",
  standardHeaders: true, // Devuelve info del límite en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
});
app.use("/api/", apiLimiter); // Aplicar a /api/*

// Rate Limiter Más Estricto para Autenticación
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // Limita cada IP a 10 intentos de login/registro por ventana
  message:
    "Demasiados intentos de autenticación desde esta IP, por favor intenta más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});
// Aplicar solo a rutas de login/register (se hace en userRoutes.js ahora)
// Ya no se aplica aquí globalmente a /api/users

// -----------------------------

// Middlewares estándar para parsear body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("Backend de SkyVault funcionando.");
});

// Rutas de la API
app.use("/api/users", userRoutes); // authLimiter se aplicará dentro de este archivo
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/search", searchRoutes);

// Manejo de ruta no encontrada (404)
app.use((req, res, next) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejador de errores global (500)
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Evitar filtrar detalles del error en producción
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Error interno del servidor."
      : err.message;
  res.status(status).json({ message });
});

// Iniciar el servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  // Sincronización desactivada
  /* if (process.env.NODE_ENV !== 'production') { await syncDatabase(); } */
});
