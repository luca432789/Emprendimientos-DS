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
   Creá un archivo llamado `.env` en la raíz del proyecto y configurá las variables con tus datos locales. Pedile al equipo las credenciales del entorno de desarrollo. Ejemplo de estructura:
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
   - `c. Insert de datos.sql`
   - `d. Usuario Conexion.sql`

3. **Crear la conexión para Node.js**: 
   En la pantalla de inicio de MySQL Workbench, crea una nueva conexión con los siguientes parámetros:
   * **Connection Name**: `nodejs_ministerio`
   * **Username**: `ministerio_api`
   * **Default Schema**: `ProyectoEmprendimientos2026`
   * Haz clic en **Test Connection** e introduce la contraseña especificada en el script `Usuario Conexion.sql`.

### Base de datos para presentaciones
El archivo `Insert de datos presentacion.sql` carga datos completos para mostrar todas las funciones: solicitudes en cada etapa (sin expediente, en revisión, con Subsidio o Crédito, en el Ministro, rechazadas), emprendimientos con facturas en cada estado, publicaciones, productos y noticias. **Reemplaza a `Insert de datos.sql`: no ejecutar los dos.**

1. Si ya existe la base `ProyectoEmprendimientos2026`, borrarla (se pierden sus datos): `drop database ProyectoEmprendimientos2026;`
2. Ejecutar como `root`, en este orden:
   - `a. Tablas.sql`
   - `b. Triggers.sql`
   - `c. Usuario Conexion.sql`
   - `d. Insert de datos presentacion.sql`
3. Con el `.env` configurado, desde la raíz del proyecto ejecutar:
```bash
   node database/preparar-archivos-presentacion.js
```
   Copia las imágenes de la carpeta `Adjunto/` a `uploads/` y genera los PDF (formularios de inicio, subsidios, créditos, garantes y facturas). Tarda un minuto y al final muestra *"Listo: todos los archivos referenciados en la base existen."* Hay que volver a ejecutarlo si se cambian imágenes de `Adjunto/` o si se borra `uploads/`.
4. Para recibir Formularios de Inicio cualquier día durante la presentación, poner `RESTRICCION_DIAS_INICIO=false` en el `.env`.

Los usuarios y contraseñas para la presentación están en [`database/Usuarios presentacion.md`](database/Usuarios%20presentacion.md). Las fechas se calculan desde el día en que se ejecuta el SQL, así que conviene cargarlo cerca de la presentación para que los plazos de facturas se vean como corresponde.
