import {
    MAXIMO_PUBLICACIONES,
    modelEmprendimientoDeUsuario,
    modelEmpleadoDeUsuario,
    modelCrearPublicacion,
    modelPublicacionPropia,
    modelEditarPublicacion,
    modelTodasLasPublicacionesAprobadas,
    modelPublicacionesAprobadas,
    modelPublicacionesPendientes,
    modelModerarPublicacion
} from '../models/publicacionesModel.js';
import { ErrorImagen, validarImagenes, guardarImagenes, listarFotos, borrarSubida } from '../helpers/imagenes.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

// Roles que pueden aprobar o rechazar publicaciones
const ROLES_MODERADORES = ['Empleado de Area', 'Administrador'];
const MAXIMO_FOTOS = 4;
const TITULO_POR_DEFECTO = 'Novedades del Emprendimiento';

const datosAuditoriaDe = (req) => ({
    idUsuario: req.usuarioLogueado.idUsuario,
    ipCliente: obtenerIpCliente(req)
});
const esModerador = (req) => ROLES_MODERADORES.includes(req.usuarioLogueado?.tipoUsuario);

// Cada versión de fotos va a su propia carpeta: lo aprobado no se pisa mientras se revisa lo nuevo
const carpetaNueva = (idPublicacion) => `/uploads/publicaciones/${idPublicacion}/${Date.now()}`;

// Título y texto validados (mismos límites que las columnas de la tabla)
const leerContenido = (body) => {
    const titulo = String(body.titulo ?? '').trim() || TITULO_POR_DEFECTO;
    const descripcion = String(body.descripcion ?? '').trim();
    if (!descripcion) return { error: 'Escriba el texto de la publicación.' };
    if (titulo.length > 150) return { error: 'El título admite hasta 150 caracteres.' };
    if (descripcion.length > 5000) return { error: 'La publicación admite hasta 5000 caracteres.' };
    return { titulo, descripcion };
};

// El emprendedor logueado y su emprendimiento (o responde el error)
const emprendimientoDelEmprendedor = async (req, res) => {
    if (req.usuarioLogueado.tipoUsuario !== 'Emprendedor') {
        res.status(403).json({ error: 'Solo un emprendedor puede publicar.' });
        return null;
    }
    const emprendimiento = await modelEmprendimientoDeUsuario(req.usuarioLogueado.idUsuario);
    if (!emprendimiento) {
        res.status(404).json({ error: 'Su usuario no tiene un emprendimiento asociado.' });
        return null;
    }
    return emprendimiento;
};

// Agrega la lista de fotos (rutas web) a cada publicación
export const conFotos = (publicaciones) => Promise.all(publicaciones.map(async ({ carpetaFotos, ...pub }) => ({
    ...pub,
    fotos: await listarFotos(carpetaFotos)
})));

// POST /api/publicaciones  (Emprendedor) body: { titulo?, descripcion, fotos?: [dataURL] }
export const crearPublicacion = async (req, res) => {
    let carpetaGuardada = null;
    try {
        const emprendimiento = await emprendimientoDelEmprendedor(req, res);
        if (!emprendimiento) return;

        const contenido = leerContenido(req.body);
        if (contenido.error) return res.status(400).json({ error: contenido.error });
        const imagenes = validarImagenes(req.body.fotos, MAXIMO_FOTOS);

        const idPublicacion = await modelCrearPublicacion(
            emprendimiento.idEmprendimiento, contenido.titulo, contenido.descripcion,
            async (id) => {
                if (!imagenes.length) return null;
                carpetaGuardada = carpetaNueva(id);
                await guardarImagenes(carpetaGuardada, imagenes);
                return carpetaGuardada;
            },
            datosAuditoriaDe(req)
        );

        if (!idPublicacion) {
            return res.status(409).json({
                error: `Ya tiene ${MAXIMO_PUBLICACIONES} publicaciones. Edite una de ellas para cambiar su contenido.`
            });
        }
        res.status(201).json({ mensaje: 'Publicación enviada a revisión correctamente.', idPublicacion });
    } catch (error) {
        await borrarSubida(carpetaGuardada);
        if (error instanceof ErrorImagen) return res.status(400).json({ error: error.message });
        console.error('Error al guardar la publicación:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// PUT /api/publicaciones/:idPublicacion  (Emprendedor dueño)
// body: { titulo?, descripcion, fotos?: [dataURL], conservarFotos?: boolean }
// fotos nuevas reemplazan a las anteriores; sin fotos nuevas: conservarFotos mantiene las que tenía.
export const editarPublicacion = async (req, res) => {
    let carpetaGuardada = null;
    try {
        const emprendimiento = await emprendimientoDelEmprendedor(req, res);
        if (!emprendimiento) return;

        const idPublicacion = Number(req.params.idPublicacion);
        if (!Number.isInteger(idPublicacion) || idPublicacion <= 0) {
            return res.status(400).json({ error: 'Publicación inválida.' });
        }
        const publicacion = await modelPublicacionPropia(idPublicacion, emprendimiento.idEmprendimiento);
        if (!publicacion) return res.status(404).json({ error: 'La publicación no existe o no le pertenece.' });

        const contenido = leerContenido(req.body);
        if (contenido.error) return res.status(400).json({ error: contenido.error });
        const imagenes = validarImagenes(req.body.fotos, MAXIMO_FOTOS);

        let carpetaFotos = null;
        if (imagenes.length) {
            carpetaGuardada = carpetaNueva(idPublicacion);
            await guardarImagenes(carpetaGuardada, imagenes);
            carpetaFotos = carpetaGuardada;
        } else if (req.body.conservarFotos === true) {
            // Las fotos "actuales" son las de la versión en revisión si la hay; si no, las aprobadas
            carpetaFotos = publicacion.EstadoModeracion === 0
                ? publicacion.DirectorioFotosActual
                : publicacion.DirectorioFotosPendiente ?? publicacion.DirectorioFotosActual;
        }

        await modelEditarPublicacion(
            idPublicacion, emprendimiento.idEmprendimiento, contenido.titulo, contenido.descripcion,
            carpetaFotos, datosAuditoriaDe(req)
        );
        res.json({ mensaje: 'Cambios enviados a revisión. Lo aprobado sigue visible hasta que el Ministerio revise la nueva versión.' });
    } catch (error) {
        await borrarSubida(carpetaGuardada);
        if (error instanceof ErrorImagen) return res.status(400).json({ error: error.message });
        console.error('Error al editar la publicación:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// GET /api/publicaciones  (público): todas las aprobadas, para la página "Publicaciones" del menú
export const obtenerTodasLasAprobadas = async (req, res) => {
    try {
        res.json(await conFotos(await modelTodasLasPublicacionesAprobadas()));
    } catch (error) {
        console.error('Error al consultar las publicaciones:', error);
        res.status(500).json({ error: 'Error al consultar las publicaciones.' });
    }
};

// GET /api/publicaciones/:idEmprendimiento  (público): solo contenido aprobado
export const obtenerPublicacionesAprobadas = async (req, res) => {
    const idEmprendimiento = Number(req.params.idEmprendimiento);
    if (!Number.isInteger(idEmprendimiento) || idEmprendimiento <= 0) {
        return res.status(400).json({ error: 'Emprendimiento inválido.' });
    }

    try {
        res.json(await conFotos(await modelPublicacionesAprobadas(idEmprendimiento)));
    } catch (error) {
        console.error('Error al consultar la publicación:', error);
        res.status(500).json({ error: 'Error al consultar la publicación.' });
    }
};

// GET /api/publicaciones/pendientes/todas  (empleado moderador)
export const obtenerPublicacionesPendientes = async (req, res) => {
    if (!esModerador(req)) {
        return res.status(403).json({ error: 'No tiene permiso para moderar publicaciones.' });
    }

    try {
        const pendientes = await modelPublicacionesPendientes();
        res.json(await Promise.all(pendientes.map(async ({ DirectorioFotosPendiente, ...pub }) => ({
            ...pub,
            esEdicion: Boolean(pub.esEdicion),
            fotos: await listarFotos(DirectorioFotosPendiente)
        }))));
    } catch (error) {
        console.error('Error al obtener pendientes:', error);
        res.status(500).json({ error: 'Error al consultar publicaciones pendientes.' });
    }
};

// PUT /api/publicaciones/moderacion/:idPublicacion  (empleado moderador)
// body: { aprobar: true }  o  { aprobar: false, motivoRechazo: '...' }
export const moderarPublicacion = async (req, res) => {
    if (!esModerador(req)) {
        return res.status(403).json({ error: 'No tiene permiso para moderar publicaciones.' });
    }

    const idPublicacion = Number(req.params.idPublicacion);
    if (!Number.isInteger(idPublicacion) || idPublicacion <= 0) {
        return res.status(400).json({ error: 'Publicación inválida.' });
    }

    const aprobar = req.body.aprobar === true;
    const motivoRechazo = String(req.body.motivoRechazo ?? '').trim();
    if (!aprobar && !motivoRechazo) {
        return res.status(400).json({ error: 'Indique el motivo del rechazo.' });
    }
    if (motivoRechazo.length > 512) {
        return res.status(400).json({ error: 'El motivo admite hasta 512 caracteres.' });
    }

    try {
        // El moderador sale del token, no del body
        const idEmpleadoModerador = await modelEmpleadoDeUsuario(req.usuarioLogueado.idUsuario);
        const cambiadas = await modelModerarPublicacion(
            idPublicacion, aprobar, aprobar ? null : motivoRechazo, idEmpleadoModerador, datosAuditoriaDe(req)
        );

        if (cambiadas === 0) {
            return res.status(404).json({ error: 'La publicación no existe o no está pendiente de revisión.' });
        }
        res.json({ mensaje: 'Resolución de moderación procesada exitosamente.' });
    } catch (error) {
        console.error('Error al moderar publicación:', error);
        res.status(500).json({ error: 'Error al moderar publicación.' });
    }
};
