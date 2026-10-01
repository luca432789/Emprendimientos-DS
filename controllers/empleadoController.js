import {
    ModelListarEmpleadosAdministracion,
    ModelObtenerEmpleadosPorCargo,
    ModelRegistrarEmpleado
} from '../models/empleadoModel.js';

const cargosEmpleado = ['Mesa de Entrada', 'Técnico', 'Social', 'Administrador'];

export const CtrlListarEmpleadosAdministracion = async (req, res) => {
    if (req.usuarioLogueado?.tipoUsuario !== 'Administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede consultar el listado de empleados.' });
    }

    try {
        const empleados = await ModelListarEmpleadosAdministracion();
        return res.status(200).json(empleados);
    } catch (error) {
        console.error('Error al listar empleados para administración:', error);
        return res.status(500).json({ error: 'No se pudo obtener el listado de empleados.' });
    }
};

export const CtrlRegistrarEmpleado = async (req, res) => {
    if (req.usuarioLogueado?.tipoUsuario !== 'Administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede registrar empleados.' });
    }

    const campos = ['nombre', 'apellido', 'dni', 'domicilio', 'telefono', 'correo', 'cargo'];
    const datosEmpleado = {};

    for (const campo of campos) {
        if (typeof req.body[campo] !== 'string' || !req.body[campo].trim()) {
            return res.status(400).json({ error: `El campo ${campo} es obligatorio.` });
        }
        datosEmpleado[campo] = req.body[campo].trim();
    }

    const longitudesMaximas = {
        nombre: 30,
        apellido: 30,
        dni: 15,
        domicilio: 512,
        telefono: 25,
        correo: 150,
        cargo: 25
    };

    for (const [campo, longitud] of Object.entries(longitudesMaximas)) {
        if (datosEmpleado[campo].length > longitud) {
            return res.status(400).json({ error: `El campo ${campo} supera el máximo de ${longitud} caracteres.` });
        }
    }

    if (!/^\S+@\S+\.\S+$/.test(datosEmpleado.correo)) {
        return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
    }

    if (!cargosEmpleado.includes(datosEmpleado.cargo)) {
        return res.status(400).json({ error: 'El cargo seleccionado no es válido.' });
    }

    datosEmpleado.activo = req.body.activo === false ? 0 : 1;

    try {
        const idEmpleado = await ModelRegistrarEmpleado(datosEmpleado, {
            idUsuario: req.usuarioLogueado.idUsuario,
            ipCliente: req.ip || req.socket.remoteAddress || '127.0.0.1'
        });

        return res.status(201).json({
            mensaje: 'El empleado fue registrado correctamente.',
            idEmpleado
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un empleado registrado con ese DNI o correo electrónico.' });
        }

        console.error('Error al registrar empleado:', error);
        return res.status(500).json({ error: 'Error interno al registrar el empleado.' });
    }
};

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