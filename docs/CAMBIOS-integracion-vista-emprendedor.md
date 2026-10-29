# Rama `integracion-vista-emprendedor`

Esta rama sale de `integracion` y le suma la vista del emprendedor completa (perfil, publicaciones con fotos, productos, contacto), la página pública de Publicaciones y las notificaciones de la campanita para todos los roles.

No modifica `main`, `integracion` ni las ramas de los compañeros (`feature-mapa`, `Formularios-digitales`, `desarrollo-panel`, `vista_emprendedor`, `vista_emprendedor-parte-2`).

---

## 1. Antes de probar: scripts de base de datos

Hay **dos tablas nuevas**. En una base ya creada, ejecutar con el usuario **root** en MySQL Workbench (archivo completo, con el rayo ⚡):

| Script | Qué crea |
|---|---|
| `database/Productos.sql` | Tabla `Producto`, sus triggers de auditoría y el permiso `INSERT, UPDATE` para `ministerio_api`. |
| `database/Notificaciones.sql` | Tabla `NotificacionVista` y el permiso `INSERT` para `ministerio_api`. |

Para una base **nueva** no hace falta: ya están incluidas en `Tablas.sql`, `Triggers.sql` y `Usuario Conexion.sql`.

Si no se ejecutan, el sistema no se rompe: el perfil funciona sin la pestaña Productos (muestra un aviso) y las notificaciones vistas se recuerdan solo en el navegador.

### Tabla `Producto`

| Columna | Tipo | Detalle |
|---|---|---|
| `idProducto` | int, PK, auto_increment | |
| `idEmprendimiento` | int, FK → `Emprendimiento` | |
| `Nombre` | varchar(100) | obligatorio |
| `Precio` | decimal(12,2) | `NULL` = "Consultar precio" |
| `Descripcion` | varchar(500) | opcional |
| `PathFoto` | varchar(1024) | ruta web de la foto (`/uploads/productos/...`) |
| `Activo` | boolean, default `true` | `false` = oculto en el perfil público (la API no tiene permiso de borrar) |
| `FechaAlta` | date, default hoy | |

Triggers: `tg_auditoria_Producto_insert` y `tg_auditoria_Producto_update` (registran altas, ediciones y ocultar/mostrar en `Auditoria`).

### Tabla `NotificacionVista`

| Columna | Tipo | Detalle |
|---|---|---|
| `idUsuario` | int, PK, FK → `Usuario` | |
| `Clave` | varchar(150), PK | identifica la notificación, ej. `pub-2-0-2026-10-17-votn1f` |
| `FechaVista` | timestamp, default ahora | |

Guarda qué notificaciones vio cada usuario: si entra desde otra computadora, no le vuelven a aparecer como nuevas.

---

## 2. Vista del emprendedor (perfil)

Páginas en `public/VISTA USUARIO/` (diseño de Ari, ahora con datos reales):

| Pestaña | Qué hace |
|---|---|
| **Acerca de** | Actividad principal, rubro, si está en marcha, dirección, nombre del emprendedor y últimas publicaciones. El dueño puede publicar desde acá. |
| **Publicaciones** | Hasta **2 publicaciones por emprendimiento**, con **hasta 4 fotos** cada una. El dueño ve el estado (aprobada / en revisión / rechazada con motivo) y puede **editar**: vuelve a revisión y lo aprobado sigue visible hasta que se apruebe lo nuevo. |
| **Productos** | El dueño carga, edita, oculta y vuelve a mostrar productos (nombre, precio opcional, descripción, foto). **Sin aprobación del Ministerio.** |
| **Fotos** | Galería automática con las fotos de las publicaciones aprobadas y de los productos visibles. |
| **Contacto** | Teléfono, enlace de WhatsApp, correo, dirección y un mini mapa con la ubicación cargada en el mapa. |

- **Perfil público:** `CdE-Perfil Emprendedor.html?id=N` muestra el emprendimiento N en solo lectura (cualquiera, sin sesión). El emprendedor logueado ve el suyo con los formularios y botones de edición.
- La barra de navegación de estas páginas ahora es la dinámica (`navbar.js`), igual que el resto del sitio.

## 3. Página pública "Publicaciones" (menú)

- Nueva página `public/Camino PUBLICACIONES.html`, ruta `/publicaciones`.
- Muestra todas las publicaciones aprobadas, con fotos, buscador y filtro por rubro. Cada una lleva al perfil público del emprendimiento.
- El botón "Publicaciones" del menú quedó conectado en todas las páginas (antes era `href="#"`).
- En el **mapa**, el popup de cada emprendimiento tiene "Ver perfil del emprendimiento".

## 4. Moderación de publicaciones (panel)

- Sección **Publicaciones en Espera** (Empleado de Área y Administrador): muestra fotos, si es una publicación nueva o una edición, y enlace al perfil. Aprobar pide confirmación; rechazar pide motivo obligatorio.

## 5. Notificaciones (campanita)

| Rol | Qué le avisa | Al hacer clic |
|---|---|---|
| **Emprendedor** | Sus publicaciones aprobadas o rechazadas (con el motivo), últimos 30 días. Número rojo con las no vistas, "Marcar todas como vistas". Lo visto se guarda en `NotificacionVista`. | Abre Publicaciones en esa publicación y la resalta. |
| **Empleado de Área / Administrador** | "Hay N solicitudes de inicio / subsidio / crédito sin revisar" y "Hay N publicaciones para revisar". Aviso emergente según lo que llegó. | Abre la sección correspondiente del panel. |
| **Empleado de Mesa** | Sin cambios: formularios de inicio sin expediente. | Carga de Expedientes GED. |

- Se actualiza sola cada 30 segundos y al volver a la pestaña.
- **Contadores en el menú del panel:** en "Publicaciones en Espera", en cada ítem de "Sin revisar" y en el grupo "Sin revisar" (visible aunque esté cerrado).

## 6. Solicitudes de Subsidio y Créditos sin revisar (panel)

- Las secciones **Solicitudes de Subsidio** y **Solicitudes de Créditos** (antes "lista para conectar con el fetch del Backend") ahora listan los pedidos sin revisar: emprendimiento, solicitante, monto, fecha y botón **Ver PDF**.
- Aprobar o rechazar subsidios y créditos **todavía no está hecho**.

## 7. Otros cambios

- Formularios digitales: el mensaje de éxito ya no muestra el número interno ("Formulario registrado correctamente.").
- `.gitignore`: se ignoran los archivos que suben o generan los usuarios (`uploads/publicaciones`, `uploads/productos`, `uploads/subsidios`, `uploads/creditos`).

---

## 8. API nueva o modificada

| Método y ruta | Acceso | Para qué |
|---|---|---|
| `GET /api/publicaciones` | público | Todas las publicaciones aprobadas (página Publicaciones) |
| `POST /api/publicaciones` | Emprendedor | Nueva publicación (máx. 2), con `fotos` en base64 |
| `PUT /api/publicaciones/:id` | Emprendedor dueño | Editar → vuelve a revisión (`conservarFotos` mantiene las fotos) |
| `GET /api/publicaciones/:idEmprendimiento` | público | Publicaciones aprobadas de un emprendimiento |
| `GET /api/publicaciones/pendientes/todas` | Área / Admin | Pendientes de moderación, con fotos |
| `PUT /api/publicaciones/moderacion/:id` | Área / Admin | Aprobar o rechazar (con motivo) |
| `GET /api/perfil/:idEmprendimiento` | público | Datos del perfil (todas las pestañas) |
| `GET /api/perfil/mio` | Emprendedor | Su perfil, con lo que está en revisión y productos ocultos |
| `POST /api/productos` | Emprendedor | Alta de producto |
| `PUT /api/productos/:id` | Emprendedor dueño | Editar producto (`quitarFoto` para sacar la foto) |
| `PATCH /api/productos/:id/estado` | Emprendedor dueño | Ocultar / mostrar (`{ activo }`) |
| `GET /api/notificaciones` | con sesión | Notificaciones según el rol |
| `POST /api/notificaciones/vistas` | con sesión | Marca notificaciones como vistas (`{ claves: [...] }`) |
| `GET /api/ayudas/:tipo/sin-revisar` | Área / Admin | Subsidios (`subsidio`) o créditos (`credito`) sin revisar |

Todas las escrituras pasan por la auditoría (`SET @usuario_id / @usuario_ip` en una conexión dedicada). Las imágenes se validan por contenido (JPG, PNG o WEBP, hasta 2 MB) y solo se guardan dentro de `uploads/`.

## 9. Archivos nuevos principales

- Backend: `helpers/imagenes.js`; `routes|controllers|models/` `perfil*`, `productos*`, `ayudas*`; cambios en `publicaciones*` y `notificaciones*`.
- Frontend: `public/js/perfil-emprendedor.js`, `productos.js`, `publicaciones-publicas.js`; `public/VISTA EMPLEADO/view empleado js/ayudas-panel.js`; `public/Camino PUBLICACIONES.html`; CSS `perfil-funcional.css` y `publicaciones-publicas.css`.
- Base de datos: `database/Productos.sql`, `database/Notificaciones.sql`.

## 10. Cómo probar

| Rol | Usuario de prueba |
|---|---|
| Emprendedor | `AlbertoSanche@gmail.com` |
| Empleado de Área | `empleadoriosnum1@gmail.com` |
| Administrador | `empleaSebas.santill@gmail.com` |
| Empleado de Mesa | `AriCorreoItse@gmail.com` |

(Contraseñas en los comentarios de `database/Insert de datos.sql`.)

1. Como emprendedor: Mi Perfil → recorrer las pestañas, publicar con fotos, cargar productos.
2. Como Área o Administrador: la campanita avisa la publicación nueva → aprobar o rechazar en Publicaciones en Espera.
3. Como emprendedor: la campanita avisa la resolución → el clic lleva a la publicación.
4. Sin sesión: menú Publicaciones → Ver perfil; o Mapa → Ver perfil del emprendimiento.
