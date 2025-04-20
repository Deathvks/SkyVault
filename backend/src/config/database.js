// backend/src/config/database.js
const { Sequelize } = require('sequelize');
// const mysql2 = require('mysql2'); // Opcional
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    // dialectModule: mysql2, // Opcional
    logging: false, // Cambiado a false para reducir logs generales (opcional)
    // collate: 'utf8mb4_unicode_ci', // Dejar o quitar, SET NAMES es más directo
    dialectOptions: {
        charset: 'utf8mb4', // Mantenemos por si acaso
        // Opciones específicas
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Función para probar la conexión y FORZAR codificación
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos autenticada.');

    // --- AÑADIDO: Forzar codificación de la conexión ---
    await sequelize.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';");
    console.log('✅ Codificación de conexión establecida a utf8mb4.');
    // --------------------------------------------------

  } catch (error) {
    console.error('❌ No se pudo conectar y configurar la base de datos:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };