import React, { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.css';

// Importa o define aquí los iconos que quieras usar en el menú
// Ejemplo simple con texto:
const RenameIcon = () => '✏️';
const MoveIcon = () => '➡️';
const DownloadIcon = () => '⬇️';
const TrashIcon = () => '🗑️';
const PreviewIcon = () => '👁️';


function ContextMenu({
  position,
  item,
  onClose,
  onRename,
  onMove,
  onDelete,
  onDownload,
  onPreview,
  isActionLoading, // Para deshabilitar acciones si algo está cargando
}) {
  const menuRef = useRef(null);
  const isFolder = item?.type === 'folder';

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    // Usar mousedown para capturar antes que otros onClick puedan interferir
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Evitar que el clic dentro del menú cierre el propio menú
  const handleMenuClick = (e) => {
    e.stopPropagation();
  };

  // --- Funciones wrapper para acciones ---
  // Estas funciones llaman a la acción correspondiente y luego cierran el menú
  const handleAction = (actionFn) => {
    if (actionFn && typeof actionFn === 'function') {
      actionFn(item.type, item.id, item.name); // Pasar info del item
    }
    onClose(); // Siempre cerrar después de la acción
  };

  if (!item) return null;

  // Determinar si la previsualización está disponible
    const mime = item.mime_type || "";
    const isPreviewable = !isFolder && (
        mime.startsWith("image/") ||
        mime === "application/pdf" ||
        mime.startsWith("text/") ||
        mime.startsWith("video/") ||
        mime.startsWith("audio/") ||
        ["application/json", "application/javascript", "application/xml", "application/xhtml+xml"].includes(mime)
    );

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      onClick={handleMenuClick} // Evita cierre inmediato
      onContextMenu={(e) => e.preventDefault()} // Evita menú anidado
    >
      <ul>
        {/* Previsualizar (solo archivos previewables) */}
        {!isFolder && isPreviewable && (
            <li onClick={() => handleAction(onPreview)} className={isActionLoading ? styles.disabled : ''} role="button" tabIndex={isActionLoading ? -1 : 0}>
                 <PreviewIcon /> Previsualizar
            </li>
        )}

        {/* Renombrar */}
        <li onClick={() => handleAction(onRename)} className={isActionLoading ? styles.disabled : ''} role="button" tabIndex={isActionLoading ? -1 : 0}>
          <RenameIcon /> Renombrar
        </li>

        {/* Mover */}
        <li onClick={() => handleAction(onMove)} className={isActionLoading ? styles.disabled : ''} role="button" tabIndex={isActionLoading ? -1 : 0}>
          <MoveIcon /> Mover
        </li>

        {/* Descargar (solo archivos) */}
        {!isFolder && (
          <li onClick={() => handleAction(onDownload)} className={isActionLoading ? styles.disabled : ''} role="button" tabIndex={isActionLoading ? -1 : 0}>
            <DownloadIcon /> Descargar
          </li>
        )}

        {/* Separador */}
        <li className={styles.separator}></li>

        {/* Mover a Papelera */}
        <li onClick={() => handleAction(onDelete)} className={`${styles.dangerOption} ${isActionLoading ? styles.disabled : ''}`} role="button" tabIndex={isActionLoading ? -1 : 0}>
           <TrashIcon /> Mover a Papelera
        </li>
      </ul>
    </div>
  );
}

export default ContextMenu;