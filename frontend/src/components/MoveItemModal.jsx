// frontend/src/components/MoveItemModal.jsx
import React, { useState, useEffect } from 'react';
import { getFolderTree } from '../services/api';
import Modal from './Modal';
import styles from './MoveItemModal.module.css';
import modalBaseStyles from './Modal.module.css';

// Componente recursivo simple para renderizar el árbol
const FolderTreeItem = ({ folder, level = 0, onSelect, selectedId, disabledIds = [] }) => {
  const isDisabled = disabledIds.includes(folder.id);
  const isSelected = selectedId === folder.id;

  return (
    <>
      <div
        className={`${styles.folderItem} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
        style={{ paddingLeft: `${level * 20 + 10}px` }}
        onClick={!isDisabled ? () => onSelect(folder.id, folder.name) : undefined}
      >
        📁 {folder.name}
      </div>
      {/* Renderizar hijos solo si no está deshabilitado y tiene hijos */}
      {!isDisabled && folder.children && folder.children.length > 0 && (
        <div className={styles.folderChildren}>
          {folder.children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              disabledIds={disabledIds} // Pasar los IDs deshabilitados hacia abajo
            />
          ))}
        </div>
      )}
    </>
  );
};


function MoveItemModal({ isOpen, onClose, itemToMove, onConfirmMove }) {
  const [folderTree, setFolderTree] = useState([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState('Raíz');
  const [errorTree, setErrorTree] = useState('');
  const [disabledFolderIds, setDisabledFolderIds] = useState([]);

  // --- ELIMINADAS FUNCIONES getDescendantIds y flatten (si existía) ---
  // const getDescendantIds = (folderId, allFolders) => { ... };
  // const flatten = (folders) => { ... };
  // --------------------------------------------------------------------

  useEffect(() => {
    if (isOpen && itemToMove) {
      setIsLoadingTree(true);
      setErrorTree('');
      setSelectedFolderId(null);
      setSelectedFolderName('Raíz');
      setDisabledFolderIds([]); // Limpiar al abrir

      const fetchTree = async () => {
        try {
          const response = await getFolderTree();
          const treeData = response.data || [];
          setFolderTree(treeData);

          // Deshabilitar solo la carpeta que se está moviendo (validación completa en backend)
          if (itemToMove.type === 'folder') {
             setDisabledFolderIds([itemToMove.id]);
          } else {
             setDisabledFolderIds([]);
          }

        } catch (err) {
          console.error("Error fetching folder tree:", err);
          setErrorTree('No se pudo cargar la estructura de carpetas.');
        } finally {
          setIsLoadingTree(false);
        }
      };
      fetchTree();
    }
  }, [isOpen, itemToMove]); // Dependencias correctas

  const handleSelectFolder = (id, name) => {
    setSelectedFolderId(id);
    setSelectedFolderName(name);
  };

   const handleSelectRoot = () => {
       setSelectedFolderId(null); // null representa la raíz
       setSelectedFolderName('Raíz');
   };

  const handleConfirm = () => {
    if (itemToMove) {
        const destinationIdForApi = selectedFolderId === 'root' ? null : selectedFolderId;
        onConfirmMove(itemToMove, destinationIdForApi);
    }
  };

  // Deshabilitar si el destino es la propia carpeta que movemos
  const isMoveDisabled = itemToMove?.type === 'folder' && selectedFolderId === itemToMove.id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mover ${itemToMove?.type === 'folder' ? 'Carpeta' : 'Archivo'}: "${itemToMove?.name || ''}"`}
    >
      <div className={styles.modalBodyContent}>
        {isLoadingTree && <p>Cargando carpetas...</p>}
        {errorTree && <p className={styles.errorText}>{errorTree}</p>}

        {!isLoadingTree && !errorTree && (
            <>
             <p>Selecciona la carpeta de destino:</p>
             <div className={styles.folderTreeContainer}>
                 <div
                     className={`${styles.folderItem} ${selectedFolderId === null ? styles.selected : ''} ${disabledFolderIds.includes('root') ? styles.disabled : ''}`} // Raíz no se deshabilita aquí
                     onClick={handleSelectRoot}
                 >
                      G Raíz (Directorio Principal)
                 </div>
                 {folderTree.map(rootFolder => (
                     <FolderTreeItem
                         key={rootFolder.id}
                         folder={rootFolder}
                         onSelect={handleSelectFolder}
                         selectedId={selectedFolderId}
                         disabledIds={disabledFolderIds} // Pasar IDs deshabilitados
                     />
                  ))}
             </div>
             <p className={styles.selectedDestination}>
                Mover a: <strong>{selectedFolderName}</strong>
             </p>
            </>
        )}
        <div className={modalBaseStyles.modalActions}>
          <button onClick={onClose} className={modalBaseStyles.cancelButton}>
            Cancelar
          </button>
          <button
             onClick={handleConfirm}
             className={modalBaseStyles.confirmButton}
             disabled={isLoadingTree || isMoveDisabled} // Deshabilitar si carga o destino es inválido
          >
            Mover Aquí
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default MoveItemModal;