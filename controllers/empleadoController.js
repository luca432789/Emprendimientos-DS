import {
    ModelContarEmpleadosAdministracion,
    ModelActualizarEmpleadoAdministracion,
    ModelListarEmpleadosAdministracion,
    ModelObtenerEquipoRevision,
    ModelObtenerEmpleadosPorCargo,
    ModelRegistrarEmpleado
} from '../models/empleadoModel.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

const cargosEmpleado = ['Mesa de Entrada', 'Técnico', 'Social', 'Administrador'];

export const CtrlListarEmpleadosAdministracion = async (req, res) => {
    if (req.usuarioLogueado?.tipoUsuario !== 'Administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede consultar el listado de empleados.' });
    }

    const paginaSolicitada = Number(req.query.page ?? 1);
    const cargosPermitidos = cargosEmpleado;
    const tiposCuentaPermitidos = ['Empleado de Mesa', 'Empleado de Area', 'Administrador', 'Sin cuenta'];
    const { cargo, estado, tipoCuenta, buscar, dni, orden } = req.query;

    if (!Number.isInteger(paginaSolicitada) || paginaSolicitada < 1) {
        return res.status(400).json({ error: 'El número de página debe ser un entero positivo.' });
    }
    if (cargo && !cargosPermitidos.includes(cargo)) {
        return res.status(400).json({ error: 'El cargo seleccionado no es válido.' });
    }
    if (estado !== undefined && !['0', '1'].includes(estado)) {
        return res.status(400).json({ error: 'El estado laboral seleccionado no es válido.' });
    }
    if (tipoCuenta && !tiposCuentaPermitidos.includes(tipoCuenta)) {
        return res.status(400).json({ error: 'El tipo de cuenta seleccionado no es válido.' });
    }
    if (orden !== undefined && !['asc', 'desc'].includes(orden)) {
        return res.status(400).json({ error: 'El orden por nombre no es válido.' });
    }
    if ((typeof buscar === 'string' && buscar.trim().length > 100) || (typeof dni === 'string' && dni.trim().length > 15)) {
        return res.status(400).json({ error: 'La búsqueda supera la longitud permitida.' });
    }

    const filtros = {
        cargo: cargo || null,
        activo: estado === undefined ? null : Number(estado),
        tipoCuenta: tipoCuenta || null,
        buscar: typeof buscar === 'string' ? buscar.trim() || null : null,
        dni: typeof dni === 'string' ? dni.trim() || null : null,
        orden: orden || 'asc'
    };

    try {
        const registrosPorPagina = 10;
        const totalRegistros = await ModelContarEmpleadosAdministracion(filtros);
        const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
        const pagina = totalPaginas === 0 ? 1 : Math.min(paginaSolicitada, totalPaginas);
        const offset = (pagina - 1) * registrosPorPagina;
        const empleados = await ModelListarEmpleadosAdministracion(filtros, registrosPorPagina, offset);

        return res.status(200).json({
            empleados,
            pagina,
            totalPaginas,
            totalRegistros,
            registrosPorPagina,
            orden: filtros.orden
        });
    } catch (error) {
        console.error('Error al listar empleados para administración:', error);
        return res.status(500).json({ error: 'No se pudo obtener el listado de empleados.' });
    }
};

export const CtrlActualizarEmpleadoAdministracion = async (req, res) => {
    if (req.usuarioLogueado?.tipoUsuario !== 'Administrador') {
        return res.status(403).json({ error: 'Solo un administrador puede editar datos de empleados.' });
    }

    const idEmpleado = Number(req.params.id);
    if (!Number.isInteger(idEmpleado) || idEmpleado < 1) {
        return res.status(400).json({ error: 'El identificador del empleado no es válido.' });
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
        correo: 150
    };
    for (const [campo, longitud] of Object.entries(longitudesMaximas)) {
        if (datosEmpleado[campo].length > longitud) {
            return res.status(400).json({ error: `El campo ${campo} supera el máximo de ${longitud} caracteres.` });
        }
    }

    if (!/^\d+$/.test(datosEmpleado.telefono)) {
        return res.status(400).json({ error: 'El teléfono solo puede contener números.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(datosEmpleado.correo)) {
        return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
    }
    if (!cargosEmpleado.includes(datosEmpleado.cargo)) {
        return res.status(400).json({ error: 'El cargo seleccionado no es válido.' });
    }
    if (req.body.activo !== 0 && req.body.activo !== 1) {
        return res.status(400).json({ error: 'El estado activo debe ser 1 o 0.' });
    }
    datosEmpleado.activo = req.body.activo;

    try {
        const resultado = await ModelActualizarEmpleadoAdministracion(idEmpleado, datosEmpleado, {
            idUsuario: req.usuarioLogueado.idUsuario,
            ipCliente: obtenerIpCliente(req)
        });

        const mensajes = ['Datos del empleado actualizados correctamente.'];
        if (resultado.cuentaWebActualizada) {
            mensajes.push(`El correo y el tipo de cuenta se sincronizaron (${resultado.tipoUsuarioNuevo}).`);
            if (datosEmpleado.activo === 0) {
                mensajes.push('La cuenta web fue desactivada junto con el empleado.');
            }
            if (datosEmpleado.activo === 1) {
                mensajes.push('La cuenta web conservó su estado actual; si estaba inactiva, debe reactivarse manualmente.');
            }
        }

        return res.status(200).json({ mensaje: mensajes.join(' ') });
    } catch (error) {
        if (error.code === 'EMPLOYEE_NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'MULTIPLE_USER_ACCOUNTS') {
            return res.status(409).json({ error: error.message });
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El DNI o el correo ya está registrado para otra persona.' });
        }

        console.error('Error al actualizar empleado:', error);
        return res.status(500).json({ error: 'No se pudieron actualizar los datos del empleado.' });
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

    if (!/^\d+$/.test(datosEmpleado.telefono)) {
        return res.status(400).json({ error: 'El teléfono solo puede contener números.' });
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
            ipCliente: obtenerIpCliente(req)
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
        const idUsuarioLogueado = req.usuarioLogueado?.idUsuario;

        if (!idUsuarioLogueado) {
            return res.status(401).json({ error: "No se encontró la identificación del usuario en el token." });
        }

        const empleados = await ModelObtenerEmpleadosPorCargo(idUsuarioLogueado);
        return res.status(200).json(empleados);
    } catch (error) {
        if (error.code === 'INACTIVE_REVIEWER' || error.code === 'REVIEWER_ROLE_NOT_ALLOWED' || error.code === 'EMPLOYEE_ACCOUNT_REQUIRED') {
            return res.status(403).json({ error: error.message });
        }
        console.error("Error crítico en CtrlObtenerEmpleadosPorCargo:", error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

export const CtrlObtenerEquipoRevision = async (req, res) => {
    const idUsuarioLogueado = req.usuarioLogueado?.idUsuario;
    if (!idUsuarioLogueado) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    try {
        const equipo = await ModelObtenerEquipoRevision(idUsuarioLogueado);
        return res.status(200).json(equipo);
    } catch (error) {
        if (error.code === 'INACTIVE_REVIEWER' || error.code === 'REVIEWER_ROLE_NOT_ALLOWED' || error.code === 'EMPLOYEE_ACCOUNT_REQUIRED') {
            return res.status(403).json({ error: error.message });
        }
        console.error('Error al obtener el equipo de revisión:', error);
        return res.status(500).json({ error: 'No se pudo obtener el equipo revisor.' });
    }
};