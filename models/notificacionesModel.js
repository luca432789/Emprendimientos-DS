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

// Publicaciones que esperan revisión del Ministerio (para Empleado de Área / Administrador)
export const modelPublicacionesEnEspera = async () => {
    const [filas] = await pool.query(`
        SELECT idPublicacion, FechaSolicitud, TituloPendiente, DescripcionPendiente
        FROM Publicacion
        WHERE EstadoModeracion = 1
        ORDER BY FechaSolicitud, idPublicacion;
    `);
    return filas;
};

// Cuáles de estas claves ya vio el usuario. Devuelve null si la tabla NotificacionVista no existe
// todavía (falta ejecutar database/Notificaciones.sql): el navegador se encarga en ese caso.
export const modelClavesVistas = async (idUsuario, claves) => {
    if (!claves.length) return new Set();
    try {
        const [filas] = await pool.query(
            'SELECT Clave FROM NotificacionVista WHERE idUsuario = ? AND Clave IN (?);',
            [idUsuario, claves]
        );
        return new Set(filas.map((f) => f.Clave));
    } catch (error) {
        if (error?.code === 'ER_NO_SUCH_TABLE') return null;
        throw error;
    }
};

// Marca notificaciones como vistas (INSERT IGNORE: si ya estaba vista no hace nada)
export const modelMarcarVistas = async (idUsuario, claves) => {
    if (!claves.length) return 0;
    const [resultado] = await pool.query(
        'INSERT IGNORE INTO NotificacionVista (idUsuario, Clave) VALUES ?;',
        [claves.map((clave) => [idUsuario, clave])]
    );
    return resultado.affectedRows;
};

// Publicaciones del emprendedor logueado que el Ministerio aprobó (0) o rechazó (2)
// en los últimos 30 días. Si el emprendedor la volvió a editar (estado 1) ya no se notifica.
export const modelResolucionesDeEmprendedor = async (idUsuario) => {
    const [filas] = await pool.query(`
        SELECT p.idPublicacion, p.EstadoModeracion, p.FechaRevision, p.MotivoRechazo,
               COALESCE(p.TituloActual, p.TituloPendiente) AS TituloAprobado,
               p.TituloPendiente, p.DescripcionActual, p.DescripcionPendiente
        FROM Usuario u
        INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
        INNER JOIN Publicacion p ON p.idEmprendimiento = em.idEmprendimiento
        WHERE u.idUsuario = ? AND u.TipoUsuario = 'Emprendedor'
          AND p.EstadoModeracion IN (0, 2)
          AND p.FechaRevision IS NOT NULL
          AND p.FechaRevision >= CURDATE() - INTERVAL 30 DAY
        ORDER BY p.FechaRevision DESC, p.idPublicacion DESC;
    `, [idUsuario]);
    return filas;
};
