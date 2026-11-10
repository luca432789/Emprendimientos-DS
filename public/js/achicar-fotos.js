// Achica las fotos antes de subirlas (formularios digitales, facturas de ley, publicaciones, productos y noticias).
// Fotos de los adjuntos: una foto de celular pesa 2 a 5 MB y en el PDF no hace falta tanta resolución.
// Se redibuja con el lado mayor en hasta 2000 px (se sigue leyendo bien un documento A4) y se guarda en JPG.
// Además queda derecha: el PDF no lee la orientación que guarda la cámara, y el navegador sí la aplica al dibujarla.
const LADO_MAXIMO_FOTO = 2000;
const CALIDAD_FOTO = 0.8;

const abrirFoto = (archivo) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(archivo);
  const imagen = new Image();
  imagen.onload = () => { URL.revokeObjectURL(url); resolve(imagen); };
  imagen.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la foto.')); };
  imagen.src = url;
});

// Devuelve la foto achicada en JPG, o la original si no se pudo o si no conviene (un PNG chico, como una captura, queda igual)
const achicarFoto = async (archivo) => {
  const esJpg = archivo.type === 'image/jpeg';
  if (!esJpg && archivo.size <= 700 * 1024) return archivo;
  try {
    const foto = window.createImageBitmap
      ? await createImageBitmap(archivo, { imageOrientation: 'from-image' }).catch(() => abrirFoto(archivo))
      : await abrirFoto(archivo);
    const anchoOriginal = foto.naturalWidth || foto.width;
    const altoOriginal = foto.naturalHeight || foto.height;
    const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(anchoOriginal, altoOriginal));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(anchoOriginal * escala);
    lienzo.height = Math.round(altoOriginal * escala);
    const contexto = lienzo.getContext('2d');
    contexto.fillStyle = '#fff'; // un PNG transparente queda sobre blanco
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    contexto.drawImage(foto, 0, 0, lienzo.width, lienzo.height);
    foto.close?.();
    const achicada = await new Promise((resolve) => lienzo.toBlob(resolve, 'image/jpeg', CALIDAD_FOTO));
    lienzo.width = 0; // libera la memoria del lienzo enseguida (importa en celulares viejos)
    lienzo.height = 0;
    // Un JPG se usa redibujado aunque no baje de peso, para que quede derecho
    if (!achicada || (!esJpg && achicada.size >= archivo.size)) return archivo;
    const nombre = `${archivo.name.replace(/\.(jpe?g|png)$/i, '')}.jpg`;
    try {
      return new File([achicada], nombre, { type: 'image/jpeg' });
    } catch {
      return Object.assign(achicada, { name: nombre }); // navegadores sin el constructor File
    }
  } catch {
    return archivo;
  }
};

// Las fotos se empiezan a achicar apenas se eligen, de a una y en segundo plano, mientras se completa el resto del
// formulario: así al enviar ya están listas (en un celular viejo cada una puede tardar unos segundos)
const fotosAchicadas = new WeakMap();
let colaDeFotos = Promise.resolve();
const fotoAchicada = (archivo) => {
  if (!fotosAchicadas.has(archivo)) {
    const lista = colaDeFotos.then(() => achicarFoto(archivo));
    colaDeFotos = lista;
    fotosAchicadas.set(archivo, lista);
  }
  return fotosAchicadas.get(archivo);
};
const adelantarFotos = (control) => {
  [...(control.files || [])].filter((archivo) => ['image/jpeg', 'image/png'].includes(archivo.type)).forEach(fotoAchicada);
};
