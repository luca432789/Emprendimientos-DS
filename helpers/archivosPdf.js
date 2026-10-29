import fs from 'fs/promises';
import path from 'path';

// Escribe el PDF con el siguiente número libre de la carpeta (el mayor existente + 1).
// La bandera 'wx' nunca pisa un archivo: si dos envíos toman el mismo número, el segundo prueba con el siguiente.
export const escribirConNumero = async (carpetaFisica, nombreBase, bytesPdf) => {
  const patron = new RegExp(`^${nombreBase}(\\d+)\\.pdf$`, 'i');
  const existentes = await fs.readdir(carpetaFisica);
  let numero = existentes.reduce((mayor, archivo) => {
    const coincidencia = archivo.match(patron);
    return coincidencia ? Math.max(mayor, Number(coincidencia[1])) : mayor;
  }, 0);

  for (let intento = 0; intento < 20; intento++) {
    numero += 1;
    const nombreArchivo = `${nombreBase}${String(numero).padStart(2, '0')}.pdf`;
    try {
      await fs.writeFile(path.join(carpetaFisica, nombreArchivo), bytesPdf, { flag: 'wx' });
      return nombreArchivo;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`No se encontró un número libre para ${nombreBase}`);
};

// Guarda el PDF en /uploads/<carpeta> y devuelve su ruta física y su dirección web
export const guardarPdfEnUploads = async (carpeta, nombreBase, bytesPdf) => {
  const carpetaFisica = path.join(process.cwd(), 'uploads', carpeta);
  await fs.mkdir(carpetaFisica, { recursive: true });
  const nombreArchivo = await escribirConNumero(carpetaFisica, nombreBase, bytesPdf);
  return {
    rutaArchivo: path.join(carpetaFisica, nombreArchivo),
    direccionWeb: `/uploads/${carpeta}/${nombreArchivo}`
  };
};
