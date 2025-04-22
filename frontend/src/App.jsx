// frontend/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import TrashPage from "./pages/TrashPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import FavoritesPage from "./pages/FavoritesPage"; // <-- 1. Importa la nueva página
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FavoritesProvider } from "./context/FavoritesContext"; // <-- 2. Importa el provider
import ProtectedRoute from "./components/ProtectedRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          {" "}
          {/* <-- 3. Envuelve con FavoritesProvider */}
          <ToastContainer
            position="top-right"
            autoClose={4000}
            theme="colored"
          />
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Rutas Protegidas */}
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
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            {/* --- 4. NUEVA RUTA FAVORITOS --- */}
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            {/* --- FIN NUEVA RUTA --- */}

            {/* Ruta Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </FavoritesProvider>{" "}
        {/* <-- Cierra FavoritesProvider */}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
