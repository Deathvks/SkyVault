// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser, registerUser } from '../services/api';
import { toast } from 'react-toastify'; // Importar toast

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('skyvault_token'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
         if (decoded.exp && decoded.exp < currentTime) {
             logout();
         } else {
             setUser({ userId: decoded.userId, username: decoded.username });
         }
      } catch (error) {
        console.error("Error decodificando token:", error);
        logout();
      }
    }
  }, [token]);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      const newToken = response.data.token;
      localStorage.setItem('skyvault_token', newToken);
      setToken(newToken);
      const decoded = jwtDecode(newToken);
      setUser({ userId: decoded.userId, username: decoded.username });
      setIsLoading(false);
      toast.success('Login exitoso!'); // Notificación de éxito
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al iniciar sesión.';
      console.error("Error en login:", errorMsg);
      toast.error(errorMsg); // Notificación de error
      setIsLoading(false);
      logout();
      // Ya no necesitamos propagar el error si lo manejamos con toast
      // throw error;
      return false; // Indicar fallo
    }
  };

  const register = async (userData) => {
      setIsLoading(true);
      try {
          const response = await registerUser(userData);
          setIsLoading(false);
          console.log("Registro exitoso:", response.data.message);
          toast.success(response.data.message || '¡Registro exitoso! Ahora puedes iniciar sesión.'); // Notificación de éxito
          return true;
      } catch (error) {
          const errorMsg = error.response?.data?.message || 'Error durante el registro.';
          console.error("Error en registro:", errorMsg);
          toast.error(errorMsg); // Notificación de error
          setIsLoading(false);
          // Ya no necesitamos propagar el error
          // throw error;
          return false; // Indicar fallo
      }
  };


  const logout = () => {
    localStorage.removeItem('skyvault_token');
    setToken(null);
    setUser(null);
    // toast.info('Sesión cerrada.'); // Opcional: notificar logout
  };

  const authContextValue = {
    token,
    user,
    isAuthenticated: !!token,
    isLoading,
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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};