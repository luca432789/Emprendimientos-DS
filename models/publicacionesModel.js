import { pool } from '../config/db.js';

// Ejecuta las consultas en una conexión dedicada con las variables de auditoría cargadas
// (los triggers de Publicacion escriben en Auditoria, que exige @usuario_ip)
const ejecutarConAuditoria = async (datosAuditoria, consultas) => {
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario ?? null]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);
        const resultado = await consultas(conexion);
        await conexion.commit();
        return resultado;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        await conexion.query('SET @usuario_id = NULL, @usuario_ip = NULL;').catch(() => {});
        conexion.release();
    }
};

// Emprendimiento del usuario emprendedor logueado (con nombre y rubro para el perfil)
export const modelEmprendimientoDeUsuario = async (idUsuario) => {
    const [filas] = await pool.query(
        `SELECT e.idEmprendimiento, e.Nombre, r.Nombre AS Rubro
         FROM Usuario u
         INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         INNER JOIN Emprendimiento e ON e.idEmprendimiento = em.idEmprendimiento
         LEFT JOIN Rubro r ON r.idRubro = e.idRubro
         WHERE u.idUsuario = ? AND u.TipoUsuario = 'Emprendedor' AND u.Activa = 1;`,
        [idUsuario]
    );
    return filas[0];
};

// idEmpleado del usuario empleado logueado (para guardar quién moderó)
export const modelEmpleadoDeUsuario = async (idUsuario) => {
    const [filas] = await pool.query('SELECT idEmpleado FROM Usuario WHERE idUsuario = ?;', [idUsuario]);
    return filas[0]?.idEmpleado ?? null;
};

// 1. EMPRENDEDOR: crear o actualizar su publicación -> queda en Revisión Pendiente (1)
export const modelGuardarPublicacionPendiente = async (idEmprendimiento, titulo, descripcion, fotoUrl, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [existe] = await conexion.query(
            'SELECT idPublicacion FROM Publicacion WHERE idEmprendimiento = ?;',
            [idEmprendimiento]
        );

        if (existe.length > 0) {
            await conexion.query(
                `UPDATE Publicacion
                 SET TituloPendiente = ?, DescripcionPendiente = ?, DirectorioFotosPendiente = ?,
                     EstadoModeracion = 1, FechaSolicitud = CURDATE(), MotivoRechazo = NULL
                 WHERE idEmprendimiento = ?;`,
                [titulo, descripcion, fotoUrl, idEmprendimiento]
            );
            return existe[0].idPublicacion;
        }

        const [resultado] = await conexion.query(
            `INSERT INTO Publicacion
             (idEmprendimiento, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion, FechaSolicitud)
             VALUES (?, ?, ?, ?, 1, CURDATE());`,
            [idEmprendimiento, titulo, descripcion, fotoUrl]
        );
        return resultado.insertId;
    });
};

// Publicación del propio emprendedor: lo aprobado + el estado de lo que mandó a revisión
export const modelPublicacionDeEmprendimiento = async (idEmprendimiento) => {
    const [filas] = await pool.query(
        `SELECT idPublicacion, TituloActual, DescripcionActual, DirectorioFotosActual,
                TituloPendiente, DescripcionPendiente, EstadoModeracion, FechaSolicitud, MotivoRechazo
         FROM Publicacion WHERE idEmprendimiento = ?;`,
        [idEmprendimiento]
    );
    return filas;
};

// 2. WEB PÚBLICA: contenido aprobado de un emprendimiento
export const modelPublicacionesAprobadas = async (idEmprendimiento) => {
    const [filas] = await pool.query(
        `SELECT idPublicacion, TituloActual AS titulo, DescripcionActual AS descripcion,
                DirectorioFotosActual AS foto
         FROM Publicacion
         WHERE idEmprendimiento = ? AND TituloActual IS NOT NULL;`,
        [idEmprendimiento]
    );
    return filas;
};

// 3. EMPLEADO: publicaciones pendientes de moderación (estado 1)
export const modelPublicacionesPendientes = async () => {
    const [filas] = await pool.query(
        `SELECT p.idPublicacion, p.TituloPendiente, p.DescripcionPendiente,
                p.FechaSolicitud, e.Nombre AS NombreEmprendimiento
         FROM Publicacion p
         JOIN Emprendimiento e ON p.idEmprendimiento = e.idEmprendimiento
         WHERE p.EstadoModeracion = 1
         ORDER BY p.FechaSolicitud, p.idPublicacion;`
    );
    return filas;
};

// 4. EMPLEADO: aprobar (pendiente -> actual, estado 0) o rechazar (estado 2, con motivo)
export const modelModerarPublicacion = async (idPublicacion, aprobar, motivoRechazo, idEmpleadoModerador, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = aprobar
            ? await conexion.query(
                `UPDATE Publicacion
                 SET TituloActual = TituloPendiente,
                     DescripcionActual = DescripcionPendiente,
                     DirectorioFotosActual = DirectorioFotosPendiente,
                     TituloPendiente = NULL, DescripcionPendiente = NULL, DirectorioFotosPendiente = NULL,
                     EstadoModeracion = 0, FechaRevision = CURDATE(), MotivoRechazo = NULL, idEmpleadoModerador = ?
                 WHERE idPublicacion = ? AND EstadoModeracion = 1;`,
                [idEmpleadoModerador, idPublicacion]
            )
            : await conexion.query(
                `UPDATE Publicacion
                 SET EstadoModeracion = 2, FechaRevision = CURDATE(),
                     MotivoRechazo = ?, idEmpleadoModerador = ?
                 WHERE idPublicacion = ? AND EstadoModeracion = 1;`,
                [motivoRechazo, idEmpleadoModerador, idPublicacion]
            );
        return resultado.affectedRows;
    });
};
