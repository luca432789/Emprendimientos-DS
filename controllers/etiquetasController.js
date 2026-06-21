import { ModelObtenerEtiquetas } from '../models/etiquetasModel.js';

export const obtenerEtiquetas = async (req, res) => {
    try {
        const filtroEstado = req.query.estado;

        const idUsuarioLogueado = req.usuarioLogueado.idUsuario;
        const ipCliente = '127.0.0.1';

        // 🚀 El controlador le pide los datos al Modelo
        const filas = await ModelObtenerEtiquetas(filtroEstado, idUsuarioLogueado, ipCliente);
        
        // El controlador solo se encarga de responderle a la red
        res.json(filas);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};