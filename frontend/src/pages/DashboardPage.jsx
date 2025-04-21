// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom"; // Asegúrate que Link está importado
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
} from "../services/api"; // Asume que api.js tiene todas estas funciones
import { formatBytes, calculateUsagePercent } from "../utils/formatBytes"; // Importar helpers de formato
import ImageThumbnail from "../components/ImageThumbnail";
import Modal from "../components/Modal";
import MoveItemModal from "../components/MoveItemModal";
import FilePreviewModal from "../components/FilePreviewModal";
import ContextMenu from "../components/ContextMenu";
import { toast } from "react-toastify";
import styles from "./DashboardPage.module.css";
import modalStyles from "../components/Modal.module.css";

// --- Iconos SVG (Definidos aquí para simplicidad) ---
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
    <path fill="none" d="M0 0h24v24H0z" />
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
    <path fill="none" d="M0 0h24v24H0z" />
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
const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="20px"
    viewBox="0 0 24 24"
    width="20px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.08-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
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
    fill="currentColor"
  >
    {/* Fill cambiado a currentColor para heredar de .selectedItem */}
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);
const CheckboxUncheckedIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="currentColor"
  >
    {/* Fill cambiado a currentColor para heredar */}
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
const ReloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="20px"
    viewBox="0 0 24 24"
    width="20px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </svg>
);
// --- Fin Iconos ---

function DashboardPage() {
  // --- Estados ---
  const { logout, user, refreshUserProfile } = useAuth(); // <-- Obtener user y refreshUserProfile
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [path, setPath] = useState([{ id: "root", name: "Raíz" }]);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null: no busca, {folders, files}: resultados
  const searchTimeoutRef = useRef(null);
  const desktopSearchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const mobileMenuRef = useRef(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // {type, id, name}
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null); // {type, id, currentName}
  const [renameInputValue, setRenameInputValue] = useState("");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState(null); // Puede ser array [{type, id, name, folder_id?, parent_folder_id?}]
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [fileToPreview, setFileToPreview] = useState(null); // {id, name, mime_type}
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isRenamingItem, setIsRenamingItem] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false); // Estado combinado de carga
  const [selectedItems, setSelectedItems] = useState(new Set()); // Set de 'type-id' strings
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [contextMenuItem, setContextMenuItem] = useState(null); // {type, id, name, ...}
  const longPressTimerRef = useRef(null);
  const touchStartPositionRef = useRef({ x: 0, y: 0 });

  // --- Funciones de Carga y Navegación ---
  const loadContents = useCallback(
    async (folderIdToLoad) => {
      // Resetear selección al cargar nueva carpeta
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      setIsLoading(true);
      setFolders([]); // Limpiar estado anterior
      setFiles([]); // Limpiar estado anterior
      try {
        const response = await getFolderContents(folderIdToLoad);
        setFolders(response.data.subFolders || []);
        setFiles(response.data.files || []);

        // Actualizar path (migas de pan)
        if (folderIdToLoad === "root") {
          // Si vamos a la raíz, el path es solo Raíz
          if (path.length > 1 || path[0]?.id !== "root") {
            setPath([{ id: "root", name: "Raíz" }]);
          }
        } else {
          // Si vamos a una subcarpeta
          let currentPathEntry = null;
          let existingIndex = -1;
          // Buscar si ya está en el path (ej. navegando hacia atrás)
          for (let i = path.length - 1; i >= 0; i--) {
            // Usar comparación no estricta por si viene como string de params
            if (path[i].id == folderIdToLoad) {
              currentPathEntry = path[i];
              existingIndex = i;
              break;
            }
          }

          if (currentPathEntry) {
            // Si ya existe en el path, cortar hasta ella
            if (existingIndex < path.length - 1) {
              setPath((prevPath) => prevPath.slice(0, existingIndex + 1));
            }
            // Si es el último elemento, el path ya es correcto, no hacer nada
          } else {
            // Si no existe (navegando hacia adelante), necesitamos añadirla.
            // Intentamos obtener el nombre de la respuesta de la API padre (si es posible)
            // o usamos un placeholder si no.
            let folderName = "Cargando..."; // Placeholder inicial
            // Esta lógica es imperfecta, idealmente la API devolvería el nombre de la carpeta actual
            // o necesitaríamos una llamada getFolderDetails(folderIdToLoad).
            // Asumimos por ahora que el nombre vendrá 'después' o usamos placeholder.
            setPath((prevPath) => [
              ...prevPath,
              { id: folderIdToLoad, name: folderName },
            ]);
            // TODO: Considerar obtener el nombre real si es crítico mostrarlo inmediatamente.
          }
        }
      } catch (err) {
        console.error("Error loading folder contents:", err);
        toast.error(
          err.response?.data?.message || `No se pudo cargar la carpeta.`
        );
        if (err.response?.status === 401 || err.response?.status === 403)
          logout();
        // Si falla al cargar una carpeta específica, volver a la raíz por seguridad
        if (folderIdToLoad !== "root") {
          setCurrentFolderId("root");
          setPath([{ id: "root", name: "Raíz" }]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [path, logout]
  ); // Dependencia de path es necesaria para actualizar breadcrumbs

  useEffect(() => {
    // Cargar contenido inicial o cuando cambia currentFolderId, si no estamos buscando
    if (!searchTerm) {
      loadContents(currentFolderId);
    }
    // No añadir loadContents a las dependencias para evitar bucles si se redefine incorrectamente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, searchTerm]); // Recargar si cambia la carpeta O si se limpia la búsqueda

  // --- Funciones de Búsqueda ---
  const performSearch = useCallback(
    async (term) => {
      if (!term) {
        setSearchResults(null);
        setIsLoading(false); // Asegurar que no se quede cargando
        loadContents(currentFolderId); // Recargar carpeta actual si se borra búsqueda
        return;
      }
      console.log(`[Search] Iniciando búsqueda para: "${term}"`);
      setIsLoading(true);
      setSearchResults(null); // Limpiar resultados mientras busca
      let inputRefToFocus = null; // Guardar referencia al input activo
      if (document.activeElement === desktopSearchInputRef.current)
        inputRefToFocus = desktopSearchInputRef;
      else if (document.activeElement === mobileSearchInputRef.current)
        inputRefToFocus = mobileSearchInputRef;

      try {
        const response = await searchItems(term);
        setSearchResults(response.data || { folders: [], files: [] });
      } catch (err) {
        console.error("Error en búsqueda:", err);
        toast.error(
          err.response?.data?.message || "Error al realizar la búsqueda."
        );
        setSearchResults({ folders: [], files: [] }); // Poner vacío en error
        if (err.response?.status === 401 || err.response?.status === 403)
          logout();
      } finally {
        setIsLoading(false);
        console.log("[Search] Búsqueda finalizada.");
        // Intentar devolver foco DESPUÉS de que el estado isLoading se actualice
        if (inputRefToFocus?.current) {
          setTimeout(() => {
            if (
              inputRefToFocus.current &&
              typeof inputRefToFocus.current.focus === "function"
            ) {
              console.log("[Search] Intentando devolver foco post-render...");
              inputRefToFocus.current.focus();
            }
          }, 0);
        }
      }
    },
    [setIsLoading, setSearchResults, loadContents, currentFolderId, logout]
  ); // Dependencias de performSearch

  const handleSearchChange = (event) => {
    const newTerm = event.target.value;
    setSearchTerm(newTerm);
    setSelectedItems(new Set()); // Limpiar selección al buscar
    setIsSelectionMode(false);

    clearTimeout(searchTimeoutRef.current); // Limpiar timeout anterior

    const termToSearch = newTerm.trim();

    if (termToSearch) {
      console.log(`[Search] Debounce iniciado para: "${termToSearch}"`);
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(termToSearch); // Llamar después del retardo
      }, 500); // 500ms debounce
    } else {
      // Si el input se vacía, limpiar resultados y cargar contenido actual
      console.log("[Search] Término vacío, limpiando búsqueda.");
      setSearchResults(null);
      loadContents(currentFolderId); // Cargar carpeta actual
    }
  };

  const clearSearch = () => {
    clearTimeout(searchTimeoutRef.current);
    setSearchTerm("");
    setSearchResults(null);
    setSelectedItems(new Set());
    setIsSelectionMode(false);
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
    loadContents(currentFolderId); // Recargar carpeta actual
    // Devolver foco si es posible
    if (desktopSearchInputRef.current) desktopSearchInputRef.current.focus();
    else if (mobileSearchInputRef.current) mobileSearchInputRef.current.focus();
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
    if (!isMobileSearchVisible) setIsMobileMenuOpen(false); // Cerrar menú si se abre búsqueda
    // Enfocar input al abrir
    setTimeout(() => {
      if (!isMobileSearchVisible && mobileSearchInputRef.current) {
        mobileSearchInputRef.current.focus();
      }
    }, 50); // Pequeño delay para asegurar renderizado
  };

  // --- Acciones de Usuario y Elementos ---
  const handleLogout = () => {
    logout();
    toast.info("Sesión cerrada correctamente.");
    // Navegación gestionada por ProtectedRoute
  };

  const handleFolderClick = (folder) => {
    if (isActionLoading || folder.id === currentFolderId) return;
    if (searchTerm) {
      // No navegar si estamos buscando
      toast.info("Limpia la búsqueda para navegar a las carpetas.");
      return;
    }

    // --- ACTUALIZAR PATH AQUÍ, ANTES DE CAMBIAR CARPETA ---
    const newPathEntry = { id: folder.id, name: folder.name };
    // Comprobación extra para evitar añadir duplicados si se hace clic muy rápido
    if (path[path.length - 1]?.id !== folder.id) {
      setPath((prevPath) => [...prevPath, newPathEntry]);
    }
    // ------------------------------------------------------

    setCurrentFolderId(folder.id); // Esto disparará useEffect -> loadContents
    setShowFabMenu(false); // Ocultar otros menús
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
  };

  const handleBreadcrumbClick = (folderId, index) => {
    if (isActionLoading || folderId === currentFolderId) return;

    // Si estamos en búsqueda, limpiarla ANTES de navegar
    if (searchTerm) {
      clearSearch(); // Esto debería recargar la carpeta actual
      // Esperar un poco para que se procese clearSearch y luego navegar
      setTimeout(() => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath); // Actualizar path para breadcrumb
        setCurrentFolderId(folderId); // Disparar carga del contenido correcto
      }, 100); // Un delay puede ser necesario
    } else {
      // Navegación normal desde breadcrumb
      const newPath = path.slice(0, index + 1);
      setPath(newPath);
      setCurrentFolderId(folderId);
    }
    setShowFabMenu(false);
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
  };

  const handleDownloadFile = async (fileId, fileName) => {
    if (isActionLoading) return;
    let toastId = toast.loading(`Preparando descarga de "${fileName}"...`);
    try {
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
        render: `"${fileName}" descargado.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
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
        } catch {
          /* Ignorar error de parseo */
        }
      } else {
        errorMsg = err.response?.data?.message || errorMsg;
      }
      toast.update(toastId, {
        render: errorMsg,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
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
    const originalInput = event.target; // Guardar referencia

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (currentFolderId !== "root")
      formData.append("folderId", currentFolderId);

    let toastId = toast.loading(`Subiendo "${file.name}"...`);

    try {
      await uploadFile(formData);
      toast.update(toastId, {
        render: `"${file.name}" subido con éxito.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      if (!searchTerm) loadContents(currentFolderId); // Recargar si no busca
      refreshUserProfile(); // <-- Refrescar cuota en contexto
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Error al subir el archivo.";
      console.error("Error subiendo archivo:", errorMsg, err.response);
      toast.update(toastId, {
        render: errorMsg,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    } finally {
      setIsUploading(false);
      if (originalInput) originalInput.value = null; // Limpiar input
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
      if (!searchTerm) loadContents(currentFolderId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al crear la carpeta.");
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
    setIsContextMenuVisible(false); // Cerrar context menu si está abierto
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isActionLoading) return;
    setIsDeletingItem(true);
    setIsConfirmDeleteModalOpen(false);
    const { type, id, name } = itemToDelete;
    const action = type === "folder" ? deleteFolder : deleteFile;
    const typeText = type === "folder" ? "La carpeta" : "El archivo";

    try {
      await action(id); // Soft delete
      toast.success(`${typeText} "${name}" se movió a la papelera.`);

      // Quitar de la vista actual
      if (searchTerm && searchResults) {
        setSearchResults((prev) => ({
          ...prev,
          [type === "folder" ? "folders" : "files"]: prev[
            type === "folder" ? "folders" : "files"
          ].filter((item) => item.id !== id),
        }));
      } else {
        const stateUpdater = type === "folder" ? setFolders : setFiles;
        stateUpdater((prev) => prev.filter((item) => item.id !== id));
      }

      // Quitar de selección si estaba seleccionado
      setSelectedItems((prev) => {
        const newSelected = new Set(prev);
        newSelected.delete(getItemId(type, id));
        if (newSelected.size === 0) setIsSelectionMode(false);
        return newSelected;
      });

      // No refrescar cuota aquí, el soft delete no cambia el uso. Se hará en borrado permanente.
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          `Error al mover ${typeText.toLowerCase()} a la papelera.`
      );
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
    setIsContextMenuVisible(false);
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    const trimmedNewName = renameInputValue.trim();
    if (
      !itemToRename ||
      !trimmedNewName ||
      isActionLoading ||
      trimmedNewName === itemToRename.currentName
    ) {
      setIsRenameModalOpen(false);
      if (trimmedNewName === itemToRename.currentName)
        toast.info("No se realizaron cambios.");
      return;
    }

    setIsRenamingItem(true);
    setIsRenameModalOpen(false);
    const { type, id } = itemToRename;
    const typeText = type === "folder" ? "Carpeta" : "Archivo";

    try {
      const action = type === "folder" ? renameFolder : renameFile;
      const response = await action(id, { newName: trimmedNewName });
      const finalName =
        response.data.file?.name ||
        response.data.folder?.name ||
        trimmedNewName;
      toast.success(`${typeText} renombrado a "${finalName}".`);

      // Actualizar UI
      if (searchTerm && searchResults) {
        setSearchResults((prev) => ({
          ...prev,
          [type === "folder" ? "folders" : "files"]: prev[
            type === "folder" ? "folders" : "files"
          ].map((item) =>
            item.id === id ? { ...item, name: finalName } : item
          ),
        }));
      } else {
        const stateUpdater = type === "folder" ? setFolders : setFiles;
        stateUpdater((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, name: finalName } : item
          )
        );
        if (type === "folder") {
          // Actualizar breadcrumbs si es carpeta
          setPath((prevPath) =>
            prevPath.map((p) => (p.id === id ? { ...p, name: finalName } : p))
          );
        }
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          `Error al renombrar ${typeText.toLowerCase()}.`
      );
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
      toast.error("Error al preparar para mover.");
      return;
    }
    setItemsToMove([
      {
        type,
        id,
        name,
        folder_id: itemData.folder_id ?? null,
        parent_folder_id: itemData.parent_folder_id ?? null,
      },
    ]);
    setIsMoveModalOpen(true);
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
    setIsContextMenuVisible(false);
  };

  const handleConfirmMove = async (itemsToProcess, destinationId) => {
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
        const action = item.type === "folder" ? moveFolder : moveFile;
        response = await action(item.id, {
          destinationFolderId: destinationIdForApi,
        });
        toast.update(toastId, {
          render: response.data.message || `"${item.name}" movido.`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
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
        } else {
          toast.update(toastId, {
            render:
              response.data.message ||
              `${itemsToProcess.length} elemento(s) movido(s).`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
        }
      }
      // Limpiar selección y recargar/limpiar vista
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      if (!searchTerm) loadContents(currentFolderId);
      else clearSearch(); // Limpiar búsqueda para ver estado actualizado
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || `Error al mover elemento(s).`;
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

    const mime = file.mime_type?.toLowerCase() || ""; // Usar minúsculas
    const fileNameLower = file.name?.toLowerCase() || ""; // Usar minúsculas

    // --- ACTUALIZAR ESTA LÓGICA ---
    const isPreviewable =
      ( // Comprobación por MIME Type
        mime.startsWith("image/") ||
        mime === "application/pdf" ||
        mime.startsWith("text/") || // Cubre text/markdown si el MIME es correcto
        mime.startsWith("video/") ||
        mime.startsWith("audio/") ||
        [ // Lista explícita de otros tipos application/*
          "application/json",
          "application/javascript",
          "application/xml",
          "application/xhtml+xml",
          "application/x-yaml",
          "application/sql",
          "application/x-sh",
          // Añade otros si es necesario
        ].includes(mime)
      ) ||
      ( // Fallback: Comprobación por extensión
        fileNameLower.endsWith('.md') || // <-- Añadido
        fileNameLower.endsWith('.txt') ||
        fileNameLower.endsWith('.js') ||
        fileNameLower.endsWith('.css') ||
        fileNameLower.endsWith('.json') ||
        fileNameLower.endsWith('.html') ||
        fileNameLower.endsWith('.xml')
        // Añade otras extensiones si es necesario
      );
    // --- FIN DE LA ACTUALIZACIÓN ---

    if (isPreviewable) {
      // Si es previsualizable (ahora incluye .md por extensión), abre el modal
      setFileToPreview(file);
      setIsPreviewModalOpen(true);
      setShowFabMenu(false);
      setIsMobileMenuOpen(false);
      setIsContextMenuVisible(false);
    } else {
      // Si AÚN no es previsualizable (tipos realmente no soportados), muestra el toast
      toast.info(
        `Previsualización no disponible para '${file.name}'. Puedes descargarlo.`
      );
    }
  };

  // --- Funciones para Selección Múltiple ---
  const getItemId = (type, id) => `${type}-${id}`;

  const handleSelectItem = (type, id) => {
    if (isActionLoading) return; // No permitir selección si algo está cargando
    const uniqueItemId = getItemId(type, id);
    setSelectedItems((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(uniqueItemId)) newSelected.delete(uniqueItemId);
      else newSelected.add(uniqueItemId);
      setIsSelectionMode(newSelected.size > 0); // Activar/desactivar modo selección
      return newSelected;
    });
  };

  const handleSelectAll = (event) => {
    if (isActionLoading) return;
    const isChecked = event.target.checked;
    const currentItems =
      searchTerm && searchResults ? searchResults : { folders, files };
    if (isChecked) {
      const allItemIds = new Set();
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
    searchTerm && searchResults
      ? (searchResults.folders?.length ?? 0) +
        (searchResults.files?.length ?? 0)
      : folders.length + files.length;
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
      `Moviendo ${itemsToProcess.length} elementos a papelera...`
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
      } else {
        toast.update(toastId, {
          render:
            response.data.message ||
            `${itemsToProcess.length} elemento(s) movido(s) a papelera.`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      }
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      if (!searchTerm) loadContents(currentFolderId);
      else clearSearch();
      // No refrescar cuota aquí
    } catch (err) {
      toast.update(toastId, {
        render: err.response?.data?.message || `Error al mover a papelera.`,
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
      if (itemFound)
        itemsDataToMove.push({
          type,
          id,
          name: itemFound.name,
          folder_id: itemFound.folder_id ?? null,
          parent_folder_id: itemFound.parent_folder_id ?? null,
        });
    });
    if (itemsDataToMove.length > 0) {
      setItemsToMove(itemsDataToMove);
      setIsMoveModalOpen(true);
      setShowFabMenu(false);
      setIsMobileMenuOpen(false);
    } else {
      toast.error("No se pudieron obtener detalles para mover.");
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
    setIsActionLoading(anyUserActionInProgress || isLoading); // isLoading es de carga de contenido
  }, [
    isLoading,
    isCreatingFolder,
    isDeletingItem,
    isRenamingItem,
    isMovingItem,
    isUploading,
  ]);

  // --- Manejadores para Context Menu y Long Press ---
  const openActionMenu = (event, type, item) => {
    if (event.type === "contextmenu") event.preventDefault();
    if (isSelectionMode || isActionLoading) return; // No mostrar si selecciona o carga

    setContextMenuItem({ type, ...item });
    let posX = 0,
      posY = 0;
    if (event.clientX && event.clientY) {
      // Click derecho o long press simulado
      posX = event.clientX;
      posY = event.clientY;
    } else if (event.target?.getBoundingClientRect) {
      // Click en botón
      const rect = event.target.getBoundingClientRect();
      posX = rect.left;
      posY = rect.bottom + 5;
    }
    const menuWidth = 180,
      menuHeight = 250; // Estimados
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
    // Cerrar context menu al hacer click fuera o Esc
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

  const handleTouchStart = (event, type, item) => {
    if (isSelectionMode || isContextMenuVisible || isActionLoading) return;
    touchStartPositionRef.current = {
      x: event.targetTouches[0].clientX,
      y: event.targetTouches[0].clientY,
    };
    longPressTimerRef.current = setTimeout(() => {
      const positionEvent = {
        clientX: touchStartPositionRef.current.x,
        clientY: touchStartPositionRef.current.y,
        type: "longpress",
      };
      openActionMenu(positionEvent, type, item);
      longPressTimerRef.current = null;
    }, 700); // 700ms long press
  };

  const handleTouchMove = (event) => {
    if (longPressTimerRef.current) {
      const touch = event.targetTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        // Cancelar si hay movimiento
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      // Cancelar si se levanta antes
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // --- Wrappers para Acciones del Menú Contextual ---
  const triggerRename = (type, id, name) => openRenameModal(type, id, name);
  const triggerMove = (type, id, name) => openMoveModal(type, id, name);
  const triggerDelete = (type, id, name) => handleDeleteItem(type, id, name);
  const triggerDownload = (type, id, name) => {
    if (type === "file") handleDownloadFile(id, name);
  };
  const triggerPreview = (type, id) => {
    if (type === "file") {
      const sourceFiles =
        searchTerm && searchResults ? searchResults.files || [] : files;
      const fileData = sourceFiles.find((f) => f.id === id);
      if (fileData) handlePreview(fileData);
      else toast.error("No se encontró archivo para previsualizar.");
    }
  };

  // --- Función para formatear texto de cuota ---
  const getQuotaText = () => {
    if (!user) return ""; // No mostrar nada si el usuario no está cargado
    const usedFormatted = formatBytes(user.storageUsedBytes);
    let quotaFormatted = "Ilimitado";
    let percent = 0;
    if (user.role !== "admin" && typeof user.storageQuotaBytes === "number") {
      // Asegurar que es número
      quotaFormatted = formatBytes(user.storageQuotaBytes);
      percent = calculateUsagePercent(
        user.storageUsedBytes,
        user.storageQuotaBytes
      );
    }
    if (user.role === "admin") {
      return `Usado: ${usedFormatted} (Admin)`;
    } else {
      return `${usedFormatted} / ${quotaFormatted} (${percent.toFixed(0)}%)`;
    }
  };

  // --- Función para recargar la vista ---
  const handleReload = () => {
    if (isActionLoading) return; // No hacer nada si ya está cargando

    // Llamar a la función para refrescar los datos del perfil (incluida la cuota)
    refreshUserProfile(); // <-- Mantener esta línea

    // Si hay un término de búsqueda, limpiar la búsqueda (esto ya recarga la carpeta actual)
    if (searchTerm) {
      clearSearch();
      toast.info("Vista recargada.");
    } else {
      // Si no hay búsqueda, simplemente recargar el contenido actual
      loadContents(currentFolderId);
      toast.info("Vista recargada.");
    }
  };

  // --- Función de Renderizado de Items ---
  const renderItem = (item, type) => {
    const isFolder = type === "folder";
    const uniqueItemId = getItemId(type, item.id);
    const isSelected = selectedItems.has(uniqueItemId);
    const mime = item.mime_type?.toLowerCase() || ""; // Asegurar toLowerCase
    const fileNameLower = item.name?.toLowerCase() || ""; // Asegurar toLowerCase

    // --- MODIFICADO isPreviewable (incluye .md) ---
    const isPreviewable =
      !isFolder && // Must not be a folder
      (mime.startsWith("image/") ||
        mime === "application/pdf" ||
        mime.startsWith("text/") || // Covers text/plain, text/css, text/markdown etc.
        mime.startsWith("video/") ||
        mime.startsWith("audio/") ||
        [
          // Lista explícita de otros tipos application/* previsualizables
          "application/json",
          "application/javascript", // Covers .js
          "application/xml",
          "application/xhtml+xml",
          "application/x-yaml",
          "application/sql",
          "application/x-sh",
          // Añade otros si los soportas
        ].includes(mime) ||
        // --- FALLBACK: Check extension explícitamente ---
        fileNameLower.endsWith(".md") || // <-- AÑADIDO
        fileNameLower.endsWith(".txt") ||
        fileNameLower.endsWith(".js") ||
        fileNameLower.endsWith(".css") ||
        fileNameLower.endsWith(".json") ||
        fileNameLower.endsWith(".html") ||
        fileNameLower.endsWith(".xml"));
    // --- FIN MODIFICACIÓN isPreviewable ---

    const isImage = !isFolder && mime.startsWith("image/");
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
        onContextMenu={(e) => openActionMenu(e, type, item)}
        onTouchStart={(e) => handleTouchStart(e, type, item)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ WebkitTouchCallout: "none", userSelect: "none" }}
      >
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
              <button
                onClick={() => (isPreviewable ? handlePreview(item) : null)}
                className={styles.folderLink} // Usa la misma clase para estilo consistente
                disabled={isActionLoading || !isPreviewable}
                title={
                  isPreviewable
                    ? `Previsualizar ${item.name}`
                    : `Previsualización no disponible`
                }
                style={{ cursor: isPreviewable ? "pointer" : "default" }}
              >
                {item.name}
              </button>
              {displaySize && (
                <span className={styles.fileSize}>({displaySize})</span>
              )}
            </>
          )}
        </span>
        <div
          className={`${styles.itemActions} ${
            isSelectionMode ? styles.itemActionsHiddenInSelection : ""
          }`}
        >
          {/* Botones Desktop */}
          {isPreviewable && ( // <-- Ahora el botón se muestra para .md también
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
          {/* Botón Menú Móvil */}
          <button
            onClick={(e) => {
              e.stopPropagation();
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
      <header className={styles.header}>
        {isSelectionMode ? (
          <div className={styles.contextualActionBar}>
            <span className={styles.selectionCount}>
              {selectedItems.size} seleccionado(s)
            </span>
            <div className={styles.contextualButtons}>
              <button
                onClick={openBulkMoveModal}
                className={`${styles.contextualButton} ${styles.moveButtonContextual}`}
                disabled={isActionLoading || selectedItems.size === 0}
                title="Mover seleccionados"
              >
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
                <span>Mover</span>
              </button>
              <button
                onClick={openBulkDeleteModal}
                className={`${styles.contextualButton} ${styles.deleteButtonContextual}`}
                disabled={isActionLoading || selectedItems.size === 0}
                title="Mover seleccionados a Papelera"
              >
                <DeleteSelectedIcon /> <span>Eliminar</span>
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
              <CloseIcon />
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
                SkyVault {user?.username ? `- ${user.username}` : ""}
              </h1>
            </button>
            <div
              className={`${styles.searchContainer} ${styles.desktopOnlySearch}`}
            >
              <input
                ref={desktopSearchInputRef}
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
                  <CloseIcon />
                </button>
              )}
            </div>
            <div
              className={`${styles.desktopActionsContainer} ${styles.desktopOnlyActions}`}
            >
              {user && (
                <span
                  className={styles.quotaInfoDesktop}
                  title="Almacenamiento Usado / Cuota Total"
                >
                  {getQuotaText()}
                </span>
              )}
              {/* --- BOTÓN RECARGA (HEADER DESKTOP) --- */}
              <button
                onClick={handleReload}
                className={styles.headerIconButton} // Nueva clase compartida
                title="Recargar"
                disabled={isActionLoading}
              >
                <ReloadIcon />
              </button>
              {/* --- FIN NUEVO BOTÓN --- */}
              <Link
                to="/settings"
                className={styles.headerIconButton} // Nueva clase compartida
                title="Ajustes"
              >
                <SettingsIcon />
              </Link>
              <Link
                to="/trash"
                className={styles.headerIconButton} // Nueva clase compartida
                title="Papelera"
              >
                <TrashIcon />
              </Link>
              <Link to="/profile" className={styles.profileLinkDesktop}>
                Mi Perfil
              </Link>
              <button
                onClick={handleLogout}
                className={styles.logoutButton}
                disabled={isActionLoading}
              >
                Logout
              </button>
            </div>
            <div className={styles.mobileHeaderActions}>
              <button
                onClick={toggleMobileSearch}
                className={styles.mobileIconButton}
                title="Buscar"
              >
                <SearchIcon />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={styles.mobileIconButton}
                title="Más opciones"
                aria-haspopup="true"
                aria-expanded={isMobileMenuOpen}
              >
                <MoreVertIcon />
              </button>
              {isMobileMenuOpen && (
                <div className={styles.mobileDropdownMenu} ref={mobileMenuRef}>
                  {user && (
                    <div className={styles.quotaInfoMobile}>
                      {getQuotaText()}
                    </div>
                  )}
                  {/* --- OPCIÓN RECARGA (MENÚ MÓVIL) --- */}
                  <button
                    onClick={() => {
                      handleReload();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isActionLoading}
                  >
                    Recargar
                  </button>
                  {/* --- FIN OPCIÓN --- */}
                  <Link
                    to="/settings"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <button>Ajustes</button>
                  </Link>
                  <Link
                    to="/profile"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <button>Mi Perfil</button>
                  </Link>
                  <Link
                    to="/trash"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <button>Papelera</button>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className={styles.mobileDropdownLogout}
                  >
                    Logout
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
                ref={mobileSearchInputRef}
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
                  <CloseIcon />
                </button>
              )}
            </div>
            <button
              onClick={toggleMobileSearch}
              className={styles.mobileSearchCancelButton}
              disabled={isActionLoading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Barra de Navegación (Breadcrumbs y Seleccionar Todo) */}
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
                    {folder.name}
                  </button>
                  {index < path.length - 1 && (
                    <span className={styles.breadcrumbSeparator}>/</span>
                  )}
                </span>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {" "}
              {/* Contenedor Flex */}
              {allVisibleItemsCount > 0 &&
                !isLoading && ( // Solo mostrar si hay items y no está cargando
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
              {/* El botón de recarga fue movido al header */}
            </div>
          </div>
        </nav>
      )}

      {/* Contenido Principal */}
      <main className={styles.mainContent}>
        {searchTerm && searchResults !== null ? ( // MODO BUSQUEDA ACTIVA
          <>
            <h3 className={styles.contentHeader}>
              Resultados para "{searchTerm}"
            </h3>
            {isLoading ? (
              <p className={styles.loadingMessage}>Buscando...</p>
            ) : !searchResults.folders?.length &&
              !searchResults.files?.length ? (
              <p className={styles.emptyMessage}>
                No se encontraron resultados.
              </p>
            ) : (
              <>
                {searchResults.folders?.length > 0 && (
                  <>
                    <h4 className={styles.sectionTitle}>Carpetas</h4>
                    <ul className={styles.itemList}>
                      {searchResults.folders.map((folder) =>
                        renderItem(folder, "folder")
                      )}
                    </ul>
                  </>
                )}
                {searchResults.files?.length > 0 && (
                  <>
                    <h4 className={styles.sectionTitle}>Archivos</h4>
                    <ul className={styles.itemList}>
                      {searchResults.files.map((file) =>
                        renderItem(file, "file")
                      )}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        ) : searchTerm && searchResults === null ? ( // MODO BUSQUEDA INICIADA (ESPERANDO)
          <>
            {" "}
            <h3 className={styles.contentHeader}>
              Buscando "{searchTerm}"...
            </h3>{" "}
            <p className={styles.loadingMessage}>Buscando...</p>{" "}
          </>
        ) : (
          // MODO NAVEGACION NORMAL
          <>
            {isLoading ? (
              <p className={styles.loadingMessage}>Cargando...</p>
            ) : !folders.length && !files.length ? (
              <p className={styles.emptyMessage}>Esta carpeta está vacía.</p>
            ) : (
              <>
                {folders.length > 0 && (
                  <>
                    <h4 className={styles.sectionTitle}>Carpetas</h4>
                    <ul className={styles.itemList}>
                      {folders.map((folder) => renderItem(folder, "folder"))}
                    </ul>
                  </>
                )}
                {files.length > 0 && (
                  <>
                    <h4 className={styles.sectionTitle}>Archivos</h4>
                    <ul className={styles.itemList}>
                      {files.map((file) => renderItem(file, "file"))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Modales */}
      <Modal
        isOpen={isCreateFolderModalOpen}
        onClose={
          !isCreatingFolder ? () => setIsCreateFolderModalOpen(false) : null
        }
        title="Crear Nueva Carpeta"
      >
        <form onSubmit={handleConfirmCreateFolder}>
          <div className={modalStyles.formGroup}>
            <label htmlFor="newFolderName">Nombre:</label>
            <input
              type="text"
              id="newFolderName"
              className={modalStyles.input}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
              autoFocus
              disabled={isCreatingFolder}
            />
          </div>
          <div className={modalStyles.modalActions}>
            <button
              type="button"
              onClick={() => setIsCreateFolderModalOpen(false)}
              className={modalStyles.cancelButton}
              disabled={isCreatingFolder}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={modalStyles.confirmButton}
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {" "}
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
              ¿Mover{" "}
              {itemToDelete.type === "folder" ? "la carpeta" : "el archivo"}{" "}
              <strong>"{itemToDelete.name}"</strong> a la papelera?
            </p>
            <p style={{ fontSize: "0.9em", color: "var(--text-secondary)" }}>
              Podrás restaurarlo desde allí.
            </p>
            <div className={modalStyles.modalActions}>
              <button
                type="button"
                onClick={() => setIsConfirmDeleteModalOpen(false)}
                className={modalStyles.cancelButton}
                disabled={isDeletingItem}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className={modalStyles.confirmButtonDanger}
                disabled={isDeletingItem}
              >
                {isDeletingItem && (
                  <span className={modalStyles.spinner}></span>
                )}{" "}
                {isDeletingItem ? "Moviendo..." : "Mover"}
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
            <div className={modalStyles.formGroup}>
              <label htmlFor="renameInput">Nuevo nombre:</label>
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
              />
            </div>
            <div className={modalStyles.modalActions}>
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className={modalStyles.cancelButton}
                disabled={isRenamingItem}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={modalStyles.confirmButton}
                disabled={
                  !renameInputValue.trim() ||
                  isRenamingItem ||
                  renameInputValue.trim() === itemToRename.currentName
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
        title="Mover a Papelera"
      >
        <>
          <p>
            Mover los <strong>{selectedItems.size}</strong> elementos
            seleccionados a la papelera?
          </p>
          <div className={modalStyles.modalActions}>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className={modalStyles.cancelButton}
              disabled={isDeletingItem}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmBulkDelete}
              className={modalStyles.confirmButtonDanger}
              disabled={isDeletingItem || selectedItems.size === 0}
            >
              {isDeletingItem && <span className={modalStyles.spinner}></span>}{" "}
              {isDeletingItem ? "Moviendo..." : `Mover ${selectedItems.size}`}
            </button>
          </div>
        </>
      </Modal>

      {/* Input Oculto para Subida */}
      <input
        id="file-upload-input"
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
        disabled={isActionLoading}
      />

      {/* Botón Flotante (FAB) */}
      {!isSelectionMode && ( // Ocultar FAB si estamos seleccionando
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
              Crear Carpeta
            </button>
            <button
              onClick={triggerFileInput}
              className={styles.fabMenuItem}
              disabled={isActionLoading}
            >
              Subir Archivo
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

      {/* Menú Contextual */}
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
    </div> // Cierre de pageWrapper
  );
}

export default DashboardPage;
