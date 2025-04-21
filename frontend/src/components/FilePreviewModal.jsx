import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { getFileDataAsBlob, downloadFile } from "../services/api";
// Usa el Prism build en lugar del Light build por defecto
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
// Temas de Prism para claro y oscuro
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "../context/ThemeContext";

// --- IMPORTAR Y REGISTRAR LENGUAJES PRISM NECESARIOS ---
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";

SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("xml", markup);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("php", php);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("bash", bash);

import styles from "./FilePreviewModal.module.css";
import modalBaseStyles from "./Modal.module.css";

const getLanguageFromMime = (mimeType = "", fileName = "") => {
  mimeType = mimeType.toLowerCase();
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  // Extensión
  if (extension === "html" || extension === "htm") return "html";
  if (extension === "xml") return "xml";
  if (extension === "jsx") return "jsx";
  if (extension === "tsx") return "tsx";
  if (extension === "js" || extension === "mjs") return "javascript";
  if (extension === "css") return "css";
  if (extension === "json") return "json";
  if (extension === "md" || extension === "markdown") return "markdown";
  if (extension === "yaml" || extension === "yml") return "yaml";
  if (extension === "sql") return "sql";
  if (extension === "py") return "python";
  if (extension === "php") return "php";
  if (extension === "sh") return "bash";
  // ... otros

  // Fallback por MIME
  if (mimeType.includes("html")) return "html";
  if (mimeType.includes("javascript")) return "javascript";
  if (mimeType.includes("css")) return "css";
  if (mimeType.includes("json")) return "json";
  if (mimeType.includes("markdown")) return "markdown";
  if (mimeType.includes("yaml")) return "yaml";
  if (mimeType.includes("sql")) return "sql";
  if (mimeType.includes("python")) return "python";
  if (mimeType.includes("php")) return "php";
  if (mimeType.includes("shell")) return "bash";
  if (mimeType.includes("typescript")) return "typescript";

  return "text";
};

function FilePreviewModal({ isOpen, onClose, file }) {
  const [previewContentUrl, setPreviewContentUrl] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileType, setFileType] = useState("");
  const [language, setLanguage] = useState("text");
  const objectUrlRef = useRef(null);
  const { appliedTheme } = useTheme();

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
      setLanguage("text");

      const mime = file?.mime_type?.toLowerCase() || "";
      const fileName = file?.name || "";
      let type = "unsupported";
      let lang = "text";

      if (mime.startsWith("image/")) {
        type = "image";
      } else if (mime === "application/pdf") {
        type = "pdf";
      } else if (mime.startsWith("video/")) {
        type = "video";
      } else if (mime.startsWith("audio/")) {
        type = "audio";
      } else if (
        mime.startsWith("text/") ||
        [
          "application/json",
          "application/javascript",
          "application/xml",
          "application/x-yaml",
          "application/sql",
          "application/x-sh",
          "application/x-typescript",
          "application/x-php",
          "application/x-python-code",
        ].includes(mime)
      ) {
        type = "text";
        lang = getLanguageFromMime(mime, fileName);
      }

      setFileType(type);
      setLanguage(lang);

      if (type !== "unsupported") {
        const loadFileContent = async () => {
          try {
            const response = await getFileDataAsBlob(file.id);
            if (type === "text") {
              const text = await response.data.text();
              setTextContent(text);
            } else {
              objectUrlRef.current = URL.createObjectURL(response.data);
              setPreviewContentUrl(objectUrlRef.current);
            }
          } catch (err) {
            console.error(`Error cargando ${file.name}:`, err);
            const errorMsg =
              err.response?.data?.message || `No se pudo cargar el archivo.`;
            setError(errorMsg);
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
      setLanguage("text");
    }

    return cleanup;
  }, [isOpen, file]);

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName || "descarga");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando desde modal:", error);
      alert("No se pudo descargar el archivo.");
    }
  };

  const renderPreview = () => {
    if (isLoading)
      return <p className={styles.loadingText}>Cargando previsualización...</p>;
    if (error) return <p className={styles.errorText}>{error}</p>;

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
        return (
          <object
            data={previewContentUrl}
            type="application/pdf"
            className={styles.previewPdf}
          >
            <p>
              Tu navegador no soporta PDF.{" "}
              <a href={previewContentUrl} download={file.name}>
                Descárgalo aquí
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
            Tu navegador no soporta vídeo.
          </video>
        );
      case "audio":
        return (
          <audio
            controls
            className={styles.previewMedia}
            src={previewContentUrl}
          >
            Tu navegador no soporta audio.
          </audio>
        );
      case "text":
        return (
          <SyntaxHighlighter
            language={language}
            style={appliedTheme === "dark" ? tomorrow : coy}
            customStyle={{
              width: "100%",
              margin: 0,
              padding: "15px",
              borderRadius: "var(--border-radius-small)",
              maxHeight: "70vh",
              overflow: "auto",
              fontSize: "0.85rem",
              backgroundColor: "var(--background-elevated)",
              border: "1px solid var(--border-color-light)",
            }}
            wrapLines
            showLineNumbers={false}
          >
            {textContent}
          </SyntaxHighlighter>
        );
      default:
        return (
          <div className={styles.unsupported}>
            <p>
              Vista previa no disponible para este tipo de archivo (
              {file?.mime_type}).
            </p>
            <button
              onClick={() => handleDownloadFile(file?.id, file?.name)}
              className={modalBaseStyles.confirmButton}
              style={{ marginTop: 15 }}
              disabled={!file?.id}
            >
              Descargar Archivo
            </button>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Previsualización: ${file?.name || ""}`}
    >
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
