# bybega · Sistema de Gestión Integral

CRM + Inventario + Facturas + Web Pública con cotizaciones  
Stack: React + Vite + Supabase + Vercel

---

## PASO A PASO COMPLETO

### PASO 1 — Crear proyecto en Supabase

1. Ve a **supabase.com** → "Start your project" → regístrate con GitHub
2. Clic en "New project"
   - Organization: tu organización personal
   - Name: `bybega-sistema`
   - Database Password: elige una contraseña segura (guárdala)
   - Region: **US East (N. Virginia)** (la más rápida para El Salvador)
3. Espera ~2 minutos a que se cree el proyecto

### PASO 2 — Ejecutar el schema SQL

1. En tu proyecto Supabase → menú izquierdo → **SQL Editor**
2. Clic en "New query"
3. Copia TODO el contenido del archivo `supabase_schema.sql`
4. Pégalo en el editor → clic en **"Run"** (botón verde)
5. Deberías ver "Success. No rows returned"

### PASO 3 — Crear el usuario Admin

1. En Supabase → menú izquierdo → **Authentication** → **Users**
2. Clic en "Add user" → "Create new user"
   - Email: `admin@bybega.com` (o el que quieras)
   - Password: `bybega2025` (cámbiala después)
   - Clic "Create user"
3. Repite para cada empleado (máx 5)

### PASO 4 — Obtener las credenciales de Supabase

1. En Supabase → menú izquierdo → **Settings** → **API**
2. Copia:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon public** key → clave larga que empieza con `eyJ...`

### PASO 5 — Configurar el archivo .env

1. En la carpeta del proyecto, crea un archivo llamado exactamente `.env`
2. Contenido:
```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```
3. Reemplaza con tus credenciales reales

### PASO 6 — Subir a GitHub

1. Ve a **github.com** → tu cuenta → "New repository"
   - Name: `bybega-sistema`
   - Visibility: **Private** (recomendado)
   - Clic "Create repository"
2. Sube todos los archivos:
   - Arrastra la carpeta completa al repositorio
   - O usa: `git init && git add . && git commit -m "init" && git push`

### PASO 7 — Desplegar en Vercel

1. Ve a **vercel.com** → "Add New Project"
2. Importa el repositorio `bybega-sistema` desde GitHub
3. **IMPORTANTE** — Antes de hacer Deploy, configura las variables de entorno:
   - Clic en "Environment Variables"
   - Agrega: `VITE_SUPABASE_URL` = tu URL de Supabase
   - Agrega: `VITE_SUPABASE_ANON_KEY` = tu clave anon
4. Clic en **"Deploy"**
5. En ~60 segundos tendrás tu URL: `bybega-sistema.vercel.app`

### PASO 8 — Configurar dominio propio (opcional)

1. Compra un dominio en **namecheap.com** o **godaddy.com**
   - Busca: `bybega.shop` (~$3/año el primer año) o `bybegashop.com` (~$12/año)
2. En Vercel → tu proyecto → **Settings** → **Domains**
3. Escribe tu dominio → "Add"
4. Vercel te mostrará registros DNS (tipo CNAME o A)
5. Copia esos registros en el panel DNS de GoDaddy/Namecheap
6. Espera 15-60 minutos → listo

### PASO 9 — Activar emails con Web3Forms

1. Ve a **web3forms.com/access**
2. Ingresa el email donde quieres recibir notificaciones → "Create Access Key"
3. Revisa tu correo → copia la clave
4. En tu sistema: **Panel Admin** → **Configuración** → sección "Notificaciones por email"
5. Pega la clave → escribe el email → "Guardar" → "Probar envío"

### PASO 10 — Configurar tus datos reales

1. Entra al panel: `tu-dominio.com/admin`
2. Ve a **Configuración** → completa todos los datos del negocio
3. Ve a **Categorías** → ajusta o añade las tuyas
4. Ve a **Productos** → carga tus joyas reales
5. Marca con ★ hasta 5 productos como destacados para la web pública

---

## URLs del sistema

- **Panel admin**: `tu-dominio.com/admin`
- **Web pública**: `tu-dominio.com/web`
- **Login**: `tu-dominio.com/login`

---

## Actualizar el sistema

Cuando yo te envíe una nueva versión del código:

1. Sube los archivos actualizados a GitHub
2. Vercel detecta el cambio y despliega automáticamente en ~30 segundos
3. No pierdes datos (están en Supabase, no en el código)

---

## Soporte y preguntas

Cualquier cambio o mejora, pídela en el chat con Claude.
