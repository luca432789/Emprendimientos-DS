#!/bin/sh
# Arranque del contenedor de la app.
# uploads es un volumen (fotos, PDF y facturas que no se pierden al actualizar): si está vacío o le faltan
# los iconos iniciales de los rubros (database/Datos iniciales.sql), se copian desde la imagen sin pisar nada.
mkdir -p /app/uploads/IconoMapa
cp -n /app/semillas/IconoMapa/* /app/uploads/IconoMapa/ 2>/dev/null || true
exec "$@"
