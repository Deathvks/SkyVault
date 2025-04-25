// src/controllers/favoriteController.js
const { Favorite, File, Folder } = require('../models'); // Asegúrate que la ruta es correcta
const { Op } = require('sequelize');

// Añadir un fichero o carpeta a favoritos
exports.addFavorite = async (req, res) => {
    const { fileId, folderId } = req.body;
    const userId = req.userId; // Asumiendo que el middleware de auth añade userId

    if (!fileId && !folderId) {
        return res.status(400).json({ message: 'Se requiere fileId o folderId.' });
    }
    if (fileId && folderId) {
        return res.status(400).json({ message: 'No se puede añadir a favoritos un fichero y una carpeta a la vez.' });
    }

    try {
        // Verificar que el fichero/carpeta existe y pertenece al usuario (o es accesible)
        if (fileId) {
            const file = await File.findOne({ where: { id: fileId, userId } });
            if (!file) return res.status(404).json({ message: 'Fichero no encontrado o no tienes permiso.' });
        } else { // folderId
            const folder = await Folder.findOne({ where: { id: folderId, userId } });
            if (!folder) return res.status(404).json({ message: 'Carpeta no encontrada o no tienes permiso.' });
        }

        // Crear el favorito
        const [favorite, created] = await Favorite.findOrCreate({
            where: { userId, fileId: fileId || null, folderId: folderId || null },
            defaults: { userId, fileId: fileId || null, folderId: folderId || null }
        });

        if (!created) {
            return res.status(409).json({ message: 'Este elemento ya está en favoritos.' });
        }

        res.status(201).json(favorite);
    } catch (error) {
        console.error("Error añadiendo favorito:", error);
         if (error.name === 'SequelizeValidationError') {
             return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Error del servidor al añadir favorito.' });
    }
};

// Eliminar un fichero o carpeta de favoritos
exports.removeFavorite = async (req, res) => {
    const { fileId, folderId } = req.query; // Usar query params para DELETE
    const userId = req.userId;

     if (!fileId && !folderId) {
        return res.status(400).json({ message: 'Se requiere fileId o folderId.' });
    }
     if (fileId && folderId) {
        return res.status(400).json({ message: 'Especifica solo fileId o folderId, no ambos.' });
    }

    try {
        const whereClause = { userId };
        if (fileId) {
            whereClause.fileId = fileId;
        } else {
            whereClause.folderId = folderId;
        }

        const deletedCount = await Favorite.destroy({ where: whereClause });

        if (deletedCount === 0) {
            return res.status(404).json({ message: 'Favorito no encontrado.' });
        }

        res.status(200).json({ message: 'Elemento eliminado de favoritos.' });
    } catch (error) {
         console.error("Error eliminando favorito:", error);
        res.status(500).json({ message: 'Error del servidor al eliminar favorito.' });
    }
};

// Listar todos los favoritos de un usuario
exports.listFavorites = async (req, res) => {
    const userId = req.userId;

    try {
        const favorites = await Favorite.findAll({
            where: { userId },
            include: [
                {
                    model: File,
                    // IMPORTANTE: Asegúrate de que el modelo File tenga paranoid:true
                    // para que no incluya archivos borrados (soft delete)
                    // Sequelize debería hacer esto por defecto si el modelo lo tiene.
                    attributes: ['id', 'name', 'size', 'mime_type', 'createdAt', 'updatedAt'],
                    required: false // Haz que la unión sea LEFT JOIN
                },
                {
                    model: Folder,
                    // IMPORTANTE: Asegúrate de que el modelo Folder tenga paranoid:true
                    // para que no incluya carpetas borradas (soft delete)
                    attributes: ['id', 'name', 'createdAt', 'updatedAt'],
                    required: false // Haz que la unión sea LEFT JOIN
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Formatear respuesta CON COMPROBACIONES
        const formattedFavorites = favorites.map(fav => {
            // Primero, comprueba si existe el archivo asociado Y NO ES NULL
            if (fav.File) {
                 // Asegura que fav.File no es null antes de llamar a toJSON
                 // Aunque Sequelize suele devolver null si no lo encuentra,
                 // una doble comprobación no hace daño.
                 const fileData = fav.File.toJSON ? fav.File.toJSON() : fav.File;
                 return { type: 'file', ...fileData, favoriteId: fav.id, favoritedAt: fav.createdAt };
            }
            // Si no hay archivo, COMPRUEBA SI EXISTE LA CARPETA asociada Y NO ES NULL
            else if (fav.Folder) {
                 // Asegura que fav.Folder no es null
                 const folderData = fav.Folder.toJSON ? fav.Folder.toJSON() : fav.Folder;
                 return { type: 'folder', ...folderData, favoriteId: fav.id, favoritedAt: fav.createdAt };
            }
            // Si no existe ni archivo ni carpeta asociada (o ambos son NULL)
            else {
                // Esto indica un estado inconsistente en la BD (un favorito huérfano)
                console.warn(`Registro Favorite (ID: ${fav.id}) no tiene File ni Folder asociado válido.`);
                return null; // O puedes devolver un objeto indicando el error
            }
        }).filter(fav => fav !== null); // Filtra los resultados nulos para no enviarlos al frontend


        res.status(200).json(formattedFavorites);
    } catch (error) {
        console.error("Error listando favoritos:", error);
        res.status(500).json({ message: 'Error del servidor al listar favoritos.' });
    }
};