// frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify'; // Importar toast para posible validación local
import styles from './LoginPage.module.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Quitar estado de error local, se usa toast desde el contexto
  // const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setError(''); // Ya no se usa

    // Validación frontend (opcional)
     if (!email.trim() || !password) {
       toast.error('Por favor, introduce email y contraseña.');
       return;
     }

    // Llamar a login (maneja toasts de éxito/error de API)
    const success = await login({ email, password });

    if (success) {
       navigate(from, { replace: true });
    }
    // Si hay error en login, el contexto ya muestra el toast
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Iniciar Sesión</h2>
         {/* Añadir noValidate al form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email:</label>
            <input
              type="email"
              id="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // required // <-- Quitar required
              autoComplete="email"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password:</label>
            <input
              type="password"
              id="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // required // <-- Quitar required
              autoComplete="current-password"
            />
          </div>
          {/* Ya no se muestra el error local aquí */}
          {/* {error && <p className={styles.error}>{error}</p>} */}
          <button type="submit" disabled={isLoading} className={styles.button}>
            {isLoading ? 'Iniciando sesión...' : 'Login'}
          </button>
        </form>
         <p className={styles.linkContainer}>
            ¿No tienes cuenta? <Link to="/register" className={styles.link}>Regístrate</Link>
         </p>
      </div>
    </div>
  );
}

export default LoginPage;