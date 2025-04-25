// frontend/src/context/AuthContext.jsx

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react"; // <-- Añadir useCallback
import { jwtDecode } from "jwt-decode";
import { loginUser, registerUser, getUserProfile } from "../services/api"; // <-- Importar getUserProfile
import { toast } from "react-toastify";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("skyvault_token"));
  // --- Añadir campos de cuota al estado del usuario ---
  const [user, setUser] = useState(null); // { userId, username, role, storageUsedBytes, storageQuotaBytes }
  const [isLoading, setIsLoading] = useState(true);

  // --- Función para cargar datos del perfil (incluida cuota) ---
  const fetchAndSetUserProfile = useCallback(async (currentToken) => {
    if (!currentToken) {
      setUser(null);
      return;
    }
    try {
      const decoded = jwtDecode(currentToken);
      const profileResponse = await getUserProfile(); // Llamar a la API de perfil
      setUser({
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        storageUsedBytes: profileResponse.data.storage_used_bytes, // <-- Guardar uso
        storageQuotaBytes: profileResponse.data.storage_quota_bytes, // <-- Guardar cuota (puede ser null)
      });
    } catch (error) {
      console.error("Error decodificando token o cargando perfil:", error);
      // Si falla al obtener perfil (ej. 401), desloguear
      logout(); // Limpia estado y token
    }
  }, []); // useCallback sin dependencias de estado local

  // --- Efecto inicial de carga ---
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      const storedToken = localStorage.getItem("skyvault_token");
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          if (decoded.exp && decoded.exp < currentTime) {
            console.log("Token expirado, limpiando.");
            logout();
          } else {
            setToken(storedToken); // Token válido, ponerlo en estado
            await fetchAndSetUserProfile(storedToken); // Cargar perfil completo
          }
        } catch (error) {
          console.error("Token almacenado inválido:", error);
          logout();
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [fetchAndSetUserProfile]); // fetchAndSetUserProfile es estable por useCallback

  // --- Función Login actualizada ---
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      const newToken = response.data.token;
      localStorage.setItem("skyvault_token", newToken);
      setToken(newToken); // Actualizar token en estado
      await fetchAndSetUserProfile(newToken); // Cargar perfil completo después del login
      setIsLoading(false);
      toast.success("Login exitoso!");
      return true;
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Error al iniciar sesión.";
      console.error("Error en login:", errorMsg);
      toast.error(errorMsg);
      logout(); // Asegurar limpieza en fallo
      setIsLoading(false);
      return false;
    }
  };

  const register = async (userData) => {
    // ... (sin cambios aquí) ...
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

  // --- Logout sin cambios explícitos, pero setUser(null) limpia todo ---
  const logout = () => {
    localStorage.removeItem("skyvault_token");
    setToken(null);
    setUser(null); // Resetea user a null, incluyendo campos de cuota
  };

  // --- Función para refrescar el perfil (incluida cuota) si es necesario ---
  // Podrías llamarla después de subir/borrar archivos si quieres la cuota actualizada inmediatamente
  const refreshUserProfile = useCallback(async () => {
    const currentToken = localStorage.getItem("skyvault_token");
    if (currentToken) {
      await fetchAndSetUserProfile(currentToken);
    }
  }, [fetchAndSetUserProfile]);

  // --- Valor del Contexto ---
  const authContextValue = {
    token,
    user, // Ahora user incluye storageUsedBytes y storageQuotaBytes
    isAuthenticated: !!token && !!user,
    isLoading,
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    refreshUserProfile, // <-- Exportar función de refresco
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth sin cambios
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};