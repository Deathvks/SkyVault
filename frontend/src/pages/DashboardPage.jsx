// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getFolderContents,
  createFolder,
  uploadFile,
  deleteFolder, // Ahora hace soft delete
  deleteFile, // Ahora hace soft delete
  downloadFile,
  renameFolder,
  renameFile,
  moveFolder,
  moveFile,
  searchItems,
} from "../services/api";
import ImageThumbnail from "../components/ImageThumbnail";
import Modal from "../components/Modal";
import MoveItemModal from "../components/MoveItemModal";
import { toast } from "react-toastify";
import styles from "./DashboardPage.module.css";
import modalStyles from "../components/Modal.module.css";
import { Link } from "react-router-dom";

// --- Iconos SVG ---
const MoreVertIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
  >
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
  >
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);
const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
  >
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);
const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="20px"
    viewBox="0 0 24 24"
    width="20px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13z" />
    <path d="M9 8h2v9H9zm4 0h2v9h-2z" />
  </svg>
);
// --- Fin Iconos ---

function DashboardPage() {
  const { user, logout } = useAuth();
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolderName, setCurrentFolderName] = useState("Raíz");
  const [path, setPath] = useState([{ id: "root", name: "Raíz" }]);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fileInputRef = useRef(null);

  // Estados para Búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Estados UI móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const mobileMenuRef = useRef(null);

  // Estados para Modales
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { type, id, name }
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null); // { type, id, currentName }
  const [renameInputValue, setRenameInputValue] = useState("");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState(null); // { type, id, name, parent_folder_id?, folder_id? }

  // Estados específicos para indicar carga de acciones
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false); // Usado para soft delete
  const [isRenamingItem, setIsRenamingItem] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Estado combinado para deshabilitar botones durante cualquier carga o acción
  const [isActionLoading, setIsActionLoading] = useState(false);

  // --- Funciones de Carga y Navegación ---
  const loadContents = useCallback(
    async (folderIdToLoad) => {
      setIsLoading(true);
      try {
        const response = await getFolderContents(folderIdToLoad);
        setFolders(response.data.subFolders || []);
        setFiles(response.data.files || []);

        if (folderIdToLoad === "root") {
          setCurrentFolderName("Raíz");
          if (path.length > 1 || path[0]?.id !== "root") {
            setPath([{ id: "root", name: "Raíz" }]);
          }
        } else {
          const currentPathEntry = path.find((p) => p.id === folderIdToLoad);
          if (currentPathEntry) {
            setCurrentFolderName(currentPathEntry.name);
          } else {
            console.warn(
              `ID ${folderIdToLoad} no encontrado en path. Volviendo a raíz.`
            );
            setCurrentFolderId("root");
            setCurrentFolderName("Raíz");
            setPath([{ id: "root", name: "Raíz" }]);
          }
        }
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "No se pudo cargar el contenido.";
        console.error(`Error cargando contenido para ${folderIdToLoad}:`, err);
        toast.error(errorMsg);
        if (err.response?.status === 401 || err.response?.status === 403)
          logout();
        if (folderIdToLoad !== "root") {
          setCurrentFolderId("root");
          setCurrentFolderName("Raíz");
          setPath([{ id: "root", name: "Raíz" }]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [path, logout]
  );

  useEffect(() => {
    if (!searchTerm) {
      loadContents(currentFolderId);
    }
  }, [currentFolderId, searchTerm, loadContents]);

  // --- Lógica de Búsqueda ---
  const performSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setSearchResults(null);
    try {
      const response = await searchItems(term.trim());
      setSearchResults(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Error al buscar.";
      toast.error(errorMsg);
      setSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (event) => {
    const newTerm = event.target.value;
    setSearchTerm(newTerm);
    clearTimeout(searchTimeoutRef.current);
    if (newTerm.trim()) {
      searchTimeoutRef.current = setTimeout(() => performSearch(newTerm), 500);
    } else {
      setSearchResults(null);
      setIsSearching(false);
      loadContents(currentFolderId);
    }
  };

  const clearSearch = () => {
    if (searchTerm) {
      setSearchTerm("");
      setSearchResults(null);
      setIsSearching(false);
      clearTimeout(searchTimeoutRef.current);
      loadContents(currentFolderId);
    }
  };

  // --- Lógica UI Móvil ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      const menuButton = document.querySelector(
        `.${styles.mobileIconButton}[title="Más opciones"]`
      );
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !menuButton?.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileSearch = () => {
    setIsMobileSearchVisible((prev) => !prev);
    setIsMobileMenuOpen(false);
  };

  // --- Acciones de Usuario y Elementos ---
  const handleLogout = () => {
    logout();
    toast.info("Sesión cerrada");
  };

  const handleFolderClick = (folder) => {
    if (isActionLoading) return;
    if (searchTerm) {
      setSearchTerm("");
      setSearchResults(null);
      setIsSearching(false);
      clearTimeout(searchTimeoutRef.current);
    }
    const newPath = [...path, { id: folder.id, name: folder.name }];
    setPath(newPath);
    setCurrentFolderId(folder.id);
    setShowFabMenu(false);
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
  };

  const handleBreadcrumbClick = (folderId, index) => {
    if (isActionLoading || folderId === currentFolderId) return;
    if (searchTerm) {
      setSearchTerm("");
      setSearchResults(null);
      setIsSearching(false);
      clearTimeout(searchTimeoutRef.current);
    }
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    setCurrentFolderId(folderId);
    setShowFabMenu(false);
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
  };

  const handleDownloadFile = async (fileId, fileName) => {
    if (isActionLoading) return;
    let toastId = null;
    try {
      toastId = toast.info(`Preparando descarga de "${fileName}"...`, {
        autoClose: false,
      });
      const response = await downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      toast.update(toastId, {
        render: `"${fileName}" descargado.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando archivo:", err);
      let errorMsg = "Error al descargar el archivo.";
      if (
        err.response?.data &&
        err.response.data instanceof Blob &&
        err.response.data.type === "application/json"
      ) {
        try {
          errorMsg =
            JSON.parse(await err.response.data.text()).message || errorMsg;
          // --- CORRECCIÓN ---
        } catch /* (parseErr) - Eliminado */ {
          // Si falla el parseo del Blob, simplemente mantenemos el errorMsg genérico
          console.log("No se pudo parsear el error Blob como JSON."); // Log opcional
        }
        // --- FIN CORRECCIÓN ---
      } else {
        errorMsg = err.response?.data?.message || errorMsg;
      }
      if (toastId) {
        toast.update(toastId, {
          render: errorMsg,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        toast.error(errorMsg);
      }
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    }
  };

  const toggleFabMenu = () => setShowFabMenu((prev) => !prev);
  const triggerFileInput = () => {
    if (isActionLoading) return;
    fileInputRef.current?.click();
    setShowFabMenu(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || isActionLoading) return;
    const originalInput = event.target;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (currentFolderId !== "root")
      formData.append("folderId", currentFolderId);

    let toastId = toast.info(`Subiendo "${file.name}"...`, {
      autoClose: false,
    });

    try {
      await uploadFile(formData);
      toast.update(toastId, {
        render: `Archivo "${file.name}" subido.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      if (!searchTerm) {
        loadContents(currentFolderId);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Error al subir el archivo.";
      console.error("Error subiendo archivo:", err);
      toast.update(toastId, {
        render: errorMsg,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsUploading(false);
      if (originalInput) originalInput.value = null;
    }
  };

  // --- Funciones para Modales ---
  const openCreateFolderModal = () => {
    if (isActionLoading) return;
    setNewFolderName("");
    setIsCreateFolderModalOpen(true);
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
  };
  const handleConfirmCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || isActionLoading) return;
    setIsCreatingFolder(true);
    setIsCreateFolderModalOpen(false);
    try {
      const parentId = currentFolderId === "root" ? null : currentFolderId;
      await createFolder({
        name: newFolderName.trim(),
        parentFolderId: parentId,
      });
      toast.success(`Carpeta "${newFolderName.trim()}" creada.`);
      if (!searchTerm) {
        loadContents(currentFolderId);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Error al crear la carpeta.";
      toast.error(errorMsg);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const openConfirmDeleteModal = (type, id, name) => {
    if (isActionLoading) return;
    setItemToDelete({ type, id, name });
    setIsConfirmDeleteModalOpen(true);
    setIsMobileMenuOpen(false);
  };
  const handleConfirmDelete = async () => {
    // Soft delete
    if (!itemToDelete || isActionLoading) return;
    setIsDeletingItem(true);
    setIsConfirmDeleteModalOpen(false);
    const { type, id, name } = itemToDelete;
    const action = type === "folder" ? deleteFolder : deleteFile;
    const typeText = type === "folder" ? "Carpeta" : "Archivo";
    try {
      await action(id);
      toast.success(`${typeText} "${name}" movida a la papelera.`);
      if (!searchTerm) {
        loadContents(currentFolderId);
      } else {
        setSearchResults((prevResults) => {
          if (!prevResults) return null;
          return {
            folders: prevResults.folders.filter(
              (f) => !(type === "folder" && f.id === id)
            ),
            files: prevResults.files.filter(
              (f) => !(type === "file" && f.id === id)
            ),
          };
        });
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        `Error al mover ${typeText.toLowerCase()} a la papelera.`;
      toast.error(errorMsg);
    } finally {
      setIsDeletingItem(false);
      setItemToDelete(null);
    }
  };
  const handleDeleteFolder = (folderId, folderName) =>
    openConfirmDeleteModal("folder", folderId, folderName);
  const handleDeleteFile = (fileId, fileName) =>
    openConfirmDeleteModal("file", fileId, fileName);

  const openRenameModal = (type, id, currentName) => {
    if (isActionLoading) return;
    setItemToRename({ type, id, currentName });
    setRenameInputValue(currentName);
    setIsRenameModalOpen(true);
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
  };
  const handleConfirmRename = async (e) => {
    e.preventDefault();
    const trimmedNewName = renameInputValue.trim();
    if (!itemToRename || !trimmedNewName || isActionLoading) {
      setIsRenameModalOpen(false);
      return;
    }
    if (trimmedNewName === itemToRename.currentName) {
      toast.info("No se realizaron cambios en el nombre.");
      setIsRenameModalOpen(false);
      setItemToRename(null);
      return;
    }
    setIsRenamingItem(true);
    setIsRenameModalOpen(false);
    const { type, id } = itemToRename;
    try {
      let response;
      if (type === "folder") {
        response = await renameFolder(id, { newName: trimmedNewName });
      } else {
        response = await renameFile(id, { newName: trimmedNewName });
      }
      const finalName =
        response.data.file?.name ||
        response.data.folder?.name ||
        trimmedNewName;
      toast.success(
        `${
          type === "folder" ? "Carpeta" : "Archivo"
        } renombrado a "${finalName}".`
      );
      if (type === "folder") {
        setPath((currentPath) =>
          currentPath.map((p) => (p.id === id ? { ...p, name: finalName } : p))
        );
        if (currentFolderId === id) {
          setCurrentFolderName(finalName);
        }
      }
      if (!searchTerm) {
        loadContents(currentFolderId);
      } else {
        setSearchResults((prevResults) => {
          if (!prevResults) return null;
          return {
            folders: prevResults.folders.map((f) =>
              type === "folder" && f.id === id ? { ...f, name: finalName } : f
            ),
            files: prevResults.files.map((f) =>
              type === "file" && f.id === id ? { ...f, name: finalName } : f
            ),
          };
        });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || `Error al renombrar.`;
      toast.error(errorMsg);
    } finally {
      setIsRenamingItem(false);
      setItemToRename(null);
    }
  };

  // Abre el modal de mover, pasando la info necesaria incluyendo el padre/carpeta actual
  const openMoveModal = (type, id, name) => {
    if (isActionLoading) return;
    const itemData =
      type === "folder"
        ? folders.find((f) => f.id === id)
        : files.find((f) => f.id === id);
    if (!itemData) {
      console.error("No se encontraron datos para el item a mover:", type, id);
      toast.error("Error al preparar la acción de mover.");
      return;
    }
    setItemToMove({
      type,
      id,
      name,
      parent_folder_id:
        (type === "folder" ? itemData.parent_folder_id : undefined) ?? null,
      folder_id: (type === "file" ? itemData.folder_id : undefined) ?? null,
    });
    setIsMoveModalOpen(true);
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
  };

  // Confirma la acción de mover
  const handleConfirmMove = async (item, destinationId) => {
    if (!item || isActionLoading) return;
    const destinationIdForApi = destinationId === null ? null : destinationId;
    const currentParentId =
      (item.type === "folder" ? item.parent_folder_id : item.folder_id) ?? null;
    if (item.type === "folder" && item.id === destinationIdForApi) return;
    if (currentParentId === destinationIdForApi) return;

    setIsMovingItem(true);
    setIsMoveModalOpen(false);
    const { type, id, name } = item;
    try {
      if (type === "folder")
        await moveFolder(id, { destinationFolderId: destinationIdForApi });
      else await moveFile(id, { destinationFolderId: destinationIdForApi });
      toast.success(
        `${type === "folder" ? "Carpeta" : "Archivo"} "${name}" movido.`
      );
      if (!searchTerm) {
        loadContents(currentFolderId);
      } else {
        setSearchResults((prevResults) => {
          if (!prevResults) return null;
          return {
            folders: prevResults.folders.filter(
              (f) => !(type === "folder" && f.id === id)
            ),
            files: prevResults.files.filter(
              (f) => !(type === "file" && f.id === id)
            ),
          };
        });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || `Error al mover.`;
      toast.error(errorMsg);
    } finally {
      setIsMovingItem(false);
      setItemToMove(null);
    }
  };

  // --- Efecto para estado de carga combinado ---
  useEffect(() => {
    const anyActionInProgress =
      isCreatingFolder ||
      isDeletingItem ||
      isRenamingItem ||
      isMovingItem ||
      isUploading ||
      isSearching;
    setIsActionLoading(anyActionInProgress || isLoading);
  }, [
    isLoading,
    isSearching,
    isCreatingFolder,
    isDeletingItem,
    isRenamingItem,
    isMovingItem,
    isUploading,
  ]);

  // --- Función de Renderizado de Items ---
  const renderItem = (item, type) => {
    const isFolder = type === "folder";
    const isImage =
      !isFolder && item.mime_type && item.mime_type.startsWith("image/");
    const fileSizeMB = item.size ? item.size / (1024 * 1024) : 0;
    const fileSizeKB = item.size ? item.size / 1024 : 0;
    const displaySize = item.size
      ? fileSizeMB >= 1
        ? `${fileSizeMB.toFixed(1)} MB`
        : `${fileSizeKB.toFixed(1)} KB`
      : "0 KB";

    return (
      <li key={`${type}-${item.id}`} className={styles.listItem}>
        {/* Nombre e icono */}
        <span
          className={`${styles.itemName} ${isFolder ? "" : styles.fileInfo}`}
        >
          {isFolder ? (
            <>
              <span className={styles.itemIcon}>📁</span>
              <button
                onClick={() => handleFolderClick(item)}
                className={styles.folderLink}
                disabled={isActionLoading}
                title={item.name}
              >
                {item.name}
              </button>
            </>
          ) : (
            <>
              {isImage ? (
                <ImageThumbnail fileId={item.id} alt={item.name} />
              ) : (
                <span className={styles.itemIcon}>📄</span>
              )}
              <span title={item.name}>{item.name}</span>
              <span className={styles.fileSize}>({displaySize})</span>
            </>
          )}
        </span>
        {/* Acciones */}
        <div className={styles.itemActions}>
          <button
            onClick={() => openRenameModal(type, item.id, item.name)}
            className={`${styles.itemActionButton} ${styles.renameButton}`}
            title="Renombrar"
            disabled={isActionLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
            >
              <path
                fill="currentColor"
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              />
            </svg>
          </button>
          <button
            onClick={() => openMoveModal(type, item.id, item.name)}
            className={`${styles.itemActionButton} ${styles.moveButton}`}
            title="Mover"
            disabled={isActionLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="18px"
              viewBox="0 0 24 24"
              width="18px"
              fill="currentColor"
            >
              <path d="M0 0h24v24H0V0z" fill="none" />
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
            </svg>
          </button>
          {!isFolder && (
            <button
              onClick={() => handleDownloadFile(item.id, item.name)}
              className={`${styles.itemActionButton} ${styles.downloadButton}`}
              title="Descargar"
              disabled={isActionLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
              >
                <path
                  fill="currentColor"
                  d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() =>
              isFolder
                ? handleDeleteFolder(item.id, item.name)
                : handleDeleteFile(item.id, item.name)
            }
            className={`${styles.itemActionButton} ${styles.deleteButton}`}
            title="Mover a Papelera"
            disabled={isActionLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
            >
              <path
                fill="currentColor"
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>
        </div>
      </li>
    );
  };

  // --- Renderizado Principal ---
  return (
    <div className={styles.pageWrapper}>
      {/* --- Header --- */}
      <header className={styles.header}>
        <button
          onClick={() => handleBreadcrumbClick("root", 0)}
          className={styles.headerTitleButton}
          title="Ir a la carpeta raíz"
          disabled={isActionLoading || currentFolderId === "root"}
        >
          <h2 className={styles.headerTitle}>
            SkyVault {user?.username ? `- ${user.username}` : ""}
          </h2>
        </button>

        {/* Desktop Search */}
        <div
          className={`${styles.searchContainer} ${styles.desktopOnlySearch}`}
        >
          <input
            type="search"
            placeholder="Buscar archivos y carpetas..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
            disabled={isActionLoading}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className={styles.clearSearchButton}
              title="Limpiar búsqueda"
            >
              {" "}
              <CloseIcon />{" "}
            </button>
          )}
        </div>

        {/* Desktop Actions */}
        <div
          className={`${styles.desktopActionsContainer} ${styles.desktopOnlyActions}`}
        >
          <Link
            to="/trash"
            className={styles.trashLinkDesktop}
            title="Papelera"
          >
            {" "}
            <TrashIcon />{" "}
          </Link>
          <Link
            to="/profile"
            className={styles.profileLinkDesktop}
            title="Mi Perfil"
          >
            {" "}
            Mi Perfil{" "}
          </Link>
          <button
            onClick={handleLogout}
            className={`${styles.logoutButton}`}
            disabled={isActionLoading}
          >
            {" "}
            Logout{" "}
          </button>
        </div>

        {/* Mobile Actions */}
        <div className={styles.mobileHeaderActions}>
          <button
            onClick={toggleMobileSearch}
            className={styles.mobileIconButton}
            title="Buscar"
            disabled={isActionLoading}
          >
            {" "}
            <SearchIcon />{" "}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={styles.mobileIconButton}
            title="Más opciones"
            disabled={isActionLoading}
          >
            {" "}
            <MoreVertIcon />{" "}
          </button>
          {isMobileMenuOpen && (
            <div className={styles.mobileDropdownMenu} ref={mobileMenuRef}>
              <Link
                to="/trash"
                className={styles.mobileDropdownLink}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {" "}
                <button disabled={isActionLoading}> Papelera </button>{" "}
              </Link>
              <Link
                to="/profile"
                className={styles.mobileDropdownLink}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {" "}
                <button disabled={isActionLoading}> Mi Perfil </button>{" "}
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isActionLoading}
                className={styles.mobileDropdownLogout}
              >
                {" "}
                Logout{" "}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* --- Overlay Búsqueda Móvil --- */}
      {isMobileSearchVisible && (
        <div
          className={styles.mobileSearchOverlay}
          onClick={toggleMobileSearch}
        >
          <div
            className={styles.mobileSearchInputWrapper}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.mobileSearchInner}>
              <SearchIcon />
              <input
                type="search"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
                autoFocus
                disabled={isActionLoading}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className={styles.clearSearchButton}
                  title="Limpiar búsqueda"
                >
                  {" "}
                  <CloseIcon />{" "}
                </button>
              )}
            </div>
            <button
              onClick={toggleMobileSearch}
              className={styles.mobileSearchCancelButton}
            >
              {" "}
              Cancelar{" "}
            </button>
          </div>
        </div>
      )}

      {/* --- Breadcrumbs --- */}
      <nav className={styles.navBar}>
        {!searchTerm && (
          <div className={styles.breadcrumbsContainer}>
            {path.map((p, index) => (
              <span key={p.id} className={styles.breadcrumbItem}>
                <button
                  onClick={() => handleBreadcrumbClick(p.id, index)}
                  disabled={isActionLoading || p.id === currentFolderId}
                  className={styles.breadcrumbLink}
                >
                  {" "}
                  {p.name}{" "}
                </button>
                {index < path.length - 1 && (
                  <span className={styles.breadcrumbSeparator}>/</span>
                )}
              </span>
            ))}
          </div>
        )}
      </nav>

      {/* --- Contenido Principal --- */}
      <main className={styles.mainContent}>
        {searchTerm /* Renderizado Búsqueda */ && (
          <>
            <h2 className={styles.contentHeader}>
              {" "}
              Resultados de búsqueda para: "{searchTerm}"{" "}
            </h2>
            {isSearching && (
              <p className={styles.loadingMessage}>Buscando...</p>
            )}
            {searchResults === false && (
              <p className={styles.errorMessage}>
                {" "}
                Error al realizar la búsqueda.{" "}
              </p>
            )}
            {searchResults &&
              !isSearching &&
              searchResults.folders.length === 0 &&
              searchResults.files.length === 0 && (
                <p className={styles.emptyMessage}>
                  {" "}
                  No se encontraron resultados.{" "}
                </p>
              )}
            {searchResults &&
              !isSearching &&
              (searchResults.folders.length > 0 ||
                searchResults.files.length > 0) && (
                <>
                  {searchResults.folders.length > 0 && (
                    <>
                      {" "}
                      <h3 className={styles.sectionTitle}>
                        {" "}
                        Carpetas Encontradas{" "}
                      </h3>{" "}
                      <ul className={styles.itemList}>
                        {" "}
                        {searchResults.folders.map((folder) =>
                          renderItem(folder, "folder")
                        )}{" "}
                      </ul>{" "}
                    </>
                  )}
                  {searchResults.files.length > 0 && (
                    <>
                      {" "}
                      <h3 className={styles.sectionTitle}>
                        {" "}
                        Archivos Encontrados{" "}
                      </h3>{" "}
                      <ul className={styles.itemList}>
                        {" "}
                        {searchResults.files.map((file) =>
                          renderItem(file, "file")
                        )}{" "}
                      </ul>{" "}
                    </>
                  )}
                </>
              )}
          </>
        )}
        {!searchTerm /* Renderizado Contenido Carpeta */ && (
          <>
            <h2 className={styles.contentHeader}>
              {" "}
              Contenido de: {currentFolderName}{" "}
            </h2>
            {isLoading && !isActionLoading ? (
              <p className={styles.loadingMessage}>Cargando...</p>
            ) : isUploading ? (
              <p className={styles.loadingMessage}>Subiendo archivo...</p>
            ) : !isLoading && folders.length === 0 && files.length === 0 ? (
              <p className={styles.emptyMessage}>Esta carpeta está vacía.</p>
            ) : (
              <>
                {folders.length > 0 && (
                  <>
                    {" "}
                    <h3 className={styles.sectionTitle}>Carpetas</h3>{" "}
                    <ul className={styles.itemList}>
                      {" "}
                      {folders.map((folder) =>
                        renderItem(folder, "folder")
                      )}{" "}
                    </ul>{" "}
                  </>
                )}
                {files.length > 0 && (
                  <>
                    {" "}
                    <h3 className={styles.sectionTitle}>Archivos</h3>{" "}
                    <ul className={styles.itemList}>
                      {" "}
                      {files.map((file) => renderItem(file, "file"))}{" "}
                    </ul>{" "}
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* --- Modales --- */}
      <Modal
        isOpen={isCreateFolderModalOpen}
        onClose={
          !isCreatingFolder ? () => setIsCreateFolderModalOpen(false) : null
        }
        title="Crear Nueva Carpeta"
      >
        <form onSubmit={handleConfirmCreateFolder}>
          <label htmlFor="newFolderName">Nombre:</label>
          <input
            type="text"
            id="newFolderName"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            required
            autoFocus
            disabled={isCreatingFolder}
            className={modalStyles.input}
          />
          <div className={modalStyles.modalActions}>
            <button
              type="button"
              onClick={() => setIsCreateFolderModalOpen(false)}
              className={`${modalStyles.cancelButton}`}
              disabled={isCreatingFolder}
            >
              {" "}
              Cancelar{" "}
            </button>
            <button
              type="submit"
              className={`${modalStyles.confirmButton}`}
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {isCreatingFolder && (
                <span className={modalStyles.spinner}></span>
              )}{" "}
              {isCreatingFolder ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isConfirmDeleteModalOpen}
        onClose={
          !isDeletingItem ? () => setIsConfirmDeleteModalOpen(false) : null
        }
        title="Mover a Papelera"
      >
        {itemToDelete && (
          <>
            <p>
              {" "}
              ¿Estás seguro de que quieres mover{" "}
              {itemToDelete.type === "folder"
                ? " la carpeta"
                : " el archivo"}{" "}
              <strong> "{itemToDelete.name}"</strong> a la papelera?{" "}
            </p>
            <div className={modalStyles.modalActions}>
              <button
                type="button"
                onClick={() => setIsConfirmDeleteModalOpen(false)}
                className={`${modalStyles.cancelButton}`}
                disabled={isDeletingItem}
              >
                {" "}
                Cancelar{" "}
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`${modalStyles.confirmButtonDanger}`}
                disabled={isDeletingItem}
              >
                {isDeletingItem && (
                  <span className={modalStyles.spinner}></span>
                )}{" "}
                {isDeletingItem ? "Moviendo..." : "Mover a Papelera"}
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        isOpen={isRenameModalOpen}
        onClose={!isRenamingItem ? () => setIsRenameModalOpen(false) : null}
        title={`Renombrar ${
          itemToRename?.type === "folder" ? "Carpeta" : "Archivo"
        }`}
      >
        {itemToRename && (
          <form onSubmit={handleConfirmRename}>
            <label htmlFor="renameInput">Nuevo nombre:</label>
            <input
              type="text"
              id="renameInput"
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              required
              autoFocus
              disabled={isRenamingItem}
              className={modalStyles.input}
            />
            <div className={modalStyles.modalActions}>
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className={`${modalStyles.cancelButton}`}
                disabled={isRenamingItem}
              >
                {" "}
                Cancelar{" "}
              </button>
              <button
                type="submit"
                className={`${modalStyles.confirmButton}`}
                disabled={
                  !renameInputValue.trim() ||
                  renameInputValue.trim() === itemToRename.currentName ||
                  isRenamingItem
                }
              >
                {isRenamingItem && (
                  <span className={modalStyles.spinner}></span>
                )}{" "}
                {isRenamingItem ? "Renombrando..." : "Renombrar"}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <MoveItemModal
        isOpen={isMoveModalOpen}
        onClose={!isMovingItem ? () => setIsMoveModalOpen(false) : null}
        itemToMove={itemToMove} // Ahora itemToMove tiene la info del padre
        onConfirmMove={handleConfirmMove}
        isActionLoading={isActionLoading} // Pasar estado de carga general
      />

      {/* --- Input Oculto y FAB --- */}
      <input
        id="file-upload-input"
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
        disabled={isActionLoading}
      />
      <div className={styles.fabContainer}>
        <div
          className={`${styles.fabMenu} ${
            showFabMenu ? styles.fabMenuVisible : ""
          }`}
        >
          <button
            onClick={openCreateFolderModal}
            className={styles.fabMenuItem}
            disabled={isActionLoading}
          >
            {" "}
            Crear Carpeta{" "}
          </button>
          <button
            onClick={triggerFileInput}
            className={styles.fabMenuItem}
            disabled={isActionLoading}
          >
            {" "}
            Subir Archivo{" "}
          </button>
        </div>
        <button
          className={styles.fabButton}
          onClick={toggleFabMenu}
          title="Añadir"
          disabled={isActionLoading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="currentColor"
          >
            <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
          </svg>
        </button>
      </div>
    </div> // Cierre de pageWrapper
  );
}

export default DashboardPage;
