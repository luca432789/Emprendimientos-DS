import {
    ModelBuscarUsuariosAuditoria,
    ModelContarRegistrosAuditoria,
    ModelListarAccionesAuditoria,
    ModelListarAuditoria
} from '../models/auditoriaModel.js';

const REGISTROS_POR_PAGINA = 10;
const ROLES_FILTRO = ['Emprendedor', 'Empleado de Mesa', 'Empleado de Area', 'Administrador'];

const fechaValida = (valor) => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

const esAdministrador = (req) => req.usuarioLogueado?.tipoUsuario === 'Administrador';

export const obtenerOpcionesAuditoria = async (req, res) => {
    if (!esAdministrador(req)) {
        return res.status(403).json({ error: 'Solo los administradores pueden consultar la auditoría.' });
    }

    try {
        const acciones = await ModelListarAccionesAuditoria();
        return res.status(200).json({ acciones });
    } catch (error) {
        console.error('Error al obtener opciones de auditoría:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las opciones del historial.' });
    }
};

export const buscarUsuariosAuditoria = async (req, res) => {
    if (!esAdministrador(req)) {
        return res.status(403).json({ error: 'Solo los administradores pueden consultar la auditoría.' });
    }

    const { tipoUsuario, buscar } = req.query;
    const termino = typeof buscar === 'string' ? buscar.trim() : '';

    if (!ROLES_FILTRO.includes(tipoUsuario)) {
        return res.status(400).json({ error: 'Selecciona un tipo de usuario válido.' });
    }
    if (termino.length < 2 || termino.length > 100) {
        return res.status(400).json({ error: 'La búsqueda debe tener entre 2 y 100 caracteres.' });
    }

    try {
        const usuarios = await ModelBuscarUsuariosAuditoria(tipoUsuario, termino);
        return res.status(200).json({ usuarios });
    } catch (error) {
        console.error('Error al buscar usuarios de auditoría:', error);
        return res.status(500).json({ error: 'No se pudo buscar usuarios.' });
    }
};

export const obtenerAuditoria = async (req, res) => {
    if (!esAdministrador(req)) {
        return res.status(403).json({ error: 'Solo los administradores pueden consultar la auditoría.' });
    }

    const paginaSolicitada = Number(req.query.page ?? 1);
    if (!Number.isInteger(paginaSolicitada) || paginaSolicitada < 1) {
        return res.status(400).json({ error: 'El número de página debe ser un entero positivo.' });
    }

    const { desde, hasta, tipoUsuario, idUsuario, accion } = req.query;
    if (desde && !fechaValida(desde)) {
        return res.status(400).json({ error: 'La fecha inicial no es válida.' });
    }
    if (hasta && !fechaValida(hasta)) {
        return res.status(400).json({ error: 'La fecha final no es válida.' });
    }
    if (desde && hasta && desde > hasta) {
        return res.status(400).json({ error: 'La fecha inicial no puede ser posterior a la fecha final.' });
    }
    if (tipoUsuario && !ROLES_FILTRO.includes(tipoUsuario)) {
        return res.status(400).json({ error: 'El tipo de usuario seleccionado no es válido.' });
    }
    if (idUsuario && (!/^\d+$/.test(idUsuario) || Number(idUsuario) < 1)) {
        return res.status(400).json({ error: 'El usuario seleccionado no es válido.' });
    }
    if (accion && (typeof accion !== 'string' || accion.length > 30)) {
        return res.status(400).json({ error: 'La acción seleccionada no es válida.' });
    }

    let hastaExclusiva;
    if (hasta) {
        const fechaFinal = new Date(`${hasta}T00:00:00.000Z`);
        fechaFinal.setUTCDate(fechaFinal.getUTCDate() + 1);
        hastaExclusiva = fechaFinal.toISOString().slice(0, 10);
    }

    const filtros = {
        desde: desde || null,
        hastaExclusiva: hastaExclusiva || null,
        tipoUsuario: tipoUsuario || null,
        idUsuario: idUsuario ? Number(idUsuario) : null,
        accion: accion || null
    };

    try {
        const total = await ModelContarRegistrosAuditoria(filtros);
        const totalPaginas = Math.ceil(total / REGISTROS_POR_PAGINA);
        const pagina = totalPaginas === 0 ? 1 : Math.min(paginaSolicitada, totalPaginas);
        const offset = (pagina - 1) * REGISTROS_POR_PAGINA;
        const registros = await ModelListarAuditoria(REGISTROS_POR_PAGINA, offset, filtros);

        return res.status(200).json({
            registros,
            pagina,
            totalPaginas,
            totalRegistros: total,
            registrosPorPagina: REGISTROS_POR_PAGINA
        });
    } catch (error) {
        console.error('Error al consultar la auditoría:', error);
        return res.status(500).json({ error: 'No se pudo cargar el historial de auditoría.' });
    }
};