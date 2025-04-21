// frontend/src/pages/SettingsPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import styles from "./SettingsPage.module.css";

function SettingsPage() {
  const { themePreference, changeThemePreference } = useTheme();
  const {
    confirmMoveToTrash,
    confirmPermanentDelete,
    confirmEmptyTrash,
    toggleConfirmMoveToTrash,
    toggleConfirmPermanentDelete,
    toggleConfirmEmptyTrash,
    // <-- Obtener estado y funciones de notificaciones -->
    showSuccessNotifications,
    showErrorNotifications,
    toggleShowSuccessNotifications,
    toggleShowErrorNotifications,
  } = useSettings();

  const handleThemeChange = (event) => {
    changeThemePreference(event.target.value);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.settingsCard}>
        <h2 className={styles.title}>Ajustes</h2>

        {/* Sección Apariencia */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Apariencia</h3>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={themePreference === "light"}
                onChange={handleThemeChange}
                className={styles.radioInput}
              />
              <span className={styles.radioText}>Claro</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={themePreference === "dark"}
                onChange={handleThemeChange}
                className={styles.radioInput}
              />
              <span className={styles.radioText}>Oscuro</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="theme"
                value="system"
                checked={themePreference === "system"}
                onChange={handleThemeChange}
                className={styles.radioInput}
              />
              <span className={styles.radioText}>
                Usar preferencia del sistema
              </span>
            </label>
          </div>
        </div>

        {/* Sección Confirmaciones */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Confirmaciones de Acciones</h3>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={confirmMoveToTrash}
                onChange={toggleConfirmMoveToTrash}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>
                Pedir confirmación antes de mover a la papelera
              </span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={confirmPermanentDelete}
                onChange={toggleConfirmPermanentDelete}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>
                Pedir confirmación antes de eliminar permanentemente (desde
                papelera)
              </span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={confirmEmptyTrash}
                onChange={toggleConfirmEmptyTrash}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>
                Pedir confirmación antes de vaciar la papelera
              </span>
            </label>
          </div>
        </div>

        {/* --- NUEVA SECCIÓN: Notificaciones --- */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Notificaciones</h3>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showSuccessNotifications}
                onChange={toggleShowSuccessNotifications}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>
                Mostrar notificaciones de éxito (verde)
              </span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showErrorNotifications}
                onChange={toggleShowErrorNotifications}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>
                Mostrar notificaciones de error (rojo)
                {/* Podrías añadir un (Recomendado) aquí si quieres */}
              </span>
            </label>
            {/* Podrías añadir más para .info, .warning si las usas */}
          </div>
        </div>
        {/* --- FIN NUEVA SECCIÓN --- */}

        <Link to="/" className={styles.backLink}>
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}

export default SettingsPage;
