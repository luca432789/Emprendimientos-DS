import {
    modelSolicitudesPendientesMesa,
    modelResolucionesDeEmprendedor,
    modelPublicacionesEnEspera,
    modelClavesVistas,
    modelMarcarVistas
} from '../models/notificacionesModel.js';
import { ModelObtenerSolicitudesParaArea, ModelListarRevisionesAsignadas } from '../models/solicitudesInicioModel.js';
import { modelAyudasSinRevisar } from '../models/ayudasModel.js';

// Roles que moderan publicaciones (mismos que en publicacionesController)
const ROLES_MODERADORES = ['Empleado de Area', 'Administrador'];
const URL_PANEL = '/Empleado';

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

// Solicitudes de inicio en revisión asignadas al empleado (las mismas de "En revisión - Inicio").
// Si la cuenta no puede revisar (cargo o rol no habilitado) no tiene ninguna.
const revisionesAsignadas = async (idUsuario) => {
    try {
        return (await ModelListarRevisionesAsignadas(idUsuario)).solicitudes;
    } catch (error) {
        if (error.code === 'REVIEWER_NOT_ACTIVE' || error.code === 'REVIEWER_ROLE_INVALID') return [];
        throw error;
    }
};

// Empleado de Área / Administrador: una notificación por cada cosa que espera revisión
// (solicitudes de inicio, subsidios, créditos, publicaciones y las solicitudes en revisión
// que tiene asignadas), con su contador.
// "pendientes" trae una clave por elemento para avisar cuando llega uno nuevo.
const notificacionesModerador = async (idUsuario) => {
    const [inicios, subsidios, creditos, publicaciones, enRevision] = await Promise.all([
        ModelObtenerSolicitudesParaArea(),
        modelAyudasSinRevisar('subsidio'),
        modelAyudasSinRevisar('credito'),
        modelPublicacionesEnEspera(),
        revisionesAsignadas(idUsuario)
    ]);

    const categorias = [
        { seccion: 'inicio-sin-revisar', nombre: 'Solicitudes de Inicio', singular: 'solicitud de inicio sin revisar', plural: 'solicitudes de inicio sin revisar',
          claves: inicios.map((s) => `ini-${s.idSolicitudInicio}`) },
        { seccion: 'subsidio-sin-revisar', nombre: 'Solicitudes de Subsidio', singular: 'solicitud de subsidio sin revisar', plural: 'solicitudes de subsidio sin revisar',
          claves: subsidios.map((s) => `sub-${s.id}`) },
        { seccion: 'creditos-sin-revisar', nombre: 'Solicitudes de Créditos', singular: 'solicitud de crédito sin revisar', plural: 'solicitudes de crédito sin revisar',
          claves: creditos.map((c) => `cre-${c.id}`) },
        { seccion: 'inicio-en-revision', nombre: 'En Revisión - Inicio', singular: 'solicitud de inicio en revisión', plural: 'solicitudes de inicio en revisión',
          claves: enRevision.map((s) => `rev-${s.idSolicitudInicio}`) },
        { seccion: 'publicaciones-espera', nombre: 'Publicaciones en Espera', singular: 'publicación para revisar', plural: 'publicaciones para revisar',
          claves: publicaciones.map((p) => `pend-${p.idPublicacion}-${fechaISO(p.FechaSolicitud)}-${huella(`${p.TituloPendiente}|${p.DescripcionPendiente}`)}`) }
    ];

    const notificaciones = categorias.filter((c) => c.claves.length).map((c) => ({
        tipo: c.seccion,
        titulo: `Hay ${c.claves.length} ${c.claves.length === 1 ? c.singular : c.plural}`,
        detalle: `Hacé clic para ir a ${c.nombre}`,
        seccion: c.seccion,
        url: `${URL_PANEL}#${c.seccion}`
    }));

    return {
        total: categorias.reduce((suma, c) => suma + c.claves.length, 0),
        contadores: Object.fromEntries(categorias.map((c) => [c.seccion, c.claves.length])),
        pendientes: categorias.flatMap((c) => c.claves),
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
            url: `/Emprendedor-Publicaciones#publicacion-${p.idPublicacion}`
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
        if (ROLES_MODERADORES.includes(tipoUsuario)) return res.json(await notificacionesModerador(idUsuario));
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
