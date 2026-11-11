# Emprendimientos-DS

Este es el repositorio central para el desarrollo del sistema de gestión de emprendimientos.

## Requisitos e Instalación

Para hacer funcionar este proyecto de forma local, seguí estos pasos:

1. **Instalar Node.js**: Asegurate de tener instalado Node.js (versión LTS recomendada).
2. **Instalar las dependencias**: Una vez clonado el proyecto, abrí la terminal en la raíz de la carpeta y ejecutá:
```bash
   npm install
```
3. **Iniciar el servidor desde Visual Studio Code**: Abrí una terminal nueva en la raíz del proyecto y ejecutá:
```bash
   npm start
```
El servidor quedará disponible en `http://localhost:3000`. Para desarrollo con reinicio automático, ejecutá `npm run dev`. Live Server sirve páginas estáticas, pero no inicia Express ni permite generar los PDF por sí solo.
4. **Configurar el archivo `.env`**:
   Copiá `.env.example` como `.env` en la raíz del proyecto y configurá las variables con tus datos locales. Pedile al equipo las credenciales del entorno de desarrollo. Ejemplo de estructura:
```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=ministerio_api
   DB_PASS="poner_aqui_la_clave_privada"
   DB_NAME=ProyectoEmprendimientos2026
   JWT_SECRET=****
   # Formularios de Inicio solo lunes, miércoles y viernes. false = se reciben todos los días (ej. para una presentación)
   RESTRICCION_DIAS_INICIO=true
```
5. **Instalar Nodemon (Opcional):**
   Para el reinicio automatico del servidor al cambiar configuraciones de funciones, conexion, etc. instalar nodemon de manera global, ejecutando en la terminal:
```bash
   npm install -g nodemon
```
   Una vez instalado, para encender el servidor se debe ejecutar en la terminal "nodemon app.js"

## 🗄️ BASE DE DATOS
Dentro de la carpeta **/database** encontraran los script necesarios para generar la base de datos.

### Paso a paso para levantar el entorno:

1. **Abrir los archivos en MySQL Workbench**: 
   * Conéctate con tu usuario `root`.
   * Dirígete a la pestaña **File** > **Open SQL Script...** (`Ctrl + Shift + O`) y abre los archivos de la carpeta.

2. **Ejecutar los scripts**: Ejecútalos obligatoriamente en el siguiente orden para evitar errores de claves foráneas o permisos:
   - `a. Tablas.sql`
   - `b. Triggers.sql`
   - `c. Usuario Conexion.sql` (antes de ejecutarlo, reemplazá `CAMBIAR_CLAVE` por la misma contraseña de `DB_PASS` del `.env`)
   - `d. Datos iniciales.sql` (los rubros iniciales)
   - `e. Insert de datos.sql` (opcional: datos de prueba / demostración; **no usar en el servidor**)

3. **Crear el primer Administrador** (si no se ejecutó `Insert de datos.sql`, que ya trae usuarios de prueba): en la terminal, en la raíz del proyecto:
```bash
   npm run crear-admin
```
   Pide los datos y la contraseña por la terminal. Los demás empleados y usuarios se cargan después desde el panel.

4. **Crear la conexión para Node.js**: 
   En la pantalla de inicio de MySQL Workbench, crea una nueva conexión con los siguientes parámetros:
   * **Connection Name**: `nodejs_ministerio`
   * **Username**: `ministerio_api`
   * **Default Schema**: `ProyectoEmprendimientos2026`
   * Haz clic en **Test Connection** e introduce la contraseña de `DB_PASS` del `.env`.

## 🐳 Instalación en un servidor (Docker)
Las instrucciones para instalar el sistema en un servidor con Docker están en [DOCKER.md](DOCKER.md).
