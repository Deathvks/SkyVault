// frontend/src/pages/SettingsPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import styles from "./SettingsPage.module.css"; // Crearemos este archivo

function SettingsPage() {
  const { themePreference, changeThemePreference } = useTheme();

  const handleThemeChange = (event) => {
    changeThemePreference(event.target.value);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.settingsCard}>
        <h2 className={styles.title}>Ajustes</h2>

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

        {/* Puedes añadir más secciones de ajustes aquí si quieres */}

        <Link to="/" className={styles.backLink}>
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}

export default SettingsPage;
