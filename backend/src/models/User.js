// Dentro de backend/src/models/User.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database"); // Importa la instancia de sequelize

// Define la cuota estándar en bytes (2 GB)
const STANDARD_USER_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

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
    role: {
      type: DataTypes.ENUM("user", "admin"), // Define los roles permitidos
      allowNull: false,
      defaultValue: "user", // Por defecto, todos son 'user'
    },
    // --- CAMPOS DE CUOTA ---
    storage_quota_bytes: {
      type: DataTypes.BIGINT.UNSIGNED, // Usar BIGINT UNSIGNED para bytes (gran capacidad, no negativo)
      allowNull: true, // Permitimos null para representar 'ilimitado' (ej. para admin)
      // El hook se encarga de poner el valor por defecto para 'user'
    },
    storage_used_bytes: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0, // El uso siempre empieza en 0
    },
    // ---------------------
    // Timestamps 'createdAt' y 'updatedAt' son añadidos automáticamente por Sequelize
  },
  {
    // Opciones adicionales del modelo
    timestamps: true, // Habilita createdAt y updatedAt
    tableName: "Users", // Asegura que el nombre de la tabla sea 'Users' (plural)
  }
);

// Hook para asignar cuota por defecto a usuarios NO admin ANTES de que se creen en la BD.
// Esto asegura que los nuevos usuarios 'user' tengan su cuota establecida.
User.beforeCreate(async (user, options) => {
  // Si el rol es 'user' y no se ha especificado una cuota (es null)
  if (user.role === "user" && user.storage_quota_bytes === null) {
    // Asigna la cuota estándar
    user.storage_quota_bytes = STANDARD_USER_QUOTA_BYTES;
  }
  // Si el rol es 'admin', dejamos storage_quota_bytes como null (o el valor que tuviera),
  // que interpretaremos en nuestra lógica (ej. en fileController) como 'sin límite'.
});

module.exports = User;
