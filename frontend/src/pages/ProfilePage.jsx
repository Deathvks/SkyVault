// frontend/src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // useNavigate ya no es necesario aquí
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, changeUserPassword } from '../services/api';
import { toast } from 'react-toastify';
import styles from './ProfilePage.module.css';

function ProfilePage() {
  // Quitamos user, token y navigate de aquí
  const { logout } = useAuth();
  // const navigate = useNavigate(); // Ya no se usa

  // Estado para datos del perfil
  const [profileData, setProfileData] = useState({ username: '', email: '', createdAt: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Estado para formulario de actualización de perfil
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Estado para formulario de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Cargar datos del perfil al montar
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const response = await getUserProfile();
        setProfileData({
          username: response.data.username,
          email: response.data.email,
          createdAt: new Date(response.data.createdAt).toLocaleDateString('es-ES', {
             year: 'numeric', month: 'long', day: 'numeric'
          })
        });
        setNewUsername(response.data.username);
        setNewEmail(response.data.email);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error(error.response?.data?.message || 'No se pudo cargar el perfil.');
        if (error.response?.status === 401 || error.response?.status === 403) {
          logout();
        }
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [logout]); // Dependencia de logout se mantiene por si falla la carga inicial

  // Manejar actualización de perfil
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (newUsername.trim() === profileData.username && newEmail.trim() === profileData.email) {
      toast.info('No hay cambios para guardar.');
      return;
    }
    setIsUpdatingProfile(true);
    const dataToUpdate = {};
    if (newUsername.trim() !== profileData.username) {
        dataToUpdate.username = newUsername.trim();
    }
    if (newEmail.trim() !== profileData.email) {
        dataToUpdate.email = newEmail.trim();
    }

    try {
      const response = await updateUserProfile(dataToUpdate);
      toast.success(response.data.message || 'Perfil actualizado.');
      setProfileData(prev => ({ ...prev, username: response.data.user.username, email: response.data.user.email }));
      setNewUsername(response.data.user.username);
      setNewEmail(response.data.user.email);
      // Considerar actualizar el contexto de autenticación si es necesario
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || 'Error al actualizar el perfil.');
       setNewUsername(profileData.username);
       setNewEmail(profileData.email);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Manejar cambio de contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Todos los campos de contraseña son requeridos.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Las nuevas contraseñas no coinciden.');
      return;
    }
     if (newPassword.length < 6) {
         toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
         return;
     }

    setIsChangingPassword(true);
    try {
      const response = await changeUserPassword({ currentPassword, newPassword });
      toast.success(response.data.message || 'Contraseña actualizada.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error.response?.data?.message || 'Error al cambiar la contraseña.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.profileCard}>
        <h2 className={styles.title}>Mi Perfil</h2>

        {isLoadingProfile ? (
          <p>Cargando perfil...</p>
        ) : (
          <>
            <div className={styles.profileInfo}>
              <p><strong>Usuario:</strong> {profileData.username}</p>
              <p><strong>Email:</strong> {profileData.email}</p>
              <p><strong>Miembro desde:</strong> {profileData.createdAt}</p>
            </div>

            <hr className={styles.divider} />

            {/* Formulario para actualizar perfil */}
            <form onSubmit={handleUpdateProfile} className={styles.profileForm}>
              <h3 className={styles.formTitle}>Actualizar Datos</h3>
              <div className={styles.formGroup}>
                <label htmlFor="username">Nombre de Usuario:</label>
                <input
                  type="text"
                  id="username"
                  className={styles.input}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={isUpdatingProfile}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  className={styles.input}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isUpdatingProfile}
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={isUpdatingProfile || (newUsername.trim() === profileData.username && newEmail.trim() === profileData.email)}
              >
                {isUpdatingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>

            <hr className={styles.divider} />

            {/* Formulario para cambiar contraseña */}
            <form onSubmit={handleChangePassword} className={styles.profileForm}>
               <h3 className={styles.formTitle}>Cambiar Contraseña</h3>
              <div className={styles.formGroup}>
                <label htmlFor="currentPassword">Contraseña Actual:</label>
                <input
                  type="password"
                  id="currentPassword"
                  className={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                  autoComplete="current-password"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">Nueva Contraseña:</label>
                <input
                  type="password"
                  id="newPassword"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña:</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  className={styles.input}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={isChangingPassword || !currentPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmNewPassword}
              >
                {isChangingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </>
        )}
         <Link to="/" className={styles.backLink}>Volver al Dashboard</Link>
      </div>
    </div>
  );
}

export default ProfilePage;