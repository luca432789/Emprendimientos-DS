# Imagen de la app (Node + Express + Puppeteer). La base de datos va en otro contenedor (ver docker-compose.yml).
FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    TZ=America/Argentina/Buenos_Aires \
    PUPPETEER_CACHE_DIR=/app/.cache/puppeteer \
    CHROME_SIN_SANDBOX=1

# Librerías que necesita Chrome (Puppeteer arma los PDF de los formularios), la zona horaria y las fuentes:
# fonts-liberation reemplaza a Times New Roman y Arial con las mismas medidas, así los PDF quedan igual que en Windows.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates tzdata fonts-liberation fonts-dejavu-core fontconfig \
        libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libdrm2 libexpat1 libgbm1 \
        libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libx11-6 libx11-xcb1 \
        libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxkbcommon0 libxrandr2 \
        libxrender1 libxshmfence1 libxss1 libxtst6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Primero solo las dependencias (se reutilizan mientras package-lock.json no cambie). Puppeteer descarga Chrome acá.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Iconos iniciales de los rubros: el arranque los copia al volumen de uploads si faltan (docker/app/entrypoint.sh)
RUN mkdir -p /app/semillas /app/uploads \
    && cp -r uploads/IconoMapa /app/semillas/ \
    && chown -R node:node /app/uploads /app/.cache

# Sin permisos de administrador dentro del contenedor
USER node

EXPOSE 3000
ENTRYPOINT ["sh", "/app/docker/app/entrypoint.sh"]
CMD ["node", "app.js"]
