// frontend/src/components/MoveItemModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getFolderTree } from "../services/api";
import Modal from "./Modal";
import styles from "./MoveItemModal.module.css";
import modalBaseStyles from "./Modal.module.css";
import { toast } from "react-toastify";

// Componente recursivo simple para renderizar el árbol de carpetas
const FolderTreeItem = ({
  folder,
  level = 0,
  onSelect,
  selectedId,
  disabledIds = [],
}) => {
  const isDisabled = disabledIds.includes(folder.id);
  const isSelected = selectedId === folder.id;

  return (
    <>
      <div
        className={`${styles.folderItem} ${isSelected ? styles.selected : ""} ${
          isDisabled ? styles.disabled : ""
        }`}
        style={{ paddingLeft: `${level * 20 + 10}px` }} // Aplica indentación según el nivel
        onClick={
          !isDisabled ? () => onSelect(folder.id, folder.name) : undefined
        } // Llama a onSelect si no está deshabilitado
        title={folder.name} // Tooltip para nombres largos
      >
        📁 {folder.name}
      </div>
      {/* Renderizar hijos recursivamente solo si no está deshabilitado y tiene hijos */}
      {!isDisabled && folder.children && folder.children.length > 0 && (
        <div className={styles.folderChildren}>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1} // Incrementar nivel para indentación
              onSelect={onSelect}
              selectedId={selectedId}
              disabledIds={disabledIds} // Pasar IDs deshabilitados
            />
          ))}
        </div>
      )}
    </>
  );
};

function MoveItemModal({
  isOpen,
  onClose,
  itemToMove,
  onConfirmMove,
  isActionLoading,
}) {
  const [folderTree, setFolderTree] = useState([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null representa la Raíz
  const [selectedFolderName, setSelectedFolderName] = useState("Raíz");
  const [errorTree, setErrorTree] = useState("");
  const [disabledFolderIds, setDisabledFolderIds] = useState([]); // IDs que no se pueden seleccionar

  // Función para obtener IDs descendientes (para deshabilitar al mover carpetas)
  const getDescendantIds = useCallback((folderId, tree) => {
    let ids = [];
    const findChildren = (targetId, nodes) => {
      for (const node of nodes) {
        if (node.id === targetId) {
          if (node.children && node.children.length > 0) {
            node.children.forEach((child) => {
              ids.push(child.id);
              findChildren(child.id, node.children); // Recursivo
            });
          }
          return; // Encontrado
        }
        if (node.children && node.children.length > 0) {
          findChildren(targetId, node.children); // Buscar en hijos
        }
      }
    };
    findChildren(folderId, tree); // Iniciar búsqueda
    ids.push(folderId); // Añadir la propia carpeta a deshabilitar
    return ids;
  }, []); // Sin dependencias

  // Efecto para cargar el árbol de carpetas y calcular deshabilitados al abrir el modal
  useEffect(() => {
    if (isOpen && itemToMove) {
      setIsLoadingTree(true);
      setErrorTree("");

      // Establecer selección inicial en la carpeta actual del item
      const initialParentId =
        (itemToMove.type === "folder"
          ? itemToMove.parent_folder_id
          : itemToMove.folder_id) ?? null;
      setSelectedFolderId(initialParentId);
      setSelectedFolderName(
        initialParentId === null ? "Raíz" : "Cargando nombre..."
      ); // Nombre temporal

      setDisabledFolderIds([]); // Resetear deshabilitados

      const fetchTree = async () => {
        try {
          const response = await getFolderTree();
          const treeData = response.data || [];
          setFolderTree(treeData);

          // Encontrar y establecer nombre inicial si no es raíz
          let initialSelectedName = "Raíz";
          if (initialParentId !== null) {
            const findName = (id, nodes) => {
              for (const node of nodes) {
                if (node.id === id) return node.name;
                if (node.children) {
                  const found = findName(id, node.children);
                  if (found) return found;
                }
              }
              return null;
            };
            initialSelectedName =
              findName(initialParentId, treeData) || "Carpeta Desconocida";
          }
          // Solo actualizamos nombre si el ID seleccionado no ha cambiado mientras cargaba
          setSelectedFolderId((currentId) => {
            if (currentId === initialParentId) {
              setSelectedFolderName(initialSelectedName);
            }
            return currentId;
          });

          // Deshabilitar item a mover y descendientes (si es carpeta)
          if (itemToMove.type === "folder") {
            const idsToDisable = getDescendantIds(itemToMove.id, treeData);
            setDisabledFolderIds(idsToDisable);
          } else {
            setDisabledFolderIds([]); // No deshabilitar nada si es archivo
          }
        } catch (err) {
          console.error("Error fetching folder tree:", err);
          setErrorTree("No se pudo cargar la estructura de carpetas.");
        } finally {
          setIsLoadingTree(false);
        }
      };
      fetchTree();
    }
  }, [isOpen, itemToMove, getDescendantIds]); // Dependencias del efecto

  // Manejador para seleccionar una carpeta del árbol
  const handleSelectFolder = (id, name) => {
    if (disabledFolderIds.includes(id)) return; // Ignorar clic si está deshabilitada
    setSelectedFolderId(id);
    setSelectedFolderName(name);
  };

  // Manejador para seleccionar la opción "Raíz"
  const handleSelectRoot = () => {
    setSelectedFolderId(null);
    setSelectedFolderName("Raíz");
  };

  // Manejador para confirmar la acción de mover
  const handleConfirm = () => {
    if (itemToMove && !isActionLoading) {
      const destinationIdForApi =
        selectedFolderId === null ? null : selectedFolderId; // null para API si es raíz

      // Validaciones finales antes de ejecutar
      if (
        itemToMove.type === "folder" &&
        itemToMove.id === destinationIdForApi
      ) {
        toast.warn("No se puede mover una carpeta dentro de sí misma.");
        return;
      }
      if (disabledFolderIds.includes(destinationIdForApi)) {
        toast.warn(
          "No se puede mover un elemento a una de sus propias subcarpetas."
        );
        return;
      }
      // Comprobar si ya está en el destino para evitar llamada innecesaria
      const currentParentId =
        (itemToMove.type === "folder"
          ? itemToMove.parent_folder_id
          : itemToMove.folder_id) ?? null;
      if (currentParentId === destinationIdForApi) {
        toast.info(
          `"${itemToMove.name}" ya se encuentra en "${selectedFolderName}".`
        );
        onClose(); // Cerrar modal
        return;
      }

      // Llamar a la función pasada por props para ejecutar el movimiento
      onConfirmMove(itemToMove, destinationIdForApi);
    }
  };

  // Calcular si el botón de confirmar debe estar deshabilitado
  const currentParentIdForCheck =
    (itemToMove?.type === "folder"
      ? itemToMove?.parent_folder_id
      : itemToMove?.folder_id) ?? null;
  const isDisabledBecauseLoading = isLoadingTree || isActionLoading;
  const isDisabledBecauseSelection =
    disabledFolderIds.includes(selectedFolderId);
  const isDisabledBecauseSameLocation =
    currentParentIdForCheck === selectedFolderId;
  const isConfirmDisabled =
    isDisabledBecauseLoading ||
    isDisabledBecauseSelection ||
    isDisabledBecauseSameLocation;

  // Renderizado del modal
  return (
    <Modal
      isOpen={isOpen}
      onClose={!isActionLoading ? onClose : null} // Permitir cerrar si no hay acción en curso
      title={`Mover ${
        itemToMove?.type === "folder" ? "Carpeta" : "Archivo"
      }: "${itemToMove?.name || ""}"`}
    >
      <div className={styles.modalBodyContent}>
        {/* Mostrar carga o error si aplica */}
        {isLoadingTree && <p>Cargando carpetas...</p>}
        {errorTree && <p className={styles.errorText}>{errorTree}</p>}

        {/* Mostrar árbol si no hay carga ni error */}
        {!isLoadingTree && !errorTree && (
          <>
            <p>Selecciona la carpeta de destino:</p>
            {/* Contenedor del árbol con scroll */}
            <div className={styles.folderTreeContainer}>
              {/* Opción estática para la Raíz */}
              <div
                className={`${styles.folderItem} ${
                  selectedFolderId === null ? styles.selected : ""
                }`}
                onClick={handleSelectRoot}
                style={{ paddingLeft: "10px" }} // Sin indentación extra
                title="Raíz (Directorio Principal)"
              >
                G Raíz (Directorio Principal)
              </div>
              {/* Mapeo recursivo del árbol de carpetas */}
              {Array.isArray(folderTree) &&
                folderTree.map((rootFolder) => (
                  <FolderTreeItem
                    key={rootFolder.id}
                    folder={rootFolder}
                    level={0} // Nivel inicial para carpetas raíz
                    onSelect={handleSelectFolder}
                    selectedId={selectedFolderId}
                    disabledIds={disabledFolderIds} // Pasar los IDs deshabilitados
                  />
                ))}
            </div>
            {/* Mostrar destino seleccionado */}
            <p className={styles.selectedDestination}>
              Mover a: <strong>{selectedFolderName}</strong>
            </p>
          </>
        )}
        {/* Acciones del Modal (botones) */}
        <div className={modalBaseStyles.modalActions}>
          <button
            onClick={onClose}
            className={modalBaseStyles.cancelButton}
            disabled={isActionLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={modalBaseStyles.confirmButton}
            disabled={isConfirmDisabled} // Habilitación dinámica
            title={
              isConfirmDisabled
                ? "No se puede mover a esta ubicación"
                : "Mover elemento aquí"
            } // Tooltip útil
          >
            {/* Mostrar spinner si hay acción externa (moviendo) */}
            {isActionLoading && !isLoadingTree && (
              <span className={modalBaseStyles.spinner}></span>
            )}
            Mover Aquí
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default MoveItemModal;
