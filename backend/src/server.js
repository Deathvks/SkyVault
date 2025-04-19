// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet"); // <-- Importar helmet
const rateLimit = require("express-rate-limit"); // <-- Importar express-rate-limit
const { connectDB } = require("./config/database");
const { scheduleTrashCleanup } = require("./jobs/trashCleanupJob"); // <-- Importar planificador

// Importar Rutas
const userRoutes = require("./routes/userRoutes");
const folderRoutes = require("./routes/folderRoutes");
const fileRoutes = require("./routes/fileRoutes");
const searchRoutes = require("./routes/searchRoutes");
const trashRoutes = require("./routes/trashRoutes"); // Importar rutas de papelera

// Conectar a la Base de Datos (es buena práctica hacerlo antes de definir la app)
connectDB();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// --- Middlewares de Seguridad ---

// Helmet (cabeceras de seguridad) - ¡Importante ponerlo al principio!
app.use(helmet());

// CORS (Configuración existente)
const corsOptions = {
  origin: "http://localhost:5173", // Origen del frontend
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate Limiter Básico (aplicar a todas las rutas API)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 peticiones por ventana (ajustar según necesidad)
  message: {
    message:
      "Demasiadas peticiones desde esta IP, por favor intenta de nuevo después de 15 minutos",
  },
  standardHeaders: true, // Devuelve info del límite en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
});
app.use("/api/", apiLimiter); // Aplicar a /api/*

// (El Rate Limiter específico para Auth se aplica dentro de userRoutes.js)

// -----------------------------

// Middlewares estándar para parsear body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("Backend de SkyVault funcionando.");
});

// Rutas de la API
app.use("/api/users", userRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/trash", trashRoutes); // <-- Registrar rutas de papelera

// Manejo de ruta no encontrada (404) - Debe ir después de las rutas de la API
app.use((req, res, next) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejador de errores global (500) - Debe ir al final
app.use((err, req, res, next) => {
  console.error("Error global:", err); // Loguear el error completo
  // Evitar filtrar detalles del error en producción
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500 // Solo ocultar si es 500 en prod
      ? "Error interno del servidor."
      : err.message || "Ocurrió un error inesperado."; // Mensaje por defecto
  res.status(status).json({ message });
});

// Iniciar el servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);

  // --- INICIAR LA TAREA PROGRAMADA ---
  // Se inicia después de que el servidor esté escuchando
  scheduleTrashCleanup();
  // ------------------------------------
});
