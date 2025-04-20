// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getFolderContents,
  createFolder,
  uploadFile,
  deleteFolder,
  deleteFile,
  downloadFile,
  renameFolder,
  renameFile,
  moveFolder,
  moveFile,
  searchItems,
  bulkMoveItemsToTrash,
  bulkMoveItems,
} from "../services/api";
import ImageThumbnail from "../components/ImageThumbnail";
import Modal from "../components/Modal";
import MoveItemModal from "../components/MoveItemModal";
import FilePreviewModal from "../components/FilePreviewModal";
import ContextMenu from "../components/ContextMenu";
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
const PreviewIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="18px"
    viewBox="0 0 24 24"
    width="18px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5c1.38 0 2.5 1.12 2.5 2.5S13.38 14 12 14s-2.5-1.12-2.5-2.5S10.62 9 12 9m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z" />
  </svg>
);
const CheckboxCheckedIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="var(--primary-blue)"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);
const CheckboxUncheckedIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="var(--system-gray-400)"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
  </svg>
);
const DeleteSelectedIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="20px"
    viewBox="0 0 24 24"
    width="20px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
  </svg>
);
// --- Fin Iconos ---

function DashboardPage() {
  // --- Estados ---
  const { logout, user } = useAuth();
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [path, setPath] = useState([{ id: "root", name: "Raíz" }]);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const searchTimeoutRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const mobileMenuRef = useRef(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [renameInputValue, setRenameInputValue] = useState("");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [fileToPreview, setFileToPreview] = useState(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isRenamingItem, setIsRenamingItem] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [contextMenuItem, setContextMenuItem] = useState(null);
  const longPressTimerRef = useRef(null);
  const touchStartPositionRef = useRef({ x: 0, y: 0 });

  // --- Funciones de Carga y Navegación ---
  const loadContents = useCallback(
    async (folderIdToLoad) => {
      // ... (contenido loadContents sin cambios respecto a la versión anterior) ...
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      setIsLoading(true);
      try {
        const response = await getFolderContents(folderIdToLoad);
        setFolders(response.data.subFolders || []);
        setFiles(response.data.files || []);

        if (folderIdToLoad === "root") {
          if (path.length > 1 || path[0]?.id !== "root") {
            setPath([{ id: "root", name: "Raíz" }]);
          }
        } else {
          let currentPathEntry = null;
          for (let i = path.length - 1; i >= 0; i--) {
            if (path[i].id === folderIdToLoad) {
              currentPathEntry = path[i];
              if (i < path.length - 1) {
                setPath((prevPath) => prevPath.slice(0, i + 1));
              }
              break;
            }
          }
          if (!currentPathEntry) {
            let folderName = "Carpeta Desconocida";
            const foundFolder = (response.data.subFolders || []).find(
              (f) => f.id === folderIdToLoad
            );
            if (foundFolder) folderName = foundFolder.name;
            else {
              const foundInPrevious = folders.find(
                (f) => f.id === folderIdToLoad
              );
              if (foundInPrevious) folderName = foundInPrevious.name;
              else
                console.warn(
                  `Could not determine name for folder ${folderIdToLoad}`
                );
            }
            setPath((prevPath) => [
              ...prevPath,
              { id: folderIdToLoad, name: folderName },
            ]);
          }
        }
      } catch (err) {
        console.error("Error loading folder contents:", err);
        toast.error(
          err.response?.data?.message || `No se pudo cargar la carpeta.`
        );
        if (err.response?.status === 401 || err.response?.status === 403)
          logout();
        if (folderIdToLoad !== "root") {
          setCurrentFolderId("root");
          setPath([{ id: "root", name: "Raíz" }]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [path, folders, logout]
  );

  useEffect(() => {
    if (!searchTerm) {
      loadContents(currentFolderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, searchTerm]);

  // --- Lógica de Búsqueda ---
  // ... (contenido búsqueda sin cambios) ...
  const performSearch = useCallback(
    async (term) => {
      setSearchResults(null);
      try {
        const response = await searchItems(term.trim());
        setSearchResults(response.data || { folders: [], files: [] });
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Error al realizar la búsqueda.";
        console.error("Error en búsqueda:", err);
        toast.error(errorMsg);
        setSearchResults({ folders: [], files: [] });
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
      }
    },
    [logout]
  );

  const handleSearchChange = (event) => {
    const newTerm = event.target.value;
    setSearchTerm(newTerm);
    setSelectedItems(new Set());
    setIsSelectionMode(false);
    clearTimeout(searchTimeoutRef.current);
    if (newTerm.trim()) {
      setSearchResults(null);
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(newTerm);
      }, 500);
    } else {
      setSearchResults(null);
      loadContents(currentFolderId);
    }
  };

  const clearSearch = () => {
    clearTimeout(searchTimeoutRef.current);
    setSearchTerm("");
    setSearchResults(null);
    setSelectedItems(new Set());
    setIsSelectionMode(false);
    if (isMobileSearchVisible) {
      setIsMobileSearchVisible(false);
    }
    setTimeout(() => {
      loadContents(currentFolderId);
    }, 0);
  };

  // --- Lógica UI Móvil ---
  // ... (lógica UI móvil sin cambios) ...
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
    if (!isMobileSearchVisible) {
      setIsMobileMenuOpen(false);
    }
  };

  // --- Acciones de Usuario y Elementos ---
  // ... (handleLogout, handleFolderClick, handleBreadcrumbClick, handleDownloadFile, etc. sin cambios) ...
  const handleLogout = () => {
    logout();
    toast.info("Sesión cerrada correctamente.");
  };

  const handleFolderClick = (folder) => {
    if (isActionLoading || folder.id === currentFolderId) return;
    if (searchTerm) {
      toast.info("Limpia la búsqueda para navegar entre carpetas.");
      return;
    }
    let newPath = [...path];
    const existingIndex = path.findIndex((p) => p.id === folder.id);
    if (existingIndex !== -1) {
      newPath = path.slice(0, existingIndex + 1);
    } else {
      newPath = [...path, { id: folder.id, name: folder.name }];
    }
    setPath(newPath);
    setCurrentFolderId(folder.id);
    setShowFabMenu(false);
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
  };

  const handleBreadcrumbClick = (folderId, index) => {
    if (isActionLoading || folderId === currentFolderId) return;
    if (searchTerm) {
      clearSearch();
      setTimeout(() => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        setCurrentFolderId(folderId);
      }, 100);
    } else {
      const newPath = path.slice(0, index + 1);
      setPath(newPath);
      setCurrentFolderId(folderId);
    }
    setShowFabMenu(false);
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
  };

  const handleDownloadFile = async (fileId, fileName) => {
    if (isActionLoading) return;
    let toastId = null;
    try {
      toastId = toast.loading(`Preparando descarga de "${fileName}"...`);
      const response = await downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName || "descarga");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.update(toastId, {
        render: `"${fileName}" descargado correctamente.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeOnClick: true,
        draggable: true,
      });
    } catch (err) {
      console.error("Error descargando archivo:", err);
      let errorMsg = "Error al descargar el archivo.";
      if (
        err.response?.data instanceof Blob &&
        err.response.data.type === "application/json"
      ) {
        try {
          const errorJson = JSON.parse(await err.response.data.text());
          errorMsg = errorJson.message || errorMsg;
        } catch (parseErr) {
          console.error(
            "No se pudo parsear el error Blob como JSON:",
            parseErr
          );
        }
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
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  };

  const toggleFabMenu = () => setShowFabMenu((prev) => !prev);

  const triggerFileInput = () => {
    if (isActionLoading) return;
    fileInputRef.current?.click();
    setShowFabMenu(false);
  };

  const handleFileUpload = async (event) => {
    // ... (sin cambios) ...
    const file = event.target.files[0];
    if (!file || isActionLoading) return;
    const originalInput = event.target;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (currentFolderId !== "root") {
      formData.append("folderId", currentFolderId);
    }
    let toastId = toast.loading(`Subiendo "${file.name}"...`);
    try {
      await uploadFile(formData);
      toast.update(toastId, {
        render: `Archivo "${file.name}" subido con éxito.`,
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
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    } finally {
      setIsUploading(false);
      if (originalInput) {
        originalInput.value = null;
      }
    }
  };

  // --- Funciones para Modales ---
  // ... (open/confirm CreateFolder, Delete, Rename, Move, Preview sin cambios) ...
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
      toast.success(`Carpeta "${newFolderName.trim()}" creada con éxito.`);
      if (!searchTerm) {
        loadContents(currentFolderId);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Error al crear la carpeta.";
      toast.error(errorMsg);
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    } finally {
      setIsCreatingFolder(false);
      setNewFolderName("");
    }
  };

  const openConfirmDeleteModal = (type, id, name) => {
    if (isActionLoading) return;
    setItemToDelete({ type, id, name });
    setIsConfirmDeleteModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isActionLoading) return;
    setIsDeletingItem(true);
    setIsConfirmDeleteModalOpen(false);
    const { type, id, name } = itemToDelete;
    const action = type === "folder" ? deleteFolder : deleteFile;
    const typeText = type === "folder" ? "La carpeta" : "El archivo";
    try {
      await action(id);
      toast.success(`${typeText} "${name}" se movió a la papelera.`);
      if (searchTerm && searchResults) {
        setSearchResults((prevResults) => {
          if (!prevResults) return null;
          const key = type === "folder" ? "folders" : "files";
          return {
            ...prevResults,
            [key]: prevResults[key].filter((item) => item.id !== id),
          };
        });
      } else {
        const stateUpdater = type === "folder" ? setFolders : setFiles;
        stateUpdater((prevItems) => prevItems.filter((item) => item.id !== id));
      }
      setSelectedItems((prevSelected) => {
        const newSelected = new Set(prevSelected);
        newSelected.delete(getItemId(type, id));
        if (newSelected.size === 0) setIsSelectionMode(false);
        return newSelected;
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        `Error al mover ${typeText.toLowerCase()} a la papelera.`;
      toast.error(errorMsg);
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    } finally {
      setIsDeletingItem(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteItem = (type, id, name) =>
    openConfirmDeleteModal(type, id, name);

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
    const typeText = type === "folder" ? "Carpeta" : "Archivo";
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
      toast.success(`${typeText} renombrado a "${finalName}".`);
      if (searchTerm && searchResults) {
        setSearchResults((prevResults) => {
          if (!prevResults) return null;
          const key = type === "folder" ? "folders" : "files";
          return {
            ...prevResults,
            [key]: prevResults[key].map((item) =>
              item.id === id ? { ...item, name: finalName } : item
            ),
          };
        });
      } else {
        const stateUpdater = type === "folder" ? setFolders : setFiles;
        stateUpdater((prevItems) =>
          prevItems.map((item) =>
            item.id === id ? { ...item, name: finalName } : item
          )
        );
        if (type === "folder") {
          setPath((currentPath) =>
            currentPath.map((p) =>
              p.id === id ? { ...p, name: finalName } : p
            )
          );
        }
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        `Error al renombrar ${typeText.toLowerCase()}.`;
      toast.error(errorMsg);
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    } finally {
      setIsRenamingItem(false);
      setItemToRename(null);
      setRenameInputValue("");
    }
  };

  const openMoveModal = (type, id, name) => {
    if (isActionLoading) return;
    const itemsSource =
      type === "folder"
        ? searchTerm && searchResults
          ? searchResults.folders
          : folders
        : searchTerm && searchResults
        ? searchResults.files
        : files;
    const itemData = itemsSource?.find((i) => i.id === id);
    if (!itemData) {
      console.error("No se encontraron datos para el item a mover:", type, id);
      toast.error("Error al preparar la acción de mover.");
      return;
    }
    const itemPayload = [
      {
        type,
        id,
        name,
        folder_id: itemData.folder_id ?? null,
        parent_folder_id: itemData.parent_folder_id ?? null,
      },
    ];
    setItemsToMove(itemPayload);
    setIsMoveModalOpen(true);
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
  };

  const handleConfirmMove = async (itemsToProcess, destinationId) => {
    // ... (sin cambios) ...
    if (!itemsToProcess || itemsToProcess.length === 0 || isActionLoading)
      return;
    const destinationIdForApi = destinationId === null ? null : destinationId;
    setIsMovingItem(true);
    setIsMoveModalOpen(false);
    const toastId = toast.loading(
      `Moviendo ${
        itemsToProcess.length === 1
          ? `"${itemsToProcess[0].name}"`
          : `${itemsToProcess.length} elementos`
      }...`
    );
    try {
      let response;
      if (itemsToProcess.length === 1) {
        const item = itemsToProcess[0];
        try {
          const action = item.type === "folder" ? moveFolder : moveFile;
          response = await action(item.id, {
            destinationFolderId: destinationIdForApi,
          });
          toast.update(toastId, {
            render: response.data.message || `"${item.name}" movido con éxito.`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
        } catch (itemError) {
          console.error(`Error moviendo ${item.type} ${item.id}:`, itemError);
          throw itemError;
        }
      } else {
        const itemsPayload = itemsToProcess.map((item) => ({
          type: item.type,
          id: item.id,
        }));
        response = await bulkMoveItems(itemsPayload, destinationIdForApi);
        if (response.status === 207 && response.data?.errors?.length > 0) {
          toast.update(toastId, {
            render: `Movimiento parcial: ${
              response.data.message ||
              `${
                itemsToProcess.length - response.data.errors.length
              } movidos, ${response.data.errors.length} con error.`
            }`,
            type: "warning",
            isLoading: false,
            autoClose: 5000,
          });
          console.warn(
            "Errores durante movimiento múltiple:",
            response.data.errors
          );
        } else {
          toast.update(toastId, {
            render:
              response.data.message ||
              `${itemsToProcess.length} elemento(s) movido(s) con éxito.`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
        }
      }
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      if (!searchTerm) {
        loadContents(currentFolderId);
      } else {
        clearSearch();
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || `Error al mover elementos.`;
      toast.update(toastId, {
        render: errorMsg,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    } finally {
      setIsMovingItem(false);
      setItemsToMove(null);
    }
  };

  const handlePreview = (file) => {
    if (isActionLoading || !file) return;
    const mime = file.mime_type || "";
    const supportedTypes = [
      "image/",
      "application/pdf",
      "text/",
      "video/",
      "audio/",
      "application/json",
      "application/javascript",
      "application/xml",
      "application/xhtml+xml",
    ];
    const isPreviewable = supportedTypes.some(
      (typePrefix) => mime.startsWith(typePrefix) || mime === typePrefix
    );
    if (isPreviewable) {
      setFileToPreview(file);
      setIsPreviewModalOpen(true);
      setShowFabMenu(false);
      setIsMobileMenuOpen(false);
    } else {
      toast.info(
        `La previsualización no está disponible para '${file.name}'. Puedes descargarlo.`
      );
    }
  };

  // --- Funciones para Selección Múltiple ---
  // ... (getItemId, handleSelectItem, handleSelectAll, openBulkDeleteModal, handleConfirmBulkDelete, openBulkMoveModal sin cambios) ...
  const getItemId = (type, id) => `${type}-${id}`;

  const handleSelectItem = (type, id) => {
    const uniqueItemId = getItemId(type, id);
    setSelectedItems((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(uniqueItemId)) {
        newSelected.delete(uniqueItemId);
      } else {
        newSelected.add(uniqueItemId);
      }
      setIsSelectionMode(newSelected.size > 0);
      return newSelected;
    });
  };

  const handleSelectAll = (event) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      const allItemIds = new Set();
      const currentItems =
        searchTerm && searchResults ? searchResults : { folders, files };
      (currentItems?.folders || []).forEach((f) =>
        allItemIds.add(getItemId("folder", f.id))
      );
      (currentItems?.files || []).forEach((f) =>
        allItemIds.add(getItemId("file", f.id))
      );
      setSelectedItems(allItemIds);
      setIsSelectionMode(allItemIds.size > 0);
    } else {
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    }
  };

  const allVisibleItemsCount =
    (searchTerm && searchResults
      ? searchResults.folders?.length ?? 0
      : folders.length) +
    (searchTerm && searchResults
      ? searchResults.files?.length ?? 0
      : files.length);
  const isAllCurrentlySelected =
    allVisibleItemsCount > 0 && selectedItems.size === allVisibleItemsCount;

  const openBulkDeleteModal = () => {
    if (selectedItems.size === 0 || isActionLoading) return;
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedItems.size === 0 || isActionLoading) return;
    setIsDeletingItem(true);
    setIsBulkDeleteModalOpen(false);
    const itemsToProcess = Array.from(selectedItems).map((itemId) => {
      const [type, idStr] = itemId.split("-");
      return { type, id: parseInt(idStr, 10) };
    });
    const toastId = toast.loading(
      `Moviendo ${itemsToProcess.length} elementos a la papelera...`
    );
    try {
      const response = await bulkMoveItemsToTrash(itemsToProcess);
      if (response.status === 207 && response.data?.errors?.length > 0) {
        toast.update(toastId, {
          render: `Borrado parcial: ${
            response.data.message ||
            `${itemsToProcess.length - response.data.errors.length} movidos, ${
              response.data.errors.length
            } con error.`
          }`,
          type: "warning",
          isLoading: false,
          autoClose: 5000,
        });
        console.warn(
          "Errores parciales en borrado múltiple:",
          response.data.errors
        );
      } else {
        toast.update(toastId, {
          render:
            response.data.message ||
            `${itemsToProcess.length} elemento(s) movido(s) a la papelera.`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      }
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      if (!searchTerm) {
        loadContents(currentFolderId);
      } else {
        clearSearch();
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        `Error al mover elementos a la papelera.`;
      toast.update(toastId, {
        render: errorMsg,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    } finally {
      setIsDeletingItem(false);
    }
  };

  const openBulkMoveModal = () => {
    if (selectedItems.size === 0 || isActionLoading) return;
    const itemsDataToMove = [];
    const currentFoldersSource =
      searchTerm && searchResults ? searchResults.folders || [] : folders;
    const currentFilesSource =
      searchTerm && searchResults ? searchResults.files || [] : files;
    selectedItems.forEach((itemIdString) => {
      const [type, idStr] = itemIdString.split("-");
      const id = parseInt(idStr, 10);
      let itemFound;
      if (type === "folder")
        itemFound = currentFoldersSource.find((f) => f.id === id);
      else itemFound = currentFilesSource.find((f) => f.id === id);
      if (itemFound) {
        itemsDataToMove.push({
          type,
          id,
          name: itemFound.name,
          folder_id: itemFound.folder_id ?? null,
          parent_folder_id: itemFound.parent_folder_id ?? null,
        });
      }
    });
    if (itemsDataToMove.length > 0) {
      setItemsToMove(itemsDataToMove);
      setIsMoveModalOpen(true);
      setShowFabMenu(false);
      setIsMobileMenuOpen(false);
    } else {
      toast.error(
        "No se pudieron obtener los detalles de los elementos seleccionados para mover."
      );
    }
  };

  // --- Efecto para estado de carga combinado ---
  useEffect(() => {
    const anyUserActionInProgress =
      isCreatingFolder ||
      isDeletingItem ||
      isRenamingItem ||
      isMovingItem ||
      isUploading;
    setIsActionLoading(anyUserActionInProgress || isLoading);
  }, [
    isLoading,
    isCreatingFolder,
    isDeletingItem,
    isRenamingItem,
    isMovingItem,
    isUploading,
  ]);

  // --- Manejadores para Context Menu y Long Press ---
  // Definición de openActionMenu (incluye lógica de posicionamiento y visibilidad)
  const openActionMenu = (event, type, item) => {
    if (event.type === "contextmenu") event.preventDefault();
    if (isSelectionMode || isActionLoading) return;
    setContextMenuItem({ type, ...item });
    let posX = 0,
      posY = 0;
    if (event.clientX && event.clientY) {
      // Click derecho o touchend de longpress
      posX = event.clientX;
      posY = event.clientY;
    } else if (event.target?.getBoundingClientRect) {
      // Click en botón ...
      const rect = event.target.getBoundingClientRect();
      posX = rect.left;
      posY = rect.bottom + 5; // Ajustar para que aparezca debajo
    } else {
      // Fallback
      posX = window.innerWidth / 2;
      posY = window.innerHeight / 2;
    }
    const menuWidth = 180;
    const menuHeight = 220;
    if (posX + menuWidth > window.innerWidth)
      posX = window.innerWidth - menuWidth - 10;
    if (posY + menuHeight > window.innerHeight)
      posY = window.innerHeight - menuHeight - 10;
    setContextMenuPosition({ x: Math.max(10, posX), y: Math.max(10, posY) });
    setIsContextMenuVisible(true);
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
  };

  const handleCloseContextMenu = useCallback(() => {
    setIsContextMenuVisible(false);
    setContextMenuItem(null);
  }, []);

  useEffect(() => {
    // Efecto para cerrar menú con click fuera o Escape
    if (isContextMenuVisible) {
      const handleGlobalClick = (e) => {
        if (e.button !== 2) handleCloseContextMenu();
      };
      const handleKeyDown = (e) => {
        if (e.key === "Escape") handleCloseContextMenu();
      };
      document.addEventListener("click", handleGlobalClick);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("click", handleGlobalClick);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isContextMenuVisible, handleCloseContextMenu]);

  // --- Manejadores para Long Press ---
  const handleTouchStart = (event, type, item) => {
    if (isSelectionMode || isContextMenuVisible || isActionLoading) return;
    touchStartPositionRef.current = {
      x: event.targetTouches[0].clientX,
      y: event.targetTouches[0].clientY,
    };
    longPressTimerRef.current = setTimeout(() => {
      // Usar coordenadas guardadas al inicio del toque para posicionar
      const positionEvent = {
        clientX: touchStartPositionRef.current.x,
        clientY: touchStartPositionRef.current.y,
        type: "longpress",
      };
      openActionMenu(positionEvent, type, item);
      longPressTimerRef.current = null;
    }, 700); // Tiempo para long press
  };

  const handleTouchMove = (event) => {
    if (longPressTimerRef.current) {
      const touch = event.targetTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        // Cancelar si hay scroll
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      // Cancelar si se levanta el dedo antes
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  // --- Fin Manejadores Long Press ---

  // Wrappers para pasar las acciones al ContextMenu
  const triggerRename = (type, id, name) => openRenameModal(type, id, name);
  const triggerMove = (type, id, name) => openMoveModal(type, id, name);
  const triggerDelete = (type, id, name) => handleDeleteItem(type, id, name);
  const triggerDownload = (type, id, name) => handleDownloadFile(id, name);
  const triggerPreview = (type, id) => {
    const sourceFiles =
      searchTerm && searchResults ? searchResults.files || [] : files;
    const fileData = sourceFiles.find((f) => f.id === id);
    if (fileData) handlePreview(fileData);
    else toast.error("No se pudo encontrar el archivo para previsualizar.");
  };
  // --- Fin Wrappers Context Menu ---

  // --- Función de Renderizado de Items ---
  const renderItem = (item, type) => {
    const isFolder = type === "folder";
    const uniqueItemId = getItemId(type, item.id);
    const isSelected = selectedItems.has(uniqueItemId);
    const mime = item.mime_type || "";
    const isImage = !isFolder && mime.startsWith("image/");
    const isPreviewable =
      !isFolder &&
      (mime.startsWith("image/") ||
        mime === "application/pdf" ||
        mime.startsWith("text/") ||
        mime.startsWith("video/") ||
        mime.startsWith("audio/") ||
        [
          "application/json",
          "application/javascript",
          "application/xml",
          "application/xhtml+xml",
        ].includes(mime));
    const fileSizeMB = item.size ? item.size / (1024 * 1024) : 0;
    const fileSizeKB = item.size ? item.size / 1024 : 0;
    const displaySize = item.size
      ? fileSizeMB >= 1
        ? `${fileSizeMB.toFixed(1)} MB`
        : `${fileSizeKB.toFixed(1)} KB`
      : "";

    return (
      <li
        key={uniqueItemId}
        className={`${styles.listItem} ${
          isSelected ? styles.selectedItem : ""
        }`}
        onContextMenu={(e) => openActionMenu(e, type, item)} // Trigger menú contextual (desktop)
        onTouchStart={(e) => handleTouchStart(e, type, item)} // Trigger long press (mobile)
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ WebkitTouchCallout: "none", userSelect: "none" }} // Prevenir menú nativo y selección
      >
        {/* Checkbox Selección */}
        <div className={styles.itemSelection}>
          <button
            className={styles.checkboxButton}
            onClick={() => handleSelectItem(type, item.id)}
            aria-checked={isSelected}
            role="checkbox"
            title={isSelected ? "Deseleccionar" : "Seleccionar"}
            disabled={isActionLoading}
          >
            {isSelected ? <CheckboxCheckedIcon /> : <CheckboxUncheckedIcon />}
          </button>
        </div>

        {/* Nombre e Icono */}
        <span
          className={`${styles.itemName} ${isFolder ? "" : styles.fileInfo}`}
        >
          {/* ... (contenido nombre/icono sin cambios) ... */}
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
              <button
                onClick={() => handlePreview(item)}
                className={styles.folderLink}
                disabled={isActionLoading || !isPreviewable}
                title={
                  isPreviewable
                    ? `Previsualizar ${item.name}`
                    : `Previsualización no disponible`
                }
              >
                {item.name}
              </button>
              {displaySize && (
                <span className={styles.fileSize}>({displaySize})</span>
              )}
            </>
          )}
        </span>

        {/* Contenedor de Acciones (con botones individuales y botón móvil) */}
        <div
          className={`${styles.itemActions} ${
            isSelectionMode ? styles.itemActionsHiddenInSelection : ""
          }`}
        >
          {/* Botones individuales (ocultos en móvil con CSS) */}
          {isPreviewable && (
            <button
              onClick={() => handlePreview(item)}
              className={`${styles.itemActionButton} ${styles.actionButtonDesktopOnly} ${styles.previewButton}`}
              title="Previsualizar"
              disabled={isActionLoading}
            >
              <PreviewIcon />
            </button>
          )}
          <button
            onClick={() => openRenameModal(type, item.id, item.name)}
            className={`${styles.itemActionButton} ${styles.actionButtonDesktopOnly} ${styles.renameButton}`}
            title="Renombrar"
            disabled={isActionLoading}
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              />
            </svg>
          </button>
          <button
            onClick={() => openMoveModal(type, item.id, item.name)}
            className={`${styles.itemActionButton} ${styles.actionButtonDesktopOnly} ${styles.moveButton}`}
            title="Mover"
            disabled={isActionLoading}
          >
            <svg
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
              className={`${styles.itemActionButton} ${styles.actionButtonDesktopOnly} ${styles.downloadButton}`}
              title="Descargar"
              disabled={isActionLoading}
            >
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => handleDeleteItem(type, item.id, item.name)}
            className={`${styles.itemActionButton} ${styles.actionButtonDesktopOnly} ${styles.deleteButton}`}
            title="Mover a Papelera"
            disabled={isActionLoading}
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>

          {/* Botón de tres puntos para móvil */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // *** IMPORTANTE: Detener propagación aquí ***
              openActionMenu(e, type, item);
            }}
            className={`${styles.itemActionButton} ${styles.mobileItemMenuButton}`}
            title="Más acciones"
            disabled={isActionLoading}
          >
            <MoreVertIcon />
          </button>
        </div>
      </li>
    );
  };

  // --- Renderizado Principal ---
  return (
    <div className={styles.pageWrapper}>
      {/* Header */}
      {/* ... (resto del JSX sin cambios) ... */}
      <header className={styles.header}>
        {isSelectionMode ? (
          <div className={styles.contextualActionBar}>
            <span className={styles.selectionCount}>
              {" "}
              {selectedItems.size} seleccionado(s){" "}
            </span>
            <div className={styles.contextualButtons}>
              <button
                onClick={openBulkMoveModal}
                className={`${styles.contextualButton} ${styles.moveButtonContextual}`}
                disabled={isActionLoading || selectedItems.size === 0}
                title="Mover elementos seleccionados"
              >
                {" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="20px"
                  viewBox="0 0 24 24"
                  width="20px"
                  fill="currentColor"
                >
                  <path d="M0 0h24v24H0V0z" fill="none" />
                  <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z" />
                </svg>{" "}
                <span>Mover</span>{" "}
              </button>
              <button
                onClick={openBulkDeleteModal}
                className={`${styles.contextualButton} ${styles.deleteButtonContextual}`}
                disabled={isActionLoading || selectedItems.size === 0}
                title="Mover seleccionados a Papelera"
              >
                {" "}
                <DeleteSelectedIcon /> <span>Eliminar</span>{" "}
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedItems(new Set());
                setIsSelectionMode(false);
              }}
              className={`${styles.contextualButton} ${styles.cancelButtonContextual}`}
              disabled={isActionLoading}
              title="Cancelar Selección"
            >
              {" "}
              <CloseIcon />{" "}
            </button>
          </div>
        ) : (
          <>
            <button
              className={styles.headerTitleButton}
              onClick={() => handleBreadcrumbClick("root", 0)}
              disabled={isActionLoading || currentFolderId === "root"}
              title={currentFolderId !== "root" ? "Ir a Raíz" : ""}
            >
              <h1 className={styles.headerTitle}>
                {" "}
                SkyVault {user?.username ? `- ${user.username}` : ""}{" "}
              </h1>
            </button>
            <div
              className={`${styles.searchContainer} ${styles.desktopOnlySearch}`}
            >
              <input
                type="search"
                placeholder="Buscar archivos y carpetas..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isActionLoading}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className={styles.clearSearchButton}
                  title="Limpiar búsqueda"
                  disabled={isActionLoading}
                >
                  {" "}
                  <CloseIcon />{" "}
                </button>
              )}
            </div>
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
              <Link to="/profile" className={styles.profileLinkDesktop}>
                {" "}
                Mi Perfil{" "}
              </Link>
              <button
                onClick={handleLogout}
                className={styles.logoutButton}
                disabled={isActionLoading}
              >
                {" "}
                Logout{" "}
              </button>
            </div>
            <div className={styles.mobileHeaderActions}>
              <button
                onClick={toggleMobileSearch}
                className={styles.mobileIconButton}
                title="Buscar"
              >
                {" "}
                <SearchIcon />{" "}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={styles.mobileIconButton}
                title="Más opciones"
                aria-haspopup="true"
                aria-expanded={isMobileMenuOpen}
              >
                {" "}
                <MoreVertIcon />{" "}
              </button>
              {isMobileMenuOpen && (
                <div className={styles.mobileDropdownMenu} ref={mobileMenuRef}>
                  <Link
                    to="/profile"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {" "}
                    <button>Mi Perfil</button>{" "}
                  </Link>
                  <Link
                    to="/trash"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {" "}
                    <button>Papelera</button>{" "}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className={styles.mobileDropdownLogout}
                  >
                    {" "}
                    Logout{" "}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </header>

      {/* Overlay Búsqueda Móvil */}
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
              <input
                type="search"
                placeholder="Buscar..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleSearchChange}
                autoFocus
                disabled={isActionLoading}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className={styles.clearSearchButton}
                  title="Limpiar búsqueda"
                  disabled={isActionLoading}
                >
                  {" "}
                  <CloseIcon />{" "}
                </button>
              )}
            </div>
            <button
              onClick={toggleMobileSearch}
              className={styles.mobileSearchCancelButton}
              disabled={isActionLoading}
            >
              {" "}
              Cancelar{" "}
            </button>
          </div>
        </div>
      )}

      {/* Barra de Navegación */}
      {!isSelectionMode && (
        <nav className={styles.navBar}>
          <div className={styles.navBarContent}>
            <div className={styles.breadcrumbsContainer}>
              {path.map((folder, index) => (
                <span key={folder.id} className={styles.breadcrumbItem}>
                  <button
                    onClick={() => handleBreadcrumbClick(folder.id, index)}
                    className={styles.breadcrumbLink}
                    disabled={isActionLoading || index === path.length - 1}
                  >
                    {" "}
                    {folder.name}{" "}
                  </button>
                  {index < path.length - 1 && (
                    <span className={styles.breadcrumbSeparator}>/</span>
                  )}
                </span>
              ))}
            </div>
            {allVisibleItemsCount > 0 && (
              <div className={styles.selectAllContainer}>
                <label
                  htmlFor="select-all-checkbox"
                  className={styles.selectAllLabel}
                  title={
                    isAllCurrentlySelected
                      ? "Deseleccionar todo"
                      : "Seleccionar todo"
                  }
                >
                  {isAllCurrentlySelected ? (
                    <CheckboxCheckedIcon />
                  ) : (
                    <CheckboxUncheckedIcon />
                  )}
                  <input
                    type="checkbox"
                    id="select-all-checkbox"
                    checked={isAllCurrentlySelected}
                    onChange={handleSelectAll}
                    className={styles.hiddenCheckbox}
                    disabled={isActionLoading}
                  />
                </label>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Contenido Principal */}
      <main className={styles.mainContent}>
        {searchTerm && searchResults !== null ? (
          <>
            <h3 className={styles.contentHeader}>
              {" "}
              Resultados de Búsqueda para "{searchTerm}"{" "}
            </h3>
            {searchResults === null ? (
              <p className={styles.loadingMessage}>Buscando...</p>
            ) : !searchResults.folders?.length &&
              !searchResults.files?.length ? (
              <p className={styles.emptyMessage}>
                {" "}
                No se encontraron resultados.{" "}
              </p>
            ) : (
              <>
                {searchResults.folders?.length > 0 && (
                  <>
                    {" "}
                    <h4 className={styles.sectionTitle}>Carpetas</h4>{" "}
                    <ul className={styles.itemList}>
                      {" "}
                      {searchResults.folders.map((folder) =>
                        renderItem(folder, "folder")
                      )}{" "}
                    </ul>{" "}
                  </>
                )}
                {searchResults.files?.length > 0 && (
                  <>
                    {" "}
                    <h4 className={styles.sectionTitle}>Archivos</h4>{" "}
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
        ) : searchTerm && searchResults === null ? (
          <>
            <h3 className={styles.contentHeader}>
              {" "}
              Resultados de Búsqueda para "{searchTerm}"{" "}
            </h3>
            <p className={styles.loadingMessage}>Buscando...</p>
          </>
        ) : (
          <>
            {isLoading ? (
              <p className={styles.loadingMessage}>Cargando...</p>
            ) : !folders.length && !files.length ? (
              <p className={styles.emptyMessage}>Esta carpeta está vacía.</p>
            ) : (
              <>
                {folders.length > 0 && (
                  <>
                    {" "}
                    <h4 className={styles.sectionTitle}>Carpetas</h4>{" "}
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
                    <h4 className={styles.sectionTitle}>Archivos</h4>{" "}
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

      {/* Modales */}
      {/* ... (modales sin cambios) ... */}
      <Modal
        isOpen={isCreateFolderModalOpen}
        onClose={
          !isCreatingFolder ? () => setIsCreateFolderModalOpen(false) : null
        }
        title="Crear Nueva Carpeta"
      >
        <form onSubmit={handleConfirmCreateFolder}>
          {" "}
          <div className={modalStyles.formGroup}>
            {" "}
            <label htmlFor="newFolderName">Nombre de la Carpeta:</label>{" "}
            <input
              type="text"
              id="newFolderName"
              className={modalStyles.input}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
              autoFocus
              disabled={isCreatingFolder}
            />{" "}
          </div>{" "}
          <div className={modalStyles.modalActions}>
            {" "}
            <button
              type="button"
              onClick={() => setIsCreateFolderModalOpen(false)}
              className={modalStyles.cancelButton}
              disabled={isCreatingFolder}
            >
              {" "}
              Cancelar{" "}
            </button>{" "}
            <button
              type="submit"
              className={modalStyles.confirmButton}
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {" "}
              {isCreatingFolder && (
                <span className={modalStyles.spinner}></span>
              )}{" "}
              {isCreatingFolder ? "Creando..." : "Crear Carpeta"}{" "}
            </button>{" "}
          </div>{" "}
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
            {" "}
            <p>
              {" "}
              ¿Estás seguro de que quieres mover{" "}
              {itemToDelete.type === "folder"
                ? " la carpeta"
                : " el archivo"}{" "}
              <strong> "{itemToDelete.name}" </strong> a la papelera?{" "}
            </p>{" "}
            <p style={{ fontSize: "0.9em", color: "var(--text-secondary)" }}>
              {" "}
              Podrás restaurarlo o eliminarlo permanentemente desde allí.{" "}
            </p>{" "}
            <div className={modalStyles.modalActions}>
              {" "}
              <button
                type="button"
                onClick={() => setIsConfirmDeleteModalOpen(false)}
                className={modalStyles.cancelButton}
                disabled={isDeletingItem}
              >
                {" "}
                Cancelar{" "}
              </button>{" "}
              <button
                onClick={handleConfirmDelete}
                className={modalStyles.confirmButtonDanger}
                disabled={isDeletingItem}
              >
                {" "}
                {isDeletingItem && (
                  <span className={modalStyles.spinner}></span>
                )}{" "}
                {isDeletingItem ? "Moviendo..." : "Mover a Papelera"}{" "}
              </button>{" "}
            </div>{" "}
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
            {" "}
            <div className={modalStyles.formGroup}>
              {" "}
              <label htmlFor="renameInput">Nuevo nombre:</label>{" "}
              <input
                type="text"
                id="renameInput"
                className={modalStyles.input}
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                required
                autoFocus
                onFocus={(e) => e.target.select()}
                disabled={isRenamingItem}
              />{" "}
            </div>{" "}
            <div className={modalStyles.modalActions}>
              {" "}
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className={modalStyles.cancelButton}
                disabled={isRenamingItem}
              >
                {" "}
                Cancelar{" "}
              </button>{" "}
              <button
                type="submit"
                className={modalStyles.confirmButton}
                disabled={
                  !renameInputValue.trim() ||
                  isRenamingItem ||
                  renameInputValue.trim() === itemToRename.currentName
                }
              >
                {" "}
                {isRenamingItem && (
                  <span className={modalStyles.spinner}></span>
                )}{" "}
                {isRenamingItem ? "Renombrando..." : "Renombrar"}{" "}
              </button>{" "}
            </div>{" "}
          </form>
        )}
      </Modal>
      <MoveItemModal
        isOpen={isMoveModalOpen}
        onClose={!isMovingItem ? () => setIsMoveModalOpen(false) : null}
        itemsToMove={itemsToMove}
        onConfirmMove={handleConfirmMove}
        isActionLoading={isMovingItem}
      />
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={fileToPreview}
      />
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={!isDeletingItem ? () => setIsBulkDeleteModalOpen(false) : null}
        title="Mover Elementos a Papelera"
      >
        <>
          {" "}
          <p>
            {" "}
            ¿Estás seguro de que quieres mover los{" "}
            <strong> {selectedItems.size} </strong> elementos seleccionados a la
            papelera?{" "}
          </p>{" "}
          <div className={modalStyles.modalActions}>
            {" "}
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className={modalStyles.cancelButton}
              disabled={isDeletingItem}
            >
              {" "}
              Cancelar{" "}
            </button>{" "}
            <button
              onClick={handleConfirmBulkDelete}
              className={modalStyles.confirmButtonDanger}
              disabled={isDeletingItem || selectedItems.size === 0}
            >
              {" "}
              {isDeletingItem && (
                <span className={modalStyles.spinner}></span>
              )}{" "}
              {isDeletingItem
                ? "Moviendo..."
                : `Mover ${selectedItems.size} a Papelera`}{" "}
            </button>{" "}
          </div>{" "}
        </>
      </Modal>

      {/* Input Oculto y FAB */}
      <input
        id="file-upload-input"
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
        disabled={isActionLoading}
      />
      {!isSelectionMode && (
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
            aria-haspopup="true"
            aria-expanded={showFabMenu}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="currentColor"
            >
              {" "}
              <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />{" "}
            </svg>
          </button>
        </div>
      )}

      {/* --- Context Menu --- */}
      {isContextMenuVisible && contextMenuItem && (
        <ContextMenu
          position={contextMenuPosition}
          item={contextMenuItem}
          onClose={handleCloseContextMenu}
          onRename={triggerRename}
          onMove={triggerMove}
          onDelete={triggerDelete}
          onDownload={triggerDownload}
          onPreview={triggerPreview}
          isActionLoading={isActionLoading}
        />
      )}
      {/* --- Fin Context Menu --- */}
    </div> // Cierre de pageWrapper
  );
}

export default DashboardPage;
