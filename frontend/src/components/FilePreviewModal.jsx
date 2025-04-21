// frontend/src/components/FilePreviewModal.jsx
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

// Función auxiliar para intentar determinar el lenguaje para SyntaxHighlighter
const getLanguageFromMime = (mimeType = "", fileName = "") => {
  mimeType = mimeType.toLowerCase();
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  // Prioridad a la extensión para tipos comunes de código/texto
  if (extension === "js" || extension === "mjs") return "javascript";
  if (extension === "jsx") return "jsx";
  if (extension === "ts") return "typescript";
  if (extension === "tsx") return "tsx";
  if (extension === "css") return "css";
  if (extension === "html" || extension === "htm") return "html";
  if (extension === "xml") return "xml";
  if (extension === "json") return "json";
  if (extension === "md" || extension === "markdown") return "markdown";
  if (extension === "yaml" || extension === "yml") return "yaml";
  if (extension === "sql") return "sql";
  if (extension === "py") return "python";
  if (extension === "php") return "php";
  if (extension === "sh") return "bash";
  if (extension === "java") return "java";
  if (extension === "c") return "c";
  if (
    extension === "cpp" ||
    extension === "cxx" ||
    extension === "h" ||
    extension === "hpp"
  )
    return "cpp";
  if (extension === "rb") return "ruby";
  if (extension === "go") return "go";
  if (extension === "rs") return "rust";
  if (extension === "kt") return "kotlin";
  if (extension === "swift") return "swift";
  if (extension === "txt") return "text"; // Para archivos de texto plano

  // Fallback usando el MIME type si la extensión no coincidió
  if (mimeType.includes("javascript")) return "javascript";
  if (mimeType.includes("typescript")) return "typescript";
  if (mimeType.includes("css")) return "css";
  if (mimeType.includes("html")) return "html";
  if (mimeType.includes("xml")) return "xml";
  if (mimeType.includes("json")) return "json";
  if (mimeType.includes("markdown")) return "markdown";
  if (mimeType.includes("yaml")) return "yaml";
  if (mimeType.includes("sql")) return "sql";
  if (mimeType.includes("python")) return "python";
  if (mimeType.includes("php")) return "php";
  if (mimeType.includes("shell")) return "bash";
  if (mimeType.startsWith("text/")) return "text"; // Genérico para otros text/*

  return "text"; // Último fallback
};

function FilePreviewModal({ isOpen, onClose, file }) {
  const [previewContentUrl, setPreviewContentUrl] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileType, setFileType] = useState(""); // 'image', 'pdf', 'video', 'audio', 'text', 'unsupported'
  const [language, setLanguage] = useState("text"); // para SyntaxHighlighter
  const objectUrlRef = useRef(null);
  const { appliedTheme } = useTheme();

  useEffect(() => {
    // Función de limpieza para revocar URLs de Blob
    const cleanup = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    if (isOpen && file) {
      cleanup(); // Limpiar URL anterior si existe
      setIsLoading(true);
      setError("");
      setPreviewContentUrl(null);
      setTextContent("");
      // Resetear estados (no es necesario resetear a 'unsupported' aquí)
      // setFileType('');
      // setLanguage('text');

      const mime = file?.mime_type?.toLowerCase() || "";
      const fileName = file?.name || "";
      const fileNameLower = fileName.toLowerCase();

      let type = "unsupported"; // Empezar asumiendo que no es soportado
      let lang = "text"; // Lenguaje por defecto

      // --- LÓGICA DE DETECCIÓN ACTUALIZADA ---
      if (mime.startsWith("image/")) {
        type = "image";
      } else if (mime === "application/pdf") {
        type = "pdf";
      } else if (mime.startsWith("video/")) {
        type = "video";
      } else if (mime.startsWith("audio/")) {
        type = "audio";
      } else if (
        // Comprobar tipos MIME de texto/código conocidos
        mime.startsWith("text/") || // Incluye text/plain, text/markdown, text/css, etc.
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
          // Añade otros application/* que quieras tratar como texto
        ].includes(mime)
      ) {
        type = "text";
        lang = getLanguageFromMime(mime, fileName); // Determinar lenguaje específico
      } else if (
        // *** FALLBACK POR EXTENSIÓN para tipos de texto/código comunes ***
        fileNameLower.endsWith(".md") ||
        fileNameLower.endsWith(".txt") ||
        fileNameLower.endsWith(".js") ||
        fileNameLower.endsWith(".mjs") ||
        fileNameLower.endsWith(".jsx") ||
        fileNameLower.endsWith(".css") ||
        fileNameLower.endsWith(".json") ||
        fileNameLower.endsWith(".html") ||
        fileNameLower.endsWith(".htm") ||
        fileNameLower.endsWith(".xml") ||
        fileNameLower.endsWith(".ts") ||
        fileNameLower.endsWith(".tsx") ||
        fileNameLower.endsWith(".py") ||
        fileNameLower.endsWith(".php") ||
        fileNameLower.endsWith(".sql") ||
        fileNameLower.endsWith(".yaml") ||
        fileNameLower.endsWith(".yml") ||
        fileNameLower.endsWith(".sh") ||
        fileNameLower.endsWith(".java") ||
        fileNameLower.endsWith(".c") ||
        fileNameLower.endsWith(".cpp") ||
        fileNameLower.endsWith(".h") ||
        fileNameLower.endsWith(".cs") || // C#
        fileNameLower.endsWith(".rb") || // Ruby
        fileNameLower.endsWith(".go") || // Go
        fileNameLower.endsWith(".rs") || // Rust
        fileNameLower.endsWith(".kt") || // Kotlin
        fileNameLower.endsWith(".swift") // Swift
      ) {
        type = "text"; // Forzar tipo texto si la extensión coincide
        lang = getLanguageFromMime(mime, fileName); // Intentar obtener lenguaje correcto (debería funcionar por extensión ahora)
        console.log(
          `FilePreviewModal: Tipo de archivo establecido a 'text' basado en extensión para: ${fileName}`
        );
      }
      // --- FIN LÓGICA DE DETECCIÓN ---

      setFileType(type); // Establecer el tipo final
      setLanguage(lang); // Establecer el lenguaje final

      // Solo intentar cargar si el tipo NO es 'unsupported'
      if (type !== "unsupported") {
        const loadFileContent = async () => {
          try {
            // Usar la función API que devuelve el blob
            const response = await getFileDataAsBlob(file.id);
            if (type === "text") {
              // Si es texto, leer el contenido del blob
              const text = await response.data.text();
              setTextContent(text);
            } else {
              // Para otros tipos (imagen, pdf, video, audio), crear una Object URL
              objectUrlRef.current = URL.createObjectURL(response.data);
              setPreviewContentUrl(objectUrlRef.current);
            }
          } catch (err) {
            console.error(`Error cargando contenido de ${file.name}:`, err);
            const errorMsg =
              err.response?.data?.message ||
              `No se pudo cargar el contenido del archivo.`;
            setError(errorMsg);
          } finally {
            setIsLoading(false);
          }
        };
        loadFileContent();
      } else {
        // Si sigue siendo 'unsupported', no necesitamos cargar nada
        setIsLoading(false);
        console.log(
          `FilePreviewModal: Tipo no soportado para ${fileName} (MIME: ${mime})`
        );
      }
    } else {
      // Limpieza si el modal se cierra o no hay archivo
      cleanup();
      setIsLoading(false);
      setError("");
      setPreviewContentUrl(null);
      setTextContent("");
      setFileType("");
      setLanguage("text");
    }

    // Devolver la función de limpieza para que se ejecute al desmontar o si cambian las dependencias
    return cleanup;
  }, [isOpen, file]); // Dependencias del efecto

  // Función para manejar la descarga desde el modal (si la preview no está disponible)
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await downloadFile(fileId); // Usa la función de api.js
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
      // Podrías usar toast aquí también si lo importas
      alert("No se pudo descargar el archivo.");
    }
  };

  // Función para renderizar el contenido de la previsualización
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
            alt={`Previsualización de ${file.name}`}
            className={styles.previewImage}
          />
        );
      case "pdf":
        // Usar <object> es más robusto que <iframe> para PDFs en algunos navegadores
        return (
          <object
            data={previewContentUrl}
            type="application/pdf"
            className={styles.previewPdf}
            aria-label={`Previsualización de PDF: ${file.name}`}
          >
            {/* Fallback si el navegador no puede mostrar el PDF */}
            <p style={{ padding: "20px", textAlign: "center" }}>
              Tu navegador no puede mostrar PDFs directamente. Puedes{" "}
              <a
                href={previewContentUrl}
                download={file.name}
                style={{
                  color: "var(--text-link)",
                  textDecoration: "underline",
                }}
              >
                descargar el archivo PDF
              </a>{" "}
              para verlo.
            </p>
          </object>
        );
      case "video":
        return (
          <video
            controls
            className={styles.previewMedia}
            src={previewContentUrl}
            title={`Reproductor de vídeo: ${file.name}`}
          >
            Tu navegador no soporta la etiqueta de vídeo.
          </video>
        );
      case "audio":
        return (
          <audio
            controls
            className={styles.previewMedia}
            src={previewContentUrl}
            title={`Reproductor de audio: ${file.name}`}
          >
            Tu navegador no soporta la etiqueta de audio.
          </audio>
        );
      case "text":
        // Usar SyntaxHighlighter para texto y código
        return (
          <SyntaxHighlighter
            language={language} // El lenguaje detectado (ej. 'markdown', 'javascript', 'text')
            style={appliedTheme === "dark" ? tomorrow : coy} // Estilo claro/oscuro
            customStyle={{
              width: "100%",
              height: "100%", // Ocupar contenedor
              margin: 0,
              padding: "15px", // Padding interno
              borderRadius: "var(--border-radius-small)", // Redondeo interno
              // maxHeight: "70vh", // Altura máxima (ya controlada por .previewContainer)
              overflow: "auto", // Scroll si es necesario
              fontSize: "0.85rem", // Tamaño fuente código/texto
              lineHeight: 1.5,
              // Dejar que el contenedor maneje el fondo y borde
              // backgroundColor: "var(--background-elevated)",
              // border: "1px solid var(--border-color-light)",
            }}
            wrapLines={true} // Habilitar ajuste de línea
            showLineNumbers={false} // Opcional: mostrar números de línea
          >
            {textContent}
          </SyntaxHighlighter>
        );
      default: // fileType === 'unsupported'
        return (
          <div className={styles.unsupported}>
            <p>
              Vista previa no disponible para este tipo de archivo (MIME:{" "}
              {file?.mime_type || "desconocido"}).
            </p>
            <button
              onClick={() => handleDownloadFile(file?.id, file?.name)}
              className={modalBaseStyles.confirmButton} // Reutilizar estilo de botón primario
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
      {/* Contenedor que controla tamaño y scroll */}
      <div
        className={`${styles.previewContainer} ${
          fileType === "pdf" ? styles.previewContainerLarge : "" // Clase especial para PDFs grandes
        }`}
      >
        {renderPreview()}
      </div>
    </Modal>
  );
}

export default FilePreviewModal;
