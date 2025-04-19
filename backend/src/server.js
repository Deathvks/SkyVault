// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken"); // <-- Importar JWT
const { connectDB } = require("./config/database");
const { scheduleTrashCleanup } = require("./jobs/trashCleanupJob");

// Importar Rutas
const userRoutes = require("./routes/userRoutes");
const folderRoutes = require("./routes/folderRoutes");
const fileRoutes = require("./routes/fileRoutes");
const searchRoutes = require("./routes/searchRoutes");
const trashRoutes = require("./routes/trashRoutes");

connectDB();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(helmet());

const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// --- MODIFICACIÓN: Rate Limiter con Skip para Admins ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite general
  message: {
    message:
      "Demasiadas peticiones desde esta IP, por favor intenta de nuevo después de 15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip, // Usar IP como clave

  // Función para saltar el limitador si es admin
  skip: (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        // Verificar y decodificar el token DENTRO del skip
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Si el rol decodificado es 'admin', saltar el limitador
        if (decoded && decoded.role === "admin") {
          console.log(
            `[RateLimit Skip] Admin user ${decoded.userId} detected. Skipping limit.`
          );
          return true; // Skip rate limiting for admins
        }
      } catch (error) {
        // Si el token es inválido o expirado, no es admin válido, aplicar limiter
        console.log(
          `[RateLimit Skip] Token error for IP ${req.ip}: ${error.name}. Applying limit.`
        );
        return false;
      }
    }
    // Si no hay token o no es admin, aplicar limiter
    // console.log(`[RateLimit Skip] No valid admin token found for IP ${req.ip}. Applying limit.`);
    return false;
  },
});
app.use("/api/", apiLimiter); // Aplicar a /api/*
// -----------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Backend de SkyVault funcionando.");
});

// Rutas de la API (sin cambios)
app.use("/api/users", userRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/trash", trashRoutes);

// Manejo 404 (sin cambios)
app.use((req, res, next) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejador de errores 500 (sin cambios)
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Error interno del servidor."
      : err.message || "Ocurrió un error inesperado.";
  res.status(status).json({ message });
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
  scheduleTrashCleanup();
});
