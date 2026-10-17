import {
    modelSolicitudesPendientesMesa,
    modelResolucionesDeEmprendedor,
    modelPublicacionesEnEspera,
    modelClavesVistas,
    modelMarcarVistas
} from '../models/notificacionesModel.js';

// Roles que moderan publicaciones (mismos que en publicacionesController)
const ROLES_MODERADORES = ['Empleado de Area', 'Administrador'];
const URL_PANEL = '/VISTA%20EMPLEADO/Empleado%20view.html';

// Huella corta del contenido: si la misma publicación se aprueba, rechaza o reenvía otra vez
// con otro contenido el mismo día, cuenta como una notificación nueva
const huella = (texto) => {
    let h = 5381;
    for (const c of String(texto ?? '')) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
    return h.toString(36);
};
const fechaISO = (f) => (f instanceof Date ? f.toISOString().slice(0, 10) : String(f));

// Empleado de Mesa: una sola notificación con la cantidad de formularios de inicio sin expediente GED
const notificacionesMesa = async () => {
    const pendientes = await modelSolicitudesPendientesMesa();
    const total = pendientes.length;
    // El id más alto sirve para detectar cuándo llega un formulario nuevo
    const ultimoId = pendientes.reduce((max, s) => Math.max(max, s.idSolicitudInicio), 0);

    const notificaciones = total === 0 ? [] : [{
        tipo: 'sin-expediente',
        titulo: total === 1
            ? 'Hay 1 formulario sin expediente'
            : `Hay ${total} formularios sin expediente`,
        detalle: 'Hacé clic para ir a Carga de Expedientes GED',
        seccion: 'solicitudes-sin-expediente',
        url: URL_PANEL
    }];

    return { total, ultimoId, notificaciones };
};

// Empleado de Área / Administrador: una notificación con las publicaciones que esperan revisión.
// "pendientes" trae una clave por publicación (id + contenido) para avisar cuando llega una nueva.
const notificacionesModerador = async () => {
    const enEspera = await modelPublicacionesEnEspera();
    const total = enEspera.length;

    const notificaciones = total === 0 ? [] : [{
        tipo: 'publicaciones-espera',
        titulo: total === 1
            ? 'Hay 1 publicación para revisar'
            : `Hay ${total} publicaciones para revisar`,
        detalle: 'Hacé clic para ir a Publicaciones en Espera',
        seccion: 'publicaciones-espera',
        url: `${URL_PANEL}#publicaciones-espera`
    }];

    return {
        total,
        pendientes: enEspera.map((p) => `pend-${p.idPublicacion}-${fechaISO(p.FechaSolicitud)}-${huella(`${p.TituloPendiente}|${p.DescripcionPendiente}`)}`),
        notificaciones
    };
};

// Emprendedor: una notificación por cada publicación aprobada o rechazada (últimos 30 días).
// "vista" sale de la tabla NotificacionVista (vale para cualquier computadora).
const notificacionesEmprendedor = async (idUsuario) => {
    const resoluciones = await modelResolucionesDeEmprendedor(idUsuario);

    const notificaciones = resoluciones.map((p) => {
        const aprobada = p.EstadoModeracion === 0;
        const titulo = aprobada ? p.TituloAprobado : (p.TituloPendiente || p.TituloAprobado);
        return {
            clave: `pub-${p.idPublicacion}-${p.EstadoModeracion}-${fechaISO(p.FechaRevision)}-${huella(aprobada ? p.DescripcionActual : `${p.DescripcionPendiente}|${p.MotivoRechazo}`)}`,
            tipo: aprobada ? 'publicacion-aprobada' : 'publicacion-rechazada',
            titulo: aprobada ? `Tu publicación "${titulo}" fue aprobada` : `Tu publicación "${titulo}" fue rechazada`,
            detalle: aprobada ? 'Ya está visible en tu perfil.' : `Motivo: ${p.MotivoRechazo || 'sin especificar'}`,
            fecha: p.FechaRevision,
            url: `/VISTA%20USUARIO/Publicaciones.html#publicacion-${p.idPublicacion}`
        };
    });

    const vistas = await modelClavesVistas(idUsuario, notificaciones.map((n) => n.clave));
    return {
        total: notificaciones.length,
        vistasEnServidor: vistas !== null,
        notificaciones: notificaciones.map((n) => ({ ...n, vista: vistas ? vistas.has(n.clave) : false }))
    };
};

// GET /api/notificaciones
// Devuelve las notificaciones del usuario logueado según su rol.
export const obtenerNotificaciones = async (req, res) => {
    try {
        const { tipoUsuario, idUsuario } = req.usuarioLogueado;

        if (tipoUsuario === 'Empleado de Mesa') return res.json(await notificacionesMesa());
        if (ROLES_MODERADORES.includes(tipoUsuario)) return res.json(await notificacionesModerador());
        if (tipoUsuario === 'Emprendedor') return res.json(await notificacionesEmprendedor(idUsuario));

        res.json({ total: 0, ultimoId: 0, notificaciones: [] });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'No se pudieron obtener las notificaciones.' });
    }
};

// POST /api/notificaciones/vistas  body: { claves: ['pub-2-0-...', ...] }
// Marca notificaciones como vistas para el usuario logueado (queda guardado en la base).
export const marcarNotificacionesVistas = async (req, res) => {
    const { claves } = req.body;
    if (!Array.isArray(claves) || claves.length > 200 ||
        claves.some((c) => typeof c !== 'string' || !c.trim() || c.length > 150)) {
        return res.status(400).json({ error: 'Lista de notificaciones inválida.' });
    }

    try {
        await modelMarcarVistas(req.usuarioLogueado.idUsuario, [...new Set(claves)]);
        res.json({ mensaje: 'Notificaciones marcadas como vistas.' });
    } catch (error) {
        if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_TABLEACCESS_DENIED_ERROR') {
            return res.status(503).json({ error: 'Falta ejecutar database/Notificaciones.sql.' });
        }
        console.error('Error al marcar notificaciones como vistas:', error);
        res.status(500).json({ error: 'No se pudieron marcar las notificaciones.' });
    }
};
