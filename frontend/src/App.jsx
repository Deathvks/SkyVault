// frontend/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
// --- Añadir la importación que falta ---
import LoginPage from "./pages/LoginPage";
// -------------------------------------
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import TrashPage from "./pages/TrashPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    // Envolver AuthProvider con ThemeProvider
    <ThemeProvider>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={4000} /* ...otras props... */
          // Añadir prop theme para que se adapte
          theme="colored" // O 'light', 'dark' - 'colored' suele adaptarse bien
        />
        <Routes>
          {/* Ahora LoginPage está definido */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trash"
            element={
              <ProtectedRoute>
                <TrashPage />
              </ProtectedRoute>
            }
          />
          {/* --- NUEVA RUTA AJUSTES --- */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          {/* --- FIN NUEVA RUTA --- */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
