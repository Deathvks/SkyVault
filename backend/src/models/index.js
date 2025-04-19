// Dentro de backend/src/models/index.js
const { sequelize } = require('../config/database');
const User = require('./User');
const Folder = require('./Folder');
const File = require('./File');

// --- Definir Asociaciones ---

// Usuario -> Carpetas (Un usuario tiene muchas carpetas)
User.hasMany(Folder, { foreignKey: 'user_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Folder.belongsTo(User, { foreignKey: 'user_id' });

// Usuario -> Archivos (Un usuario tiene muchos archivos)
User.hasMany(File, { foreignKey: 'user_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
File.belongsTo(User, { foreignKey: 'user_id' });

// Carpeta -> Subcarpetas (Una carpeta puede tener muchas subcarpetas)
Folder.hasMany(Folder, { as: 'SubFolders', foreignKey: 'parent_folder_id', onDelete: 'CASCADE', onUpdate: 'CASCADE', allowNull: true });
Folder.belongsTo(Folder, { as: 'ParentFolder', foreignKey: 'parent_folder_id', allowNull: true });

// Carpeta -> Archivos (Una carpeta contiene muchos archivos)
Folder.hasMany(File, { foreignKey: 'folder_id', onDelete: 'CASCADE', onUpdate: 'CASCADE', allowNull: true });
File.belongsTo(Folder, { foreignKey: 'folder_id', allowNull: true });


// Sincronización (DESACTIVADA - Comentada o Eliminada)
/*
const syncDatabase = async () => {
  try {
    // await sequelize.sync({ force: true }); // ¡CUIDADO! Borra y recrea tablas
    await sequelize.sync({ alter: true }); // Intenta alterar tablas existentes para que coincidan (más seguro)
    console.log('🔄 Base de datos sincronizada correctamente (tablas verificadas/creadas/alteradas).');
  } catch (error) {
    console.error('❌ Error al sincronizar la base de datos:', error);
  }
};
*/

module.exports = {
  sequelize,
  User,
  Folder,
  File,
  // syncDatabase // <--- Eliminada o comentada la exportación
};