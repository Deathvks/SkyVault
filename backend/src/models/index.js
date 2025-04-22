// src/models/index.js
const { Sequelize } = require("sequelize");
const sequelize = require("../config/database"); // La instancia de sequelize

// Importa los modelos
const User = require("./User");
const Folder = require("./Folder");
const File = require("./File");
const Favorite = require("./Favorite"); // Asumiendo que Favorite también exporta el modelo directamente o se maneja como los demás

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Carga los modelos en el objeto db
db.User = User;
db.Folder = Folder;
db.File = File;
db.Favorite = Favorite;

// --- Define las asociaciones ---

// User <-> Folder (One-to-Many)
// Asumiendo que la columna en la tabla 'Folders' se llama 'user_id'
db.User.hasMany(db.Folder, {
  foreignKey: {
    name: "userId", // Nombre usado en el modelo/JS
    field: "user_id", // Nombre real de la columna en la DB
  },
  // onDelete: 'CASCADE' // Opcional: si quieres borrar carpetas cuando se borra el usuario
});
db.Folder.belongsTo(db.User, {
  foreignKey: {
    name: "userId",
    field: "user_id",
  },
});

// Folder <-> Folder (Self-referencing for Parent/Subfolders)
// Asumiendo que la columna en la tabla 'Folders' se llama 'parent_folder_id'
db.Folder.belongsTo(db.Folder, {
  as: "parent",
  foreignKey: {
    name: "parentFolderId", // Nombre usado en el modelo/JS
    field: "parent_folder_id", // Nombre real de la columna en la DB
  },
  // allowNull: true // La FK debe permitir nulos para carpetas raíz
});
db.Folder.hasMany(db.Folder, {
  as: "subFolders",
  foreignKey: {
    name: "parentFolderId",
    field: "parent_folder_id",
  },
  // allowNull: true // La FK debe permitir nulos
});

// Folder <-> File (One-to-Many)
// Asumiendo que la columna en la tabla 'Files' se llama 'folder_id'
db.Folder.hasMany(db.File, {
  foreignKey: {
    name: "folderId", // Nombre usado en el modelo/JS
    field: "folder_id", // Nombre real de la columna en la DB
  },
  // allowNull: true // La FK debe permitir nulos para archivos en la raíz
});
db.File.belongsTo(db.Folder, {
  foreignKey: {
    name: "folderId",
    field: "folder_id",
  },
});

// User <-> File (One-to-Many)
// Asumiendo que la columna en la tabla 'Files' se llama 'user_id'
db.User.hasMany(db.File, {
  foreignKey: {
    name: "userId",
    field: "user_id",
  },
});
db.File.belongsTo(db.User, {
  foreignKey: {
    name: "userId",
    field: "user_id",
  },
});

// --- Asociaciones para Favoritos ---

// User <-> Favorite (One-to-Many)
// Asumiendo que la columna en la tabla 'Favorites' se llama 'user_id'
db.User.hasMany(db.Favorite, {
  foreignKey: {
    name: "userId",
    field: "user_id",
  },
  onDelete: "CASCADE", // Borra favoritos si se borra el usuario
});
db.Favorite.belongsTo(db.User, {
  foreignKey: {
    name: "userId",
    field: "user_id",
  },
});

// File <-> Favorite (One-to-Many, as a File can be favorited by many Users via Favorite entries)
// Asumiendo que la columna en la tabla 'Favorites' se llama 'file_id'
db.File.hasMany(db.Favorite, {
  foreignKey: {
    name: "fileId",
    field: "file_id", // Nombre real de la columna en la DB
    allowNull: true, // Permite nulos si el favorito es una carpeta
  },
  onDelete: "CASCADE", // Borra favoritos si se borra el archivo
});
db.Favorite.belongsTo(db.File, {
  foreignKey: {
    name: "fileId",
    field: "file_id",
    allowNull: true,
  },
});

// Folder <-> Favorite (One-to-Many)
// Asumiendo que la columna en la tabla 'Favorites' se llama 'folder_id'
db.Folder.hasMany(db.Favorite, {
  foreignKey: {
    name: "folderId",
    field: "folder_id", // Nombre real de la columna en la DB
    allowNull: true, // Permite nulos si el favorito es un archivo
  },
  onDelete: "CASCADE", // Borra favoritos si se borra la carpeta
});
db.Favorite.belongsTo(db.Folder, {
  foreignKey: {
    name: "folderId",
    field: "folder_id",
    allowNull: true,
  },
});

// Alternativa si usas el método .associate dentro de cada modelo:
// Object.keys(db).forEach(modelName => {
//   if (db[modelName].associate) {
//     db[modelName].associate(db);
//   }
// });

module.exports = db; // Exporta el objeto db que contiene todo