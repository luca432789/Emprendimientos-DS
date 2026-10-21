import { pool } from '../config/db.js';

// Solo las columnas que necesita el mapa (sin NroProyecto, idSolicitudInicio, etc.)
// El JOIN con Rubro trae el nombre del rubro para el filtro, los popups y las tarjetas.
const SQL_EMPRENDIMIENTOS = [
    'SELECT e.idEmprendimiento,',
    '       e.Nombre,',
    '       e.Calle,',
    '       e.`NúmeroCalle` AS NumeroCalle,',
    '       e.Barrio,',
    '       e.Departamento,',
    '       e.Localidad,',
    '       e.EnMarcha,',
    '       e.ActividadPrincipal,',
    '       e.Latitud,',
    '       e.Longitud,',
    '       e.idRubro,',
    '       r.Nombre AS Rubro,',
    '       r.IconoMapa',
    '  FROM Emprendimiento e',
    '  JOIN Rubro r ON r.idRubro = e.idRubro',
    ' ORDER BY e.Nombre'
].join('\n');

export const obtenerEmprendimientosMapa = async () => {
    const [rows] = await pool.query(SQL_EMPRENDIMIENTOS);
    return rows;
};

// Usa una conexión dedicada para que @usuario_id / @usuario_ip (que lee el trigger
// de auditoría) sean los de ESTA petición y no queden mezclados con otras del pool.
export const actualizarUbicacionEmprendimiento = async (id, latitud, longitud, datosAuditoria) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);

        const [resultado] = await conexion.query(
            `
            UPDATE Emprendimiento
            SET
                Latitud = ?,
                Longitud = ?
            WHERE idEmprendimiento = ?
            `,
            [latitud, longitud, id]
        );

        await conexion.commit();
        return resultado;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};