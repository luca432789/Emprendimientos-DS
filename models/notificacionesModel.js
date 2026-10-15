import { pool } from '../config/db.js';

// Solicitudes de inicio que todavía no tienen expediente: son las que Mesa de Entrada
// tiene que atender. Cuando se carga el expediente GED dejan de aparecer.
export const modelSolicitudesPendientesMesa = async () => {
    const [filas] = await pool.query(`
        SELECT s.idSolicitudInicio
        FROM SolicitudInicio s
        LEFT JOIN Expediente e ON e.idSolicitudInicio = s.idSolicitudInicio
        WHERE e.idExpediente IS NULL;
    `);
    return filas;
};
