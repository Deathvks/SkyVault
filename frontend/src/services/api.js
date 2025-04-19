// frontend/src/services/api.js
import axios from "axios";

// La URL base de tu backend API
const API_URL = "http://localhost:3001/api"; // Asegúrate que coincida con tu backend

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para añadir el token JWT a las cabeceras
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("skyvault_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    // *** Añadido: Log para depurar cabeceras ***
    // console.log('Request Headers:', config.headers);
    // *** Fin añadido ***
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Usuarios ---
export const registerUser = (userData) =>
  apiClient.post("/users/register", userData);
export const loginUser = (credentials) =>
  apiClient.post("/users/login", credentials);
// --- NUEVAS FUNCIONES DE USUARIO ---
export const getUserProfile = () => apiClient.get("/users/profile");
export const updateUserProfile = (profileData) =>
  apiClient.put("/users/profile", profileData); // profileData = { email?, username? }
export const changeUserPassword = (passwordData) =>
  apiClient.put("/users/password", passwordData); // passwordData = { currentPassword, newPassword }
// --- FIN NUEVAS FUNCIONES ---

// --- Carpetas ---
export const createFolder = (folderData) =>
  apiClient.post("/folders", folderData);
export const getFolderContents = (folderId = "root") =>
  apiClient.get(`/folders/contents/${folderId}`);
export const deleteFolder = (folderId) =>
  apiClient.delete(`/folders/${folderId}`);
export const renameFolder = (folderId, data) =>
  apiClient.put(`/folders/${folderId}`, data); // data = { newName: '...' }
export const moveFolder = (folderId, data) =>
  apiClient.put(`/folders/${folderId}/move`, data); // data = { destinationFolderId: '...' }
export const getFolderTree = () => apiClient.get("/folders/tree");
export const searchItems = (term) =>
  apiClient.get("/search", { params: { term } });

// --- Archivos ---
export const uploadFile = (formData) =>
  apiClient.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const downloadFile = (fileId) =>
  apiClient.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });
export const deleteFile = (fileId) => apiClient.delete(`/files/${fileId}`);
export const getFileDataAsBlob = (fileId) =>
  apiClient.get(`/files/${fileId}/view`, {
    responseType: "blob",
  });
export const renameFile = (fileId, data) =>
  apiClient.put(`/files/${fileId}`, data); // data = { newName: '...' }
export const moveFile = (fileId, data) =>
  apiClient.put(`/files/${fileId}/move`, data); // data = { destinationFolderId: '...' }

export default apiClient;
