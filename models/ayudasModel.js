import { pool } from '../config/db.js';

// Pedidos de Subsidio / Crédito que todavía no revisó nadie del área
// (sin resolución y sin empleado revisor asignado)
const TABLAS = {
    subsidio: { tabla: 'Subsidio', id: 'idSubsidio', path: 'PathFormularioSub' },
    credito: { tabla: 'Credito', id: 'idCredito', path: 'PathFormularioCredito' }
};

export const TIPOS_AYUDA = Object.keys(TABLAS);

export const modelAyudasSinRevisar = async (tipo) => {
    const { tabla, id, path } = TABLAS[tipo];
    const [filas] = await pool.query(`
        SELECT a.${id} AS id, a.idSolicitudInicio, a.monto, a.FechaRecibido, a.${path} AS DireccionPDF,
               e.Nombre AS Emprendimiento,
               TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)) AS Solicitante
        FROM ${tabla} a
        LEFT JOIN Emprendimiento e ON e.idSolicitudInicio = a.idSolicitudInicio
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = a.idSolicitudInicio
        WHERE a.Aprobado IS NULL AND a.idEmpleadoRevisor IS NULL
        ORDER BY a.FechaRecibido, a.${id};
    `);
    return filas;
};
