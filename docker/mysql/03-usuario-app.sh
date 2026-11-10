#!/bin/bash
# Paso 3 de la creación de la base (lo ejecuta la imagen de MySQL una sola vez, con la base vacía).
# Crea el usuario ministerio_api con "database/Usuario Conexion.sql", pero:
#   - con '%' en lugar de 'localhost': la app se conecta desde otro contenedor (el puerto de MySQL no se publica afuera);
#   - con la contraseña de DB_PASS del .env (en el repositorio queda CAMBIAR_CLAVE).
# La imagen de MySQL puede "sourcear" este archivo: por eso no usa set -e ni exit.

if [ -z "$APP_DB_PASS" ]; then
    echo "03-usuario-app.sh: falta DB_PASS en el .env; no se creó el usuario ministerio_api." >&2
else
    shopt -u patsub_replacement 2>/dev/null || true # que "&" en la contraseña no se tome como especial
    # Contraseña como texto SQL: se duplican las barras invertidas y las comillas simples
    clave=${APP_DB_PASS//\\/\\\\}
    clave=${clave//\'/\'\'}
    sql=$(< /docker-entrypoint-initdb.d/sql/usuario-conexion.sql)
    sql=${sql//"'ministerio_api'@'localhost'"/"'ministerio_api'@'%'"}
    sql=${sql//CAMBIAR_CLAVE/"$clave"}
    printf '%s\n' "$sql" | MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot ${SOCKET:+--socket="$SOCKET"}
    echo "03-usuario-app.sh: usuario ministerio_api@'%' creado con sus permisos."
fi
