// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Importa el hook

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation(); // Para redirigir a la página original después del login

   // Podrías mostrar un spinner mientras se verifica el token inicial
   if (isLoading && !isAuthenticated) {
       // Opcional: Mostrar un indicador de carga global o aquí
       return <div>Verificando autenticación...</div>;
   }

  if (!isAuthenticated) {
    // Redirigir al login, guardando la ubicación a la que intentaban acceder
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si está autenticado, renderizar el componente hijo (la página protegida)
  return children;
};

export default ProtectedRoute;