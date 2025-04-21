// frontend/src/pages/TrashPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext"; // <-- Importar hook de ajustes
import {
  getTrashItems,
  restoreFile,
  restoreFolder,
  deleteFilePermanently,
  deleteFolderPermanently,
  emptyUserTrash,
} from "../services/api";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import styles from "./TrashPage.module.css";
import modalStyles from "../components/Modal.module.css";

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
const EmptyTrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="20px"
    viewBox="0 0 24 24"
    width="20px"
    fill="currentColor"
  >
    <path d="M0 0h24v24H0V0z" fill="none" />
    <path d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13zm-5-9.72l-3.15 3.15 1.41 1.41L12 10.83l3.15 3.15 1.41-1.41L13.41 9.41 16.59 6.22l-1.41-1.41L12 7.59 8.82 4.41 7.41 5.82 10.59 9z" />
  </svg>
);

function TrashPage() {
  const { logout } = useAuth();
  // <-- Obtener ajustes de confirmación -->
  const { confirmPermanentDelete, confirmEmptyTrash } = useSettings();
  const [trashItems, setTrashItems] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [itemToPermanentlyDelete, setItemToPermanentlyDelete] = useState(null);
  const [
    isConfirmPermanentDeleteModalOpen,
    setIsConfirmPermanentDeleteModalOpen,
  ] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);

  const RETENTION_HOURS = 24;

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

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // --- Funciones de Acción ---

  const handleRestore = async (type, id, name) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const toastId = toast.loading(`Restaurando "${name}"...`);
    try {
      let response;
      if (type === "folder") {
        response = await restoreFolder(id);
      } else {
        response = await restoreFile(id);
      }
      toast.update(toastId, {
        render:
          response.data.message ||
          `${type === "folder" ? "Carpeta" : "Archivo"} restaurado.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      fetchTrash();
    } catch (error) {
      console.error(`Error restoring ${type}:`, error);
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

  // Lógica para ejecutar borrado permanente individual
  const executePermanentDelete = async (type, id, name) => {
    setIsProcessing(true);
    const toastId = toast.loading(`Eliminando "${name}" permanentemente...`);
    let success = false;
    try {
      let response;
      if (type === "folder") {
        response = await deleteFolderPermanently(id);
      } else {
        response = await deleteFilePermanently(id);
      }
      toast.update(toastId, {
        render:
          response.data.message ||
          `${
            type === "folder" ? "Carpeta" : "Archivo"
          } eliminado permanentemente.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      fetchTrash();
      success = true;
    } catch (error) {
      console.error(`Error permanently deleting ${type}:`, error);
      toast.update(toastId, {
        render:
          error.response?.data?.message || `Error en eliminación permanente.`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
    return success;
  };

  // Modificado para usar ajuste de confirmación
  const openPermanentDeleteModal = (type, id, name) => {
    if (isProcessing) return;
    if (confirmPermanentDelete) {
      setItemToPermanentlyDelete({ type, id, name });
      setIsConfirmPermanentDeleteModalOpen(true);
    } else {
      executePermanentDelete(type, id, name);
    }
  };

  // Modificado para solo ejecutar la lógica
  const handlePermanentDelete = async () => {
    if (!itemToPermanentlyDelete) return;
    setIsConfirmPermanentDeleteModalOpen(false);
    await executePermanentDelete(
      itemToPermanentlyDelete.type,
      itemToPermanentlyDelete.id,
      itemToPermanentlyDelete.name
    );
    setItemToPermanentlyDelete(null);
  };

  // --- NUEVAS Funciones para Vaciar Papelera ---

  // Lógica para ejecutar Vaciar Papelera
  const executeEmptyTrash = async () => {
    setIsProcessing(true);
    const toastId = toast.loading("Vaciando papelera...");
    let success = false;
    try {
      const response = await emptyUserTrash();
      toast.update(toastId, {
        render: response.data.message || "Papelera vaciada.",
        type: "success",
        isLoading: false,
        autoClose: 4000,
      });
      fetchTrash();
      success = true;
    } catch (error) {
      console.error("Error emptying trash:", error);
      toast.update(toastId, {
        render: error.response?.data?.message || "Error al vaciar la papelera.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
    return success;
  };

  // Modificado para usar ajuste de confirmación
  const openEmptyTrashModal = () => {
    if (isProcessing || !hasItems) return;
    if (confirmEmptyTrash) {
      setIsEmptyTrashModalOpen(true);
    } else {
      executeEmptyTrash();
    }
  };

  // Modificado para solo ejecutar la lógica
  const handleConfirmEmptyTrash = async () => {
    setIsEmptyTrashModalOpen(false);
    await executeEmptyTrash();
  };
  // --- FIN NUEVAS Funciones ---

  // --- Función para Renderizar cada Item ---
  const renderTrashItem = (item, type) => {
    const isFolder = type === "folder";
    const deletedDate = item.deletedAt
      ? new Date(item.deletedAt).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "N/A";
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
          {!isFolder && displaySize && (
            <span className={styles.itemSize}>({displaySize})</span>
          )}
          <span className={styles.deletedDate}>Eliminado: {deletedDate}</span>
        </span>
        <div className={styles.itemActions}>
          <button
            onClick={() => handleRestore(type, item.id, item.name)}
            className={`${styles.actionButton} ${styles.restoreButton}`}
            title="Restaurar"
            disabled={isProcessing}
          >
            <RestoreIcon />
          </button>
          <button
            onClick={() => openPermanentDeleteModal(type, item.id, item.name)} // Llama a la función que comprueba el ajuste
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

  const hasItems =
    !isLoading &&
    (trashItems.folders.length > 0 || trashItems.files.length > 0);

  // --- Renderizado del Componente Principal ---
  return (
    <div className={styles.pageContainer}>
      <div className={styles.trashCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>Papelera de Reciclaje</h2>
          <button
            onClick={openEmptyTrashModal} // Llama a la función que comprueba el ajuste
            className={styles.emptyTrashButton}
            disabled={!hasItems || isProcessing}
            title={!hasItems ? "La papelera está vacía" : "Vaciar papelera"}
          >
            <EmptyTrashIcon />
            Vaciar Papelera
          </button>
          <Link to="/" className={styles.backLink}>
            Volver al Dashboard
          </Link>
        </div>

        <p className={styles.infoMessage}>
          Los elementos en la papelera se eliminarán permanentemente después de{" "}
          {RETENTION_HOURS} horas.
        </p>

        {isLoading ? (
          <p className={styles.message}>Cargando papelera...</p>
        ) : !hasItems ? (
          <p className={styles.message}>La papelera está vacía.</p>
        ) : (
          <ul className={styles.itemList}>
            {trashItems.folders.map((folder) =>
              renderTrashItem(folder, "folder")
            )}
            {trashItems.files.map((file) => renderTrashItem(file, "file"))}
          </ul>
        )}
      </div>

      {/* Modal Confirmación Eliminación Permanente Individual */}
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
              ¿Estás seguro de que quieres eliminar permanentemente{" "}
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
                onClick={handlePermanentDelete} // Llama al handler del modal
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

      {/* Modal Confirmación Vaciar Papelera */}
      <Modal
        isOpen={isEmptyTrashModalOpen}
        onClose={!isProcessing ? () => setIsEmptyTrashModalOpen(false) : null}
        title="Confirmar Vaciar Papelera"
      >
        <>
          <p>
            ¿Estás seguro de que quieres{" "}
            <strong>eliminar permanentemente</strong> todos los elementos de la
            papelera?
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
              onClick={() => setIsEmptyTrashModalOpen(false)}
              className={modalStyles.cancelButton}
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmEmptyTrash} // Llama al handler del modal
              className={modalStyles.confirmButtonDanger}
              disabled={isProcessing}
            >
              {isProcessing && <span className={modalStyles.spinner}></span>}
              {isProcessing ? "Vaciando..." : "Vaciar Papelera"}
            </button>
          </div>
        </>
      </Modal>
    </div>
  );
}

export default TrashPage;
