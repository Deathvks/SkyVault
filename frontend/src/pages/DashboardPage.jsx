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
} from "../services/api";
import ImageThumbnail from "../components/ImageThumbnail";
import Modal from "../components/Modal";
import MoveItemModal from "../components/MoveItemModal";
import FilePreviewModal from "../components/FilePreviewModal";
import ContextMenu from "../components/ContextMenu";
import { toast } from "react-toastify";
import styles from "./DashboardPage.module.css";
import modalStyles from "../components/Modal.module.css";

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
// Icono de Ajustes (ejemplo)
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
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      setIsLoading(true);
      try {
        const response = await getFolderContents(folderIdToLoad);
        setFolders(response.data.subFolders || []);
        setFiles(response.data.files || []);

        // Actualizar path (lógica sin cambios)
        if (folderIdToLoad === "root") {
          if (path.length > 1 || path[0]?.id !== "root") {
            setPath([{ id: "root", name: "Raíz" }]);
          }
        } else {
          let currentPathEntry = null;
          let existingIndex = -1;
          for (let i = path.length - 1; i >= 0; i--) {
            if (path[i].id === folderIdToLoad) {
              currentPathEntry = path[i];
              existingIndex = i;
              break;
            }
          }

          if (currentPathEntry) {
            // Si la carpeta ya existe en el path, cortar hasta ella
            if (existingIndex < path.length - 1) {
              setPath((prevPath) => prevPath.slice(0, existingIndex + 1));
            }
          } else {
            // Si no existe, intentar obtener su nombre y añadirla
            let folderName = "Carpeta Desconocida";
            // Primero buscar en la respuesta actual (si el padre ya cargó hijos)
            const parentFolder = folders.find((f) => f.id === folderIdToLoad); // Check folders state *before* update
            if (parentFolder) {
              folderName = parentFolder.name;
            } else {
              // Si no está en la lista actual de carpetas (puede ser la carpeta que se acaba de cargar)
              // Necesitaríamos una forma de obtener el nombre de la carpeta actual (quizás desde la API de getFolderContents?)
              // O, si es seguro asumir que el último elemento del path es el padre:
              // const parent = path[path.length - 1];
              // Buscar en la respuesta actual si contiene la carpeta padre con la carpeta actual como subcarpeta?
              // -> Esta lógica es compleja. Una solución simple pero no ideal es obtener el nombre después
              console.warn(
                `Could not determine name for folder ${folderIdToLoad} immediately.`
              );
              // Podríamos llamar a una API getFolderDetails(folderIdToLoad) aquí, pero sería ineficiente.
              // Por ahora, usamos un placeholder y actualizamos si la información llega después.
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
        // Si falla al cargar una carpeta específica, volver a la raíz
        if (folderIdToLoad !== "root") {
          setCurrentFolderId("root");
          setPath([{ id: "root", name: "Raíz" }]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [path, folders, logout] // folders debe estar aquí si se usa para buscar nombres
  );

  useEffect(() => {
    if (!searchTerm) {
      loadContents(currentFolderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, searchTerm]); // loadContents ya está en useCallback

  // --- Lógica de Búsqueda ---
  const performSearch = useCallback(
    async (term) => {
      if (!term.trim()) {
        setSearchResults(null);
        loadContents(currentFolderId); // Cargar contenido actual si la búsqueda está vacía
        return;
      }
      setIsLoading(true); // Indicar carga durante la búsqueda
      setSearchResults(null);
      try {
        const response = await searchItems(term.trim());
        setSearchResults(response.data || { folders: [], files: [] });
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Error al realizar la búsqueda.";
        console.error("Error en búsqueda:", err);
        toast.error(errorMsg);
        setSearchResults({ folders: [], files: [] }); // Mostrar vacío en error
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
      } finally {
        setIsLoading(false); // Finalizar carga
      }
    },
    [logout, currentFolderId, loadContents] // Añadir loadContents y currentFolderId
  );

  const handleSearchChange = (event) => {
    const newTerm = event.target.value;
    setSearchTerm(newTerm);
    setSelectedItems(new Set());
    setIsSelectionMode(false);

    clearTimeout(searchTimeoutRef.current); // Limpiar timeout anterior

    if (newTerm.trim()) {
      setIsLoading(true); // Mostrar carga mientras se escribe
      setSearchResults(null); // Limpiar resultados anteriores
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(newTerm); // Ejecutar búsqueda después de pausa
      }, 500); // 500ms debounce
    } else {
      // Si el término está vacío, limpiar búsqueda y cargar contenido actual
      setIsLoading(false); // Quitar indicador de carga inmediato
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
    // Cargar contenido de la carpeta actual inmediatamente
    loadContents(currentFolderId);
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
        !menuButton?.contains(event.target) // No cerrar si se clickea el botón de menú
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
      // Si se está abriendo la búsqueda, cerrar el menú de opciones
      setIsMobileMenuOpen(false);
    }
  };

  // --- Acciones de Usuario y Elementos ---
  const handleLogout = () => {
    logout();
    toast.info("Sesión cerrada correctamente.");
    // La navegación al login se manejará por ProtectedRoute
  };

  const handleFolderClick = (folder) => {
    if (isActionLoading || folder.id === currentFolderId) return;

    // Si estamos en modo búsqueda, NO navegar, quizás mostrar un mensaje o limpiar búsqueda?
    if (searchTerm) {
      toast.info("Limpia la búsqueda para navegar a la carpeta.");
      // Opcionalmente: clearSearch(); y luego navegar? Depende de la UX deseada.
      return;
    }

    // Lógica de navegación y actualización de path (sin cambios)
    let newPath = [...path];
    const existingIndex = path.findIndex((p) => p.id === folder.id);

    if (existingIndex !== -1) {
      // Si la carpeta ya está en el path (navegando hacia atrás), cortar el path
      newPath = path.slice(0, existingIndex + 1);
    } else {
      // Si es una carpeta nueva, añadirla al path
      newPath = [...path, { id: folder.id, name: folder.name }];
    }

    setPath(newPath);
    setCurrentFolderId(folder.id); // Actualiza la carpeta actual
    setShowFabMenu(false); // Ocultar menú FAB al navegar
    if (isMobileSearchVisible) setIsMobileSearchVisible(false); // Ocultar búsqueda móvil si está abierta
  };

  const handleBreadcrumbClick = (folderId, index) => {
    if (isActionLoading || folderId === currentFolderId) return;

    // Si estamos en búsqueda, limpiarla ANTES de navegar
    if (searchTerm) {
      clearSearch(); // Limpia término y resultados, carga contenido de carpeta actual
      // Esperar un ciclo para que se actualice el estado antes de navegar
      setTimeout(() => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        setCurrentFolderId(folderId); // Navegar a la carpeta del breadcrumb
      }, 50); // Pequeño delay
    } else {
      // Si no hay búsqueda, navegar directamente
      const newPath = path.slice(0, index + 1);
      setPath(newPath);
      setCurrentFolderId(folderId);
    }
    setShowFabMenu(false); // Ocultar FAB
    if (isMobileSearchVisible) setIsMobileSearchVisible(false); // Ocultar búsqueda móvil
  };

  const handleDownloadFile = async (fileId, fileName) => {
    if (isActionLoading) return;
    let toastId = null;
    try {
      // Mostrar loading toast inmediatamente
      toastId = toast.loading(`Preparando descarga de "${fileName}"...`);

      const response = await downloadFile(fileId);

      // Crear URL y link para descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      // Usar el nombre original del archivo para la descarga
      link.setAttribute("download", fileName || "descarga"); // Usa fileName o un fallback
      document.body.appendChild(link);
      link.click();

      // Limpiar
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Actualizar toast a éxito
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

      // Intentar leer el mensaje de error si la respuesta es un JSON Blob
      if (
        err.response?.data instanceof Blob &&
        err.response.data.type === "application/json"
      ) {
        try {
          const errorJson = JSON.parse(await err.response.data.text());
          errorMsg = errorJson.message || errorMsg;
        } catch (parseError) {
          console.error(
            "No se pudo parsear el error Blob como JSON:",
            parseError
          );
        }
      } else {
        // Usar mensaje de error de Axios si existe
        errorMsg = err.response?.data?.message || errorMsg;
      }

      // Actualizar toast a error (si se creó) o mostrar uno nuevo
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

      // Manejar error de autenticación
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  };

  const toggleFabMenu = () => setShowFabMenu((prev) => !prev);

  const triggerFileInput = () => {
    if (isActionLoading) return;
    fileInputRef.current?.click(); // Abre el selector de archivos
    setShowFabMenu(false); // Oculta el menú FAB si estaba abierto
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || isActionLoading) return;

    // Guardar referencia al input para limpiarlo después
    const originalInput = event.target;

    setIsUploading(true); // Iniciar estado de carga específico
    const formData = new FormData();
    formData.append("file", file); // 'file' debe coincidir con el esperado en backend (Multer)

    // Añadir folderId si no estamos en la raíz
    if (currentFolderId !== "root") {
      formData.append("folderId", currentFolderId);
    }

    let toastId = toast.loading(`Subiendo "${file.name}"...`);

    try {
      await uploadFile(formData); // Llamar a la función API

      // Éxito
      toast.update(toastId, {
        render: `Archivo "${file.name}" subido con éxito.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // Recargar contenido si no estamos en modo búsqueda
      if (!searchTerm) {
        loadContents(currentFolderId);
      }
      // Si estamos en búsqueda, podríamos decidir no recargar o limpiar la búsqueda.
      // Por ahora, no hacemos nada extra en modo búsqueda.
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
      setIsUploading(false); // Finalizar estado de carga específico
      // Limpiar el valor del input para permitir subir el mismo archivo de nuevo
      if (originalInput) {
        originalInput.value = null;
      }
    }
  };

  // --- Funciones para Modales ---
  const openCreateFolderModal = () => {
    if (isActionLoading) return;
    setNewFolderName("");
    setIsCreateFolderModalOpen(true);
    setShowFabMenu(false); // Ocultar FAB
    setIsMobileMenuOpen(false); // Ocultar menú móvil
  };

  const handleConfirmCreateFolder = async (e) => {
    e.preventDefault(); // Prevenir envío de formulario
    if (!newFolderName.trim() || isActionLoading) return;

    setIsCreatingFolder(true);
    setIsCreateFolderModalOpen(false); // Cerrar modal

    try {
      const parentId = currentFolderId === "root" ? null : currentFolderId;
      await createFolder({
        name: newFolderName.trim(),
        parentFolderId: parentId,
      });
      toast.success(`Carpeta "${newFolderName.trim()}" creada con éxito.`);

      // Recargar contenido si no estamos buscando
      if (!searchTerm) {
        loadContents(currentFolderId);
      }
      // Si estamos buscando, la nueva carpeta no aparecerá hasta limpiar la búsqueda
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Error al crear la carpeta.";
      toast.error(errorMsg);
      if (err.response?.status === 401 || err.response?.status === 403)
        logout();
    } finally {
      setIsCreatingFolder(false);
      setNewFolderName(""); // Limpiar input
    }
  };

  const openConfirmDeleteModal = (type, id, name) => {
    if (isActionLoading) return;
    setItemToDelete({ type, id, name });
    setIsConfirmDeleteModalOpen(true);
    setIsMobileMenuOpen(false); // Cerrar menú móvil si estaba abierto
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isActionLoading) return;

    setIsDeletingItem(true);
    setIsConfirmDeleteModalOpen(false); // Cerrar modal
    const { type, id, name } = itemToDelete;
    const action = type === "folder" ? deleteFolder : deleteFile;
    const typeText = type === "folder" ? "La carpeta" : "El archivo";

    try {
      await action(id); // Llama a la API (soft delete)
      toast.success(`${typeText} "${name}" se movió a la papelera.`);

      // Actualizar UI: quitar el item de la lista actual
      if (searchTerm && searchResults) {
        // Si estamos en búsqueda, quitar de los resultados
        setSearchResults((prevResults) => {
          if (!prevResults) return null;
          const key = type === "folder" ? "folders" : "files";
          return {
            ...prevResults,
            [key]: prevResults[key].filter((item) => item.id !== id),
          };
        });
      } else {
        // Si no estamos en búsqueda, quitar de la lista normal
        const stateUpdater = type === "folder" ? setFolders : setFiles;
        stateUpdater((prevItems) => prevItems.filter((item) => item.id !== id));
      }

      // Si el item estaba seleccionado, quitarlo de la selección
      setSelectedItems((prevSelected) => {
        const newSelected = new Set(prevSelected);
        newSelected.delete(getItemId(type, id));
        // Desactivar modo selección si ya no hay nada seleccionado
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
      setItemToDelete(null); // Limpiar item a borrar
    }
  };

  // Wrapper para usar en botones/context menu
  const handleDeleteItem = (type, id, name) =>
    openConfirmDeleteModal(type, id, name);

  const openRenameModal = (type, id, currentName) => {
    if (isActionLoading) return;
    setItemToRename({ type, id, currentName });
    setRenameInputValue(currentName); // Pre-rellenar input
    setIsRenameModalOpen(true);
    setShowFabMenu(false); // Ocultar otros menús
    setIsMobileMenuOpen(false);
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault(); // Prevenir envío de formulario
    const trimmedNewName = renameInputValue.trim();

    if (!itemToRename || !trimmedNewName || isActionLoading) {
      setIsRenameModalOpen(false);
      return; // No hacer nada si no hay nombre o ya está renombrando
    }
    // Evitar llamada API si el nombre no cambió
    if (trimmedNewName === itemToRename.currentName) {
      toast.info("No se realizaron cambios en el nombre.");
      setIsRenameModalOpen(false);
      setItemToRename(null);
      return;
    }

    setIsRenamingItem(true);
    setIsRenameModalOpen(false); // Cerrar modal
    const { type, id } = itemToRename;
    const typeText = type === "folder" ? "Carpeta" : "Archivo";

    try {
      let response;
      if (type === "folder") {
        response = await renameFolder(id, { newName: trimmedNewName });
      } else {
        response = await renameFile(id, { newName: trimmedNewName });
      }

      // Obtener el nombre final (puede incluir extensión preservada por backend)
      const finalName =
        response.data.file?.name ||
        response.data.folder?.name ||
        trimmedNewName;

      toast.success(`${typeText} renombrado a "${finalName}".`);

      // Actualizar UI
      if (searchTerm && searchResults) {
        // Actualizar resultados de búsqueda
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
        // Actualizar lista normal
        const stateUpdater = type === "folder" ? setFolders : setFiles;
        stateUpdater((prevItems) =>
          prevItems.map((item) =>
            item.id === id ? { ...item, name: finalName } : item
          )
        );
        // Si es carpeta, actualizar también el path si está en él
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
      setItemToRename(null); // Limpiar item
      setRenameInputValue(""); // Limpiar input
    }
  };

  const openMoveModal = (type, id, name) => {
    if (isActionLoading) return;

    // Encontrar los datos completos del item (incluyendo su padre actual)
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

    // Crear payload para el modal (siempre un array)
    const itemPayload = [
      {
        type,
        id,
        name,
        folder_id: itemData.folder_id ?? null, // folder_id para archivos
        parent_folder_id: itemData.parent_folder_id ?? null, // parent_folder_id para carpetas
      },
    ];

    setItemsToMove(itemPayload);
    setIsMoveModalOpen(true);
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
  };

  const handleConfirmMove = async (itemsToProcess, destinationId) => {
    if (!itemsToProcess || itemsToProcess.length === 0 || isActionLoading)
      return;

    // El ID `null` representa la raíz en la API
    const destinationIdForApi = destinationId === null ? null : destinationId;

    setIsMovingItem(true);
    setIsMoveModalOpen(false); // Cerrar modal

    const toastId = toast.loading(
      `Moviendo ${
        itemsToProcess.length === 1
          ? `"${itemsToProcess[0].name}"`
          : `${itemsToProcess.length} elementos`
      }...`
    );

    try {
      let response;
      // Decidir si usar API individual o bulk
      if (itemsToProcess.length === 1) {
        const item = itemsToProcess[0];
        try {
          const action = item.type === "folder" ? moveFolder : moveFile;
          response = await action(item.id, {
            destinationFolderId: destinationIdForApi,
          });
          // Mensaje de éxito para movimiento individual
          toast.update(toastId, {
            render: response.data.message || `"${item.name}" movido con éxito.`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
        } catch (itemError) {
          // Si falla el individual, relanzar para el catch general
          console.error(`Error moviendo ${item.type} ${item.id}:`, itemError);
          throw itemError; // Asegura que el catch exterior lo maneje
        }
      } else {
        // Llamada a API Bulk
        const itemsPayload = itemsToProcess.map((item) => ({
          type: item.type,
          id: item.id,
        }));
        response = await bulkMoveItems(itemsPayload, destinationIdForApi);

        // Manejar respuesta 207 (Multi-Status) para bulk
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
          // Éxito total en bulk (o mensaje genérico si no hay detalles)
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

      // Limpiar selección y recargar vista actual (o limpiar búsqueda)
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      if (!searchTerm) {
        loadContents(currentFolderId);
      } else {
        // Si estábamos buscando, limpiamos la búsqueda para ver el estado actualizado
        clearSearch();
      }
    } catch (err) {
      // Captura errores tanto de llamadas individuales como bulk
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
      setItemsToMove(null); // Limpiar items a mover
    }
  };

  const handlePreview = (file) => {
    if (isActionLoading || !file) return;

    // Comprobar si el tipo MIME es soportado para previsualización
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
      setShowFabMenu(false); // Ocultar otros menús
      setIsMobileMenuOpen(false);
    } else {
      // Si no es previsualizable, informar al usuario
      toast.info(
        `La previsualización no está disponible para '${file.name}'. Puedes descargarlo.`
      );
      // Opcional: Podrías intentar descargarlo directamente aquí si prefieres esa UX
      // handleDownloadFile(file.id, file.name);
    }
  };

  // --- Funciones para Selección Múltiple ---
  const getItemId = (type, id) => `${type}-${id}`;

  const handleSelectItem = (type, id) => {
    const uniqueItemId = getItemId(type, id);
    setSelectedItems((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(uniqueItemId)) {
        newSelected.delete(uniqueItemId); // Deseleccionar
      } else {
        newSelected.add(uniqueItemId); // Seleccionar
      }
      // Activar/desactivar modo selección basado en si hay elementos seleccionados
      setIsSelectionMode(newSelected.size > 0);
      return newSelected;
    });
  };

  const handleSelectAll = (event) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      // Seleccionar todos los items visibles actualmente
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
      setIsSelectionMode(allItemIds.size > 0); // Activar modo selección si hay items
    } else {
      // Deseleccionar todo
      setSelectedItems(new Set());
      setIsSelectionMode(false); // Desactivar modo selección
    }
  };

  // Calcular si todos los items visibles están seleccionados (para el checkbox "Seleccionar todo")
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

    setIsDeletingItem(true); // Usar estado de carga general o uno específico
    setIsBulkDeleteModalOpen(false);

    // Convertir Set de IDs string a array de objetos {type, id} para la API
    const itemsToProcess = Array.from(selectedItems).map((itemId) => {
      const [type, idStr] = itemId.split("-");
      return { type, id: parseInt(idStr, 10) };
    });

    const toastId = toast.loading(
      `Moviendo ${itemsToProcess.length} elementos a la papelera...`
    );

    try {
      const response = await bulkMoveItemsToTrash(itemsToProcess); // Llamar API bulk

      // Manejar respuesta (puede ser 200 OK o 207 Multi-Status)
      if (response.status === 207 && response.data?.errors?.length > 0) {
        // Hubo errores parciales
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
        // Éxito total o sin errores reportados
        toast.update(toastId, {
          render:
            response.data.message ||
            `${itemsToProcess.length} elemento(s) movido(s) a la papelera.`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      }

      // Limpiar selección y recargar/limpiar vista
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      if (!searchTerm) {
        loadContents(currentFolderId);
      } else {
        clearSearch(); // Limpiar búsqueda para reflejar cambios
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

    // Recopilar datos completos de los items seleccionados para pasarlos al modal
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
          folder_id: itemFound.folder_id ?? null, // Necesario para saber origen
          parent_folder_id: itemFound.parent_folder_id ?? null, // Necesario para saber origen
        });
      }
    });

    if (itemsDataToMove.length > 0) {
      setItemsToMove(itemsDataToMove); // Pasar array de items al estado
      setIsMoveModalOpen(true);
      setShowFabMenu(false);
      setIsMobileMenuOpen(false);
    } else {
      toast.error(
        "No se pudieron obtener los detalles de los elementos seleccionados para mover."
      );
      // Podría pasar si los datos locales están desincronizados
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
    //isLoading es la carga de contenido, anyUserActionInProgress son las acciones POST/PUT/DELETE
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
  const openActionMenu = (event, type, item) => {
    // Prevenir menú contextual nativo si es un evento de contextmenu
    if (event.type === "contextmenu") event.preventDefault();

    // No mostrar menú si estamos en modo selección o hay una acción en curso
    if (isSelectionMode || isActionLoading) return;

    // Guardar la información del item sobre el que se abrió el menú
    setContextMenuItem({ type, ...item });

    // Calcular posición del menú
    let posX = 0,
      posY = 0;

    if (event.clientX && event.clientY) {
      // Click derecho o evento de long press (que simula clientX/Y)
      posX = event.clientX;
      posY = event.clientY;
    } else if (event.target?.getBoundingClientRect) {
      // Click en un botón (ej. los tres puntos en móvil)
      const rect = event.target.getBoundingClientRect();
      posX = rect.left; // Alinear a la izquierda del botón
      posY = rect.bottom + 5; // Aparecer debajo del botón
    } else {
      // Fallback si no se pueden obtener coordenadas
      posX = window.innerWidth / 2;
      posY = window.innerHeight / 2;
    }

    // Ajustar posición para que no se salga de la pantalla
    const menuWidth = 180; // Ancho estimado del menú
    const menuHeight = 220; // Altura estimada del menú
    if (posX + menuWidth > window.innerWidth)
      posX = window.innerWidth - menuWidth - 10;
    if (posY + menuHeight > window.innerHeight)
      posY = window.innerHeight - menuHeight - 10;

    setContextMenuPosition({ x: Math.max(10, posX), y: Math.max(10, posY) }); // Asegurar un margen mínimo
    setIsContextMenuVisible(true);

    // Cerrar otros menús flotantes
    setShowFabMenu(false);
    setIsMobileMenuOpen(false);
  };

  const handleCloseContextMenu = useCallback(() => {
    setIsContextMenuVisible(false);
    setContextMenuItem(null); // Limpiar item al cerrar
  }, []);

  // Efecto para cerrar el menú contextual al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (isContextMenuVisible) {
      const handleGlobalClick = (e) => {
        // No cerrar si el clic es derecho (podría ser para abrir otro menú)
        if (e.button !== 2) {
          handleCloseContextMenu();
        }
      };
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          handleCloseContextMenu();
        }
      };

      document.addEventListener("click", handleGlobalClick);
      document.addEventListener("keydown", handleKeyDown);

      // Limpieza del efecto
      return () => {
        document.removeEventListener("click", handleGlobalClick);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isContextMenuVisible, handleCloseContextMenu]);

  // --- Manejadores para Long Press ---
  const handleTouchStart = (event, type, item) => {
    // No iniciar long press si ya hay un menú, modo selección, o acción en curso
    if (isSelectionMode || isContextMenuVisible || isActionLoading) return;

    // Guardar posición inicial del toque
    touchStartPositionRef.current = {
      x: event.targetTouches[0].clientX,
      y: event.targetTouches[0].clientY,
    };

    // Iniciar temporizador para el long press
    longPressTimerRef.current = setTimeout(() => {
      // Crear un objeto evento simulado con las coordenadas iniciales
      const positionEvent = {
        clientX: touchStartPositionRef.current.x,
        clientY: touchStartPositionRef.current.y,
        type: "longpress", // Identificador opcional
      };
      openActionMenu(positionEvent, type, item); // Abrir menú contextual
      longPressTimerRef.current = null; // Limpiar referencia al timer
    }, 700); // 700ms para considerar long press
  };

  const handleTouchMove = (event) => {
    // Si el temporizador está activo y el dedo se mueve significativamente, cancelar el long press
    if (longPressTimerRef.current) {
      const touch = event.targetTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
      // Umbral de movimiento para cancelar (evita cancelar por pequeños temblores)
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    // Si el dedo se levanta antes de que se complete el tiempo, cancelar el temporizador
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  // --- Fin Manejadores Long Press ---

  // --- Wrappers para Acciones del Menú Contextual ---
  // Estas funciones se pasarán como props al componente ContextMenu
  const triggerRename = (type, id, name) => openRenameModal(type, id, name);
  const triggerMove = (type, id, name) => openMoveModal(type, id, name);
  const triggerDelete = (type, id, name) => handleDeleteItem(type, id, name); // Reutiliza la función existente
  const triggerDownload = (type, id, name) => {
    // Asegurarse que solo se llame para archivos
    if (type === "file") {
      handleDownloadFile(id, name);
    }
  };
  const triggerPreview = (type, id) => {
    // Encontrar los datos del archivo para pasarlos al modal de preview
    if (type === "file") {
      const sourceFiles =
        searchTerm && searchResults ? searchResults.files || [] : files;
      const fileData = sourceFiles.find((f) => f.id === id);
      if (fileData) {
        handlePreview(fileData); // Llama a la función existente
      } else {
        toast.error("No se pudo encontrar el archivo para previsualizar.");
      }
    }
  };
  // --- Fin Wrappers Context Menu ---

  // --- Función de Renderizado de Items ---
  const renderItem = (item, type) => {
    const isFolder = type === "folder";
    const uniqueItemId = getItemId(type, item.id);
    const isSelected = selectedItems.has(uniqueItemId);
    const mime = item.mime_type || "";
    const isImage = !isFolder && mime.startsWith("image/");

    // Determinar si el archivo es previsualizable
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

    // Formatear tamaño
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
        // Eventos para menú contextual y long press
        onContextMenu={(e) => openActionMenu(e, type, item)}
        onTouchStart={(e) => handleTouchStart(e, type, item)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        // Estilos para prevenir selección de texto y menú nativo en móvil
        style={{ WebkitTouchCallout: "none", userSelect: "none" }}
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
          {isFolder ? (
            <>
              <span className={styles.itemIcon}>📁</span>
              <button
                onClick={() => handleFolderClick(item)}
                className={styles.folderLink}
                disabled={isActionLoading}
                title={item.name} // Tooltip con nombre completo
              >
                {item.name}
              </button>
            </>
          ) : (
            <>
              {isImage ? (
                <ImageThumbnail fileId={item.id} alt={item.name} />
              ) : (
                // Icono genérico de archivo si no es imagen
                <span className={styles.itemIcon}>📄</span>
              )}
              {/* Botón para previsualizar (si es posible) o solo texto */}
              <button
                onClick={() => (isPreviewable ? handlePreview(item) : null)}
                className={styles.folderLink} // Reutilizar estilo de link
                disabled={isActionLoading || !isPreviewable}
                title={
                  isPreviewable
                    ? `Previsualizar ${item.name}`
                    : `Previsualización no disponible para ${item.name}`
                }
                style={{ cursor: isPreviewable ? "pointer" : "default" }} // Cambiar cursor si no es previsualizable
              >
                {item.name}
              </button>
              {/* Mostrar tamaño */}
              {displaySize && (
                <span className={styles.fileSize}>({displaySize})</span>
              )}
            </>
          )}
        </span>

        {/* Contenedor de Acciones (botones individuales y botón móvil) */}
        <div
          className={`${styles.itemActions} ${
            isSelectionMode ? styles.itemActionsHiddenInSelection : ""
          }`}
        >
          {/* Botones individuales (ocultos en móvil por defecto con CSS) */}
          {/* --- Previsualizar --- */}
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
          {/* --- Renombrar --- */}
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
          {/* --- Mover --- */}
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
          {/* --- Descargar (solo archivos) --- */}
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
          {/* --- Eliminar (Mover a Papelera) --- */}
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

          {/* Botón de tres puntos para móvil (se muestra/oculta con CSS) */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Evitar que el click en el botón cierre el menú inmediatamente
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
        {/* --- Barra Contextual (Modo Selección) --- */}
        {isSelectionMode ? (
          <div className={styles.contextualActionBar}>
            <span className={styles.selectionCount}>
              {selectedItems.size} seleccionado(s)
            </span>
            <div className={styles.contextualButtons}>
              {/* Botón Mover Seleccionados */}
              <button
                onClick={openBulkMoveModal}
                className={`${styles.contextualButton} ${styles.moveButtonContextual}`}
                disabled={isActionLoading || selectedItems.size === 0}
                title="Mover elementos seleccionados"
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
                </svg>
                <span>Mover</span>
              </button>
              {/* Botón Eliminar Seleccionados */}
              <button
                onClick={openBulkDeleteModal}
                className={`${styles.contextualButton} ${styles.deleteButtonContextual}`}
                disabled={isActionLoading || selectedItems.size === 0}
                title="Mover seleccionados a Papelera"
              >
                <DeleteSelectedIcon />
                <span>Eliminar</span>
              </button>
            </div>
            {/* Botón Cancelar Selección */}
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
          // --- Header Normal (No Selección) ---
          <>
            {/* Título */}
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

            {/* Búsqueda Desktop */}
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
                  <CloseIcon />
                </button>
              )}
            </div>

            {/* Acciones Desktop */}
            <div
              className={`${styles.desktopActionsContainer} ${styles.desktopOnlyActions}`}
            >
              {/* Icono Ajustes Desktop (Opcional) */}
              <Link
                to="/settings"
                className={styles.trashLinkDesktop}
                title="Ajustes"
              >
                <SettingsIcon />
              </Link>
              {/* Icono Papelera Desktop */}
              <Link
                to="/trash"
                className={styles.trashLinkDesktop}
                title="Papelera"
              >
                <TrashIcon />
              </Link>
              {/* Link Perfil Desktop */}
              <Link to="/profile" className={styles.profileLinkDesktop}>
                Mi Perfil
              </Link>
              {/* Botón Logout Desktop */}
              <button
                onClick={handleLogout}
                className={styles.logoutButton}
                disabled={isActionLoading}
              >
                Logout
              </button>
            </div>

            {/* Acciones Móvil */}
            <div className={styles.mobileHeaderActions}>
              {/* Botón Búsqueda Móvil */}
              <button
                onClick={toggleMobileSearch}
                className={styles.mobileIconButton}
                title="Buscar"
              >
                <SearchIcon />
              </button>
              {/* Botón Más Opciones Móvil */}
              <button
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={styles.mobileIconButton}
                title="Más opciones"
                aria-haspopup="true"
                aria-expanded={isMobileMenuOpen}
              >
                <MoreVertIcon />
              </button>
              {/* Menú Desplegable Móvil */}
              {isMobileMenuOpen && (
                <div className={styles.mobileDropdownMenu} ref={mobileMenuRef}>
                  {/* Link Ajustes Móvil */}
                  <Link
                    to="/settings"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <button>Ajustes</button>
                  </Link>
                  {/* Link Perfil Móvil */}
                  <Link
                    to="/profile"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <button>Mi Perfil</button>
                  </Link>
                  {/* Link Papelera Móvil */}
                  <Link
                    to="/trash"
                    className={styles.mobileDropdownLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <button>Papelera</button>
                  </Link>
                  {/* Botón Logout Móvil */}
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
      {/* No mostrar NavBar si estamos en modo selección */}
      {!isSelectionMode && (
        <nav className={styles.navBar}>
          <div className={styles.navBarContent}>
            {/* Breadcrumbs */}
            <div className={styles.breadcrumbsContainer}>
              {path.map((folder, index) => (
                <span key={folder.id} className={styles.breadcrumbItem}>
                  <button
                    onClick={() => handleBreadcrumbClick(folder.id, index)}
                    className={styles.breadcrumbLink}
                    disabled={isActionLoading || index === path.length - 1} // Deshabilitar último elemento
                  >
                    {folder.name}
                  </button>
                  {index < path.length - 1 && (
                    <span className={styles.breadcrumbSeparator}>/</span>
                  )}
                </span>
              ))}
            </div>
            {/* Checkbox Seleccionar Todo (solo si hay items visibles) */}
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
                    className={styles.hiddenCheckbox} // Ocultar checkbox nativo
                    disabled={isActionLoading}
                  />
                </label>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Contenido Principal (Listas o Resultados Búsqueda) */}
      <main className={styles.mainContent}>
        {/* --- Renderizado Condicional: Búsqueda vs Navegación --- */}
        {searchTerm && searchResults !== null ? (
          // --- MODO BÚSQUEDA ACTIVA ---
          <>
            <h3 className={styles.contentHeader}>
              Resultados de Búsqueda para "{searchTerm}"
            </h3>
            {isLoading ? ( // Mostrar carga si isLoading es true durante búsqueda
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
          // --- MODO BÚSQUEDA INICIADA (Esperando resultados) ---
          <>
            <h3 className={styles.contentHeader}>
              Resultados de Búsqueda para "{searchTerm}"
            </h3>
            <p className={styles.loadingMessage}>Buscando...</p>
          </>
        ) : (
          // --- MODO NAVEGACIÓN NORMAL ---
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
      <Modal
        isOpen={isCreateFolderModalOpen}
        onClose={
          !isCreatingFolder ? () => setIsCreateFolderModalOpen(false) : null
        }
        title="Crear Nueva Carpeta"
      >
        <form onSubmit={handleConfirmCreateFolder}>
          <div className={modalStyles.formGroup}>
            <label htmlFor="newFolderName">Nombre de la Carpeta:</label>
            <input
              type="text"
              id="newFolderName"
              className={modalStyles.input} // Usar clase global o específica de modal
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
              className={modalStyles.cancelButton} // Clase específica o global
              disabled={isCreatingFolder}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={modalStyles.confirmButton} // Clase específica o global
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {isCreatingFolder && (
                <span className={modalStyles.spinner}></span>
              )}
              {isCreatingFolder ? "Creando..." : "Crear Carpeta"}
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
              ¿Estás seguro de que quieres mover{" "}
              {itemToDelete.type === "folder" ? " la carpeta" : " el archivo"}{" "}
              <strong> "{itemToDelete.name}" </strong> a la papelera?
            </p>
            <p style={{ fontSize: "0.9em", color: "var(--text-secondary)" }}>
              Podrás restaurarlo o eliminarlo permanentemente desde allí.
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
                )}
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
                onFocus={(e) => e.target.select()} // Seleccionar texto al enfocar
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
                )}
                {isRenamingItem ? "Renombrando..." : "Renombrar"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <MoveItemModal
        isOpen={isMoveModalOpen}
        onClose={!isMovingItem ? () => setIsMoveModalOpen(false) : null}
        itemsToMove={itemsToMove} // Pasar el array de items
        onConfirmMove={handleConfirmMove}
        isActionLoading={isMovingItem} // Pasar estado de carga
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
          <p>
            ¿Estás seguro de que quieres mover los{" "}
            <strong> {selectedItems.size} </strong> elementos seleccionados a la
            papelera?
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
              {isDeletingItem && <span className={modalStyles.spinner}></span>}
              {isDeletingItem
                ? "Moviendo..."
                : `Mover ${selectedItems.size} a Papelera`}
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
        disabled={isActionLoading} // Deshabilitar si hay acción en curso
      />

      {/* Botón Flotante (FAB) y Menú (solo si no está en modo selección) */}
      {!isSelectionMode && (
        <div className={styles.fabContainer}>
          {/* Menú del FAB */}
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
          {/* Botón Principal del FAB */}
          <button
            className={styles.fabButton}
            onClick={toggleFabMenu}
            title="Añadir"
            disabled={isActionLoading}
            aria-haspopup="true" // Indica que abre un menú
            aria-expanded={showFabMenu} // Estado del menú
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

      {/* --- Menú Contextual --- */}
      {isContextMenuVisible && contextMenuItem && (
        <ContextMenu
          position={contextMenuPosition}
          item={contextMenuItem} // Pasar el item completo
          onClose={handleCloseContextMenu}
          onRename={triggerRename}
          onMove={triggerMove}
          onDelete={triggerDelete}
          onDownload={triggerDownload}
          onPreview={triggerPreview}
          isActionLoading={isActionLoading} // Para deshabilitar acciones
        />
      )}
      {/* --- Fin Menú Contextual --- */}
    </div> // Cierre de pageWrapper
  );
}

export default DashboardPage;
