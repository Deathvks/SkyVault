# SkyVault ☁️

SkyVault es una aplicación web full-stack diseñada para ofrecer una solución de almacenamiento personal en la nube, similar a servicios como Dropbox o Google Drive. Permite a los usuarios registrarse, iniciar sesión, gestionar archivos y carpetas, y mucho más, todo dentro de un entorno seguro y privado.

## ✨ Características Principales

**Gestión de Usuarios:**
* **Autenticación Segura:** Registro de nuevos usuarios e inicio de sesión mediante credenciales (email/contraseña).
* **Sesiones JWT:** Uso de JSON Web Tokens para mantener la sesión del usuario y proteger las rutas API.
* **Hashing de Contraseñas:** Las contraseñas se almacenan de forma segura usando bcrypt.
* **Gestión de Perfil:** Los usuarios pueden ver su perfil (nombre de usuario, email, fecha de registro) y actualizar su nombre de usuario o email.
* **Cambio de Contraseña:** Funcionalidad segura para cambiar la contraseña actual.
* **Roles:** Diferenciación entre usuarios (`user`) y administradores (`admin`). Los administradores pueden tener configuraciones especiales (ej. sin cuota de almacenamiento, sin límite de peticiones API).

**Gestión de Archivos y Carpetas:**
* **Creación de Carpetas:** Organiza tus archivos creando carpetas anidadas.
* **Subida de Archivos:** Sube archivos al directorio actual. Incluye validación de tipo MIME y límite de tamaño configurado en el backend (Multer).
* **Visualización Jerárquica:** Navega a través de la estructura de carpetas. El contenido (subcarpetas y archivos) se muestra de forma clara.
* **Descarga de Archivos:** Descarga cualquier archivo almacenado.
* **Renombrar:** Cambia el nombre de archivos y carpetas. La extensión original del archivo se preserva automáticamente al renombrar archivos.
* **Mover:** Mueve archivos y carpetas entre diferentes ubicaciones, incluyendo la raíz del almacenamiento. Se previenen operaciones inválidas (mover una carpeta dentro de sí misma o a una subcarpeta).
* **Previsualización:** Visualiza directamente en la aplicación archivos comunes (imágenes, PDF, texto, vídeo, audio) sin necesidad de descargarlos.

**Papelera de Reciclaje:**
* **Borrado Suave (Soft Delete):** Al eliminar un archivo o carpeta, se mueve primero a la papelera en lugar de borrarse permanentemente.
* **Visualización de Papelera:** Accede a una sección dedicada para ver todos los elementos eliminados.
* **Restauración:** Restaura archivos o carpetas desde la papelera a su ubicación original (con comprobaciones para evitar conflictos de nombre o restauración en carpetas padre ya eliminadas).
* **Borrado Permanente:** Elimina permanentemente elementos individuales desde la papelera.
* **Vaciar Papelera:** Elimina permanentemente *todos* los elementos de la papelera de una vez.
* **Limpieza Automática:** Una tarea programada en el backend (`node-cron`) elimina automáticamente y de forma permanente los elementos que lleven más de 24 horas en la papelera.

**Funcionalidades Adicionales:**
* **Búsqueda:** Encuentra rápidamente archivos y carpetas por su nombre.
* **Operaciones Masivas (Bulk):**
    * Selecciona múltiples archivos y/o carpetas.
    * Mueve los elementos seleccionados a otra carpeta o a la raíz.
    * Mueve los elementos seleccionados a la papelera.
* **Cuota de Almacenamiento:**
    * Límite de almacenamiento por usuario (configurable, ej. 2 GB para usuarios normales).
    * Los administradores pueden tener cuota ilimitada.
    * La cuota se verifica antes de permitir la subida de archivos.
    * El uso actual se muestra en la interfaz de usuario.
* **Interfaz de Usuario:**
    * Diseño responsive adaptable a diferentes tamaños de pantalla.
    * Menú contextual (clic derecho / pulsación larga en móvil) para acceder rápidamente a acciones sobre archivos/carpetas.
    * Botón Flotante (FAB) para crear carpetas o subir archivos fácilmente.
    * Navegación mediante "migas de pan" (breadcrumbs).
    * Notificaciones Toast para feedback al usuario (éxito, error, información).
    * Selección de Tema: Preferencia de apariencia (Claro, Oscuro, Sistema) guardada localmente.

**Seguridad:**
* Middleware `Helmet` para cabeceras de seguridad HTTP.
* Configuración `CORS` para controlar los orígenes permitidos.
* Rate Limiting para prevenir ataques de fuerza bruta (general y específico para autenticación).
* Validación de entradas en el backend (`express-validator`).

## 💻 Pila Tecnológica

La aplicación se divide en dos partes principales: Frontend y Backend.

**Frontend:**
* **Framework/Librería:** React (v19)
* **Build Tool:** Vite
* **Routing:** React Router DOM (v7)
* **Cliente HTTP:** Axios
* **Gestión de Estado:** React Context API (`AuthContext`, `ThemeContext`)
* **UI y Notificaciones:** React Toastify, Componentes personalizados (Modal, ContextMenu, etc.), CSS Modules + Variables CSS globales
* **Lenguaje:** JavaScript (JSX)

**Backend:**
* **Framework:** Node.js, Express (v5)
* **ORM:** Sequelize (v6)
* **Base de Datos:** MySQL (Driver: `mysql2`)
* **Autenticación:** JSON Web Tokens (JWT) (`jsonwebtoken`), Bcrypt
* **Subida de Archivos:** Multer
* **Tareas Programadas:** node-cron
* **Middleware:** Helmet, CORS, Express Rate Limit, Express Validator
* **Lenguaje:** JavaScript (Node.js)

## 🚀 Instalación y Ejecución Local

Sigue estos pasos para poner en marcha SkyVault en tu máquina local:

**Prerrequisitos:**
* Node.js (v18 o superior recomendado)
* npm (normalmente viene con Node.js)
* Un servidor de base de datos MySQL funcionando localmente.

**Pasos:**

1.  **Clonar el Repositorio:**
    ```bash
    git clone <url-del-repositorio>
    cd SkyVault
    ```

2.  **Configurar Backend:**
    * Navega a la carpeta del backend: `cd backend`
    * Crea un archivo `.env` basado en `.env.example` (si existe) o créalo manualmente. Necesitarás definir al menos estas variables:
        ```dotenv
        # Base de Datos
        DB_NAME=tu_base_de_datos_skyvault
        DB_USER=tu_usuario_mysql
        DB_PASSWORD=tu_contraseña_mysql
        DB_HOST=localhost # o 127.0.0.1
        DB_PORT=3306      # Puerto estándar de MySQL
        # JWT
        JWT_SECRET=genera_una_cadena_secreta_larga_y_aleatoria
        # Servidor
        SERVER_PORT=3001 # Puerto donde escuchará el backend
        ```
    * Instala las dependencias: `npm install`
    * **Configura la Base de Datos MySQL:**
        * Asegúrate de que tu servidor MySQL esté corriendo.
        * Crea una base de datos con el nombre que pusiste en `DB_NAME`, asegurándote de usar el conjunto de caracteres `utf8mb4` y la colación `utf8mb4_unicode_ci` para compatibilidad completa con caracteres. Ejemplo:
          ```sql
          CREATE DATABASE IF NOT EXISTS tu_base_de_datos_skyvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
          ```
        * **Ejecuta el siguiente script SQL** para crear las tablas (`Users`, `Folders`, `Files`) con la estructura correcta, incluyendo las columnas de cuota, índices y relaciones:
          ```sql
          -- Script de Base de Datos para SkyVault (MySQL)
          -- Derivado de los modelos Sequelize. Considera usar migraciones Sequelize.

          USE tu_base_de_datos_skyvault; -- Asegúrate de seleccionar tu base de datos

          -- Tabla Users
          CREATE TABLE IF NOT EXISTS `Users` (
            `id` INTEGER NOT NULL auto_increment ,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `email` VARCHAR(100) NOT NULL UNIQUE,
            `password_hash` VARCHAR(255) NOT NULL,
            `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
            `storage_quota_bytes` BIGINT UNSIGNED NULL,
            `storage_used_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
            `createdAt` DATETIME NOT NULL,
            `updatedAt` DATETIME NOT NULL,
            PRIMARY KEY (`id`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

          -- Tabla Folders
          CREATE TABLE IF NOT EXISTS `Folders` (
            `id` INTEGER NOT NULL auto_increment ,
            `name` VARCHAR(100) NOT NULL,
            `user_id` INTEGER NULL, -- Se relaciona con Users.id
            `parent_folder_id` INTEGER NULL, -- Se relaciona con Folders.id (auto-referencia)
            `createdAt` DATETIME NOT NULL,
            `updatedAt` DATETIME NOT NULL,
            `deletedAt` DATETIME NULL, -- Para Soft Deletes (paranoid: true)
            PRIMARY KEY (`id`),
            UNIQUE INDEX `unique_folder_constraint` (`user_id`, `parent_folder_id`, `name`, `deletedAt`), -- Índice Único Compuesto
            CONSTRAINT `Folders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `Folders_ibfk_2` FOREIGN KEY (`parent_folder_id`) REFERENCES `Folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

          -- Tabla Files
          CREATE TABLE IF NOT EXISTS `Files` (
            `id` INTEGER NOT NULL auto_increment ,
            `name` VARCHAR(255) NOT NULL,
            `storage_path` VARCHAR(512) NOT NULL,
            `mime_type` VARCHAR(100) NULL,
            `size` BIGINT UNSIGNED NULL,
            `user_id` INTEGER NULL, -- Se relaciona con Users.id
            `folder_id` INTEGER NULL, -- Se relaciona con Folders.id
            `createdAt` DATETIME NOT NULL,
            `updatedAt` DATETIME NOT NULL,
            `deletedAt` DATETIME NULL, -- Para Soft Deletes (paranoid: true)
            PRIMARY KEY (`id`),
            UNIQUE INDEX `unique_file_constraint` (`user_id`, `folder_id`, `name`, `deletedAt`), -- Índice Único Compuesto
            CONSTRAINT `Files_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `Files_ibfk_2` FOREIGN KEY (`folder_id`) REFERENCES `Folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

          -- Nota: Los índices únicos incluyen `deletedAt` para permitir nombres duplicados
          -- si uno de los elementos está en la papelera (soft-deleted).
          -- La gestión de estos índices puede variar ligeramente según la configuración exacta de MySQL.
          ```
        * *Alternativa (si usas migraciones Sequelize):* Ejecuta `npx sequelize-cli db:migrate` (esto requiere que hayas configurado `sequelize-cli` y creado los archivos de migración correspondientes a los modelos).
        * (Si es una base de datos existente) Ejecuta los comandos `ALTER TABLE` necesarios para añadir las columnas de cuota (`storage_quota_bytes`, `storage_used_bytes`) a la tabla `Users` y actualiza las cuotas/uso de usuarios existentes si es necesario.
    * Inicia el servidor backend: `npm run dev` (usa Nodemon para recarga automática) o `npm start` (usa Node directamente). Deberías ver un mensaje indicando que el servidor escucha en el puerto `SERVER_PORT` (ej. 3001) y que la conexión a la BD fue exitosa.

3.  **Configurar Frontend:**
    * Abre *otra terminal*.
    * Navega a la carpeta del frontend: `cd ../frontend` (si estás en `backend`) o `cd frontend` (si estás en la raíz `SkyVault`).
    * Instala las dependencias: `npm install`
    * **Verifica la URL de la API:** Asegúrate de que la constante `API_URL` en `src/services/api.js` apunta correctamente a tu backend local (normalmente `http://localhost:3001/api`).
    * Inicia el servidor de desarrollo del frontend: `npm run dev`

4.  **Acceder a la Aplicación:**
    * Abre tu navegador web y ve a la dirección que te indica Vite (normalmente `http://localhost:5173`).
    * ¡Ya deberías poder registrarte, iniciar sesión y usar SkyVault localmente!

## ☁️ Despliegue

El despliegue de esta aplicación full-stack requiere pasos separados para el frontend y el backend.

* **Frontend:** La aplicación React está preparada para ser desplegada como un sitio estático. Se puede usar **Firebase Hosting** siguiendo los pasos de inicialización (`firebase init`), construcción (`npm run build`) y despliegue (`firebase deploy --only hosting`). Asegúrate de configurar la `API_URL` en `src/services/api.js` para que apunte a la URL pública del backend *antes* de construir.
* **Backend:** El backend Node.js/Express/MySQL **no puede** desplegarse directamente en Firebase Hosting. Opciones:
    * **Exposición Local (Para Demos/Pruebas):** Usar un servicio de túnel como **Cloudflare Tunnel** (recomendado por su plan gratuito generoso y hostnames estables) o ngrok para exponer tu backend local a internet. Requiere mantener tu PC, backend, base de datos y el túnel (`cloudflared` o `ngrok`) siempre activos. Configura CORS adecuadamente en `backend/src/server.js`.
    * **Hosting en la Nube (Recomendado para uso real):** Desplegar el backend y la base de datos MySQL en una plataforma como Render, Fly.io, Heroku (con addons), AWS (EC2, RDS, Lightsail), Google Cloud (Cloud Run, Cloud SQL), etc. Esto proporcionará una solución más estable, segura y escalable. Generalmente implicará costes una vez superados los niveles gratuitos (si los hay).
    * **Refactorización a Serverless (Firebase/GCP o AWS):** Reescribir el backend para usar Cloud Functions/AWS Lambda, una base de datos NoSQL (Firestore, RTDB, DynamoDB) y Cloud Storage/S3. Esto permite potencialmente aprovechar mejor los niveles gratuitos de estas plataformas, pero requiere un esfuerzo de desarrollo significativo.