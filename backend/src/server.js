// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken"); // Importado para rate limit skip
const { connectDB } = require("./config/database");
const { scheduleTrashCleanup } = require("./jobs/trashCleanupJob");

// Importar Rutas
const userRoutes = require("./routes/userRoutes");
const folderRoutes = require("./routes/folderRoutes");
const fileRoutes = require("./routes/fileRoutes");
const searchRoutes = require("./routes/searchRoutes");
const trashRoutes = require("./routes/trashRoutes");
const bulkRoutes = require("./routes/bulkRoutes"); // <-- Importar nuevas rutas masivas

connectDB();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// --- Middlewares de Seguridad ---
app.use(helmet());

const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate Limiter General con Skip para Admins
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite general (ajustar si es necesario)
  message: {
    message:
      "Demasiadas peticiones desde esta IP, por favor intenta de nuevo después de 15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip,
  skip: (req, res) => {
    // Función para saltar el limitador si es admin
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.role === "admin") {
          console.log(
            `[RateLimit Skip] Admin user ${decoded.userId} detected. Skipping limit.`
          );
          return true; // Saltar limitador para admins
        }
      } catch (error) {
        console.log(
          `[RateLimit Skip] Token error for IP ${req.ip}: ${error.name}. Applying limit.`
        );
        return false; // Aplicar límite si token inválido/expirado
      }
    }
    return false; // Aplicar límite si no hay token o no es admin
  },
});
app.use("/api/", apiLimiter); // Aplicar a /api/*
// -----------------------------

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
app.use("/api/trash", trashRoutes);
app.use("/api/bulk", bulkRoutes); // <-- Registrar rutas masivas

// Manejo 404
app.use((req, res, next) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejador de errores 500
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Error interno del servidor."
      : err.message || "Ocurrió un error inesperado.";
  res.status(status).json({ message });
});

// Iniciar el servidor y planificador
app.listen(PORT, async () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  scheduleTrashCleanup(); // Iniciar la tarea de limpieza de papelera
});
