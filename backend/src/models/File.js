// Dentro de backend/src/models/File.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const File = sequelize.define('File', {
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  storage_path: {
    type: DataTypes.STRING(512),
    allowNull: false,
    unique: true, // Asegura que la ruta de almacenamiento sea única
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true, // Puede ser nulo si no se detecta
  },
  size: {
    type: DataTypes.BIGINT.UNSIGNED, // BIGINT sin signo para tamaños grandes
    allowNull: true, // Puede ser nulo inicialmente
  },
  // 'user_id' y 'folder_id' se definirán a través de las asociaciones
}, {
  timestamps: true,
  tableName: 'Files',
    indexes: [ // Índice único para nombre de archivo dentro de una carpeta de usuario
      {
          unique: true,
          fields: ['user_id', 'folder_id', 'name']
      }
  ]
});

module.exports = File;