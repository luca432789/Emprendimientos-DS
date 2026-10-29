import { pool } from '../config/db.js';

// Máximo de publicaciones por emprendimiento (regla acordada: 2)
export const MAXIMO_PUBLICACIONES = 2;

// Ejecuta las consultas en una conexión dedicada con las variables de auditoría cargadas
// (los triggers de Publicacion escriben en Auditoria, que exige @usuario_ip)
export const ejecutarConAuditoria = async (datosAuditoria, consultas) => {
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

// Emprendimiento del usuario emprendedor logueado
export const modelEmprendimientoDeUsuario = async (idUsuario) => {
    const [filas] = await pool.query(
        `SELECT e.idEmprendimiento, e.Nombre
         FROM Usuario u
         INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         INNER JOIN Emprendimiento e ON e.idEmprendimiento = em.idEmprendimiento
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

// 1a. EMPRENDEDOR: nueva publicación (queda en Revisión Pendiente = 1).
// guardarFotos(idPublicacion) guarda los archivos y devuelve la carpeta web (o null).
// Devuelve null si el emprendimiento ya tiene el máximo de publicaciones.
export const modelCrearPublicacion = async (idEmprendimiento, titulo, descripcion, guardarFotos, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        // FOR UPDATE bloquea las filas del emprendimiento para que dos envíos a la vez no pasen el límite
        const [existentes] = await conexion.query(
            'SELECT idPublicacion FROM Publicacion WHERE idEmprendimiento = ? FOR UPDATE;',
            [idEmprendimiento]
        );
        if (existentes.length >= MAXIMO_PUBLICACIONES) return null;

        const [resultado] = await conexion.query(
            `INSERT INTO Publicacion
             (idEmprendimiento, TituloPendiente, DescripcionPendiente, EstadoModeracion, FechaSolicitud)
             VALUES (?, ?, ?, 1, CURDATE());`,
            [idEmprendimiento, titulo, descripcion]
        );
        const idPublicacion = resultado.insertId;

        const carpetaFotos = await guardarFotos(idPublicacion);
        if (carpetaFotos) {
            await conexion.query(
                'UPDATE Publicacion SET DirectorioFotosPendiente = ? WHERE idPublicacion = ?;',
                [carpetaFotos, idPublicacion]
            );
        }
        return idPublicacion;
    });
};

// Publicación del emprendimiento (para editar): solo si le pertenece
export const modelPublicacionPropia = async (idPublicacion, idEmprendimiento) => {
    const [filas] = await pool.query(
        `SELECT idPublicacion, EstadoModeracion, DirectorioFotosActual, DirectorioFotosPendiente
         FROM Publicacion WHERE idPublicacion = ? AND idEmprendimiento = ?;`,
        [idPublicacion, idEmprendimiento]
    );
    return filas[0];
};

// 1b. EMPRENDEDOR: edita una de sus publicaciones -> vuelve a Revisión Pendiente.
// Lo aprobado sigue visible hasta que el Ministerio apruebe la nueva versión.
export const modelEditarPublicacion = async (idPublicacion, idEmprendimiento, titulo, descripcion, carpetaFotos, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = await conexion.query(
            `UPDATE Publicacion
             SET TituloPendiente = ?, DescripcionPendiente = ?, DirectorioFotosPendiente = ?,
                 EstadoModeracion = 1, FechaSolicitud = CURDATE(), MotivoRechazo = NULL
             WHERE idPublicacion = ? AND idEmprendimiento = ?;`,
            [titulo, descripcion, carpetaFotos, idPublicacion, idEmprendimiento]
        );
        return resultado.affectedRows;
    });
};

// Todas las publicaciones de un emprendimiento (para su dueño: aprobado + pendiente + estado)
export const modelPublicacionesDeEmprendimiento = async (idEmprendimiento) => {
    const [filas] = await pool.query(
        `SELECT idPublicacion, TituloActual, DescripcionActual, DirectorioFotosActual,
                TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente,
                EstadoModeracion, FechaSolicitud, FechaRevision, MotivoRechazo
         FROM Publicacion WHERE idEmprendimiento = ?
         ORDER BY idPublicacion;`,
        [idEmprendimiento]
    );
    return filas;
};

// 2. WEB PÚBLICA: contenido aprobado de un emprendimiento
export const modelPublicacionesAprobadas = async (idEmprendimiento) => {
    const [filas] = await pool.query(
        `SELECT idPublicacion, TituloActual AS titulo, DescripcionActual AS descripcion,
                DirectorioFotosActual AS carpetaFotos, FechaRevision AS fecha
         FROM Publicacion
         WHERE idEmprendimiento = ? AND TituloActual IS NOT NULL
         ORDER BY FechaRevision DESC, idPublicacion DESC;`,
        [idEmprendimiento]
    );
    return filas;
};

// 2b. WEB PÚBLICA: publicaciones aprobadas de todos los emprendimientos (página "Publicaciones" del menú)
// filtros: { buscar, idRubro }. La búsqueda no distingue mayúsculas ni tildes (collation utf8mb4_0900_ai_ci).
const filtrosPublicacionesAprobadas = ({ buscar, idRubro } = {}) => {
    const condiciones = ['p.TituloActual IS NOT NULL'];
    const parametros = [];
    if (idRubro) {
        condiciones.push('e.idRubro = ?');
        parametros.push(idRubro);
    }
    if (buscar) {
        condiciones.push("CONCAT_WS(' ', e.Nombre, p.TituloActual, p.DescripcionActual, r.Nombre) LIKE ?");
        parametros.push(`%${buscar.replace(/[\\%_]/g, '\\$&')}%`);
    }
    return { sql: `WHERE ${condiciones.join(' AND ')}`, parametros };
};

const DESDE_PUBLICACIONES_APROBADAS = `
    FROM Publicacion p
    INNER JOIN Emprendimiento e ON e.idEmprendimiento = p.idEmprendimiento
    LEFT JOIN Rubro r ON r.idRubro = e.idRubro`;

export const modelContarPublicacionesAprobadas = async (filtros) => {
    const { sql, parametros } = filtrosPublicacionesAprobadas(filtros);
    const [filas] = await pool.query(`SELECT COUNT(*) AS total ${DESDE_PUBLICACIONES_APROBADAS} ${sql};`, parametros);
    return Number(filas[0].total);
};

export const modelTodasLasPublicacionesAprobadas = async (filtros, limite, offset) => {
    const { sql, parametros } = filtrosPublicacionesAprobadas(filtros);
    const [filas] = await pool.query(
        `SELECT p.idPublicacion, p.TituloActual AS titulo, p.DescripcionActual AS descripcion,
                p.DirectorioFotosActual AS carpetaFotos, p.FechaRevision AS fecha,
                e.idEmprendimiento, e.Nombre AS emprendimiento, e.Localidad, e.Departamento,
                r.idRubro, r.Nombre AS rubro, r.IconoMapa
         ${DESDE_PUBLICACIONES_APROBADAS}
         ${sql}
         ORDER BY p.FechaRevision DESC, p.idPublicacion DESC
         LIMIT ? OFFSET ?;`,
        [...parametros, limite, offset]
    );
    return filas;
};

// Rubros que tienen al menos una publicación aprobada (para el filtro de la página)
export const modelRubrosConPublicaciones = async () => {
    const [filas] = await pool.query(
        `SELECT DISTINCT r.idRubro, r.Nombre AS rubro
         ${DESDE_PUBLICACIONES_APROBADAS}
         WHERE p.TituloActual IS NOT NULL AND r.idRubro IS NOT NULL
         ORDER BY r.Nombre;`
    );
    return filas;
};

// 3. EMPLEADO: publicaciones pendientes de moderación (estado 1)
export const modelPublicacionesPendientes = async () => {
    const [filas] = await pool.query(
        `SELECT p.idPublicacion, p.TituloPendiente, p.DescripcionPendiente, p.DirectorioFotosPendiente,
                p.FechaSolicitud, e.idEmprendimiento, e.Nombre AS NombreEmprendimiento,
                (p.TituloActual IS NOT NULL) AS esEdicion
         FROM Publicacion p
         JOIN Emprendimiento e ON p.idEmprendimiento = e.idEmprendimiento
         WHERE p.EstadoModeracion = 1
         ORDER BY p.FechaSolicitud, p.idPublicacion;`
    );
    return filas;
};

// 4. EMPLEADO: aprobar (pendiente -> actual, estado 0) o rechazar (estado 2, con motivo).
// Solo afecta publicaciones en revisión: aprobar dos veces no borra el contenido aprobado.
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
