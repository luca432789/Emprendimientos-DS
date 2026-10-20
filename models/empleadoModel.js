import { pool } from '../config/db.js';

export const ModelRegistrarEmpleado = async (datosEmpleado, datosAuditoria) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);

        const [resultado] = await conexion.query(
            `INSERT INTO Empleado
                (Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo, Activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                datosEmpleado.nombre,
                datosEmpleado.apellido,
                datosEmpleado.dni,
                datosEmpleado.domicilio,
                datosEmpleado.telefono,
                datosEmpleado.correo,
                datosEmpleado.cargo,
                datosEmpleado.activo
            ]
        );

        await conexion.commit();
        return resultado.insertId;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

export const ModelActualizarEmpleadoAdministracion = async (idEmpleado, datosEmpleado, datosAuditoria) => {
    const conexion = await pool.getConnection();
    const tipoUsuarioPorCargo = {
        'Mesa de Entrada': 'Empleado de Mesa',
        'Técnico': 'Empleado de Area',
        'Social': 'Empleado de Area',
        'Administrador': 'Administrador'
    };

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);

        const [filas] = await conexion.query(
            `SELECT e.idEmpleado, e.Activo, e.Cargo, u.idUsuario, u.TipoUsuario, u.Activa AS UsuarioActivo
             FROM Empleado e
             LEFT JOIN Usuario u ON u.idEmpleado = e.idEmpleado
             WHERE e.idEmpleado = ?
             FOR UPDATE`,
            [idEmpleado]
        );

        if (filas.length === 0) {
            const error = new Error('No se encontró el empleado seleccionado.');
            error.code = 'EMPLOYEE_NOT_FOUND';
            throw error;
        }
        if (filas.length > 1) {
            const error = new Error('El empleado tiene más de una cuenta web asociada; se requiere revisar el vínculo antes de modificarlo.');
            error.code = 'MULTIPLE_USER_ACCOUNTS';
            throw error;
        }

        const actual = filas[0];
        const tipoUsuarioNuevo = tipoUsuarioPorCargo[datosEmpleado.cargo];

        await conexion.query(
            `UPDATE Empleado
             SET Nombre = ?, Apellido = ?, DNI = ?, Domicilio = ?, Teléfono = ?, Correo = ?, Cargo = ?, Activo = ?
             WHERE idEmpleado = ?`,
            [
                datosEmpleado.nombre,
                datosEmpleado.apellido,
                datosEmpleado.dni,
                datosEmpleado.domicilio,
                datosEmpleado.telefono,
                datosEmpleado.correo,
                datosEmpleado.cargo,
                datosEmpleado.activo,
                idEmpleado
            ]
        );

        if (actual.idUsuario) {
            await conexion.query(
                'UPDATE Usuario SET Correo = ?, TipoUsuario = ? WHERE idUsuario = ?',
                [datosEmpleado.correo, tipoUsuarioNuevo, actual.idUsuario]
            );

            const fueReactivado = Number(actual.Activo) === 0 && datosEmpleado.activo === 1;
            const nuevoEstadoUsuario = datosEmpleado.activo === 0 || fueReactivado
                ? 0
                : Number(actual.UsuarioActivo);
            if (Number(actual.UsuarioActivo) !== nuevoEstadoUsuario) {
                await conexion.query(
                    'UPDATE Usuario SET Activa = ? WHERE idUsuario = ?',
                    [nuevoEstadoUsuario, actual.idUsuario]
                );
            }
        }

        await conexion.commit();
        return { tipoUsuarioNuevo, cuentaWebActualizada: Boolean(actual.idUsuario) };
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

const construirFiltrosEmpleados = (filtros) => {
    const condiciones = [];
    const parametros = [];

    if (filtros.cargo) {
        condiciones.push('e.Cargo = ?');
        parametros.push(filtros.cargo);
    }
    if (filtros.activo !== null) {
        condiciones.push('e.Activo = ?');
        parametros.push(filtros.activo);
    }
    if (filtros.tipoCuenta === 'Sin cuenta') {
        condiciones.push('u.idUsuario IS NULL');
    } else if (filtros.tipoCuenta) {
        condiciones.push('u.TipoUsuario = ?');
        parametros.push(filtros.tipoCuenta);
    }
    if (filtros.buscar) {
        const termino = `%${filtros.buscar}%`;
        condiciones.push(`(
            e.Nombre LIKE ?
            OR e.Apellido LIKE ?
            OR CONCAT_WS(' ', e.Nombre, e.Apellido) LIKE ?
            OR e.Correo LIKE ?
        )`);
        parametros.push(termino, termino, termino, termino);
    }
    if (filtros.dni) {
        condiciones.push('e.DNI LIKE ?');
        parametros.push(`%${filtros.dni}%`);
    }

    return {
        sql: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
        parametros
    };
};

const fromEmpleadosAdministracion = `
    FROM Empleado e
    LEFT JOIN Usuario u ON u.idEmpleado = e.idEmpleado
`;

export const ModelContarEmpleadosAdministracion = async (filtros = {}) => {
    const condiciones = construirFiltrosEmpleados(filtros);
    const [filas] = await pool.query(
        `SELECT COUNT(DISTINCT e.idEmpleado) AS total
         ${fromEmpleadosAdministracion}
         ${condiciones.sql}`,
        condiciones.parametros
    );

    return Number(filas[0].total);
};

export const ModelListarEmpleadosAdministracion = async (filtros = {}, limite = 10, offset = 0) => {
    const condiciones = construirFiltrosEmpleados(filtros);
    const orden = filtros.orden === 'desc' ? 'DESC' : 'ASC';
    const [filas] = await pool.query(
        `SELECT
            e.idEmpleado,
            e.Nombre,
            e.Apellido,
            e.DNI,
            e.Domicilio,
            e.Teléfono AS Telefono,
            e.Correo,
            e.Cargo,
            e.Activo,
            GROUP_CONCAT(DISTINCT u.TipoUsuario ORDER BY u.TipoUsuario SEPARATOR ', ') AS TipoUsuarioWeb,
            MAX(u.Activa) AS UsuarioActivo
         ${fromEmpleadosAdministracion}
         ${condiciones.sql}
         GROUP BY e.idEmpleado, e.Nombre, e.Apellido, e.DNI, e.Domicilio, e.Teléfono, e.Correo, e.Cargo, e.Activo
         ORDER BY LOWER(e.Nombre) ${orden}, LOWER(e.Apellido) ASC, e.idEmpleado ASC
         LIMIT ? OFFSET ?`,
        [...condiciones.parametros, limite, offset]
    );

    return filas;
};

const obtenerEmpleadoVinculadoAUsuario = async (conexion, idUsuario, bloquear = false) => {
    const [filas] = await conexion.query(
        `SELECT u.idUsuario, u.TipoUsuario, u.Activa AS UsuarioActivo,
                e.idEmpleado, e.Cargo, e.Activo AS EmpleadoActivo
         FROM Usuario u
         INNER JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         WHERE u.idUsuario = ?
         ${bloquear ? 'FOR UPDATE' : ''}`,
        [idUsuario]
    );

    return filas[0] || null;
};

const tipoCuentaCompatibleConCargo = (empleado) => {
    if (empleado.Cargo === 'Administrador') return empleado.TipoUsuario === 'Administrador';
    return ['Técnico', 'Social'].includes(empleado.Cargo) && empleado.TipoUsuario === 'Empleado de Area';
};

const cargosValidosParaPareja = (cargoActual) => {
    if (cargoActual === 'Social') return ['Técnico', 'Administrador'];
    if (cargoActual === 'Técnico' || cargoActual === 'Administrador') return ['Social'];
    return [];
};

export const ModelObtenerEquipoRevision = async (idUsuarioLogueado) => {
    const actual = await obtenerEmpleadoVinculadoAUsuario(pool, idUsuarioLogueado);
    if (!actual) {
        const error = new Error('La cuenta no está vinculada a una ficha de empleado.');
        error.code = 'EMPLOYEE_ACCOUNT_REQUIRED';
        throw error;
    }
    if (Number(actual.UsuarioActivo) !== 1 || Number(actual.EmpleadoActivo) !== 1) {
        const error = new Error('La cuenta y la ficha del empleado deben estar activas para iniciar una revisión.');
        error.code = 'INACTIVE_REVIEWER';
        throw error;
    }
    if (!['Empleado de Area', 'Administrador'].includes(actual.TipoUsuario) || !tipoCuentaCompatibleConCargo(actual)) {
        const error = new Error('Solo un empleado del Área o un administrador con cargo compatible puede iniciar una revisión.');
        error.code = 'REVIEWER_ROLE_NOT_ALLOWED';
        throw error;
    }

    const cargosCandidatos = cargosValidosParaPareja(actual.Cargo);
    const placeholders = cargosCandidatos.map(() => '?').join(', ');
    const [candidatos] = await pool.query(
        `SELECT DISTINCT u.idUsuario, e.idEmpleado, e.Nombre, e.Apellido, e.DNI, e.Cargo
         FROM Empleado e
         INNER JOIN Usuario u ON u.idEmpleado = e.idEmpleado
         WHERE e.Activo = 1
           AND u.Activa = 1
           AND e.idEmpleado <> ?
           AND e.Cargo IN (${placeholders})
           AND (
                (e.Cargo IN ('Técnico', 'Social') AND u.TipoUsuario = 'Empleado de Area')
                OR (e.Cargo = 'Administrador' AND u.TipoUsuario = 'Administrador')
           )
         ORDER BY e.Apellido, e.Nombre`,
        [actual.idEmpleado, ...cargosCandidatos]
    );

    return {
        empleadoActual: {
            idEmpleado: actual.idEmpleado,
            cargo: actual.Cargo,
            tipoUsuario: actual.TipoUsuario
        },
        cargosCandidatos,
        candidatos
    };
};

export const ModelObtenerEmpleadosPorCargo = async (idUsuarioLogueado) => {
    const equipo = await ModelObtenerEquipoRevision(idUsuarioLogueado);
    return equipo.candidatos;
};

export const ModelIniciarRevisionSolicitud = async (idSolicitud, idUsuarioActual, idEmpleadoCompañero, ipCliente) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [idUsuarioActual]);
        await conexion.query('SET @usuario_ip = ?;', [ipCliente]);

        const actual = await obtenerEmpleadoVinculadoAUsuario(conexion, idUsuarioActual, true);
        if (!actual || Number(actual.UsuarioActivo) !== 1 || Number(actual.EmpleadoActivo) !== 1) {
            const error = new Error('La cuenta y la ficha del empleado deben estar activas para iniciar una revisión.');
            error.code = 'INACTIVE_REVIEWER';
            throw error;
        }
        if (!['Empleado de Area', 'Administrador'].includes(actual.TipoUsuario) || !tipoCuentaCompatibleConCargo(actual)) {
            const error = new Error('El usuario no tiene un rol/cargo habilitado para iniciar revisiones.');
            error.code = 'REVIEWER_ROLE_NOT_ALLOWED';
            throw error;
        }

        const cargosCandidatos = cargosValidosParaPareja(actual.Cargo);
        if (cargosCandidatos.length === 0 || Number(idEmpleadoCompañero) === Number(actual.idEmpleado)) {
            const error = new Error('El compañero seleccionado no es válido para este cargo.');
            error.code = 'INVALID_REVIEW_PARTNER';
            throw error;
        }

        const [pareja] = await conexion.query(
            `SELECT e.idEmpleado, e.Cargo, u.TipoUsuario
             FROM Empleado e
             INNER JOIN Usuario u ON u.idEmpleado = e.idEmpleado
             WHERE e.idEmpleado = ?
               AND e.Activo = 1
               AND u.Activa = 1
             FOR UPDATE`,
            [idEmpleadoCompañero]
        );
        const cargoPareja = pareja[0];
        if (!cargoPareja || !cargosCandidatos.includes(cargoPareja.Cargo) || !tipoCuentaCompatibleConCargo(cargoPareja)) {
            const error = new Error('El compañero debe tener una ficha y cuenta activas con el cargo complementario correspondiente.');
            error.code = 'INVALID_REVIEW_PARTNER';
            throw error;
        }

        const [solicitudes] = await conexion.query(
            `SELECT s.idSolicitudInicio, s.EstadoRevisionArea, s.idEmpleadoTecRevisor, s.idEmpleadoSocRevisor
             FROM SolicitudInicio s
             WHERE s.idSolicitudInicio = ?
               AND s.FechaRecibidoArea IS NOT NULL
             FOR UPDATE`,
            [idSolicitud]
        );
        const solicitud = solicitudes[0];
        if (!solicitud) {
            const error = new Error('La solicitud no existe o todavía no está disponible para el Área.');
            error.code = 'REVIEW_REQUEST_NOT_FOUND';
            throw error;
        }

        const [expedientes] = await conexion.query(
            'SELECT idExpediente FROM Expediente WHERE idSolicitudInicio = ? LIMIT 1',
            [idSolicitud]
        );
        if (expedientes.length === 0) {
            const error = new Error('La solicitud todavía no tiene un expediente asignado.');
            error.code = 'REVIEW_REQUEST_NOT_FOUND';
            throw error;
        }

        if (Number(solicitud.EstadoRevisionArea) !== 0 || solicitud.idEmpleadoTecRevisor || solicitud.idEmpleadoSocRevisor) {
            const error = new Error('La solicitud ya fue tomada o ya tiene revisores asignados.');
            error.code = 'REVIEW_ALREADY_STARTED';
            throw error;
        }

        const idEmpleadoTecnico = actual.Cargo === 'Social' ? cargoPareja.idEmpleado : actual.idEmpleado;
        const idEmpleadoSocial = actual.Cargo === 'Social' ? actual.idEmpleado : cargoPareja.idEmpleado;

        await conexion.query(
            `UPDATE SolicitudInicio
             SET idEmpleadoTecRevisor = ?,
                 idEmpleadoSocRevisor = ?,
                 EstadoRevisionArea = 1,
                 FechaInicioRev = CURRENT_DATE
             WHERE idSolicitudInicio = ?`,
            [idEmpleadoTecnico, idEmpleadoSocial, idSolicitud]
        );

        await conexion.commit();
        return { idEmpleadoTecnico, idEmpleadoSocial };
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};