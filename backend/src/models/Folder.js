// Dentro de backend/src/models/Folder.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Folder = sequelize.define('Folder', {
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  // 'user_id' y 'parent_folder_id' se definirán a través de las asociaciones
}, {
  timestamps: true,
  tableName: 'Folders',
  indexes: [ // Definimos el índice único a nivel de modelo también
      {
          unique: true,
          fields: ['user_id', 'parent_folder_id', 'name']
      }
  ]
});

module.exports = Folder;