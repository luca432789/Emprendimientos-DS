import {
    modelEsNoticiero,
    modelContarNoticias,
    modelListarNoticias,
    modelObtenerNoticia,
    modelCrearNoticia,
    modelEditarNoticia,
    modelCambiarVisibilidadNoticia,
    modelEliminarNoticia
} from '../models/noticiasModel.js';
import { usuarioDelTokenOpcional } from '../middlewares/loginMiddleware.js';
import { ErrorImagen, validarImagenes, guardarImagenes, copiarFotos, listarFotos, borrarSubida } from '../helpers/imagenes.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

// Cada versión de las imágenes de una noticia va a su carpeta (ej: /uploads/NoticiasImagen/noticia-1729000000000,
// con foto-1.jpg y foto-2.jpg) y Noticia.ImagenUrl guarda esa carpeta. Las noticias anteriores guardan un archivo suelto.
const CARPETA_IMAGENES = '/uploads/NoticiasImagen';
const MAXIMO_IMAGENES = 2;
const NOTICIAS_POR_PAGINA = 5; // de a 5 en la columna de la derecha
const MAXIMO_TITULO = 255;
const MAXIMO_CONTENIDO = 10000;

const datosAuditoriaDe = (req) => ({
    idUsuario: req.usuarioLogueado.idUsuario,
    ipCliente: obtenerIpCliente(req)
});

const idValido = (valor) => {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// El usuario logueado tiene el permiso Noticiero (o responde el error)
const verificarNoticiero = async (req, res) => {
    if (await modelEsNoticiero(req.usuarioLogueado.idUsuario)) return true;
    res.status(403).json({ error: 'Su usuario no tiene permiso para publicar noticias.' });
    return false;
};

const leerNoticia = (body) => {
    const titulo = String(body.titulo ?? '').trim();
    const contenido = String(body.contenido ?? '').trim();

    if (!titulo) return { error: 'Escriba el título de la noticia.' };
    if (titulo.length > MAXIMO_TITULO) return { error: `El título admite hasta ${MAXIMO_TITULO} caracteres.` };
    if (!contenido) return { error: 'Escriba el contenido de la noticia.' };
    if (contenido.length > MAXIMO_CONTENIDO) return { error: `El contenido admite hasta ${MAXIMO_CONTENIDO} caracteres.` };
    return { titulo, contenido };
};

// Rutas web de las imágenes de una noticia (ImagenUrl es una carpeta, o un archivo en las noticias anteriores)
const imagenesDeNoticia = async (imagenUrl) => {
    if (!imagenUrl) return [];
    if (/\.(jpe?g|png|webp)$/i.test(imagenUrl)) return [imagenUrl];
    return listarFotos(imagenUrl);
};

// Arma la carpeta nueva con las imágenes que se conservan (primero) y las nuevas, y devuelve su ruta web,
// o null si la noticia queda sin imágenes
const guardarImagenesNoticia = async (nuevasBase64, conservadas = []) => {
    const nuevas = validarImagenes(nuevasBase64 ?? [], MAXIMO_IMAGENES);
    if (conservadas.length + nuevas.length > MAXIMO_IMAGENES) {
        throw new ErrorImagen(`La noticia puede tener hasta ${MAXIMO_IMAGENES} imágenes.`);
    }
    if (!conservadas.length && !nuevas.length) return null;
    const carpeta = `${CARPETA_IMAGENES}/noticia-${Date.now()}`;
    const copiadas = await copiarFotos(conservadas, carpeta);
    await guardarImagenes(carpeta, nuevas, 'foto', copiadas + 1);
    return carpeta;
};

// Borra las imágenes que la noticia ya no usa (solo dentro de uploads/NoticiasImagen)
const borrarImagenesNoticia = async (imagenUrl) => {
    if (imagenUrl && imagenUrl.startsWith(`${CARPETA_IMAGENES}/`)) await borrarSubida(imagenUrl);
};

// Imágenes que llegan en el pedido: { imagenes: [dataURL, ...] } (o { imagen } como antes)
const nuevasDelPedido = (body) => (Array.isArray(body.imagenes) ? body.imagenes : body.imagen ? [body.imagen] : []);

const formatoNoticia = async (n, usuario, esNoticiero) => ({
    idNoticia: n.idNoticia,
    titulo: n.Titulo,
    contenido: n.Contenido,
    imagenes: await imagenesDeNoticia(n.ImagenUrl),
    visible: n.Visible,
    autor: n.Autor,
    fechaCreacion: n.FechaCreacion,
    fechaEdicion: n.FechaEdicion,
    // Solo el autor, con el permiso vigente y dentro de la primera hora
    segundosEdicion: esNoticiero && n.idAutor === usuario?.idUsuario ? n.SegundosEdicion : 0
});

const responderError = (res, error, mensaje) => {
    if (error instanceof ErrorImagen) return res.status(400).json({ error: error.message });
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_TABLEACCESS_DENIED_ERROR'].includes(error?.code)) {
        return res.status(503).json({ error: 'Las noticias no están instaladas en la base de datos (ejecutar database/Noticias.sql).' });
    }
    // Rechazos de los triggers de seguridad de Noticia (permiso o ventana de 1 hora)
    if (error?.code === 'ER_SIGNAL_EXCEPTION') return res.status(403).json({ error: error.sqlMessage });
    console.error(mensaje, error);
    return res.status(500).json({ error: mensaje });
};

// Usuario de la sesión (si mandó token) y si tiene el permiso Noticiero
const sesionOpcional = async (req) => {
    const usuario = usuarioDelTokenOpcional(req);
    return { usuario, esNoticiero: usuario ? await modelEsNoticiero(usuario.idUsuario) : false };
};

// GET /api/noticias?page=1  (pública; si manda el token de un noticiero también ve las ocultas)
// Solo título y fecha, de a 5: es la columna de la derecha de la página
export const listarNoticias = async (req, res) => {
    try {
        const { esNoticiero } = await sesionOpcional(req);
        const totalRegistros = await modelContarNoticias(!esNoticiero);
        const totalPaginas = Math.ceil(totalRegistros / NOTICIAS_POR_PAGINA);
        const pagina = Math.min(idValido(req.query.page) ?? 1, Math.max(1, totalPaginas));
        const noticias = await modelListarNoticias(!esNoticiero, NOTICIAS_POR_PAGINA, (pagina - 1) * NOTICIAS_POR_PAGINA);

        res.json({
            noticias: noticias.map((n) => ({ idNoticia: n.idNoticia, titulo: n.Titulo, visible: n.Visible, fechaCreacion: n.FechaCreacion })),
            pagina,
            totalPaginas,
            totalRegistros,
            puedePublicar: esNoticiero
        });
    } catch (error) {
        responderError(res, error, 'No se pudieron obtener las noticias.');
    }
};

// GET /api/noticias/:idNoticia  (pública; las ocultas solo para noticieros)
export const obtenerNoticia = async (req, res) => {
    try {
        const idNoticia = idValido(req.params.idNoticia);
        if (!idNoticia) return res.status(400).json({ error: 'Noticia inválida.' });

        const { usuario, esNoticiero } = await sesionOpcional(req);
        const noticia = await modelObtenerNoticia(idNoticia);
        if (!noticia || (!noticia.Visible && !esNoticiero)) return res.status(404).json({ error: 'La noticia no existe o ya no está disponible.' });

        res.json(await formatoNoticia(noticia, usuario, esNoticiero));
    } catch (error) {
        responderError(res, error, 'No se pudo obtener la noticia.');
    }
};

// POST /api/noticias  body: { titulo, contenido, imagenes?: [dataURL] }  (hasta 2)
export const crearNoticia = async (req, res) => {
    let imagenGuardada = null;
    try {
        if (!(await verificarNoticiero(req, res))) return;

        const datos = leerNoticia(req.body);
        if (datos.error) return res.status(400).json({ error: datos.error });

        // La imagen se guarda antes del alta para que el INSERT ya lleve su ruta (una sola entrada de auditoría)
        imagenGuardada = await guardarImagenesNoticia(nuevasDelPedido(req.body));
        const idNoticia = await modelCrearNoticia(req.usuarioLogueado.idUsuario, datos, imagenGuardada, datosAuditoriaDe(req));

        res.status(201).json({ mensaje: 'Noticia publicada. Puede editarla durante la próxima hora.', idNoticia });
    } catch (error) {
        await borrarSubida(imagenGuardada);
        responderError(res, error, 'No se pudo publicar la noticia.');
    }
};

// PUT /api/noticias/:idNoticia  body: { titulo, contenido, imagenes?: [dataURL], conservar?: [ruta web] }
// conservar: cuáles de las imágenes actuales siguen (sin conservar se mantienen todas); las nuevas se suman, hasta 2
export const editarNoticia = async (req, res) => {
    let imagenGuardada = null;
    try {
        if (!(await verificarNoticiero(req, res))) return;

        const idNoticia = idValido(req.params.idNoticia);
        if (!idNoticia) return res.status(400).json({ error: 'Noticia inválida.' });
        const noticia = await modelObtenerNoticia(idNoticia);
        if (!noticia) return res.status(404).json({ error: 'La noticia no existe.' });
        if (noticia.idAutor !== req.usuarioLogueado.idUsuario) {
            return res.status(403).json({ error: 'Solo el autor puede editar la noticia.' });
        }
        if (noticia.SegundosEdicion <= 0) {
            return res.status(403).json({ error: 'Pasó la hora para editar esta noticia. Solo puede ocultarla o mostrarla.' });
        }

        const datos = leerNoticia(req.body);
        if (datos.error) return res.status(400).json({ error: datos.error });

        const actuales = await imagenesDeNoticia(noticia.ImagenUrl);
        const conservadas = Array.isArray(req.body.conservar) ? actuales.filter((u) => req.body.conservar.includes(u)) : actuales;
        const nuevas = nuevasDelPedido(req.body);
        // Sin cambios en las imágenes: sigue la misma carpeta
        const cambianImagenes = nuevas.length > 0 || conservadas.length !== actuales.length;
        if (cambianImagenes) imagenGuardada = await guardarImagenesNoticia(nuevas, conservadas);
        const imagenUrl = cambianImagenes ? imagenGuardada : noticia.ImagenUrl;

        const cambiadas = await modelEditarNoticia(idNoticia, req.usuarioLogueado.idUsuario, datos, imagenUrl, datosAuditoriaDe(req));
        if (!cambiadas) {
            await borrarSubida(imagenGuardada);
            return res.status(403).json({ error: 'Pasó la hora para editar esta noticia. Solo puede ocultarla o mostrarla.' });
        }
        // Las imágenes anteriores se borran solo cuando la base ya confirmó el cambio
        if (cambianImagenes) await borrarImagenesNoticia(noticia.ImagenUrl);
        res.json({ mensaje: 'Noticia actualizada.' });
    } catch (error) {
        await borrarSubida(imagenGuardada);
        responderError(res, error, 'No se pudo actualizar la noticia.');
    }
};

// PATCH /api/noticias/:idNoticia/visible  body: { visible: true | false }  (cualquier noticiero, sin límite de tiempo)
export const cambiarVisibilidadNoticia = async (req, res) => {
    try {
        if (!(await verificarNoticiero(req, res))) return;

        const idNoticia = idValido(req.params.idNoticia);
        if (!idNoticia) return res.status(400).json({ error: 'Noticia inválida.' });
        if (typeof req.body.visible !== 'boolean') return res.status(400).json({ error: 'Indique si la noticia queda visible u oculta.' });

        const cambiadas = await modelCambiarVisibilidadNoticia(idNoticia, req.body.visible, datosAuditoriaDe(req));
        if (!cambiadas) return res.status(404).json({ error: 'La noticia no existe.' });
        res.json({ mensaje: req.body.visible ? 'La noticia volvió a estar visible.' : 'Noticia oculta para el público.' });
    } catch (error) {
        responderError(res, error, 'No se pudo cambiar la visibilidad de la noticia.');
    }
};

// DELETE /api/noticias/:idNoticia  (cualquier noticiero, igual que ocultar): la borra junto con sus imágenes
export const eliminarNoticia = async (req, res) => {
    try {
        if (!(await verificarNoticiero(req, res))) return;

        const idNoticia = idValido(req.params.idNoticia);
        if (!idNoticia) return res.status(400).json({ error: 'Noticia inválida.' });
        const noticia = await modelObtenerNoticia(idNoticia);
        if (!noticia) return res.status(404).json({ error: 'La noticia no existe.' });

        const eliminadas = await modelEliminarNoticia(idNoticia, datosAuditoriaDe(req));
        if (!eliminadas) return res.status(404).json({ error: 'La noticia no existe.' });

        // La imagen se borra solo cuando la base ya confirmó: si falla el DELETE no se pierde nada
        await borrarImagenesNoticia(noticia.ImagenUrl);
        res.json({ mensaje: 'Noticia eliminada.' });
    } catch (error) {
        responderError(res, error, 'No se pudo eliminar la noticia.');
    }
};
