// frontend/src/pages/TrashPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getTrashItems,
  restoreFile,
  restoreFolder,
  deleteFilePermanently,
  deleteFolderPermanently,
} from "../services/api";
import Modal from "../components/Modal"; // Reutilizamos el modal
import { toast } from "react-toastify";
import styles from "./TrashPage.module.css"; // Estilos específicos de esta página
import modalStyles from "../components/Modal.module.css"; // Estilos del modal genérico

// Iconos simples (puedes importarlos o definirlos aquí)
const RestoreIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="18px"
    viewBox="0 0 24 24"
    width="18px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12z" />
  </svg>
);
const DeleteForeverIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="18px"
    viewBox="0 0 24 24"
    width="18px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
    <path d="M0 0h24v24H0z" fill="none" />
  </svg>
);

function TrashPage() {
  const { logout } = useAuth();
  const [trashItems, setTrashItems] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [itemToPermanentlyDelete, setItemToPermanentlyDelete] = useState(null);
  const [
    isConfirmPermanentDeleteModalOpen,
    setIsConfirmPermanentDeleteModalOpen,
  ] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Para deshabilitar botones durante acción

  // Variable para el tiempo de retención (podría venir de una config)
  const RETENTION_HOURS = 24; // Horas antes de la eliminación automática

  // Función para cargar el contenido de la papelera
  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTrashItems();
      setTrashItems({
        folders: response.data.folders || [],
        files: response.data.files || [],
      });
    } catch (error) {
      console.error("Error fetching trash:", error);
      toast.error(
        error.response?.data?.message || "No se pudo cargar la papelera."
      );
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Cargar la papelera al montar el componente
  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // --- Funciones de Acción ---

  const handleRestore = async (type, id, name) => {
    if (isProcessing) return;
    setIsProcessing(true);
    // Usar toast.loading para indicar proceso
    const toastId = toast.loading(`Restaurando "${name}"...`);
    try {
      let response;
      if (type === "folder") {
        response = await restoreFolder(id);
      } else {
        response = await restoreFile(id);
      }
      // Actualizar a éxito
      toast.update(toastId, {
        render:
          response.data.message ||
          `${type === "folder" ? "Carpeta" : "Archivo"} restaurado.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      fetchTrash(); // Recargar papelera para reflejar el cambio
    } catch (error) {
      console.error(`Error restoring ${type}:`, error);
      // Actualizar a error
      toast.update(toastId, {
        render: error.response?.data?.message || `Error al restaurar.`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openPermanentDeleteModal = (type, id, name) => {
    if (isProcessing) return;
    setItemToPermanentlyDelete({ type, id, name });
    setIsConfirmPermanentDeleteModalOpen(true);
  };

  const handlePermanentDelete = async () => {
    if (!itemToPermanentlyDelete || isProcessing) return;
    setIsProcessing(true);
    setIsConfirmPermanentDeleteModalOpen(false);
    const { type, id, name } = itemToPermanentlyDelete;
    // Iniciar notificación de carga
    const toastId = toast.loading(`Eliminando "${name}" permanentemente...`);

    try {
      let response;
      if (type === "folder") {
        response = await deleteFolderPermanently(id);
      } else {
        response = await deleteFilePermanently(id);
      }
      // Actualizar a éxito
      toast.update(toastId, {
        render:
          response.data.message ||
          `${
            type === "folder" ? "Carpeta" : "Archivo"
          } eliminado permanentemente.`,
        type: "success", // Correcto: usar string 'success'
        isLoading: false,
        autoClose: 3000,
      });
      fetchTrash(); // Recargar papelera para quitar el item
    } catch (error) {
      console.error(`Error permanently deleting ${type}:`, error);
      // Actualizar a error
      toast.update(toastId, {
        render:
          error.response?.data?.message || `Error en eliminación permanente.`,
        type: "error", // Correcto: usar string 'error'
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsProcessing(false);
      setItemToPermanentlyDelete(null);
    }
  };

  // --- Función para Renderizar cada Item ---

  const renderTrashItem = (item, type) => {
    const isFolder = type === "folder";
    // Formatear la fecha de borrado
    const deletedDate = item.deletedAt
      ? new Date(item.deletedAt).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "N/A";
    // Formatear tamaño
    const fileSizeMB = item.size ? item.size / (1024 * 1024) : 0;
    const fileSizeKB = item.size ? item.size / 1024 : 0;
    const displaySize = item.size
      ? fileSizeMB >= 1
        ? `${fileSizeMB.toFixed(1)} MB`
        : `${fileSizeKB.toFixed(1)} KB`
      : "";

    return (
      <li key={`${type}-${item.id}`} className={styles.trashItem}>
        <span className={styles.itemInfo}>
          <span className={styles.itemIcon}>{isFolder ? "📁" : "📄"}</span>
          <span className={styles.itemName} title={item.name}>
            {item.name}
          </span>
          {/* Mostrar tamaño solo para archivos */}
          {!isFolder && displaySize && (
            <span className={styles.itemSize}>({displaySize})</span>
          )}
          {/* Mostrar fecha de eliminación */}
          <span className={styles.deletedDate}>Eliminado: {deletedDate}</span>
        </span>
        <div className={styles.itemActions}>
          {/* Botón Restaurar */}
          <button
            onClick={() => handleRestore(type, item.id, item.name)}
            className={`${styles.actionButton} ${styles.restoreButton}`}
            title="Restaurar"
            disabled={isProcessing}
          >
            <RestoreIcon />
          </button>
          {/* Botón Eliminar Permanentemente */}
          <button
            onClick={() => openPermanentDeleteModal(type, item.id, item.name)}
            className={`${styles.actionButton} ${styles.deleteButton}`}
            title="Eliminar permanentemente"
            disabled={isProcessing}
          >
            <DeleteForeverIcon />
          </button>
        </div>
      </li>
    );
  };

  // Determinar si hay items para mostrar
  const hasItems =
    !isLoading &&
    (trashItems.folders.length > 0 || trashItems.files.length > 0);

  // --- Renderizado del Componente Principal ---
  return (
    <div className={styles.pageContainer}>
      <div className={styles.trashCard}>
        {/* Encabezado */}
        <div className={styles.header}>
          <h2 className={styles.title}>Papelera de Reciclaje</h2>
          <Link to="/" className={styles.backLink}>
            Volver al Dashboard
          </Link>
        </div>

        {/* Mensaje Informativo sobre retención */}
        <p className={styles.infoMessage}>
          Los elementos en la papelera se eliminarán permanentemente después de{" "}
          {RETENTION_HOURS} horas.
        </p>

        {/* Contenido: Carga, Vacío o Lista */}
        {isLoading ? (
          <p className={styles.message}>Cargando papelera...</p>
        ) : !hasItems ? (
          <p className={styles.message}>La papelera está vacía.</p>
        ) : (
          <ul className={styles.itemList}>
            {/* Renderizar carpetas y luego archivos */}
            {trashItems.folders.map((folder) =>
              renderTrashItem(folder, "folder")
            )}
            {trashItems.files.map((file) => renderTrashItem(file, "file"))}
          </ul>
        )}
      </div>

      {/* Modal de Confirmación para Eliminación Permanente */}
      <Modal
        isOpen={isConfirmPermanentDeleteModalOpen}
        onClose={
          !isProcessing
            ? () => setIsConfirmPermanentDeleteModalOpen(false)
            : null
        }
        title="Confirmar Eliminación Permanente"
      >
        {itemToPermanentlyDelete && (
          <>
            <p>
              ¿Estás seguro de que quieres eliminar permanentemente
              {itemToPermanentlyDelete.type === "folder"
                ? " la carpeta"
                : " el archivo"}
              <strong> "{itemToPermanentlyDelete.name}"</strong>?
            </p>
            <p
              style={{
                color: "var(--error-red)",
                fontWeight: "500",
                fontSize: "0.9em",
              }}
            >
              ¡Esta acción no se puede deshacer!
            </p>
            <div className={modalStyles.modalActions}>
              <button
                type="button"
                onClick={() => setIsConfirmPermanentDeleteModalOpen(false)}
                className={modalStyles.cancelButton}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handlePermanentDelete}
                className={modalStyles.confirmButtonDanger}
                disabled={isProcessing}
              >
                {isProcessing && <span className={modalStyles.spinner}></span>}
                {isProcessing ? "Eliminando..." : "Eliminar Permanentemente"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div> // Cierre de pageContainer
  );
}

export default TrashPage;
