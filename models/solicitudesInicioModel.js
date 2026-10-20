import { pool } from '../config/db.js';

// 1. Buscar las solicitudes iniciales que NO tienen asignado un expediente electrónico todavía
export const ModelObtenerSinExpediente = async () => {
    // Hacemos un LEFT JOIN con Expediente. Si no existe expediente, las columnas de la tabla Expediente vendrán como NULL.
    // También seleccionamos CorreoVal (que identifica al Emprendedor) y la FechaRecibidoMesa según tus campos reales.
    const querySQL = `
        SELECT 
            s.idSolicitudInicio, 
            s.CorreoVal AS Emprendedor, 
            s.FechaRecibidoMesa AS FechaRecibido, 
            s.DireccionPDF 
        FROM SolicitudInicio s
        LEFT JOIN Expediente e ON s.idSolicitudInicio = e.idSolicitudInicio
        WHERE e.NroExpediente IS NULL;
    `;
    const [filas] = await pool.query(querySQL);
    return filas;
};

// 2. Insertar el expediente en su respectiva tabla y activar los Triggers de Auditoría
export const ModelAsignarExpediente = async (idSolicitud, nroExpediente, idUsuario, ipCliente) => {
    await pool.query("SET @usuario_id = ?;", [idUsuario]);
    await pool.query("SET @usuario_ip = ?;", [ipCliente]);

    const querySQL = `
        INSERT INTO Expediente (NroExpediente, idSolicitudInicio, FechaCarga, idEmpleadoCargo)
        VALUES (?, ?, NOW(), ?);
    `;
    
    const [resultado] = await pool.query(querySQL, [nroExpediente, idSolicitud, idUsuario]);
    
    // Para mantener la compatibilidad con el controlador que verifica "affectedRows"
    return resultado;
};

//////////////////////////////////////////////////////////////////////////////////////////////
// MODELO PARA EMPLEADO DE AREA/ADMIN
////////////////////////////////////7/////////////////////////////////////////////////////////
// Recupera solicitudes con expediente que no han finalizado su revisión
export const ModelObtenerSolicitudesParaArea = async () => {
    const querySQL = `
        SELECT s.*, e.NroExpediente, e.FechaCarga
        FROM SolicitudInicio s
        INNER JOIN Expediente e ON s.idSolicitudInicio = e.idSolicitudInicio
        WHERE s.FechaRecibidoArea IS NOT NULL 
                    AND s.EstadoRevisionArea = 0
                    AND s.idEmpleadoTecRevisor IS NULL
                    AND s.idEmpleadoSocRevisor IS NULL
        ORDER BY s.FechaRecibidoArea ASC;
    `;
    const [filas] = await pool.query(querySQL);
    return filas;
};

const obtenerRevisorArea = async (conexion, idUsuario, bloquear = false) => {
    const [filas] = await conexion.query(
        `SELECT u.idUsuario, u.TipoUsuario, u.Activa AS UsuarioActivo,
                e.idEmpleado, e.Cargo, e.Activo AS EmpleadoActivo
         FROM Usuario u
         INNER JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         WHERE u.idUsuario = ?
         ${bloquear ? 'FOR UPDATE' : ''}`,
        [idUsuario]
    );
    const revisor = filas[0];

    if (!revisor || Number(revisor.UsuarioActivo) !== 1 || Number(revisor.EmpleadoActivo) !== 1) {
        const error = new Error('Se requiere una cuenta y ficha de empleado activas.');
        error.code = 'REVIEWER_NOT_ACTIVE';
        throw error;
    }
    const cuentaCompatible = revisor.Cargo === 'Administrador'
        ? revisor.TipoUsuario === 'Administrador'
        : ['Técnico', 'Social'].includes(revisor.Cargo) && revisor.TipoUsuario === 'Empleado de Area';
    if (!cuentaCompatible) {
        const error = new Error('La cuenta no tiene un rol y cargo habilitados para esta bandeja.');
        error.code = 'REVIEWER_ROLE_INVALID';
        throw error;
    }

    return revisor;
};

export const ModelListarRevisionesAsignadas = async (idUsuario, departamento = null) => {
    const revisor = await obtenerRevisorArea(pool, idUsuario);
    const asignadoSql = '(s.idEmpleadoTecRevisor = ? OR s.idEmpleadoSocRevisor = ?)';
    const etapaPendienteSql = `((s.EstadoRevisionArea = 1 AND s.AprobacionArea IS NULL)
        OR (s.EstadoRevisionArea = 2 AND s.AprobacionArea = 1 AND s.AprobacionMinistro IS NULL))`;
    const parametrosBase = [revisor.idEmpleado, revisor.idEmpleado];
    const [departamentos] = await pool.query(
        `SELECT DISTINCT d.EmprendimientoDepto
         FROM SolicitudInicio s
         INNER JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = s.idSolicitudInicio
         WHERE ${asignadoSql} AND ${etapaPendienteSql}
         ORDER BY d.EmprendimientoDepto`,
        parametrosBase
    );

    const condiciones = [asignadoSql, etapaPendienteSql];
    const parametros = [...parametrosBase];

    if (departamento) {
        condiciones.push('d.EmprendimientoDepto = ?');
        parametros.push(departamento);
    }

    const [solicitudes] = await pool.query(
        `SELECT s.idSolicitudInicio,
                d.EmprendimientoDepto,
                s.FechaInicioRev,
                d.EleccionAyuda,
                d.PersonaCorreo,
                s.DireccionPDF,
                s.AprobacionArea,
                s.EnvioMinistro,
                s.FechaEnvioMinistro,
                s.AprobacionMinistro,
                e.NroExpediente
         FROM SolicitudInicio s
         INNER JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = s.idSolicitudInicio
         LEFT JOIN Expediente e ON e.idSolicitudInicio = s.idSolicitudInicio
         WHERE ${condiciones.join(' AND ')}
         ORDER BY s.FechaInicioRev DESC, s.idSolicitudInicio DESC`,
        parametros
    );

    return {
        solicitudes,
        departamentos: departamentos.map(fila => fila.EmprendimientoDepto)
    };
};

export const ModelResolverRevisionArea = async (idSolicitud, idUsuario, aprobacionArea, latitud, longitud, ipCliente) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [ipCliente]);

        const revisor = await obtenerRevisorArea(conexion, idUsuario, true);
        const [solicitudes] = await conexion.query(
            `SELECT idSolicitudInicio, EstadoRevisionArea, idEmpleadoTecRevisor,
                    idEmpleadoSocRevisor, AprobacionArea
             FROM SolicitudInicio
             WHERE idSolicitudInicio = ?
             FOR UPDATE`,
            [idSolicitud]
        );
        const solicitud = solicitudes[0];

        if (!solicitud) {
            const error = new Error('No se encontró la solicitud asignada.');
            error.code = 'REVIEW_REQUEST_NOT_FOUND';
            throw error;
        }
        if (![solicitud.idEmpleadoTecRevisor, solicitud.idEmpleadoSocRevisor].includes(revisor.idEmpleado)) {
            const error = new Error('Esta solicitud no está asignada a su usuario.');
            error.code = 'REVIEW_NOT_ASSIGNED';
            throw error;
        }
        if (Number(solicitud.EstadoRevisionArea) !== 1 || solicitud.AprobacionArea !== null) {
            const error = new Error('La solicitud ya no está pendiente de decisión del Área.');
            error.code = 'REVIEW_ALREADY_RESOLVED';
            throw error;
        }

        if (aprobacionArea === 1) {
            const [datos] = await conexion.query(
                'SELECT idDatosSolicitudInicio FROM DatosSolicitudInicio WHERE idSolicitudInicio = ?',
                [idSolicitud]
            );
            if (datos.length === 0) {
                const error = new Error('No se encontraron los datos de la solicitud para guardar las coordenadas.');
                error.code = 'REVIEW_DATA_NOT_FOUND';
                throw error;
            }
            await conexion.query(
                `UPDATE DatosSolicitudInicio
                 SET EmprendimientoLatitud = ?, EmprendimientoLongitud = ?
                 WHERE idSolicitudInicio = ?`,
                [latitud, longitud, idSolicitud]
            );
        }

        await conexion.query(
            `UPDATE SolicitudInicio
             SET AprobacionArea = ?, FechaFinRev = CURRENT_DATE, EstadoRevisionArea = 2
             WHERE idSolicitudInicio = ?`,
            [aprobacionArea, idSolicitud]
        );

        await conexion.commit();
        return { aprobacionArea };
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

// Bloquea la solicitud y valida que el usuario sea uno de sus revisores y que el Área la haya aprobado
const obtenerSolicitudEtapaMinistro = async (conexion, idSolicitud, idUsuario) => {
    const revisor = await obtenerRevisorArea(conexion, idUsuario, true);
    const [solicitudes] = await conexion.query(
        `SELECT idSolicitudInicio, EstadoRevisionArea, idEmpleadoTecRevisor, idEmpleadoSocRevisor,
                AprobacionArea, EnvioMinistro, AprobacionMinistro
         FROM SolicitudInicio
         WHERE idSolicitudInicio = ?
         FOR UPDATE`,
        [idSolicitud]
    );
    const solicitud = solicitudes[0];

    if (!solicitud) {
        const error = new Error('No se encontró la solicitud asignada.');
        error.code = 'REVIEW_REQUEST_NOT_FOUND';
        throw error;
    }
    if (![solicitud.idEmpleadoTecRevisor, solicitud.idEmpleadoSocRevisor].includes(revisor.idEmpleado)) {
        const error = new Error('Esta solicitud no está asignada a su usuario.');
        error.code = 'REVIEW_NOT_ASSIGNED';
        throw error;
    }
    if (Number(solicitud.EstadoRevisionArea) !== 2 || Number(solicitud.AprobacionArea) !== 1) {
        const error = new Error('La solicitud no fue aprobada por el Área.');
        error.code = 'MINISTER_STAGE_INVALID';
        throw error;
    }

    return solicitud;
};

export const ModelRegistrarEnvioMinistro = async (idSolicitud, idUsuario, ipCliente) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [ipCliente]);

        const solicitud = await obtenerSolicitudEtapaMinistro(conexion, idSolicitud, idUsuario);
        if (Number(solicitud.EnvioMinistro) !== 0) {
            const error = new Error('El envío al Ministro ya fue registrado para esta solicitud.');
            error.code = 'MINISTER_ALREADY_SENT';
            throw error;
        }

        await conexion.query(
            `UPDATE SolicitudInicio
             SET EnvioMinistro = 1, FechaEnvioMinistro = CURRENT_DATE
             WHERE idSolicitudInicio = ?`,
            [idSolicitud]
        );

        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

export const ModelRegistrarResolucionMinistro = async (idSolicitud, idUsuario, aprobacionMinistro, ipCliente) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [ipCliente]);

        const solicitud = await obtenerSolicitudEtapaMinistro(conexion, idSolicitud, idUsuario);
        if (Number(solicitud.EnvioMinistro) !== 1) {
            const error = new Error('Primero debe confirmarse el envío al Ministro.');
            error.code = 'MINISTER_NOT_SENT';
            throw error;
        }
        if (solicitud.AprobacionMinistro !== null) {
            const error = new Error('La resolución del Ministro ya fue registrada para esta solicitud.');
            error.code = 'MINISTER_ALREADY_RESOLVED';
            throw error;
        }

        await conexion.query(
            `UPDATE SolicitudInicio
             SET AprobacionMinistro = ?, FechaResolucionMin = CURRENT_DATE
             WHERE idSolicitudInicio = ?`,
            [aprobacionMinistro, idSolicitud]
        );

        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

// Recupera los empleados activos de un cargo específico junto con su idUsuario
export const ModelObtenerEmpleadosPorCargo = async (cargo) => {
    const querySQL = `
        SELECT u.idUsuario, e.Nombre, e.Apellido 
        FROM Empleado e
        INNER JOIN Usuario u ON e.idEmpleado = u.idEmpleado
        WHERE e.Cargo = ? AND e.Activo = 1;
    `;
    const [filas] = await pool.query(querySQL, [cargo]);
    return filas;
};