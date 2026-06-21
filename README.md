# Emprendimientos-DS

Este es el repositorio central para el desarrollo del sistema de gestión de emprendimientos.

## Requisitos e Instalación

Para hacer funcionar este proyecto de forma local, seguí estos pasos:

1. **Instalar Node.js**: Asegurate de tener instalado Node.js (versión LTS recomendada).
2. **Instalar las dependencias**: Una vez clonado el proyecto, abrí la terminal en la raíz de la carpeta y ejecutá:
```bash
   npm install
```
3. **Configurar el archivo `.env`**:
   Creá un archivo llamado `.env` en la raíz del proyecto y configurá las variables con tus datos locales. Pedile al equipo las credenciales del entorno de desarrollo. Ejemplo de estructura:
```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=ministerio_api
   DB_PASS="poner_aqui_la_clave_privada"
   DB_NAME=ProyectoEmprendimientos2026
   JWT_SECRET=****
```
4. **Instalar Nodemon (Opcional):**
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
   - `c. Insert de datos.sql`
   - `d. Usuario Conexion.sql`

3. **Crear la conexión para Node.js**: 
   En la pantalla de inicio de MySQL Workbench, crea una nueva conexión con los siguientes parámetros:
   * **Connection Name**: `nodejs_ministerio`
   * **Username**: `ministerio_api`
   * **Default Schema**: `ProyectoEmprendimientos2026`
   * Haz clic en **Test Connection** e introduce la contraseña especificada en el script `Usuario Conexion.sql`.
