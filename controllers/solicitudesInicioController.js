import { ModelIniciarRevisionSolicitud } from '../models/empleadoModel.js';
import {
    ModelListarRevisionesAsignadas,
    ModelObtenerSinExpediente,
    ModelAsignarExpediente,
    ModelResolverRevisionArea,
    ModelRegistrarEnvioMinistro,
    ModelRegistrarResolucionMinistro
} from '../models/solicitudesInicioModel.js';

const responderErrorEtapaMinistro = (res, error, mensajeGenerico) => {
    if (['REVIEWER_NOT_ACTIVE', 'REVIEWER_ROLE_INVALID', 'REVIEW_NOT_ASSIGNED'].includes(error.code)) {
        return res.status(403).json({ error: error.message });
    }
    if (error.code === 'REVIEW_REQUEST_NOT_FOUND') {
        return res.status(404).json({ error: error.message });
    }
    if (['MINISTER_STAGE_INVALID', 'MINISTER_ALREADY_SENT', 'MINISTER_NOT_SENT', 'MINISTER_ALREADY_RESOLVED'].includes(error.code)) {
        return res.status(409).json({ error: error.message });
    }

    console.error(mensajeGenerico, error);
    return res.status(500).json({ error: mensajeGenerico });
};

export const registrarEnvioMinistro = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    try {
        await ModelRegistrarEnvioMinistro(idSolicitud, idUsuario, req.ip || req.socket.remoteAddress || '127.0.0.1');
        return res.status(200).json({ mensaje: 'Se registró el envío de la solicitud al Ministro.' });
    } catch (error) {
        return responderErrorEtapaMinistro(res, error, 'No se pudo registrar el envío al Ministro.');
    }
};

export const registrarResolucionMinistro = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    const aprobacionMinistro = req.body.aprobacionMinistro;
    if (aprobacionMinistro !== 0 && aprobacionMinistro !== 1) {
        return res.status(400).json({ error: 'Selecciona si el Ministro aprobó o rechazó la solicitud.' });
    }

    try {
        await ModelRegistrarResolucionMinistro(
            idSolicitud,
            idUsuario,
            aprobacionMinistro,
            req.ip || req.socket.remoteAddress || '127.0.0.1'
        );
        return res.status(200).json({
            mensaje: aprobacionMinistro === 1
                ? 'Se registró la aprobación del Ministro.'
                : 'Se registró el rechazo del Ministro.'
        });
    } catch (error) {
        return responderErrorEtapaMinistro(res, error, 'No se pudo registrar la resolución del Ministro.');
    }
};

export const obtenerRevisionesAsignadas = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const departamento = typeof req.query.departamento === 'string' ? req.query.departamento.trim() : '';
    if (departamento.length > 20) {
        return res.status(400).json({ error: 'El departamento excede la longitud permitida.' });
    }

    try {
        const resultado = await ModelListarRevisionesAsignadas(idUsuario, departamento || null);
        return res.status(200).json(resultado);
    } catch (error) {
        if (error.code === 'REVIEWER_NOT_ACTIVE' || error.code === 'REVIEWER_ROLE_INVALID') {
            return res.status(403).json({ error: error.message });
        }
        console.error('Error al obtener revisiones asignadas:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las revisiones asignadas.' });
    }
};

export const resolverRevisionArea = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    const aprobacionArea = req.body.aprobacionArea;
    if (aprobacionArea !== 0 && aprobacionArea !== 1) {
        return res.status(400).json({ error: 'Selecciona aprobar o rechazar la solicitud.' });
    }

    let latitud = null;
    let longitud = null;
    if (aprobacionArea === 1) {
        latitud = Number(req.body.latitud);
        longitud = Number(req.body.longitud);
        if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
            return res.status(400).json({ error: 'La latitud debe ser un número entre -90 y 90.' });
        }
        if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
            return res.status(400).json({ error: 'La longitud debe ser un número entre -180 y 180.' });
        }
    }

    try {
        await ModelResolverRevisionArea(
            idSolicitud,
            idUsuario,
            aprobacionArea,
            latitud,
            longitud,
            req.ip || req.socket.remoteAddress || '127.0.0.1'
        );

        return res.status(200).json({
            mensaje: aprobacionArea === 1
                ? 'El Área aprobó la solicitud y guardó sus coordenadas. Quedó pendiente la etapa del Ministro.'
                : 'El Área rechazó la solicitud y la revisión quedó finalizada.'
        });
    } catch (error) {
        if (error.code === 'REVIEWER_NOT_ACTIVE' || error.code === 'REVIEWER_ROLE_INVALID' || error.code === 'REVIEW_NOT_ASSIGNED') {
            return res.status(403).json({ error: error.message });
        }
        if (error.code === 'REVIEW_REQUEST_NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'REVIEW_ALREADY_RESOLVED') {
            return res.status(409).json({ error: error.message });
        }
        if (error.code === 'REVIEW_DATA_NOT_FOUND') {
            return res.status(409).json({ error: error.message });
        }
        if (error.code === 'ER_SIGNAL_EXCEPTION') {
            return res.status(409).json({
                error: 'La base de datos todavía bloquea los cambios de coordenadas. Ejecuta la migración de coordenadas de revisión del Área.'
            });
        }
        if (error.code === 'ER_SIGNAL_EXCEPTION') {
            return res.status(409).json({
                error: 'La base de datos aún no permite la actualización controlada de coordenadas. Ejecute la migración de revisión del Área.'
            });
        }

        console.error('Error al resolver revisión del Área:', error);
        return res.status(500).json({ error: 'No se pudo guardar la decisión del Área.' });
    }
};

export const iniciarRevisionArea = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }
    if (!['Empleado de Area', 'Administrador'].includes(req.usuarioLogueado.tipoUsuario)) {
        return res.status(403).json({ error: 'Solo empleados del Área y administradores pueden iniciar revisiones.' });
    }

    const idSolicitud = Number(req.params.id);
    const idEmpleadoCompañero = Number(req.body.idEmpleadoCompañero);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1 || !Number.isInteger(idEmpleadoCompañero) || idEmpleadoCompañero < 1) {
        return res.status(400).json({ error: 'La solicitud y el empleado compañero deben ser identificadores válidos.' });
    }

    try {
        const revisores = await ModelIniciarRevisionSolicitud(
            idSolicitud,
            idUsuario,
            idEmpleadoCompañero,
            req.ip || req.socket.remoteAddress || '127.0.0.1'
        );

        return res.status(200).json({
            mensaje: 'La revisión fue iniciada y ambos revisores quedaron asignados.',
            ...revisores
        });
    } catch (error) {
        if (error.code === 'INACTIVE_REVIEWER' || error.code === 'REVIEWER_ROLE_NOT_ALLOWED') {
            return res.status(403).json({ error: error.message });
        }
        if (error.code === 'INVALID_REVIEW_PARTNER') {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === 'REVIEW_REQUEST_NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'REVIEW_ALREADY_STARTED') {
            return res.status(409).json({ error: error.message });
        }

        console.error('Error al iniciar revisión de solicitud:', error);
        return res.status(500).json({ error: 'No se pudo iniciar la revisión.' });
    }
};

export const obtenerSinExpediente = async (req, res) => {
    try {
        const solicitudes = await ModelObtenerSinExpediente();
        res.json(solicitudes);
    } catch (error) {
        console.error("Error en obtenerSinExpediente:", error.message);
        res.status(500).json({ error: "Error interno al recuperar las solicitudes." });
    }
};

export const asignarExpedienteGED = async (req, res) => {
    const { id } = req.params;
    const { nroExpediente } = req.body;
    
    // Datos inyectados automáticamente por tu middleware de login
    const idUsuario = req.usuarioLogueado.idUsuario || req.usuarioLogueado.id; 
    const ipCliente = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!nroExpediente) {
        return res.status(400).json({ error: "El número de expediente GED es obligatorio." });
    }

    try {
        
        const resultado = await ModelAsignarExpediente(id, nroExpediente, idUsuario, ipCliente);
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "La solicitud no existe." });
        }

        res.json({ mensaje: "Expediente asignado y registrado en auditoría con éxito." });
    } catch (error) {
        console.error("Error en asignarExpedienteGED:", error.message);
        res.status(500).json({ error: "Error interno al actualizar el expediente." });
    }
};

////////////////////////////////////////////////////////////
// Controlador para empleador area
import { ModelObtenerSolicitudesParaArea } from '../models/solicitudesInicioModel.js';

export const obtenerSolicitudesArea = async (req, res) => {
    try {
        // Como es un SELECT puro, recordá que no hace falta setear variables de auditoría @usuario_id
        const solicitudes = await ModelObtenerSolicitudesParaArea();
        res.json(solicitudes);
    } catch (error) {
        console.error("Error en obtenerSolicitudesArea:", error.message);
        res.status(500).json({ error: "Error interno al recuperar las solicitudes para el Área Técnica." });
    }
};