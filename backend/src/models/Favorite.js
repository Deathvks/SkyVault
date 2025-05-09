// backend/src/models/Favorite.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const User = require("./User");
const File = require("./File");
const Folder = require("./Folder");

const Favorite = sequelize.define(
  "Favorite",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id", // <--- AÑADIDO: Mapeo a la columna de la BD
      references: {
        model: User,
        key: "id",
      },
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "file_id", // <--- AÑADIDO: Mapeo a la columna de la BD
      references: {
        model: File,
        key: "id",
      },
    },
    folderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "folder_id", // <--- AÑADIDO: Mapeo a la columna de la BD
      references: {
        model: Folder,
        key: "id",
      },
    },
    // createdAt y updatedAt son manejados por Sequelize
  },
  {
    tableName: "Favorites",
    timestamps: true, // Habilita createdAt y updatedAt
    // Sequelize usará automáticamente 'created_at' y 'updated_at' como nombres de columna
    // si no se especifica `underscored: true` o nombres de campo personalizados para ellos.
    // Si tus columnas se llaman 'createdAt' y 'updatedAt' en la BD, está bien.
    // Si se llaman 'created_at' y 'updated_at', añade `underscored: true` aquí.
    // Basado en tu script SQL, se llaman 'createdAt' y 'updatedAt', así que no se necesita `underscored: true`.

    indexes: [
      { unique: true, fields: ["user_id", "file_id"] }, // Usar nombres de columna de BD para índices
      { unique: true, fields: ["user_id", "folder_id"] }, // Usar nombres de columna de BD para índices
    ],
    validate: {
      eitherFileOrFolder() {
        // Esta validación se ejecuta antes de guardar en la BD
        if (!((this.fileId === null) ^ (this.folderId === null))) {
          // XOR check
          throw new Error(
            "Favorite must reference either a file or a folder, not both or neither."
          );
        }
      },
    },
  }
);

module.exports = Favorite;
