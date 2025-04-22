// src/models/Favorite.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database"); // Importa la instancia de sequelize
const User = require('./User'); // Asegúrate que la ruta es correcta
const File = require('./File'); // Asegúrate que la ruta es correcta
const Folder = require('./Folder'); // Asegúrate que la ruta es correcta

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
      references: {
        model: User, // Referencia al modelo User importado
        key: "id",
      },
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: File, // Referencia al modelo File importado
        key: "id",
      },
    },
    folderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Folder, // Referencia al modelo Folder importado
        key: "id",
      },
    },
  },
  {
    tableName: "Favorites",
    timestamps: true,
    indexes: [
      // Índice único para evitar duplicados exactos
      { unique: true, fields: ["userId", "fileId"] },
      { unique: true, fields: ["userId", "folderId"] },
    ],
    validate: {
      eitherFileOrFolder() {
        // Valida que solo fileId O folderId tenga valor, pero no ambos ni ninguno
        if (!((this.fileId === null) ^ (this.folderId === null))) { // XOR check
          throw new Error(
            "Favorite must reference either a file or a folder, not both or neither."
          );
        }
      },
    },
  }
);

// Definición de asociaciones (opcional aquí, pero recomendado)
// Asegúrate que los modelos referenciados también definen la asociación inversa si es necesario
Favorite.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
Favorite.belongsTo(File, { foreignKey: 'fileId', onDelete: 'CASCADE', constraints: false, // Permite que fileId sea null
allowNull: true });
Favorite.belongsTo(Folder, { foreignKey: 'folderId', onDelete: 'CASCADE', constraints: false, // Permite que folderId sea null
allowNull: true });


// Exporta el modelo directamente
module.exports = Favorite;