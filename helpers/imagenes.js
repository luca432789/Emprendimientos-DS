import fs from 'fs/promises';
import path from 'path';

// Imágenes que suben los emprendedores (publicaciones y productos).
// Llegan en el JSON como "data:image/...;base64,..." (igual que los adjuntos de los formularios digitales).

export class ErrorImagen extends Error {}

const TAMANIO_MAXIMO = 2 * 1024 * 1024; // 2 MB por imagen

// Se identifica el tipo por los primeros bytes del archivo, no por lo que diga el navegador
const tipoReal = (bytes) => {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
    if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
};

// Valida una lista de imágenes en base64 y devuelve [{ bytes, extension }]
export const validarImagenes = (lista, maximo) => {
    if (lista == null) return [];
    if (!Array.isArray(lista)) throw new ErrorImagen('Formato de imágenes inválido.');
    if (lista.length > maximo) throw new ErrorImagen(`Puede subir hasta ${maximo} ${maximo === 1 ? 'imagen' : 'imágenes'}.`);

    return lista.map((imagen) => {
        const data = typeof imagen === 'string' ? imagen : imagen?.data;
        if (typeof data !== 'string' || !data.startsWith('data:image/')) {
            throw new ErrorImagen('Solo se permiten imágenes JPG, PNG o WEBP.');
        }
        const bytes = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
        if (!bytes.length || bytes.length > TAMANIO_MAXIMO) {
            throw new ErrorImagen('Cada imagen debe pesar como máximo 2 MB.');
        }
        const extension = tipoReal(bytes);
        if (!extension) throw new ErrorImagen('Solo se permiten imágenes JPG, PNG o WEBP.');
        return { bytes, extension };
    });
};

// Ruta web (/uploads/...) -> ruta física dentro del proyecto. Nunca sale de la carpeta uploads.
export const rutaFisica = (rutaWeb) => {
    const partes = String(rutaWeb).split('/').filter(Boolean);
    if (partes[0] !== 'uploads' || partes.some((p) => p === '..' || p.includes('\\'))) {
        throw new Error(`Ruta de archivo no permitida: ${rutaWeb}`);
    }
    return path.join(process.cwd(), ...partes);
};

// Guarda las imágenes en una carpeta web (ej: /uploads/publicaciones/3/1729000000000) y devuelve sus rutas web
export const guardarImagenes = async (carpetaWeb, imagenes, prefijo = 'foto') => {
    const carpeta = rutaFisica(carpetaWeb);
    await fs.mkdir(carpeta, { recursive: true });
    const rutas = [];
    for (const [i, imagen] of imagenes.entries()) {
        const nombre = `${prefijo}-${i + 1}.${imagen.extension}`;
        await fs.writeFile(path.join(carpeta, nombre), imagen.bytes);
        rutas.push(`${carpetaWeb}/${nombre}`);
    }
    return rutas;
};

// Lista las fotos de una carpeta web (las columnas DirectorioFotos* guardan la carpeta)
export const listarFotos = async (carpetaWeb) => {
    if (!carpetaWeb) return [];
    try {
        const archivos = await fs.readdir(rutaFisica(carpetaWeb));
        return archivos
            .filter((a) => /\.(jpe?g|png|webp)$/i.test(a))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((a) => `${carpetaWeb}/${a}`);
    } catch {
        return [];
    }
};

// Borra una carpeta o archivo subido (se usa si la base de datos falla después de guardar)
export const borrarSubida = async (rutaWeb) => {
    if (!rutaWeb) return;
    await fs.rm(rutaFisica(rutaWeb), { recursive: true, force: true }).catch(() => {});
};
