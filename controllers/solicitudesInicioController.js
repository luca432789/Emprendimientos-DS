import { ModelObtenerSinExpediente, ModelAsignarExpediente } from '../models/solicitudesInicioModel.js';

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