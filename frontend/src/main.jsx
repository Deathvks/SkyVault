// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext'; // Asegúrate que ThemeProvider esté aquí
import { AuthProvider } from './context/AuthContext';   // Asegúrate que AuthProvider esté aquí
import { SettingsProvider } from './context/SettingsContext'; // <-- Importa el nuevo provider
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider> {/* 1. Theme */}
        <SettingsProvider> {/* 2. Settings */}
          <AuthProvider> {/* 3. Auth */}
            <App />
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);