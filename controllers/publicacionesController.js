import {
    modelEmprendimientoDeUsuario,
    modelEmpleadoDeUsuario,
    modelGuardarPublicacionPendiente,
    modelPublicacionDeEmprendimiento,
    modelPublicacionesAprobadas,
    modelPublicacionesPendientes,
    modelModerarPublicacion
} from '../models/publicacionesModel.js';

// Roles que pueden aprobar o rechazar publicaciones
const ROLES_MODERADORES = ['Empleado de Area', 'Administrador'];

const TITULO_POR_DEFECTO = 'Novedades del Emprendimiento';
const datosAuditoriaDe = (req) => ({
    idUsuario: req.usuarioLogueado.idUsuario,
    ipCliente: req.ip || '127.0.0.1'
});

const esModerador = (req) => ROLES_MODERADORES.includes(req.usuarioLogueado?.tipoUsuario);

// POST /api/publicaciones  (Emprendedor logueado)
// La publicación se guarda en las columnas "Pendiente" hasta que un empleado la apruebe.
export const crearPublicacion = async (req, res) => {
    try {
        if (req.usuarioLogueado.tipoUsuario !== 'Emprendedor') {
            return res.status(403).json({ error: 'Solo un emprendedor puede publicar.' });
        }

        const emprendimiento = await modelEmprendimientoDeUsuario(req.usuarioLogueado.idUsuario);
        if (!emprendimiento) {
            return res.status(404).json({ error: 'Su usuario no tiene un emprendimiento asociado.' });
        }

        const titulo = String(req.body.titulo ?? '').trim() || TITULO_POR_DEFECTO;
        const descripcion = String(req.body.descripcion ?? '').trim();
        if (!descripcion) {
            return res.status(400).json({ error: 'Escriba el texto de la publicación.' });
        }
        if (titulo.length > 150) {
            return res.status(400).json({ error: 'El título admite hasta 150 caracteres.' });
        }
        if (descripcion.length > 5000) {
            return res.status(400).json({ error: 'La publicación admite hasta 5000 caracteres.' });
        }

        // La subida de fotos todavía no está implementada: no se guarda ninguna ruta de foto
        const idPublicacion = await modelGuardarPublicacionPendiente(
            emprendimiento.idEmprendimiento, titulo, descripcion, null, datosAuditoriaDe(req)
        );

        res.status(201).json({ mensaje: 'Publicación enviada a revisión correctamente.', idPublicacion });
    } catch (error) {
        console.error('Error al guardar la publicación:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// GET /api/publicaciones/mias  (Emprendedor logueado)
// Datos del perfil (nombre y rubro) + publicación aprobada + estado de la que está en revisión
export const obtenerMisPublicaciones = async (req, res) => {
    try {
        if (req.usuarioLogueado.tipoUsuario !== 'Emprendedor') {
            return res.status(403).json({ error: 'Solo disponible para emprendedores.' });
        }

        const emprendimiento = await modelEmprendimientoDeUsuario(req.usuarioLogueado.idUsuario);
        if (!emprendimiento) {
            return res.status(404).json({ error: 'Su usuario no tiene un emprendimiento asociado.' });
        }

        const publicaciones = await modelPublicacionDeEmprendimiento(emprendimiento.idEmprendimiento);
        res.json({ emprendimiento, publicaciones });
    } catch (error) {
        console.error('Error al obtener las publicaciones del emprendedor:', error);
        res.status(500).json({ error: 'Error al consultar sus publicaciones.' });
    }
};

// GET /api/publicaciones/:idEmprendimiento  (público): solo contenido aprobado
export const obtenerPublicacionesAprobadas = async (req, res) => {
    const idEmprendimiento = Number(req.params.idEmprendimiento);
    if (!Number.isInteger(idEmprendimiento) || idEmprendimiento <= 0) {
        return res.status(400).json({ error: 'Emprendimiento inválido.' });
    }

    try {
        res.json(await modelPublicacionesAprobadas(idEmprendimiento));
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
        res.json(await modelPublicacionesPendientes());
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
