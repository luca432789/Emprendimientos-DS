import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';

// Un solo Chrome para todo el servidor: abrirlo tarda varios segundos, así que se abre al arrancar
// (prepararNavegador) y se reutiliza entre pedidos. Si se cierra o falla, el próximo pedido lo vuelve a abrir.
let navegador = null;
// Abrir una pestaña también tarda (~1 s): siempre se deja una abierta esperando al próximo documento
let paginaLista = null;
// Si llegan varios pedidos mientras Chrome se está abriendo, todos esperan la misma apertura
let abriendo = null;

// En Docker (CHROME_SIN_SANDBOX=1) Chrome no puede usar su sandbox y /dev/shm es chico: se desactivan los dos
const argumentosChrome = process.env.CHROME_SIN_SANDBOX === '1' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];

const obtenerNavegador = async () => {
  if (navegador?.connected) return navegador;
  abriendo ??= puppeteer.launch({ headless: true, args: argumentosChrome })
    .then((nuevo) => {
      navegador = nuevo;
      nuevo.on('disconnected', () => { navegador = null; paginaLista = null; });
      return nuevo;
    })
    .finally(() => { abriendo = null; });
  return abriendo;
};

const abrirPaginaLista = () => {
  const pendiente = obtenerNavegador().then((nav) => nav.newPage());
  paginaLista = pendiente;
  pendiente.catch(() => { if (paginaLista === pendiente) paginaLista = null; });
};

// Toma la pestaña que estaba esperando (cada pedido usa la suya) y deja otra abriéndose para el siguiente
const tomarPagina = async () => {
  const pendiente = paginaLista;
  abrirPaginaLista();
  const pagina = pendiente ? await pendiente.catch(() => null) : null;
  if (pagina && !pagina.isClosed()) return pagina;
  return (await obtenerNavegador()).newPage();
};

// Se llama al arrancar el servidor para que el primer formulario no espere la apertura de Chrome
export const prepararNavegador = () => {
  if (!paginaLista) abrirPaginaLista();
  return paginaLista.then(() => true, (error) => {
    console.error('No se pudo abrir Chrome para generar los PDF:', error.message);
    return false;
  });
};

// La página se carga con setContent (sin dirección), así que las imágenes van incrustadas en base64
const imagenesEnCache = new Map();
export const imagenComoDataUri = async (rutaImagen) => {
  if (!imagenesEnCache.has(rutaImagen)) {
    const tipo = path.extname(rutaImagen).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const bytes = await fs.readFile(rutaImagen);
    imagenesEnCache.set(rutaImagen, `data:${tipo};base64,${bytes.toString('base64')}`);
  }
  return imagenesEnCache.get(rutaImagen);
};

// Arma el HTML con la plantilla EJS y lo imprime a PDF (A4, tamaño y márgenes los fija el @page del CSS)
export const generarPdfDesdePlantilla = async (rutaPlantilla, datos) => {
  const html = await ejs.renderFile(rutaPlantilla, datos);
  const pagina = await tomarPagina();
  try {
    await pagina.setContent(html, { waitUntil: 'load' });
    return await pagina.pdf({ printBackground: true, preferCSSPageSize: true });
  } finally {
    await pagina.close().catch(() => {});
  }
};
