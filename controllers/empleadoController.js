import { ModelObtenerEmpleadosPorCargo } from '../models/empleadoModel.js';

// Cómo quedaría tu controlador definitivo leyendo todo desde el Token:
export const CtrlObtenerEmpleadosPorCargo = async (req, res) => {
    try {
        // Leemos de forma segura el ID que nos demostró el console.log
        const idUsuarioLogueado = req.usuarioLogueado?.idUsuario;

        if (!idUsuarioLogueado) {
            return res.status(401).json({ error: "No se encontró la identificación del usuario en el token." });
        }

        // Llamamos al modelo pasándole solo el ID
        const empleados = await ModelObtenerEmpleadosPorCargo(idUsuarioLogueado);
        
        return res.status(200).json(empleados);
    } catch (error) {
        console.error("Error crítico en CtrlObtenerEmpleadosPorCargo:", error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};