import { pool } from '../config/db.js';

export const obtenerEmprendimientosMapa = async () => {

    const [rows] = await pool.query(`
        SELECT
            idEmprendimiento,
            Nombre,
            Calle,
            NúmeroCalle,
            Barrio,
            Departamento,
            Localidad,
            ActividadPrincipal,
            Latitud,
            Longitud
        FROM Emprendimiento
    `);

    return rows;
};

export const actualizarUbicacionEmprendimiento = async (
    id,
    latitud,
    longitud
) => {

    const [resultado] = await pool.query(
        `
        UPDATE Emprendimiento
        SET
            Latitud = ?,
            Longitud = ?
        WHERE idEmprendimiento = ?
        `,
        [latitud, longitud, id]
    );

    return resultado;
};