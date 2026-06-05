
# Evolución Académica AI

Plataforma e-learning impulsada por Inteligencia Artificial (Gemini 2.5 Pro).

## 🚀 Integración con GitHub
Para sincronizar este proyecto con el repositorio institucional, ejecuta los siguientes comandos en la terminal:

```bash
git init
git remote add origin https://github.com/felizdeemprender-svg/firebaseApp.git
git add .
git commit -m "Initial commit: Infraestructura base"
git branch -M main
git push -u origin main
```

## 🌿 Gestión de Ramas (Colaboración)
Para trabajar en equipo sin sobreescribir el trabajo de otros, usen ramas independientes:

### Crear y entrar en la rama de Marketing:
Ejecuta este comando en la terminal:
```bash
git checkout -b Marketing
```

### Subir tus cambios de esta rama a GitHub:
```bash
git add .
git commit -m "Descripción de tus cambios en marketing"
git push origin Marketing
```

**Nota para colaboradores:** Se recomienda el uso de ramas independientes para evitar conflictos. Siempre realicen un `git pull origin main` antes de empezar para tener lo último del proyecto.

## Configuración Requerida (Pasos Manuales Críticos)

### 1. Activar Proveedores de Autenticación
1. Ve a la consola de Firebase > **Authentication** > **Sign-in method**.
2. Habilita **Google** (para cuentas Workspace).
3. Habilita **Correo electrónico/contraseña** (obligatorio para el sistema de invitaciones).

### 2. Autorizar Dominio de Cloud Workstation (CRÍTICO)
Si accedes mediante la URL de Workstation y el login con Google falla:
1. Copia el dominio de tu navegador (ej: `9000-firebase-studio...cloudworkstations.dev`).
2. En la consola de Firebase, ve a **Authentication** > **Settings** > **Authorized domains**.
3. Haz clic en **"Add domain"** y pega tu URL.

### 3. Solución de Problemas: Persistencia de Sesión (IMPORTANTE)
Si tras redirigir desde Google vuelves a aparecer en la pantalla de login o recibes el error "Missing initial state":

- **OPCIÓN A: PERMITIR COOKIES:** En la barra de direcciones (icono del candado o el ojo), asegúrate de **"Permitir Cookies de Terceros"**. Firebase Auth las necesita para validar la redirección entre dominios.
- **OPCIÓN B: MODO INCÓGNITO (RECOMENDADO):** Abre la plataforma en una ventana de incógnito. 
- **CRÍTICO - ERROR 401 EN INCÓGNITO:** Si el navegador te muestra un error **401: PERMISSION_DENIED** al usar incógnito, es porque la Workstation requiere que estés logueado en Google Cloud. **Solución:** En esa misma ventana de incógnito, entra primero a [GCP Console](https://console.cloud.google.com), loguéate con tu cuenta de desarrollador, y luego vuelve a cargar la URL de la aplicación.

### 4. Sistema de Invitaciones
La plataforma no permite el registro público libre. Los usuarios son pre-registrados por un Administrador o un Mentor.
- **Si el alumno usa Google:** Solo necesita iniciar sesión; el sistema vinculará su cuenta automáticamente si su email está invitado.
- **Si el alumno usa contraseña:** Debe usar la opción **"Activar Invitación"** en la pantalla de login. 

### 5. Activar Storage
1. Ve a la consola de Firebase -> **Storage**.
2. Haz clic en el botón **"Comenzar"**.
3. Sigue el asistente hasta ver el panel de archivos.

## Roles de Usuario
- **Admin**: Acceso total (Email: felizdeemprender@gmail.com).
- **Mentor**: Gestión académica, creación de cursos e identidad visual.
- **Alumno**: Acceso al catálogo y progreso educativo bajo invitación.
