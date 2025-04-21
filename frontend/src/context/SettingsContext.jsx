// frontend/src/context/SettingsContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";

// Valores por defecto (confirmaciones y notificaciones activadas)
const defaultSettings = {
  confirmMoveToTrash: true,
  confirmPermanentDelete: true,
  confirmEmptyTrash: true,
  showSuccessNotifications: true, // <-- NUEVO
  showErrorNotifications: true, // <-- NUEVO
};

// Función para leer desde localStorage de forma segura
const getInitialSetting = (key, defaultValue) => {
  if (typeof window !== "undefined") {
    const storedValue = localStorage.getItem(`skyvault_setting_${key}`);
    return storedValue === null ? defaultValue : storedValue === "true";
  }
  return defaultValue;
};

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  // Estados de Confirmaciones (existentes)
  const [confirmMoveToTrash, setConfirmMoveToTrash] = useState(() =>
    getInitialSetting("confirmMoveToTrash", defaultSettings.confirmMoveToTrash)
  );
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(() =>
    getInitialSetting(
      "confirmPermanentDelete",
      defaultSettings.confirmPermanentDelete
    )
  );
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(() =>
    getInitialSetting("confirmEmptyTrash", defaultSettings.confirmEmptyTrash)
  );

  // --- NUEVOS Estados de Notificaciones ---
  const [showSuccessNotifications, setShowSuccessNotifications] = useState(() =>
    getInitialSetting(
      "showSuccessNotifications",
      defaultSettings.showSuccessNotifications
    )
  );
  const [showErrorNotifications, setShowErrorNotifications] = useState(() =>
    getInitialSetting(
      "showErrorNotifications",
      defaultSettings.showErrorNotifications
    )
  );
  // --- FIN NUEVOS Estados ---

  // Efectos para guardar en localStorage (existentes)
  useEffect(() => {
    localStorage.setItem(
      "skyvault_setting_confirmMoveToTrash",
      confirmMoveToTrash
    );
  }, [confirmMoveToTrash]);

  useEffect(() => {
    localStorage.setItem(
      "skyvault_setting_confirmPermanentDelete",
      confirmPermanentDelete
    );
  }, [confirmPermanentDelete]);

  useEffect(() => {
    localStorage.setItem(
      "skyvault_setting_confirmEmptyTrash",
      confirmEmptyTrash
    );
  }, [confirmEmptyTrash]);

  // --- NUEVOS Efectos para guardar Notificaciones ---
  useEffect(() => {
    localStorage.setItem(
      "skyvault_setting_showSuccessNotifications",
      showSuccessNotifications
    );
  }, [showSuccessNotifications]);

  useEffect(() => {
    localStorage.setItem(
      "skyvault_setting_showErrorNotifications",
      showErrorNotifications
    );
  }, [showErrorNotifications]);
  // --- FIN NUEVOS Efectos ---

  // Funciones para actualizar los ajustes (existentes)
  const toggleConfirmMoveToTrash = useCallback(() => {
    setConfirmMoveToTrash((prev) => !prev);
  }, []);

  const toggleConfirmPermanentDelete = useCallback(() => {
    setConfirmPermanentDelete((prev) => !prev);
  }, []);

  const toggleConfirmEmptyTrash = useCallback(() => {
    setConfirmEmptyTrash((prev) => !prev);
  }, []);

  // --- NUEVAS Funciones para actualizar Notificaciones ---
  const toggleShowSuccessNotifications = useCallback(() => {
    setShowSuccessNotifications((prev) => !prev);
  }, []);

  const toggleShowErrorNotifications = useCallback(() => {
    setShowErrorNotifications((prev) => !prev);
  }, []);
  // --- FIN NUEVAS Funciones ---

  // Añadir nuevos valores al contexto
  const contextValue = {
    confirmMoveToTrash,
    confirmPermanentDelete,
    confirmEmptyTrash,
    toggleConfirmMoveToTrash,
    toggleConfirmPermanentDelete,
    toggleConfirmEmptyTrash,
    // --- Nuevos ---
    showSuccessNotifications,
    showErrorNotifications,
    toggleShowSuccessNotifications,
    toggleShowErrorNotifications,
    // -------------
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook personalizado (sin cambios)
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings debe ser usado dentro de un SettingsProvider");
  }
  return context;
};
