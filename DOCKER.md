# Instalación en un servidor con Docker

**El Camino de los Emprendedores** es una aplicación web en Node.js (Express) con una base de datos MySQL 8.
Con Docker se instala como dos contenedores, definidos en `docker-compose.yml`:

| Servicio | Qué es | Puerto |
|---|---|---|
| `app` | La aplicación (Node 24 + Express). Incluye Chrome (Puppeteer) para generar los PDF de los formularios | `3000` dentro del contenedor, publicado en `PUERTO_PUBLICO` del servidor |
| `db` | MySQL 8.0 | No se publica: solo la usa la app, dentro de la red interna de Docker |

Los datos quedan en dos volúmenes de Docker, que no se borran al actualizar ni al reiniciar:

| Volumen | Contenido |
|---|---|
| `emprendedores_datos-mysql` | La base de datos |
| `emprendedores_archivos-subidos` | Los archivos que suben o generan los usuarios: fotos, PDF de los formularios, facturas e iconos de rubros |

## Requisitos

- Docker Engine con Docker Compose v2 (el comando es `docker compose`, sin guion).
- Unos 2 GB de RAM libres y 3 GB de disco para las imágenes, más lo que ocupen los datos.
- Acceso a internet al construir la imagen: descarga Node, MySQL, los paquetes de npm y Chrome.
- Salida a internet hacia el servidor de correo (por defecto Gmail, `smtp.gmail.com`, puerto 465). El sistema envía correos de activación de cuentas y avisos a los emprendedores.

## Instalación

1. Bajar el proyecto (la rama que indique el equipo) y entrar a la carpeta:
   ```bash
   git clone <url-del-repositorio> emprendedores
   cd emprendedores
   ```

2. Crear el archivo de configuración a partir del ejemplo y completarlo (ver [Variables](#variables)):
   ```bash
   cp .env.example .env
   nano .env
   ```

3. Construir y levantar los contenedores:
   ```bash
   docker compose up -d --build
   ```
   La primera vez, MySQL crea la base con los scripts de la carpeta `database` y tarda alrededor de un minuto. La app espera a que la base esté lista antes de arrancar. Para ver el avance:
   ```bash
   docker compose ps
   docker compose logs -f
   ```
   Cuando `db` aparece como `healthy` y la app muestra `Servidor API corriendo`, el sistema está funcionando.

4. Crear el primer Administrador (una sola vez). Pide nombre, DNI, correo y contraseña por la terminal:
   ```bash
   docker compose exec app npm run crear-admin
   ```
   Con ese usuario se inicia sesión en el sitio. Los demás empleados y usuarios se cargan desde el panel.

5. Entrar al sitio en `http://<servidor>:<PUERTO_PUBLICO>`, o en la dirección configurada en el proxy (ver [HTTPS](#https-y-proxy-inverso)).

## Variables

Se completan en el archivo `.env`, que no se sube al repositorio.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Sí | Contraseña de root de MySQL. La usa solo el contenedor de la base; la app no la recibe |
| `DB_PASS` | Sí | Contraseña del usuario `ministerio_api`, con el que la app se conecta a la base. Se crea sola al crear la base |
| `JWT_SECRET` | Sí | Clave para firmar las sesiones: una cadena larga y aleatoria (por ejemplo, la salida de `openssl rand -hex 32`) |
| `APP_URL` | Sí | Dirección pública del sitio, sin barra final (por ejemplo `https://emprendedores.ejemplo.edu.ar`). Se usa en los enlaces de los correos |
| `PUERTO_PUBLICO` | No | Puerto del servidor por el que se entra a la app. Por defecto `3000` |
| `DIAS_RECEPCION_INICIO` | No | Días en que se reciben los Formularios de Inicio, separados por coma (por ejemplo `lunes,martes,jueves`; con o sin tildes). Los demás días el sitio avisa que son de procesos administrativos. Por defecto `lunes,miercoles,viernes` |
| `RESTRICCION_DIAS_INICIO` | No | `false` recibe los Formularios de Inicio todos los días, sin importar `DIAS_RECEPCION_INICIO` (por ejemplo, para una presentación). Por defecto `true` |
| `TRUST_PROXY` | No | `1` si el sitio está detrás de un proxy inverso (nginx, Apache), para registrar en la auditoría la IP real de los usuarios. Por defecto `false` |
| `SMTP_USER`, `SMTP_PASS` | Para enviar correos | Cuenta que envía los correos. Con Gmail, `SMTP_PASS` es una "contraseña de aplicación" de la cuenta |
| `SMTP_HOST`, `SMTP_PORT` | No | Otro servidor de correo. Por defecto `smtp.gmail.com` y `465` |
| `CORREO_REMITENTE` | No | Nombre que ve quien recibe los correos |
| `JWT_EXPIRES_IN` | No | Duración de la sesión sin actividad. Por defecto `10m` |

No poner comillas alrededor de los valores. Las variables `DB_HOST`, `DB_USER`, `DB_NAME` y `PORT` del `.env` no se usan con Docker: las fija `docker-compose.yml`.

## HTTPS y proxy inverso

La app sirve el sitio por HTTP. Para publicarlo con HTTPS conviene ponerla detrás del proxy inverso del servidor (nginx, Apache, Caddy o el que use la institución), que maneja el certificado y reenvía los pedidos a `http://127.0.0.1:<PUERTO_PUBLICO>`. En ese caso hay que ajustar dos cosas:

- En el `.env`, `TRUST_PROXY=1` y `APP_URL` con la dirección `https://` definitiva.
- Si el puerto de la app no debe quedar abierto hacia afuera, publicarlo solo en el propio servidor. En `docker-compose.yml`, cambiar `"${PUERTO_PUBLICO:-3000}:3000"` por `"127.0.0.1:${PUERTO_PUBLICO:-3000}:3000"`.

Los formularios con adjuntos envían hasta unos 30 MB por pedido. Si el proxy limita el tamaño (en nginx, `client_max_body_size`, que por defecto es 1 MB), hay que subir ese límite a `50m`.

## Datos iniciales

Al crearse, la base queda con su estructura, sus triggers de auditoría, el usuario `ministerio_api` y los cuatro rubros iniciales. No trae datos de prueba. El primer Administrador se crea con el paso 4 de la instalación.

`database/Insert de datos.sql` trae datos de demostración inventados (personas, correos y usuarios). **No se debe cargar en el servidor**, porque el sistema podría enviar correos reales a esas direcciones.

## Operación

| Tarea | Comando |
|---|---|
| Ver el estado | `docker compose ps` |
| Ver los registros (logs) | `docker compose logs -f app` |
| Reiniciar la app | `docker compose restart app` |
| Detener todo (los datos quedan) | `docker compose down` |
| Volver a levantar | `docker compose up -d` |

### Actualizar a una versión nueva

```bash
git pull
docker compose up -d --build
```

La base y los archivos subidos se conservan. Los scripts de `database` solo se ejecutan cuando la base no existe. Si una versión nueva cambia la estructura de la base, el equipo tiene que indicar qué cambios aplicar sobre la base existente.

### Copias de seguridad

Base de datos, a un archivo:
```bash
docker compose exec db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers --databases ProyectoEmprendimientos2026' > respaldo-bd-$(date +%F).sql
```

Archivos subidos (fotos, PDF, facturas), a un `.tar.gz`:
```bash
docker run --rm -v emprendedores_archivos-subidos:/datos -v "$PWD":/respaldo alpine tar czf /respaldo/respaldo-archivos-$(date +%F).tar.gz -C /datos .
```

Se necesitan las dos copias: la base guarda las rutas de los archivos.

Para restaurar la base desde una copia:
```bash
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot' < respaldo-bd-AAAA-MM-DD.sql
```

### Empezar de cero

**Borra la base y todos los archivos subidos**, sin posibilidad de recuperarlos:
```bash
docker compose down -v
docker compose up -d --build
```

## Problemas frecuentes

- **`db` no llega a `healthy`**: revisar `docker compose logs db`. Si se cambió `MYSQL_ROOT_PASSWORD` o `DB_PASS` después de crear la base, las contraseñas nuevas no se aplican solas: se crean junto con la base, la primera vez.
- **Los formularios no generan el PDF**: revisar `docker compose logs app` y buscar errores de Chrome o Puppeteer.
- **No llegan los correos**: revisar `SMTP_USER` y `SMTP_PASS` (con Gmail tiene que ser una contraseña de aplicación) y que el servidor tenga salida al puerto 465. El panel muestra si un correo no se pudo enviar.
- **Las fechas salen con un día de diferencia**: los contenedores usan la hora de Argentina (`TZ=America/Argentina/Buenos_Aires`). Revisar que no se haya cambiado en `docker-compose.yml`.
