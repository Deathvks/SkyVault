// src/routes/favoriteRoutes.js
const express = require('express');
const favoriteController = require('../controllers/favoriteController'); // Asegúrate que la ruta es correcta
const { protect } = require('../middleware/authMiddleware'); // Asumiendo que así se llama tu middleware

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas de favoritos
router.use(protect);

// POST /api/favorites - Añadir un item a favoritos (pasando fileId o folderId en el body)
router.post('/', favoriteController.addFavorite);

// DELETE /api/favorites?fileId=X o /api/favorites?folderId=Y - Eliminar un item de favoritos
router.delete('/', favoriteController.removeFavorite);

// GET /api/favorites - Listar todos los favoritos del usuario
router.get('/', favoriteController.listFavorites);

module.exports = router;