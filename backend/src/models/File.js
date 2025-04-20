// Dentro de backend/src/models/File.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const File = sequelize.define(
  "File",
  {
    name: {
      type: DataTypes.STRING(255), // VARCHAR(255) para compatibilidad amplia
      allowNull: false,
    },
    storage_path: {
      type: DataTypes.STRING(512),
      allowNull: false,
      // Ya no necesitamos unique aquí si usamos el índice compuesto de abajo
      // unique: true,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    // 'user_id' y 'folder_id' se definirán a través de las asociaciones
    // Sequelize añade 'deletedAt' automáticamente con paranoid: true
  },
  {
    timestamps: true,
    paranoid: true, // <-- HABILITAR SOFT DELETES
    tableName: "Files",
    indexes: [
      // Índice único para nombre de archivo dentro de una carpeta de usuario (considerando borrado suave)
      {
        unique: true,
        fields: ["user_id", "folder_id", "name", "deletedAt"], // <-- AÑADIR deletedAt AL ÍNDICE ÚNICO
        name: "unique_file_constraint", // Nombrar el índice
      },
      // Índice único para storage_path (si realmente debe ser único incluso tras borrado suave)
      // Si un archivo se borra y se sube otro que resulta tener el mismo path físico (poco probable con UUIDs/timestamps), esto fallaría.
      // Quizás es mejor quitarlo o hacerlo no único si el path puede reutilizarse teóricamente.
      // Por ahora, lo comentamos para evitar problemas si el path no se limpia inmediatamente.
      /*
       {
           unique: true,
           fields: ['storage_path'],
           name: 'unique_storage_path'
       }
       */
    ],
  }
);

module.exports = File;
