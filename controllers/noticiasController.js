import {
    modelEsNoticiero,
    modelContarNoticias,
    modelListarNoticias,
    modelObtenerNoticia,
    modelCrearNoticia,
    modelEditarNoticia,
    modelCambiarVisibilidadNoticia
} from '../models/noticiasModel.js';
import { usuarioDelTokenOpcional } from '../middlewares/loginMiddleware.js';
import { ErrorImagen, validarImagenes, guardarImagenes, borrarSubida } from '../helpers/imagenes.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

const CARPETA_IMAGENES = '/uploads/NoticiasImagen';
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

// Guarda la imagen (si vino) en uploads/NoticiasImagen y devuelve su ruta web, o null
const guardarImagenNoticia = async (imagenBase64) => {
    const [imagen] = validarImagenes(imagenBase64 ? [imagenBase64] : [], 1);
    if (!imagen) return null;
    const [ruta] = await guardarImagenes(CARPETA_IMAGENES, [imagen], `noticia-${Date.now()}`);
    return ruta;
};

const formatoNoticia = (n, usuario, esNoticiero) => ({
    idNoticia: n.idNoticia,
    titulo: n.Titulo,
    contenido: n.Contenido,
    imagen: n.ImagenUrl,
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

        res.json(formatoNoticia(noticia, usuario, esNoticiero));
    } catch (error) {
        responderError(res, error, 'No se pudo obtener la noticia.');
    }
};

// POST /api/noticias  body: { titulo, contenido, imagen?: dataURL }
export const crearNoticia = async (req, res) => {
    let imagenGuardada = null;
    try {
        if (!(await verificarNoticiero(req, res))) return;

        const datos = leerNoticia(req.body);
        if (datos.error) return res.status(400).json({ error: datos.error });

        // La imagen se guarda antes del alta para que el INSERT ya lleve su ruta (una sola entrada de auditoría)
        imagenGuardada = await guardarImagenNoticia(req.body.imagen);
        const idNoticia = await modelCrearNoticia(req.usuarioLogueado.idUsuario, datos, imagenGuardada, datosAuditoriaDe(req));

        res.status(201).json({ mensaje: 'Noticia publicada. Puede editarla durante la próxima hora.', idNoticia });
    } catch (error) {
        await borrarSubida(imagenGuardada);
        responderError(res, error, 'No se pudo publicar la noticia.');
    }
};

// PUT /api/noticias/:idNoticia  body: { titulo, contenido, imagen?: dataURL, quitarImagen?: boolean }
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

        imagenGuardada = await guardarImagenNoticia(req.body.imagen);
        const imagenUrl = imagenGuardada ?? (req.body.quitarImagen === true ? null : noticia.ImagenUrl);

        const cambiadas = await modelEditarNoticia(idNoticia, req.usuarioLogueado.idUsuario, datos, imagenUrl, datosAuditoriaDe(req));
        if (!cambiadas) {
            await borrarSubida(imagenGuardada);
            return res.status(403).json({ error: 'Pasó la hora para editar esta noticia. Solo puede ocultarla o mostrarla.' });
        }
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
