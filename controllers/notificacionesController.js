import { modelSolicitudesPendientesMesa } from '../models/notificacionesModel.js';

// GET /api/notificaciones
// Devuelve las notificaciones del usuario logueado según su rol.
// Por ahora: Empleado de Mesa -> una sola notificación con la cantidad de
// formularios de inicio que todavía no tienen expediente GED.
export const obtenerNotificaciones = async (req, res) => {
    try {
        const { tipoUsuario } = req.usuarioLogueado;

        if (tipoUsuario !== 'Empleado de Mesa') {
            return res.json({ total: 0, ultimoId: 0, notificaciones: [] });
        }

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

        res.json({ total, ultimoId, notificaciones });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'No se pudieron obtener las notificaciones.' });
    }
};
