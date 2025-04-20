// frontend/src/components/Modal.jsx
import React from 'react';
import styles from './Modal.module.css';

// Icono SVG simple para 'X' (o impórtalo desde un archivo dedicado)
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);


function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) {
    return null; // No renderizar nada si no está abierto
  }

  // Evita que el clic dentro del modal lo cierre
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    // El overlay oscuro que cubre la página
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* El contenedor del contenido del modal */}
      <div className={styles.modalContent} onClick={handleContentClick}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          {/* Usar el icono SVG para cerrar */}
          <button onClick={onClose} className={styles.modalCloseButton} title="Cerrar">
            <CloseIcon />
          </button>
        </div>
        <div className={styles.modalBody}>
          {children} {/* Aquí se renderizará el contenido específico */}
        </div>
      </div>
    </div>
  );
}

export default Modal;