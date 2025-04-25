// frontend/src/services/api.js
import axios from "axios";

// Asegúrate que la URL y el puerto coinciden con tu backend
const API_URL = "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor para añadir el token de autenticación a las cabeceras
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("skyvault_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Podrías añadir manejo de errores de petición aquí si es necesario
    return Promise.reject(error);
  }
);

// --- Usuarios ---
export const registerUser = (userData) =>
  apiClient.post("/users/register", userData);

export const loginUser = (credentials) =>
  apiClient.post("/users/login", credentials);

export const getUserProfile = () => apiClient.get("/users/profile");

export const updateUserProfile = (profileData) =>
  apiClient.put("/users/profile", profileData);

export const changeUserPassword = (passwordData) =>
  apiClient.put("/users/password", passwordData);

// --- Carpetas ---
export const createFolder = (folderData) =>
  apiClient.post("/folders", folderData);

export const getFolderContents = (folderId = "root") =>
  apiClient.get(`/folders/contents/${folderId}`);

export const deleteFolder = (folderId) =>
  apiClient.delete(`/folders/${folderId}`); // Soft delete

export const renameFolder = (folderId, data) =>
  apiClient.put(`/folders/${folderId}`, data);

export const moveFolder = (folderId, data) =>
  apiClient.put(`/folders/${folderId}/move`, data);

export const getFolderTree = () => apiClient.get("/folders/tree"); // Para el modal de mover

// --- Archivos ---

// MODIFICADO: uploadFile ahora acepta onUploadProgress
export const uploadFile = (
  formData,
  onUploadProgress // <-- Añadido callback
) =>
  apiClient.post("/files/upload", formData, {
    // Importante: Configurar headers para multipart/form-data
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress, // <-- Pasar el callback a Axios
  });

// MODIFICADO: downloadFile ahora acepta onDownloadProgress
export const downloadFile = (
  fileId,
  onDownloadProgress // <-- Añadido callback
) =>
  apiClient.get(`/files/${fileId}/download`, {
    responseType: "blob", // Esperar un Blob como respuesta
    onDownloadProgress, // <-- Pasar el callback a Axios
  });

export const deleteFile = (fileId) => apiClient.delete(`/files/${fileId}`); // Soft delete

export const getFileDataAsBlob = (fileId) =>
  apiClient.get(`/files/${fileId}/view`, { responseType: "blob" }); // Para previsualización / miniaturas

export const renameFile = (fileId, data) =>
  apiClient.put(`/files/${fileId}`, data);

export const moveFile = (fileId, data) =>
  apiClient.put(`/files/${fileId}/move`, data);

// --- Búsqueda ---
export const searchItems = (term) =>
  apiClient.get("/search", { params: { term } }); // Pasar término como query parameter

// --- Papelera ---
export const getTrashItems = () => apiClient.get("/trash");

export const restoreFolder = (folderId) =>
  apiClient.put(`/trash/folders/${folderId}/restore`);

export const restoreFile = (fileId) =>
  apiClient.put(`/trash/files/${fileId}/restore`);

export const deleteFolderPermanently = (folderId) =>
  apiClient.delete(`/trash/folders/${folderId}/permanent`);

export const deleteFilePermanently = (fileId) =>
  apiClient.delete(`/trash/files/${fileId}/permanent`);

export const emptyUserTrash = () => apiClient.delete("/trash/empty");

// --- Operaciones Masivas (Bulk) ---

/**
 * Mueve múltiples items a la papelera (soft delete).
 * @param {Array<{type: string, id: number}>} items - Array de objetos con tipo ('folder' o 'file') e id.
 * @returns {Promise<axios.AxiosResponse>} La respuesta de Axios.
 */
export const bulkMoveItemsToTrash = (items) =>
  apiClient.post("/bulk/trash", { items });

/**
 * Mueve múltiples items (archivos y/o carpetas) a una carpeta destino.
 * @param {Array<{type: 'folder'|'file', id: number}>} items - Array de objetos identificando los items a mover.
 * @param {number | null} destinationFolderId - ID de la carpeta destino (null para mover a la raíz).
 * @returns {Promise<axios.AxiosResponse>} La respuesta de Axios (puede ser 200 OK o 207 Multi-Status).
 */
export const bulkMoveItems = (items, destinationFolderId) =>
  apiClient.post("/bulk/move", { items, destinationFolderId });

// --- Favoritos ---

/**
 * Obtiene la lista de favoritos del usuario.
 * @returns {Promise<axios.AxiosResponse>} La respuesta de Axios con la lista de favoritos.
 */
export const getFavorites = () => apiClient.get("/favorites");

/**
 * Añade un archivo o carpeta a favoritos.
 * @param {{ fileId?: number, folderId?: number }} data - Objeto con fileId o folderId.
 * @returns {Promise<axios.AxiosResponse>} La respuesta de Axios.
 */
export const addFavorite = (data) => apiClient.post("/favorites", data);

/**
 * Elimina un archivo o carpeta de favoritos.
 * @param {{ fileId?: number, folderId?: number }} params - Objeto con fileId o folderId para los query params.
 * @returns {Promise<axios.AxiosResponse>} La respuesta de Axios.
 */
export const removeFavorite = (params) =>
  apiClient.delete("/favorites", { params });

// --- FIN NUEVA FUNCIÓN API ---

export default apiClient; // Exportar instancia configurada por si se necesita en otro lugar
