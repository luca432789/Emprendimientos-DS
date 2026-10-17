import { modelSolicitudesPendientesMesa, modelResolucionesDeEmprendedor } from '../models/notificacionesModel.js';

// Huella corta del contenido: si la misma publicación se aprueba o rechaza otra vez
// con otro contenido el mismo día, cuenta como una notificación nueva
const huella = (texto) => {
    let h = 5381;
    for (const c of String(texto ?? '')) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
    return h.toString(36);
};

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
        url: '/VISTA%20EMPLEADO/Empleado%20view.html'
    }];

    return { total, ultimoId, notificaciones };
};

// Emprendedor: una notificación por cada publicación aprobada o rechazada (últimos 30 días).
// Cuáles ya vio lo recuerda el navegador con la "clave" de cada notificación.
const notificacionesEmprendedor = async (idUsuario) => {
    const resoluciones = await modelResolucionesDeEmprendedor(idUsuario);

    const notificaciones = resoluciones.map((p) => {
        const aprobada = p.EstadoModeracion === 0;
        const titulo = aprobada ? p.TituloAprobado : (p.TituloPendiente || p.TituloAprobado);
        const fecha = p.FechaRevision instanceof Date ? p.FechaRevision.toISOString().slice(0, 10) : String(p.FechaRevision);
        return {
            clave: `pub-${p.idPublicacion}-${p.EstadoModeracion}-${fecha}-${huella(aprobada ? p.DescripcionActual : `${p.DescripcionPendiente}|${p.MotivoRechazo}`)}`,
            tipo: aprobada ? 'publicacion-aprobada' : 'publicacion-rechazada',
            titulo: aprobada ? `Tu publicación "${titulo}" fue aprobada` : `Tu publicación "${titulo}" fue rechazada`,
            detalle: aprobada ? 'Ya está visible en tu perfil.' : `Motivo: ${p.MotivoRechazo || 'sin especificar'}`,
            fecha: p.FechaRevision,
            url: `/VISTA%20USUARIO/Publicaciones.html#publicacion-${p.idPublicacion}`
        };
    });

    return { total: notificaciones.length, notificaciones };
};

// GET /api/notificaciones
// Devuelve las notificaciones del usuario logueado según su rol.
export const obtenerNotificaciones = async (req, res) => {
    try {
        const { tipoUsuario, idUsuario } = req.usuarioLogueado;

        if (tipoUsuario === 'Empleado de Mesa') return res.json(await notificacionesMesa());
        if (tipoUsuario === 'Emprendedor') return res.json(await notificacionesEmprendedor(idUsuario));

        res.json({ total: 0, ultimoId: 0, notificaciones: [] });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'No se pudieron obtener las notificaciones.' });
    }
};
