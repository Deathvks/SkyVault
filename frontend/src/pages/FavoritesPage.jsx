// frontend/src/pages/FavoritesPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react"; // Añadir useCallback, useRef
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useFavorites } from "../context/FavoritesContext";
import {
  // API calls needed for actions
  renameFolder,
  renameFile,
  moveFolder,
  moveFile,
  deleteFolder, // To move to trash
  deleteFile,   // To move to trash
  downloadFile,
} from "../services/api";
import ImageThumbnail from "../components/ImageThumbnail";
import FilePreviewModal from "../components/FilePreviewModal";
import ContextMenu from "../components/ContextMenu"; // <-- Importar Menú Contextual
import Modal from "../components/Modal"; // <-- Importar Modal base
import MoveItemModal from "../components/MoveItemModal"; // <-- Importar Modal Mover
import { toast } from "react-toastify";
import styles from "./DashboardPage.module.css"; // Reutilizar estilos
import modalStyles from "../components/Modal.module.css"; // Estilos para modales
import { formatBytes } from "../utils/formatBytes";

// --- Iconos Necesarios ---
const StarFilledIcon = () => (
  <svg /* ... SVG ... */ xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/></svg>
);
const PreviewIcon = () => (
  <svg /* ... SVG ... */ xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5c1.38 0 2.5 1.12 2.5 2.5S13.38 14 12 14s-2.5-1.12-2.5-2.5S10.62 9 12 9m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z"/></svg>
);
// Añadir icono "..." para menú móvil
const MoreVertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
);
// --- Fin Iconos ---

function FavoritesPage() {
  const { logout, user, refreshUserProfile } = useAuth(); // <-- Añadir refreshUserProfile
  const { confirmMoveToTrash, showErrorNotifications, showSuccessNotifications } = useSettings(); // <-- Añadir confirmMoveToTrash y notificaciones
  const {
    favorites,
    loading: favoritesLoading,
    error: favoritesError,
    fetchFavorites, // <-- Obtener función para recargar
    removeFavorite // <-- Obtener función para quitar favorito
  } = useFavorites();
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [fileToPreview, setFileToPreview] = useState(null);
  const navigate = useNavigate();

  // --- Estados para Menú Contextual y Acciones ---
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuItem, setContextMenuItem] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false); // Loading combinado
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [renameInputValue, setRenameInputValue] = useState("");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState(null); // Ahora puede ser array
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isRenamingItem, setIsRenamingItem] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const longPressTimerRef = useRef(null);
  const touchStartPositionRef = useRef({ x: 0, y: 0 });
  // --- Fin Estados ---

  // Sincronizar estado de carga general y combinado
  useEffect(() => {
    setIsLoading(favoritesLoading);
  }, [favoritesLoading]);

  useEffect(() => {
      const anyAction = isRenamingItem || isMovingItem || isDeletingItem || isDownloading || favoritesLoading;
      setIsActionLoading(anyAction);
  }, [isRenamingItem, isMovingItem, isDeletingItem, isDownloading, favoritesLoading]);

  // Mostrar error si el contexto lo reporta
  useEffect(() => {
    if (favoritesError && showErrorNotifications) {
      toast.error(favoritesError || "Error al cargar los favoritos.");
    }
  }, [favoritesError, showErrorNotifications]);

  // --- Funciones de Menú Contextual y Touch --- (Adaptadas de DashboardPage)
  const openActionMenu = (event, type, item) => {
    if (event.type === "contextmenu") event.preventDefault();
    if (isActionLoading) return; // No abrir si ya hay acción
    // Obtener el item completo del estado 'favorites' para tener todos los datos
    const fullItem = favorites.find(fav => fav.id === item.id && fav.type === type);
    if (!fullItem) {
        console.error("No se encontró el item completo para el menú contextual:", item);
        return;
    }
    setContextMenuItem(fullItem); // Guardar el item completo
    let posX = 0, posY = 0;
    const menuWidth = 180, menuHeight = 250; // Altura estimada
    if (event.clientX && event.clientY) {
      posX = event.clientX; posY = event.clientY;
    } else if (event.target?.getBoundingClientRect) {
      const rect = event.target.getBoundingClientRect();
      posX = rect.left; posY = rect.bottom + 5;
    }
    if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 10;
    if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 10;
    setContextMenuPosition({ x: Math.max(10, posX), y: Math.max(10, posY) });
    setIsContextMenuVisible(true);
  };

  const handleCloseContextMenu = useCallback(() => {
    setIsContextMenuVisible(false);
    setContextMenuItem(null);
  }, []);

   useEffect(() => {
    if (isContextMenuVisible) {
      const handleGlobalClick = (e) => { if (e.button !== 2) handleCloseContextMenu(); };
      const handleKeyDown = (e) => { if (e.key === "Escape") handleCloseContextMenu(); };
      document.addEventListener("click", handleGlobalClick);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("click", handleGlobalClick);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isContextMenuVisible, handleCloseContextMenu]);

  const handleTouchStart = (event, type, item) => {
    if (isContextMenuVisible || isActionLoading) return;
    touchStartPositionRef.current = { x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY };
    longPressTimerRef.current = setTimeout(() => {
      const positionEvent = { clientX: touchStartPositionRef.current.x, clientY: touchStartPositionRef.current.y, type: "longpress" };
      openActionMenu(positionEvent, type, item);
      longPressTimerRef.current = null;
    }, 700);
  };

   const handleTouchMove = (event) => {
    if (longPressTimerRef.current) {
      const touch = event.targetTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

   const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  // --- Fin Funciones Menú/Touch ---

  // --- Funciones para Modales y Acciones --- (Adaptadas de DashboardPage)
  const handlePreview = (item) => {
    if (!item || isActionLoading) return;
    const mime = item.mime_type?.toLowerCase() || "";
    const fileNameLower = item.name?.toLowerCase() || "";
    const isPreviewable = /* ... (lógica de isPreviewable como antes) ... */
      mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/") || mime.startsWith("video/") || mime.startsWith("audio/") ||
      ["application/json", "application/javascript", "application/xml", "application/xhtml+xml", "application/x-yaml", "application/sql", "application/x-sh"].includes(mime) ||
      fileNameLower.endsWith(".md") || fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".js") || fileNameLower.endsWith(".css") || fileNameLower.endsWith(".json") || fileNameLower.endsWith(".html") || fileNameLower.endsWith(".xml");

    if (isPreviewable) {
      setFileToPreview(item);
      setIsPreviewModalOpen(true);
      handleCloseContextMenu();
    } else {
      if (showErrorNotifications) toast.info("Previsualización no disponible.");
    }
  };

  const openRenameModal = (type, id, currentName) => {
    if (isActionLoading) return;
    setItemToRename({ type, id, currentName });
    setRenameInputValue(currentName);
    setIsRenameModalOpen(true);
    handleCloseContextMenu();
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    const trimmedNewName = renameInputValue.trim();
    if (!itemToRename || !trimmedNewName || isActionLoading || trimmedNewName === itemToRename.currentName) {
      setIsRenameModalOpen(false); return;
    }
    setIsRenamingItem(true);
    setIsRenameModalOpen(false);
    const { type, id } = itemToRename;
    const typeText = type === "folder" ? "Carpeta" : "Archivo";
    try {
      const action = type === "folder" ? renameFolder : renameFile;
      await action(id, { newName: trimmedNewName });
      if (showSuccessNotifications) toast.success(`${typeText} renombrado.`);
      fetchFavorites(); // Recargar favoritos
    } catch (err) {
      if (showErrorNotifications) toast.error(err.response?.data?.message || `Error al renombrar.`);
      if (err.response?.status === 401) logout();
    } finally {
      setIsRenamingItem(false); setItemToRename(null); setRenameInputValue("");
    }
  };

  const openMoveModal = (type, id, name) => {
     if (isActionLoading) return;
     // Encontrar el item completo para obtener folder_id/parent_folder_id
     const itemData = favorites.find(fav => fav.id === id && fav.type === type);
     if (!itemData) {
         if (showErrorNotifications) toast.error("Error al preparar para mover.");
         return;
     }
     setItemsToMove([{
         type, id, name,
         folder_id: itemData.folder_id ?? null, // Asumiendo que el contexto los devuelve
         parent_folder_id: itemData.parent_folder_id ?? null // Asumiendo que el contexto los devuelve
     }]);
     setIsMoveModalOpen(true);
     handleCloseContextMenu();
  };

  const handleConfirmMove = async (itemsMoved, destinationId) => {
      if (!itemsMoved || itemsMoved.length !== 1 || isActionLoading) return; // Solo movemos 1 item desde favs
      const item = itemsMoved[0];
      const destinationIdForApi = destinationId === null ? null : destinationId;
      setIsMovingItem(true); setIsMoveModalOpen(false);
      const toastId = toast.loading(`Moviendo "${item.name}"...`);
      try {
          const action = item.type === "folder" ? moveFolder : moveFile;
          const response = await action(item.id, { destinationFolderId: destinationIdForApi });
          if (showSuccessNotifications) toast.update(toastId, { render: response.data.message || `"${item.name}" movido.`, type: "success", isLoading: false, autoClose: 3000 });
          else toast.dismiss(toastId);
          fetchFavorites(); // Recargar favoritos
      } catch (err) {
          if (showErrorNotifications) toast.update(toastId, { render: err.response?.data?.message || `Error al mover.`, type: "error", isLoading: false, autoClose: 5000 });
          else toast.dismiss(toastId);
          if (err.response?.status === 401) logout();
      } finally {
          setIsMovingItem(false); setItemsToMove(null);
      }
  };

  const openDeleteModal = (type, id, name) => {
      if (isActionLoading) return;
      if (confirmMoveToTrash) {
          setItemToDelete({ type, id, name });
          setIsConfirmDeleteModalOpen(true);
          handleCloseContextMenu();
      } else {
          executeMoveToTrash(type, id, name); // Ejecutar directamente si no hay confirmación
          handleCloseContextMenu();
      }
  };

   const executeMoveToTrash = async (type, id, name) => {
      setIsDeletingItem(true);
      const action = type === "folder" ? deleteFolder : deleteFile;
      const typeText = type === "folder" ? "La carpeta" : "El archivo";
      try {
          await action(id); // API para mover a papelera
          if (showSuccessNotifications) toast.success(`${typeText} "${name}" movido a la papelera.`);
          fetchFavorites(); // Quitar de la vista de favoritos
          if(refreshUserProfile) refreshUserProfile(); // Actualizar cuota
      } catch (err) {
          if (showErrorNotifications) toast.error(err.response?.data?.message || `Error al mover a papelera.`);
          if (err.response?.status === 401) logout();
      } finally {
          setIsDeletingItem(false);
      }
  };

  const handleConfirmDelete = async () => {
      if (!itemToDelete) return;
      setIsConfirmDeleteModalOpen(false);
      await executeMoveToTrash(itemToDelete.type, itemToDelete.id, itemToDelete.name);
      setItemToDelete(null);
  };

  const handleDownloadFile = async (fileId, fileName) => {
      if (isActionLoading) return;
      setIsDownloading(true);
      const toastId = toast.loading(`Descargando "${fileName}"...`);
      try {
          const response = await downloadFile(fileId); // Asume que downloadFile maneja progreso si se implementó
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url; link.setAttribute("download", fileName || "descarga");
          document.body.appendChild(link); link.click();
          link.parentNode.removeChild(link); window.URL.revokeObjectURL(url);
          if (showSuccessNotifications) toast.update(toastId, { render: `"${fileName}" descargado.`, type: "success", isLoading: false, autoClose: 3000 });
           else toast.dismiss(toastId);
      } catch (err) {
          if (showErrorNotifications) toast.update(toastId, { render: err.response?.data?.message || "Error al descargar.", type: "error", isLoading: false, autoClose: 5000 });
           else toast.dismiss(toastId);
          if (err.response?.status === 401) logout();
      } finally {
          setIsDownloading(false); handleCloseContextMenu();
      }
  };

  const handleRemoveFavorite = (type, id) => {
       if (isActionLoading) return;
       // Usar directamente la función del contexto
       removeFavorite(type, id); // El contexto ya maneja loading y recarga
       handleCloseContextMenu();
  };

   // --- Wrappers para Acciones del Menú Contextual ---
   const triggerRename = (type, id, name) => openRenameModal(type, id, name);
   const triggerMove = (type, id, name) => openMoveModal(type, id, name);
   const triggerDelete = (type, id, name) => openDeleteModal(type, id, name); // Mover a papelera
   const triggerDownload = (type, id, name) => { if (type === 'file') handleDownloadFile(id, name); };
   const triggerPreview = (type, id) => {
       if (type === 'file') {
           const fileData = favorites.find(fav => fav.id === id && fav.type === 'file');
           if (fileData) handlePreview(fileData); // Pasar el objeto completo
           else if (showErrorNotifications) toast.error("No se encontró archivo para previsualizar.");
       }
   };
   const triggerRemoveFavorite = (type, id) => handleRemoveFavorite(type, id);
   // --- Fin Wrappers ---

  // --- Función de Renderizado de Items Favoritos ---
  // --- Función de Renderizado de Items Favoritos ---
  const renderFavoriteItem = (item) => {
    const isFolder = item.type === "folder";
    const uniqueItemId = `${item.type}-${item.id}`;
    // Acceder a propiedades directamente desde 'item'
    const isPreviewable = /* ... lógica isPreviewable ... */
        !isFolder &&
      (() => {
        const mime = item.mime_type?.toLowerCase() || "";
        const fileNameLower = item.name?.toLowerCase() || "";
        return ( mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/") || mime.startsWith("video/") || mime.startsWith("audio/") ||
          ["application/json", "application/javascript", "application/xml", "application/xhtml+xml", "application/x-yaml", "application/sql", "application/x-sh"].includes(mime) ||
          fileNameLower.endsWith(".md") || fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".js") || fileNameLower.endsWith(".css") || fileNameLower.endsWith(".json") || fileNameLower.endsWith(".html") || fileNameLower.endsWith(".xml"));
      })();

    const isImage = !isFolder && item.mime_type?.toLowerCase().startsWith("image/");
    const displaySize = item.size ? formatBytes(item.size) : "";
    const itemName = item.name;
    const itemId = item.id;

    if (!itemName || !itemId) {
      console.warn("Item favorito sin nombre o ID:", item); return null;
    }

     // Deshabilitar acciones si CUALQUIER acción está en progreso
    const disableActions = isActionLoading;

    return (
      <li
        key={uniqueItemId}
        className={`${styles.listItem} ${styles.favoriteItem}`} // Reutiliza estilos de item
        // Añadir handlers para menú contextual
        onContextMenu={(e) => !disableActions && openActionMenu(e, item.type, item)} // <-- CORREGIDO: Usar item.type
        onTouchStart={(e) => !disableActions && handleTouchStart(e, item.type, item)} // <-- CORREGIDO: Usar item.type
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ WebkitTouchCallout: "none", userSelect: "none" }} // Evitar selección texto en long press
      >
        {/* Checkbox oculto */}
        <div className={styles.itemSelection} style={{ visibility: "hidden" }}>
          <button className={styles.checkboxButton} disabled> <StarFilledIcon /> </button>
        </div>
        {/* Botón favorito (fijo y no interactivo aquí) */}
        <button className={`${styles.favoriteButton} ${styles.isFavorite}`} disabled style={{cursor: 'default'}} title="Favorito">
             <StarFilledIcon />
        </button>
        <span
          className={`${styles.itemName} ${isFolder ? "" : styles.fileInfo}`}
        >
           {/* El icono de estrella YA NO VA AQUÍ DENTRO */}
           {isFolder ? (
            <>
              <span className={styles.itemIcon}>📁</span>
              <button
                className={styles.folderLink}
                title={`Abrir carpeta ${itemName}`}
                onClick={() => !disableActions && navigate('/', { state: { targetFolderId: itemId, targetFolderName: itemName } })}
                disabled={disableActions} // Deshabilitar si hay acción
              >
                {itemName}
              </button>
            </>
          ) : (
            <>
              {isImage && itemId ? (
                <ImageThumbnail fileId={itemId} alt={itemName} />
              ) : (
                <span className={styles.itemIcon}>📄</span>
              )}
              <button
                onClick={() => !disableActions && handlePreview(item)} // Pasar item completo
                className={styles.folderLink}
                disabled={disableActions || !isPreviewable}
                title={ isPreviewable ? `Previsualizar ${itemName}` : `Previsualización no disponible` }
                style={{ cursor: isPreviewable ? "pointer" : "default" }}
              >
                {itemName}
              </button>
              {displaySize && (
                <span className={styles.fileSize}>({displaySize})</span>
              )}
            </>
          )}
        </span>
        {/* Botón "..." para menú contextual */}
        <div className={styles.itemActions}>
           <button
            onClick={(e) => {
              e.stopPropagation(); // Prevenir otros eventos
              !disableActions && openActionMenu(e, item.type, item); // <-- CORREGIDO: Usar item.type
            }}
            className={`${styles.itemActionButton} ${styles.mobileItemMenuButton}`} // Reutilizar estilo
            title="Más acciones"
            disabled={disableActions}
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
      {/* Header Simplificado */}
      <header className={styles.header}>
          {/* ... (Header igual que antes) ... */}
            <Link to="/" className={styles.headerTitleButton} title="Volver al Dashboard">
                <h1 className={styles.headerTitle}>Favoritos</h1>
            </Link>
            <div className={`${styles.desktopActionsContainer} ${styles.desktopOnlyActions}`}>
                <Link to="/settings" className={styles.headerIconButton} title="Ajustes"> Ajustes </Link>
                <button onClick={logout} className={styles.logoutButton}> Cerrar sesión </button>
            </div>
      </header>

      {/* Contenido Principal */}
      <main className={styles.mainContent}>
        {isLoading ? (
          <p className={styles.loadingMessage}>Cargando favoritos...</p>
        ) : !favorites || favorites.length === 0 ? (
          <p className={styles.emptyMessage}>
            No tienes elementos marcados como favoritos.
          </p>
        ) : (
          <ul className={styles.itemList}>
            {favorites.map((fav) => renderFavoriteItem(fav))}
          </ul>
        )}
      </main>

      {/* Modal de Previsualización */}
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={fileToPreview}
      />

       {/* --- Modales para Acciones --- */}
        <Modal
            isOpen={isRenameModalOpen}
            onClose={!isRenamingItem ? () => setIsRenameModalOpen(false) : null}
            title={`Renombrar ${itemToRename?.type === 'folder' ? 'Carpeta' : 'Archivo'}`}
        >
            {itemToRename && (
                <form onSubmit={handleConfirmRename}>
                   <div className={modalStyles.formGroup}>
                        <label htmlFor="renameInput">Nuevo nombre:</label>
                        <input type="text" id="renameInput" className={modalStyles.input} value={renameInputValue}
                               onChange={(e) => setRenameInputValue(e.target.value)} required autoFocus onFocus={(e) => e.target.select()}
                               disabled={isRenamingItem} />
                    </div>
                    <div className={modalStyles.modalActions}>
                        <button type="button" onClick={() => setIsRenameModalOpen(false)} className={modalStyles.cancelButton} disabled={isRenamingItem}> Cancelar </button>
                        <button type="submit" className={modalStyles.confirmButton} disabled={!renameInputValue.trim() || isRenamingItem || renameInputValue.trim() === itemToRename.currentName}>
                            {isRenamingItem && <span className={modalStyles.spinner}></span>} {isRenamingItem ? 'Renombrando...' : 'Renombrar'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>

        <MoveItemModal
            isOpen={isMoveModalOpen}
            onClose={!isMovingItem ? () => setIsMoveModalOpen(false) : null}
            itemsToMove={itemsToMove} // Pasa el array (aunque aquí sea de 1)
            onConfirmMove={handleConfirmMove}
            isActionLoading={isMovingItem}
        />

         <Modal
            isOpen={isConfirmDeleteModalOpen}
            onClose={!isDeletingItem ? () => setIsConfirmDeleteModalOpen(false) : null}
            title="Mover a Papelera"
          >
            {itemToDelete && (
              <>
                <p> ¿Mover {itemToDelete.type === 'folder' ? 'la carpeta' : 'el archivo'} <strong>"{itemToDelete.name}"</strong> a la papelera? </p>
                <p style={{ fontSize: "0.9em", color: "var(--text-secondary)" }}> Podrás restaurarlo desde allí. </p>
                <div className={modalStyles.modalActions}>
                  <button type="button" onClick={() => setIsConfirmDeleteModalOpen(false)} className={modalStyles.cancelButton} disabled={isDeletingItem}> Cancelar </button>
                  <button onClick={handleConfirmDelete} className={modalStyles.confirmButtonDanger} disabled={isDeletingItem}>
                    {isDeletingItem && <span className={modalStyles.spinner}></span>} {isDeletingItem ? "Moviendo..." : "Mover"}
                  </button>
                </div>
              </>
            )}
        </Modal>
      {/* --- Fin Modales --- */}


      {/* Menú Contextual */}
      {isContextMenuVisible && contextMenuItem && (
        <ContextMenu
          position={contextMenuPosition}
          item={contextMenuItem} // Pasamos el item completo
          onClose={handleCloseContextMenu}
          // Pasar las funciones trigger correctas
          onRename={triggerRename}
          onMove={triggerMove}
          onDelete={triggerDelete} // Mover a papelera
          onDownload={triggerDownload}
          onPreview={triggerPreview}
          // Modificar para quitar de favoritos
          onToggleFavorite={triggerRemoveFavorite}
          isFavorite={true} // Siempre es favorito en esta página
          isActionLoading={isActionLoading}
        />
      )}

    </div> // Cierre pageWrapper
  );
}

export default FavoritesPage;