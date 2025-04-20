// frontend/src/components/ImageThumbnail.jsx
import React, { useState, useEffect } from 'react';
import { getFileDataAsBlob } from '../services/api';
import styles from '../pages/DashboardPage.module.css'; // Reutilizar estilos

function ImageThumbnail({ fileId, alt }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    setIsLoading(true);
    setError(false);

    const loadImage = async () => {
      try {
        const response = await getFileDataAsBlob(fileId); // Llama a la nueva función
        objectUrl = URL.createObjectURL(response.data); // Crea URL temporal
        setImageUrl(objectUrl);
      } catch (err) {
        console.error(`Error cargando imagen ${fileId}:`, err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // Función de limpieza para revocar la URL del objeto cuando el componente se desmonte
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId]); // Ejecutar cada vez que cambie fileId

  if (isLoading) {
    // Placeholder opcional mientras carga
    return <div className={styles.itemThumbnail} style={{ backgroundColor: '#eee' }}></div>;
  }

  if (error) {
    // Placeholder opcional en caso de error
    return <span title="Error al cargar imagen">⚠️</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={styles.itemThumbnail}
    />
  );
}

export default ImageThumbnail;