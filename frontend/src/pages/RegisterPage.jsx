// frontend/src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import styles from './RegisterPage.module.css';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevenir envío HTML normal

    // Validación frontend (opcional, pero mejora UX)
    if (!username.trim() || !email.trim() || !password) {
      toast.error('Todos los campos son requeridos.');
      return;
    }
    if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    // Podrías añadir validación de formato de email aquí también si quieres feedback inmediato

    // Llamar a la función register del contexto
    const success = await register({ username, email, password });

    if (success) {
        setUsername('');
        setEmail('');
        setPassword('');
        // Notificación de éxito ya está en el contexto
        setTimeout(() => navigate('/login'), 3000);
    }
    // Notificación de error de API ya está en el contexto
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Crear Cuenta</h2>
        {/* Añadir noValidate al form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>Username:</label>
            <input
              type="text"
              id="username"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              // required // <-- Quitar required
              autoComplete="username"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email:</label>
            <input
              type="email" // type="email" aún ayuda a teclados móviles, pero no valida sin 'required'/'noValidate'
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
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={isLoading} className={styles.button}>
            {isLoading ? 'Registrando...' : 'Register'}
          </button>
        </form>
         <p className={styles.linkContainer}>
           ¿Ya tienes cuenta? <Link to="/login" className={styles.link}>Inicia sesión</Link>
         </p>
      </div>
    </div>
  );
}

export default RegisterPage;