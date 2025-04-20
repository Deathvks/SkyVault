// frontend/src/components/FilePreviewModal.jsx
import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { getFileDataAsBlob } from "../services/api";
import styles from "./FilePreviewModal.module.css";
import modalBaseStyles from "./Modal.module.css";

function FilePreviewModal({ isOpen, onClose, file }) {
  const [previewContentUrl, setPreviewContentUrl] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileType, setFileType] = useState("");
  const objectUrlRef = useRef(null);

  useEffect(() => {
    const cleanup = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    if (isOpen && file) {
      cleanup();
      setIsLoading(true);
      setError("");
      setPreviewContentUrl(null);
      setTextContent("");
      setFileType("unsupported");

      const mime = file.mime_type || "";
      let type = "unsupported";

      if (mime.startsWith("image/")) type = "image";
      else if (mime === "application/pdf") type = "pdf"; // PDF sigue aquí
      else if (mime.startsWith("text/")) type = "text";
      else if (mime.startsWith("video/")) type = "video";
      else if (mime.startsWith("audio/")) type = "audio";
      else if (
        [
          "application/json",
          "application/javascript",
          "application/xml",
          "application/xhtml+xml",
        ].includes(mime)
      )
        type = "text";

      setFileType(type);

      if (type !== "unsupported") {
        const loadFileContent = async () => {
          try {
            const response = await getFileDataAsBlob(file.id);
            if (type === "text") {
              const text = await response.data.text();
              setTextContent(text);
            } else {
              // Crear Blob URL para pdf, image, video, audio
              objectUrlRef.current = URL.createObjectURL(response.data);
              setPreviewContentUrl(objectUrlRef.current);
            }
          } catch (err) {
            console.error(`Error loading file content for ${file.name}:`, err);
            const errorMsg =
              err.response?.data?.message ||
              `No se pudo cargar el contenido del archivo.`;
            if (
              err.response?.data &&
              err.response.data instanceof Blob &&
              err.response.data.type === "application/json"
            ) {
              try {
                setError(
                  JSON.parse(await err.response.data.text()).message || errorMsg
                );
              } catch {
                setError(errorMsg);
              }
            } else {
              setError(errorMsg);
            }
          } finally {
            setIsLoading(false);
          }
        };
        loadFileContent();
      } else {
        setIsLoading(false);
      }
    } else {
      cleanup();
      setIsLoading(false);
      setError("");
      setPreviewContentUrl(null);
      setTextContent("");
      setFileType("");
    }

    return cleanup;
  }, [isOpen, file]);

  const renderPreview = () => {
    if (isLoading) {
      return <p className={styles.loadingText}>Cargando previsualización...</p>;
    }
    if (error) {
      return <p className={styles.errorText}>{error}</p>;
    }

    switch (fileType) {
      case "image":
        return (
          <img
            src={previewContentUrl}
            alt={file.name}
            className={styles.previewImage}
          />
        );
      case "pdf":
        // PDF vuelve a renderizarse aquí con <object>
        return (
          <object
            data={previewContentUrl}
            type="application/pdf"
            className={styles.previewPdf}
          >
            <p>
              Tu navegador no soporta la previsualización de PDF. Puedes{" "}
              <a href={previewContentUrl} download={file.name}>
                descargarlo
              </a>
              .
            </p>
          </object>
        );
      case "video":
        return (
          <video
            controls
            className={styles.previewMedia}
            src={previewContentUrl}
          >
            {" "}
            Tu navegador no soporta la etiqueta de vídeo.{" "}
          </video>
        );
      case "audio":
        return (
          <audio
            controls
            className={styles.previewMedia}
            src={previewContentUrl}
          >
            {" "}
            Tu navegador no soporta la etiqueta de audio.{" "}
          </audio>
        );
      case "text":
        return (
          <pre className={styles.previewText}>
            <code>{textContent}</code>
          </pre>
        );
      default:
        return (
          <div className={styles.unsupported}>
            <p>
              Previsualización no disponible para este tipo de archivo (
              {file?.mime_type || "desconocido"}).
            </p>
            {previewContentUrl && (
              <a
                href={previewContentUrl}
                download={file?.name || "archivo"}
                className={modalBaseStyles.confirmButton}
                style={{
                  display: "inline-block",
                  textDecoration: "none",
                  marginTop: "15px",
                }}
              >
                Descargar Archivo (desde Blob)
              </a>
            )}
          </div>
        );
    }
  };

  return (
    // El Modal sigue siendo el mismo, pero su contenido se ajustará con CSS
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Previsualización: ${file?.name || ""}`}
    >
      {/* **MODIFICACIÓN:** Añadir clase condicional */}
      <div
        className={`${styles.previewContainer} ${
          fileType === "pdf" ? styles.previewContainerLarge : ""
        }`}
      >
        {renderPreview()}
      </div>
    </Modal>
  );
}

export default FilePreviewModal;
