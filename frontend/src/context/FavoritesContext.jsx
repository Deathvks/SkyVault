// src/contexts/FavoritesContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
} from "../services/api"; // Asegúrate que la ruta es correcta
// import { useAuth } from './AuthContext'; // Descomenta si usas AuthContext para saber si el user está logueado
import { useAuth } from './AuthContext'; // <-- AÑADIR ESTA LÍNEA

// 1. Crear el Contexto
const FavoritesContext = createContext();

// 2. Crear el Proveedor del Contexto
export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]); // Lista de favoritos [{ type: 'file'/'folder', id: ..., name: ..., ... }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // Descomenta si necesitas el estado del usuario

  // Función para obtener los favoritos desde la API
  const fetchFavorites = useCallback(async () => {
    // if (!user) return; // Descomenta si solo quieres cargar si hay usuario
    setLoading(true);
    setError(null);
    try {
      const response = await getFavorites();
      // La API devuelve un array formateado con 'type', 'id', etc.
      setFavorites(response.data || []);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError(err.response?.data?.message || "Error al cargar los favoritos.");
      setFavorites([]); // Limpiar en caso de error
    } finally {
      setLoading(false);
    }
  }, []); // Añade [user] como dependencia si lo usas

  // Función para añadir un favorito
  const addFavorite = useCallback(
    async (itemType, itemId) => {
      if (!itemType || !itemId) return;
      setLoading(true); // Podrías tener un loading específico para añadir/quitar
      setError(null);
      try {
        const payload =
          itemType === "file" ? { fileId: itemId } : { folderId: itemId };
        await apiAddFavorite(payload);
        // Refrescar la lista completa después de añadir
        // Alternativa: actualizar el estado localmente de forma optimista
        await fetchFavorites();
      } catch (err) {
        console.error("Error adding favorite:", err);
        setError(err.response?.data?.message || "Error al añadir favorito.");
        // Revertir si fue optimista, o simplemente mostrar error
      } finally {
        setLoading(false);
      }
    },
    [fetchFavorites]
  ); // fetchFavorites está envuelto en useCallback

  // Función para eliminar un favorito
  const removeFavorite = useCallback(
    async (itemType, itemId) => {
      if (!itemType || !itemId) return;
      setLoading(true);
      setError(null);
      try {
        const params =
          itemType === "file" ? { fileId: itemId } : { folderId: itemId };
        await apiRemoveFavorite(params);
        // Refrescar la lista completa después de eliminar
        // Alternativa: actualizar el estado localmente
        await fetchFavorites();
        // Alternativa local:
        // setFavorites(prev => prev.filter(fav => !(fav.type === itemType && fav.id === itemId)));
      } catch (err) {
        console.error("Error removing favorite:", err);
        setError(err.response?.data?.message || "Error al quitar favorito.");
      } finally {
        setLoading(false);
      }
    },
    [fetchFavorites]
  ); // fetchFavorites está envuelto en useCallback

  // Función helper para comprobar si un item es favorito
  const isFavorite = useCallback(
    (itemType, itemId) => {
      return favorites.some(
        (fav) => fav.type === itemType && fav.id === itemId
      );
    },
    [favorites]
  );

  // Efecto para cargar los favoritos inicialmente (ej: cuando el componente se monta o el usuario cambia)
  useEffect(() => {
    if (user) { // Si hay un usuario logueado
      console.log('[FavoritesContext] User detected, fetching favorites.'); // Log opcional
      fetchFavorites(); // Carga sus favoritos
    } else { // Si no hay usuario (logout)
      console.log('[FavoritesContext] No user detected, clearing favorites.'); // Log opcional
      setFavorites([]); // Limpia la lista de favoritos
    }
  }, [user, fetchFavorites]);

  // Valor que proporcionará el contexto
  const value = {
    favorites,
    loading,
    error,
    fetchFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

// 3. Crear un Hook personalizado para usar el contexto fácilmente
export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error(
      "useFavorites debe ser usado dentro de un FavoritesProvider"
    );
  }
  return context;
};
