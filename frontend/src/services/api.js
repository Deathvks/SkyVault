// frontend/src/services/api.js
import axios from "axios";

const API_URL = "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("skyvault_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
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
  apiClient.delete(`/folders/${folderId}`); // Ahora hace soft delete
export const renameFolder = (folderId, data) =>
  apiClient.put(`/folders/${folderId}`, data);
export const moveFolder = (folderId, data) =>
  apiClient.put(`/folders/${folderId}/move`, data);
export const getFolderTree = () => apiClient.get("/folders/tree");
export const searchItems = (term) =>
  apiClient.get("/search", { params: { term } });

// --- Archivos ---
export const uploadFile = (formData) =>
  apiClient.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const downloadFile = (fileId) =>
  apiClient.get(`/files/${fileId}/download`, { responseType: "blob" });
export const deleteFile = (fileId) => apiClient.delete(`/files/${fileId}`); // Ahora hace soft delete
export const getFileDataAsBlob = (fileId) =>
  apiClient.get(`/files/${fileId}/view`, { responseType: "blob" });
export const renameFile = (fileId, data) =>
  apiClient.put(`/files/${fileId}`, data);
export const moveFile = (fileId, data) =>
  apiClient.put(`/files/${fileId}/move`, data);

// --- NUEVAS FUNCIONES PAPELERA ---
export const getTrashItems = () => apiClient.get("/trash");
export const restoreFolder = (folderId) =>
  apiClient.put(`/trash/folders/${folderId}/restore`);
export const restoreFile = (fileId) =>
  apiClient.put(`/trash/files/${fileId}/restore`);
export const deleteFolderPermanently = (folderId) =>
  apiClient.delete(`/trash/folders/${folderId}/permanent`);
export const deleteFilePermanently = (fileId) =>
  apiClient.delete(`/trash/files/${fileId}/permanent`);
// --- FIN FUNCIONES PAPELERA ---

export default apiClient;
