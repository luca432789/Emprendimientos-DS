import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { rutaFisica } from '../helpers/imagenes.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';
import {
    DIAS_PLAZO_FACTURAS,
    errorFacturas,
    modelAyudaDelEmprendedor,
    bloquearAyudaPendiente,
    conTransaccion,
    guardarCarpetaFacturas,
    auditarArchivoFactura,
    marcarFacturasEntregadas
} from '../models/facturasModel.js';

// Las fotos llegan achicadas por la página (achicar-fotos.js); al validarlas se juntan en un solo PDF,
// por eso el total es chico: así ese PDF se puede mandar por correo
export const LIMITES_FACTURAS = { maximoArchivos: 20, megasTotal: 20, megasFoto: 4, megasPdf: 8 };
const MEGA = 1024 * 1024;
const FALTA_MIGRACION = 'La base de datos no está actualizada para las Facturas de Ley: créela de nuevo con los scripts de la carpeta database (Tablas.sql, Triggers.sql y Usuario Conexion.sql).';

// Nombre guardado: <milisegundos>-<azar>__<nombre original>.<jpg|png|pdf> (el orden es el de subida)
const PATRON_ARCHIVO = /^(\d{13})-([0-9a-f]{8})__(.+)\.(jpg|png|pdf)$/;

const tipoReal = (bytes) => {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
    if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
    return null;
};

// Nombre que se muestra, sin la extensión ni caracteres que Windows no acepta en un archivo
const nombreSeguro = (nombre) => {
    const base = String(nombre || '').normalize('NFC').replace(/\.[^.]*$/, '')
        .replace(/[^\p{L}\p{N} _().-]/gu, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
    return base.slice(0, 80) || 'factura';
};

// Al validarlas, el Área junta las facturas en este PDF (con carátula) y borra los archivos sueltos
export const direccionPdfValidado = (carpetaWeb, tipo, id) => `${carpetaWeb}/FacturasDeLey-${tipo}-${id}.pdf`;
const pdfValidadoSiExiste = async (ayuda) => {
    if (!ayuda.FechaFacturasValidadas || !ayuda.PathDirectorioFacturas) return null;
    const direccion = direccionPdfValidado(ayuda.PathDirectorioFacturas, ayuda.tipo, ayuda.id);
    return fs.access(rutaFisica(direccion)).then(() => direccion, () => null);
};

// Archivos de la carpeta de facturas, en el orden en que se subieron
export const listarArchivosFacturas = async (carpetaWeb) => {
    if (!carpetaWeb) return [];
    const carpeta = rutaFisica(carpetaWeb);
    const nombres = await fs.readdir(carpeta).catch(() => []);
    const archivos = [];
    for (const archivo of nombres.sort()) {
        const partes = archivo.match(PATRON_ARCHIVO);
        if (!partes) continue;
        const { size } = await fs.stat(path.join(carpeta, archivo));
        archivos.push({
            archivo,
            nombre: `${partes[3]}.${partes[4]}`,
            tipo: partes[4] === 'pdf' ? 'pdf' : 'imagen',
            bytes: size,
            fecha: new Date(Number(partes[1])).toISOString(),
            url: `${carpetaWeb}/${encodeURIComponent(archivo)}`
        });
    }
    return archivos;
};

// Revisa que el archivo se pueda abrir (al validar las facturas se juntan todas en un PDF)
const validarArchivo = async (archivo) => {
    const data = archivo?.data;
    if (typeof data !== 'string' || !/^data:[\w/.+-]*;base64,/.test(data)) throw errorFacturas('Adjunte una foto JPG/PNG o un PDF.', 'INVALIDO');
    const bytes = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    const extension = bytes.length ? tipoReal(bytes) : null;
    if (!extension) throw errorFacturas('Solo se aceptan fotos JPG o PNG y archivos PDF.', 'INVALIDO');

    const megas = extension === 'pdf' ? LIMITES_FACTURAS.megasPdf : LIMITES_FACTURAS.megasFoto;
    if (bytes.length > megas * MEGA) {
        throw errorFacturas(`Cada ${extension === 'pdf' ? 'PDF' : 'foto'} puede pesar como máximo ${megas} MB.`, 'INVALIDO');
    }
    try {
        if (extension === 'pdf') {
            const pdf = await PDFDocument.load(bytes);
            if (!pdf.getPageCount()) throw new Error('PDF sin páginas');
        } else {
            const prueba = await PDFDocument.create();
            await (extension === 'png' ? prueba.embedPng(bytes) : prueba.embedJpg(bytes));
        }
    } catch {
        throw errorFacturas(extension === 'pdf'
            ? `"${archivo.nombre || 'El PDF'}" no se pudo abrir. Use un PDF válido y sin contraseña.`
            : `"${archivo.nombre || 'La foto'}" no se pudo leer. Use una foto JPG o PNG válida.`, 'INVALIDO');
    }
    return { bytes, extension };
};

const ESTADOS_HTTP = { SIN_AYUDA: 404, NO_PENDIENTE: 409, INVALIDO: 400, LIMITE: 400, NO_EXISTE: 404 };
const responderError = (res, error, contexto) => {
    if (ESTADOS_HTTP[error.codigo]) return res.status(ESTADOS_HTTP[error.codigo]).json({ error: error.message });
    if (error.code === 'ER_BAD_FIELD_ERROR') return res.status(503).json({ error: FALTA_MIGRACION });
    console.error(`Error al ${contexto}:`, error);
    res.status(500).json({ error: `No se pudo ${contexto}.` });
};

const soloEmprendedor = (req, res) => {
    if (req.usuarioLogueado.tipoUsuario === 'Emprendedor') return true;
    res.status(403).json({ error: 'Solo disponible para emprendedores.' });
    return false;
};

const auditoriaDe = (req) => ({ idUsuario: req.usuarioLogueado.idUsuario, ipCliente: obtenerIpCliente(req) });

// Lo que necesita la página de facturas (y la campanita): ayuda, plazo, estado y archivos subidos
export const datosFacturas = async (ayuda) => ({
    disponible: true,
    tipo: ayuda.tipo,
    ayuda: ayuda.Nombre,
    estado: ayuda.estado,
    plazoDias: DIAS_PLAZO_FACTURAS,
    fechaLimite: ayuda.FechaLimite,
    diasRestantes: Number(ayuda.DiasRestantes),
    fechaEntrega: ayuda.FechaEntregaFacturas,
    fechaValidacion: ayuda.FechaFacturasValidadas,
    observacion: ayuda.estado === 'pendiente' ? ayuda.MotivoObservacionFacturas : null,
    archivos: await listarArchivosFacturas(ayuda.PathDirectorioFacturas),
    pdfValidado: await pdfValidadoSiExiste(ayuda),
    limites: LIMITES_FACTURAS
});

// GET /api/facturas/mias
export const obtenerMisFacturas = async (req, res) => {
    if (!soloEmprendedor(req, res)) return;
    try {
        const ayuda = await modelAyudaDelEmprendedor(req.usuarioLogueado.idUsuario);
        res.json(ayuda ? await datosFacturas(ayuda) : { disponible: false });
    } catch (error) {
        responderError(res, error, 'cargar sus facturas');
    }
};

// POST /api/facturas/mias/archivos  body: { archivo: { nombre, data: 'data:...;base64,...' } }  (de a uno)
export const subirFactura = async (req, res) => {
    if (!soloEmprendedor(req, res)) return;
    let rutaGuardada = null;
    try {
        const archivo = req.body?.archivo;
        const { bytes, extension } = await validarArchivo(archivo);
        const auditoria = auditoriaDe(req);

        const ayuda = await conTransaccion(auditoria, async (conexion) => {
            const ayuda = await bloquearAyudaPendiente(conexion, auditoria.idUsuario);
            const existentes = await listarArchivosFacturas(ayuda.PathDirectorioFacturas);
            if (existentes.length >= LIMITES_FACTURAS.maximoArchivos) {
                throw errorFacturas(`Puede subir hasta ${LIMITES_FACTURAS.maximoArchivos} archivos. Borre alguno o junte varias facturas en un PDF.`, 'LIMITE');
            }
            const total = existentes.reduce((suma, a) => suma + a.bytes, 0) + bytes.length;
            if (total > LIMITES_FACTURAS.megasTotal * MEGA) {
                throw errorFacturas(`Entre todas las facturas no pueden superar los ${LIMITES_FACTURAS.megasTotal} MB.`, 'LIMITE');
            }

            // La carpeta lleva una parte al azar: no se puede adivinar la dirección de las facturas de otro
            if (!ayuda.PathDirectorioFacturas) {
                ayuda.PathDirectorioFacturas = `/uploads/facturas/${ayuda.tipo}-${ayuda.id}-${crypto.randomBytes(8).toString('hex')}`;
                await guardarCarpetaFacturas(conexion, ayuda, ayuda.PathDirectorioFacturas);
            }
            const carpeta = rutaFisica(ayuda.PathDirectorioFacturas);
            await fs.mkdir(carpeta, { recursive: true });
            const nombre = `${nombreSeguro(archivo.nombre)}.${extension}`;
            const nombreArchivo = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}__${nombre}`;
            rutaGuardada = path.join(carpeta, nombreArchivo);
            await fs.writeFile(rutaGuardada, bytes, { flag: 'wx' });
            await auditarArchivoFactura(conexion, ayuda, 'INSERT',
                `Factura de ley subida por el emprendedor: ${nombre} (${Math.ceil(bytes.length / 1024)} KB)`, auditoria);
            return ayuda;
        });
        rutaGuardada = null;
        res.status(201).json({ mensaje: 'Factura guardada.', archivos: await listarArchivosFacturas(ayuda.PathDirectorioFacturas) });
    } catch (error) {
        if (rutaGuardada) await fs.unlink(rutaGuardada).catch(() => {});
        responderError(res, error, 'guardar la factura');
    }
};

// DELETE /api/facturas/mias/archivos/:archivo  (solo antes de enviarlas a revisar)
export const borrarFactura = async (req, res) => {
    if (!soloEmprendedor(req, res)) return;
    try {
        const archivo = String(req.params.archivo || '');
        const partes = archivo.match(PATRON_ARCHIVO);
        if (!partes || archivo.includes('/') || archivo.includes('\\')) throw errorFacturas('El archivo no existe.', 'NO_EXISTE');
        const auditoria = auditoriaDe(req);

        const ayuda = await conTransaccion(auditoria, async (conexion) => {
            const ayuda = await bloquearAyudaPendiente(conexion, auditoria.idUsuario);
            const existentes = await listarArchivosFacturas(ayuda.PathDirectorioFacturas);
            if (!existentes.some((a) => a.archivo === archivo)) throw errorFacturas('El archivo no existe.', 'NO_EXISTE');
            await auditarArchivoFactura(conexion, ayuda, 'DELETE',
                `Factura de ley borrada por el emprendedor antes de enviarla: ${partes[3]}.${partes[4]}`, auditoria);
            await fs.unlink(path.join(rutaFisica(ayuda.PathDirectorioFacturas), archivo));
            return ayuda;
        });
        res.json({ mensaje: 'Factura borrada.', archivos: await listarArchivosFacturas(ayuda.PathDirectorioFacturas) });
    } catch (error) {
        responderError(res, error, 'borrar la factura');
    }
};

// POST /api/facturas/mias/enviar  -> "Enviar a revisar las Facturas": después ya no se pueden cambiar
export const enviarFacturasARevisar = async (req, res) => {
    if (!soloEmprendedor(req, res)) return;
    try {
        const auditoria = auditoriaDe(req);
        await conTransaccion(auditoria, async (conexion) => {
            const ayuda = await bloquearAyudaPendiente(conexion, auditoria.idUsuario);
            const archivos = await listarArchivosFacturas(ayuda.PathDirectorioFacturas);
            if (!archivos.length) throw errorFacturas('Suba al menos una factura antes de enviarlas a revisar.', 'INVALIDO');
            await marcarFacturasEntregadas(conexion, ayuda);
        });
        const ayuda = await modelAyudaDelEmprendedor(auditoria.idUsuario);
        res.json({ mensaje: 'Sus facturas fueron enviadas a revisar.', ...(await datosFacturas(ayuda)) });
    } catch (error) {
        responderError(res, error, 'enviar las facturas');
    }
};
