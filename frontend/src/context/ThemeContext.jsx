// frontend/src/context/ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Lee la preferencia guardada o usa 'system' por defecto
  const getInitialPreference = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('skyvault_theme_preference') || 'system';
    }
    return 'system'; // Fallback para SSR si se usara
  };

  const [themePreference, setThemePreference] = useState(getInitialPreference); // 'light', 'dark', 'system'
  const [appliedTheme, setAppliedTheme] = useState('light'); // 'light' o 'dark'

  // Función para aplicar el tema al HTML
  const applyTheme = useCallback((theme) => {
    if (typeof window !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      setAppliedTheme(theme);
      console.log(`Applying theme: ${theme}`); // Para depuración
    }
  }, []);

  // Efecto para manejar cambios de preferencia del usuario o del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let isSystemDark = mediaQuery.matches;

    const updateTheme = () => {
      if (themePreference === 'system') {
        applyTheme(isSystemDark ? 'dark' : 'light');
      } else {
        applyTheme(themePreference);
      }
    };

    const handleSystemThemeChange = (e) => {
      isSystemDark = e.matches;
      if (themePreference === 'system') {
        updateTheme();
      }
    };

    // Listener para cambios de tema del sistema
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Aplicar tema inicial
    updateTheme();

    // Limpieza al desmontar o cambiar preferencia
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themePreference, applyTheme]); // Depende de la preferencia del usuario

  // Función para cambiar la preferencia del usuario
  const changeThemePreference = (newPreference) => {
    if (['light', 'dark', 'system'].includes(newPreference)) {
      localStorage.setItem('skyvault_theme_preference', newPreference);
      setThemePreference(newPreference);
      // El useEffect se encargará de aplicar el tema correcto
      console.log(`Theme preference changed to: ${newPreference}`); // Para depuración
    }
  };

  const contextValue = {
    themePreference, // 'light', 'dark', 'system'
    appliedTheme,    // 'light', 'dark' (el tema actual)
    changeThemePreference,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};