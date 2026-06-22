import { ModelObtenerEtiquetas, ModelActualizarEtiqueta } from '../models/etiquetasModel.js';

export const obtenerEtiquetas = async (req, res) => {
    try {
        const filtroEstado = req.query.estado;

        const idUsuarioLogueado = req.usuarioLogueado.idUsuario;
        const rolUsuario = req.usuarioLogueado.tipoUsuario;

        const ipCliente = req.ip || '127.0.0.1';

        // REGLA DE NEGOCIO EN EL BACKEND:
        // Si es Emprendedor, se le fuerza el filtro a "activas", eliminando acceso a las inactivas.
        if (rolUsuario === 'Emprendedor') {
            filtroEstado = 'activas';
        }

        // 🚀 El controlador le pide los datos al Modelo
        const filas = await ModelObtenerEtiquetas(filtroEstado, idUsuarioLogueado, ipCliente);
        
        // El controlador solo se encarga de responderle a la red
        res.json(filas);
    } catch (error) {
        console.error("Error en controlador de etiquetas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};


export const modificarEtiqueta = async (req, res) => {
    try {
        const idEtiqueta = req.params.id; // Captura el ID desde la ruta /api/etiquetas/:id
        const { nombre, activa } = req.body; // Desestructuramos el JSON recibido

        // Validaciones básicas de seguridad en el servidor antes de tocar la DB
        if (!nombre || nombre.trim() === "" || (activa !== 0 && activa !== 1)) {
            return res.status(400).json({ error: "Datos de entrada inválidos o incompletos." });
        }

        // Datos del payload del JWT y de la red para el Trigger de Auditoría
        const idUsuarioLogueado = req.usuarioLogueado.idUsuario;
        const ipCliente = req.ip || '127.0.0.1';

        // 🚀 El controlador le ordena al modelo ejecutar el cambio
        const resultado = await ModelActualizarEtiqueta(idEtiqueta, nombre.trim(), activa, idUsuarioLogueado, ipCliente);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "La etiqueta especificada no existe en el sistema." });
        }

        res.json({ mensaje: "Etiqueta modificada con éxito." });

    } catch (error) {
        console.error("Error en modificarEtiqueta:", error);
        
        // Manejo específico por si violan el constraint UNIQUE del nombre en MySQL (Error 1062)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Ya existe otra etiqueta registrada con ese mismo nombre." });
        }
        
        res.status(500).json({ error: "Error interno en el servidor al actualizar la etiqueta." });
    }
};