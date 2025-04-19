// frontend/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import TrashPage from "./pages/TrashPage"; // <-- Importar nueva página
import NotFoundPage from "./pages/NotFoundPage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={4000} /* ...otras props... */
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {" "}
              <DashboardPage />{" "}
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              {" "}
              <ProfilePage />{" "}
            </ProtectedRoute>
          }
        />
        {/* --- NUEVA RUTA PAPELERA --- */}
        <Route
          path="/trash"
          element={
            <ProtectedRoute>
              {" "}
              <TrashPage />{" "}
            </ProtectedRoute>
          }
        />
        {/* --- FIN NUEVA RUTA --- */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
