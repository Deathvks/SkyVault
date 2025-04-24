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
        {/* Icono - podrías mejorarlo con un SVG real */}
        <span
          style={{
            marginRight: "8px",
            fontSize: "1.1em",
            opacity: isDisabled ? 0.5 : isSelected ? 1 : 0.8,
          }}
        >
          📁
        </span>
        {folder.name}
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
  itemsToMove, // Renombrado a plural, siempre será un array
  onConfirmMove,
  isActionLoading, // Prop que indica si hay una acción en curso
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
              // ¡Corrección en recursión! Pasar node.children, no tree
              findChildren(child.id, node.children);
            });
          }
          return; // Encontrado
        }
        // ¡Corrección en recursión! Pasar node.children, no tree
        if (node.children && node.children.length > 0) {
          findChildren(targetId, node.children); // Buscar en hijos
        }
      }
    };
    findChildren(folderId, tree); // Iniciar búsqueda desde la raíz del árbol
    ids.push(folderId); // Añadir la propia carpeta a deshabilitar
    return ids;
  }, []); // Sin dependencias

  // Efecto para cargar el árbol de carpetas y calcular deshabilitados al abrir el modal
  useEffect(() => {
    // Asegurarse que itemsToMove es un array y tiene al menos un elemento
    if (isOpen && Array.isArray(itemsToMove) && itemsToMove.length > 0) {
      const firstItem = itemsToMove[0]; // Usar el primer item para determinar la carpeta actual
      setIsLoadingTree(true);
      setErrorTree("");
      setDisabledFolderIds([]); // Resetear deshabilitados

      // Establecer selección inicial en la carpeta actual del *primer* item
      const initialParentId =
        (firstItem.type === "folder"
          ? firstItem.parent_folder_id // Usar parent_folder_id si es carpeta
          : firstItem.folder_id) ?? // Usar folder_id si es archivo
        null; // Si no tiene padre (está en raíz), es null

      setSelectedFolderId(initialParentId);
      // Nombre temporal mientras carga el árbol
      setSelectedFolderName(
        initialParentId === null ? "Raíz" : "Cargando nombre..."
      );

      const fetchTree = async () => {
        try {
          const response = await getFolderTree();
          const treeData = response.data || [];
          setFolderTree(treeData);

          // Encontrar y establecer nombre inicial correcto si no es raíz
          let initialSelectedNameFound = "Raíz";
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
            initialSelectedNameFound =
              findName(initialParentId, treeData) || "Carpeta Desconocida";
          }
          // Solo actualizamos nombre si el ID seleccionado no ha cambiado mientras cargaba
          // Esto evita sobrescribir una selección hecha por el usuario rápidamente
          setSelectedFolderId((currentSelectedIdDuringLoad) => {
            if (currentSelectedIdDuringLoad === initialParentId) {
              setSelectedFolderName(initialSelectedNameFound);
            }
            return currentSelectedIdDuringLoad;
          });

          // Deshabilitar carpetas destino inválidas (la propia carpeta y sus hijas)
          // Solo aplica si movemos UNA carpeta
          if (itemsToMove.length === 1 && firstItem.type === "folder") {
            if (firstItem.id) {
              // Asegurarse que el ID existe
              const idsToDisable = getDescendantIds(firstItem.id, treeData);
              setDisabledFolderIds(idsToDisable);
            }
          } else {
            // No deshabilitar nada si movemos archivo(s) o múltiples carpetas
            // (La validación de mover a subcarpeta se hará en el backend o al confirmar)
            setDisabledFolderIds([]);
          }
        } catch (err) {
          console.error("Error fetching folder tree:", err);
          setErrorTree("No se pudo cargar la estructura de carpetas.");
          setSelectedFolderName("Error"); // Indicar error en nombre
        } finally {
          setIsLoadingTree(false);
        }
      };
      fetchTree();
    } else if (!isOpen) {
      // Resetear estados al cerrar
      setFolderTree([]);
      setIsLoadingTree(false);
      setSelectedFolderId(null);
      setSelectedFolderName("Raíz");
      setErrorTree("");
      setDisabledFolderIds([]);
    }
  }, [isOpen, itemsToMove, getDescendantIds]); // Dependencias del efecto

  // Manejador para seleccionar una carpeta del árbol
  const handleSelectFolder = (id, name) => {
    if (disabledFolderIds.includes(id)) return; // Ignorar clic si está deshabilitada
    setSelectedFolderId(id);
    setSelectedFolderName(name);
  };

  // Manejador para seleccionar la opción "Raíz"
  const handleSelectRoot = () => {
    // No necesitas verificar disabledFolderIds aquí porque la raíz (null) nunca estará deshabilitada
    setSelectedFolderId(null);
    setSelectedFolderName("Raíz");
  };

  // Manejador para confirmar la acción de mover
  // Dentro de MoveItemModal.jsx
  const handleConfirm = () => {
    console.log("[MoveItemModal Debug] handleConfirm INICIADO."); // <-- LOG INICIO

    if (
      !Array.isArray(itemsToMove) ||
      itemsToMove.length === 0 ||
      isActionLoading
    ) {
      console.log(
        "[MoveItemModal Debug] Salida temprana: No items o cargando."
      ); // <-- LOG SALIDA TEMPRANA
      return;
    }

    const destinationIdForApi =
      selectedFolderId === null ? null : selectedFolderId;
    console.log(
      `[MoveItemModal Debug] Destino seleccionado (API): ${destinationIdForApi}, Nombre: ${selectedFolderName}`
    ); // <-- LOG DESTINO

    // *** Validaciones ANTES de llamar a onConfirmMove ***
    if (itemsToMove.length === 1 && itemsToMove[0].type === "folder") {
      const movingFolder = itemsToMove[0];
      console.log(
        `[MoveItemModal Debug] Validando mover carpeta ID ${movingFolder.id} a destino ${destinationIdForApi}`
      ); // <-- LOG VALIDACIÓN CARPETA

      if (movingFolder.id === destinationIdForApi) {
        console.warn(
          "[MoveItemModal Debug] Validación FALLIDA: Mover carpeta a sí misma."
        ); // <-- LOG FALLO 1
        toast.warn("No se puede mover una carpeta dentro de sí misma.");
        return;
      }
      // Comprobar usando los IDs cacheados en disabledFolderIds
      if (disabledFolderIds.includes(destinationIdForApi)) {
        console.warn(
          "[MoveItemModal Debug] Validación FALLIDA: Mover carpeta a subcarpeta (destino deshabilitado)."
        ); // <-- LOG FALLO 2
        toast.warn(
          "No se puede mover una carpeta a una de sus propias subcarpetas."
        );
        return;
      }
      console.log(
        "[MoveItemModal Debug] Validación OK: Mover carpeta a sí misma/subcarpeta."
      ); // <-- LOG OK 1
    }

    // Comprobar si TODOS los elementos ya están en el destino
    console.log("[MoveItemModal Debug] Validando si ya está(n) en destino..."); // <-- LOG VALIDACIÓN MISMA UBICACIÓN
    let allItemsAlreadyInDestination = false;
    if (Array.isArray(itemsToMove) && itemsToMove.length > 0) {
      allItemsAlreadyInDestination = itemsToMove.every((item) => {
        const currentParentId =
          (item.type === "folder" ? item.parent_folder_id : item.folder_id) ??
          null;
        return currentParentId === destinationIdForApi;
      });
    }

    if (allItemsAlreadyInDestination) {
      console.info(
        "[MoveItemModal Debug] Validación INFO: Ya está(n) en el destino."
      ); // <-- LOG INFO MISMA UBICACIÓN
      const itemText =
        itemsToMove.length === 1
          ? `"${itemsToMove[0].name}"`
          : "Los elementos seleccionados";
      toast.info(
        `${itemText} ya se encuentra(n) en "${selectedFolderName}".` // Corregido para template literal
      );
      onClose();
      return;
    }
    console.log(
      "[MoveItemModal Debug] Validación OK: No está(n) todos en el destino."
    ); // <-- LOG OK 2

    // Si pasa las validaciones, llamar a la función externa
    console.log("[MoveItemModal Debug] *** Llamando a onConfirmMove... ***"); // <-- LOG LLAMADA
    onConfirmMove(itemsToMove, destinationIdForApi);
    console.log("[MoveItemModal Debug] *** onConfirmMove fue llamada. ***"); // <-- LOG DESPUÉS LLAMADA
  };

  // ==============================================================
  // Calcular si el botón de confirmar debe estar deshabilitado
  // ==============================================================

  // 1. Está cargando algo? (árbol o acción externa)
  const isDisabledBecauseLoading = isLoadingTree || isActionLoading;

  // 2. El destino seleccionado es inválido (p.ej., mover carpeta a sí misma o subcarpeta)?
  //    (Solo aplica si se mueve UNA carpeta, la validación para múltiple está en backend)
  let isDisabledBecauseSelection = false;
  if (
    Array.isArray(itemsToMove) &&
    itemsToMove.length === 1 &&
    itemsToMove[0].type === "folder"
  ) {
    isDisabledBecauseSelection = disabledFolderIds.includes(selectedFolderId);
    // También verificar si se intenta mover a sí misma explícitamente
    if (itemsToMove[0].id === selectedFolderId) {
      isDisabledBecauseSelection = true;
    }
  }

  // 3. El destino seleccionado es el mismo que el origen actual PARA TODOS los items?
  //    (Aplica para uno o VARIOS elementos) <-- LÓGICA ACTUALIZADA
  let isDisabledBecauseSameLocation = false;
  if (Array.isArray(itemsToMove) && itemsToMove.length > 0) {
    // Es true si CADA item ya está en el destino seleccionado
    isDisabledBecauseSameLocation = itemsToMove.every((item) => {
      const currentParentId =
        (item.type === "folder" ? item.parent_folder_id : item.folder_id) ??
        null; // Origen actual (null si es raíz)

      // --- LOGS DE DEPURACIÓN ---
      console.log("[MoveModal SameLocation Check] Item:", item);
      console.log(
        "[MoveModal SameLocation Check] Calculated currentParentId:",
        currentParentId,
        `(Type: ${typeof currentParentId})`
      );
      console.log(
        "[MoveModal SameLocation Check] Comparing with selectedFolderId:",
        selectedFolderId,
        `(Type: ${typeof selectedFolderId})`
      );
      const comparisonResult = currentParentId === selectedFolderId;
      console.log(
        "[MoveModal SameLocation Check] Comparison Result:",
        comparisonResult
      );
      // --- FIN LOGS ---

      return comparisonResult; // Comparar con destino seleccionado
    });
  }

  console.log(
    "[MoveModal Debug] Final isDisabledBecauseSameLocation:",
    isDisabledBecauseSameLocation
  ); // <-- LOG AÑADIDO EXTRA

  // Combinar condiciones
  // El botón se deshabilita si está cargando, O si es una selección inválida (mover carpeta a subcarpeta),
  // O si TODOS los elementos ya están en el destino.
  const isConfirmDisabled =
    isDisabledBecauseLoading ||
    isDisabledBecauseSelection || // Esta solo aplica realmente para mover 1 carpeta
    isDisabledBecauseSameLocation;

  // ---- Renderizado del Modal ----

  // Determinar el nombre del item a mostrar en el título (tomar el primero si hay varios)
  const displayItemName = itemsToMove?.[0]?.name || "";
  const displayItemType =
    itemsToMove?.[0]?.type === "folder" ? "Carpeta" : "Archivo";
  const modalTitle =
    itemsToMove?.length > 1
      ? `Mover ${itemsToMove.length} elementos`
      : `Mover ${displayItemType}: "${displayItemName}"`;

  return (
    <Modal
      isOpen={isOpen}
      // Permitir cerrar si no hay acción en curso (API call)
      onClose={!isActionLoading ? onClose : undefined}
      title={modalTitle}
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
                {/* Icono Raíz */}
                <span
                  style={{
                    marginRight: "8px",
                    fontSize: "1.1em",
                    opacity: selectedFolderId === null ? 1 : 0.8,
                  }}
                >
                  🗂️ {/* O un icono más representativo de raíz */}
                </span>
                Raíz (Directorio Principal)
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
            disabled={isActionLoading} // Deshabilitar si hay acción externa
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={modalBaseStyles.confirmButton}
            disabled={isConfirmDisabled} // Habilitación dinámica calculada arriba
            title={
              isConfirmDisabled
                ? isDisabledBecauseSameLocation
                  ? "Los elementos ya están en esta ubicación" // Mensaje actualizado
                  : isDisabledBecauseSelection
                  ? "No se puede mover a esta carpeta"
                  : "Acción no disponible"
                : "Mover elemento(s) aquí"
            } // Tooltip útil
          >
            {/* Usar isActionLoading para el spinner */}
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
