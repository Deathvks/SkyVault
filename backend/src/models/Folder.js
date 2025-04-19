// Dentro de backend/src/models/Folder.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Folder = sequelize.define(
  "Folder",
  {
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // 'user_id' y 'parent_folder_id' se definirán a través de las asociaciones
    // Sequelize añade 'deletedAt' automáticamente con paranoid: true
  },
  {
    timestamps: true,
    paranoid: true, // <-- HABILITAR SOFT DELETES
    tableName: "Folders",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "parent_folder_id", "name", "deletedAt"], // <-- AÑADIR deletedAt AL ÍNDICE ÚNICO
        name: "unique_folder_constraint", // Es buena práctica nombrar los índices
      },
    ],
  }
);

module.exports = Folder;
