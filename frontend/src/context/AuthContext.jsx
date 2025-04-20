// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { loginUser, registerUser } from "../services/api";
import { toast } from "react-toastify";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("skyvault_token"));
  // --- MODIFICACIÓN: Estado de usuario incluye rol ---
  const [user, setUser] = useState(null); // { userId, username, role }
  // ----------------------------------------------------
  const [isLoading, setIsLoading] = useState(true); // Cambiado a true inicialmente

  useEffect(() => {
    setIsLoading(true); // Iniciar carga al verificar token
    const storedToken = localStorage.getItem("skyvault_token");
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;
        if (decoded.exp && decoded.exp < currentTime) {
          console.log("Token expirado, limpiando.");
          logout(); // Limpia el token si está expirado
        } else {
          // --- MODIFICACIÓN: Guardar rol en el estado ---
          setUser({
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
          });
          setToken(storedToken); // Asegurar que el token está en el estado si es válido
          // ----------------------------------------------
        }
      } catch (error) {
        console.error("Error decodificando token almacenado:", error);
        logout(); // Limpia si el token es inválido
      }
    } else {
      // Si no hay token almacenado, no hay usuario
      setUser(null);
      setToken(null);
    }
    setIsLoading(false); // Finalizar carga después de verificar
  }, []); // Ejecutar solo al montar

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      const newToken = response.data.token;
      localStorage.setItem("skyvault_token", newToken);
      const decoded = jwtDecode(newToken);
      // --- MODIFICACIÓN: Guardar rol en el estado ---
      setUser({
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      });
      // ----------------------------------------------
      setToken(newToken);
      setIsLoading(false);
      toast.success("Login exitoso!");
      return true;
    } catch (error) {
      // ... (manejo de errores sin cambios) ...
      const errorMsg =
        error.response?.data?.message || "Error al iniciar sesión.";
      console.error("Error en login:", errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
      logout(); // Asegurarse de limpiar estado en fallo de login
      return false;
    }
  };

  const register = async (userData) => {
    // ... (sin cambios necesarios para rol aquí) ...
    setIsLoading(true);
    try {
      const response = await registerUser(userData);
      setIsLoading(false);
      console.log("Registro exitoso:", response.data.message);
      toast.success(
        response.data.message ||
          "¡Registro exitoso! Ahora puedes iniciar sesión."
      );
      return true;
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Error durante el registro.";
      console.error("Error en registro:", errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("skyvault_token");
    setToken(null);
    setUser(null);
  };

  const authContextValue = {
    token,
    user, // Ahora user = { userId, username, role } o null
    isAuthenticated: !!token && !!user, // Asegurarse que user también exista
    isLoading,
    isAdmin: user?.role === "admin", // <-- Helper para verificar si es admin
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  // ... (sin cambios) ...
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
