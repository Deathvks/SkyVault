// Dentro de backend/src/models/User.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database"); // Importa la instancia de sequelize

const User = sequelize.define(
  "User",
  {
    // No es necesario definir 'id' explícitamente, Sequelize lo añade por defecto
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true, // Validación básica de formato email
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // --- NUEVO CAMPO ---
    role: {
      type: DataTypes.ENUM("user", "admin"), // Define los roles permitidos
      allowNull: false,
      defaultValue: "user", // Por defecto, todos son 'user'
    },
    // -----------------
    // Timestamps 'createdAt' y 'updatedAt' son añadidos automáticamente por Sequelize
  },
  {
    // Opciones adicionales del modelo
    timestamps: true, // Habilita createdAt y updatedAt
    tableName: "Users", // Asegura que el nombre de la tabla sea 'Users' (plural)
  }
);

module.exports = User;
