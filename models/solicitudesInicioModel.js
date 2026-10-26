import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

// 1. Buscar las solicitudes iniciales que NO tienen asignado un expediente electrónico todavía
export const ModelObtenerSinExpediente = async () => {
    // Hacemos un LEFT JOIN con Expediente. Si no existe expediente, las columnas de la tabla Expediente vendrán como NULL.
    // El nombre del Emprendedor sale de DatosSolicitudInicio (lo que cargó en el Formulario de Inicio);
    // si la solicitud no tiene datos cargados, se usa CorreoVal como antes.
    const querySQL = `
        SELECT
            s.idSolicitudInicio,
            COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)), ''),
                s.CorreoVal
            ) AS Emprendedor,
            s.FechaRecibidoMesa AS FechaRecibido,
            s.DireccionPDF
        FROM SolicitudInicio s
        LEFT JOIN Expediente e ON s.idSolicitudInicio = e.idSolicitudInicio
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = s.idSolicitudInicio
        WHERE e.NroExpediente IS NULL
        ORDER BY s.idSolicitudInicio;
    `;
    const [filas] = await pool.query(querySQL);
    return filas;
};

// 2. Insertar el expediente en su respectiva tabla y activar los Triggers de Auditoría
// Usa una conexión dedicada: @usuario_id / @usuario_ip viven por conexión y el trigger
// de auditoría tiene que leerlos en la misma conexión que hace el INSERT.
export const ModelAsignarExpediente = async (idSolicitud, nroExpediente, idUsuario, ipCliente) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [ipCliente]);

        const [resultado] = await conexion.query(
            `INSERT INTO Expediente (NroExpediente, idSolicitudInicio, FechaCarga, idEmpleadoCargo)
             VALUES (?, ?, NOW(), ?);`,
            [nroExpediente, idSolicitud, idUsuario]
        );

        await conexion.commit();
        // Para mantener la compatibilidad con el controlador que verifica "affectedRows"
        return resultado;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        await conexion.query('SET @usuario_id = NULL, @usuario_ip = NULL;').catch(() => {});
        conexion.release();
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////
// MODELO PARA EMPLEADO DE AREA/ADMIN
////////////////////////////////////7/////////////////////////////////////////////////////////
// Recupera solicitudes con expediente que no han finalizado su revisión
const sinRevisarAreaSql = `
        FROM SolicitudInicio s
        INNER JOIN Expediente e ON s.idSolicitudInicio = e.idSolicitudInicio
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = s.idSolicitudInicio
        WHERE s.FechaRecibidoArea IS NOT NULL
                    AND s.EstadoRevisionArea = 0
                    AND s.idEmpleadoTecRevisor IS NULL
                    AND s.idEmpleadoSocRevisor IS NULL`;

export const ModelObtenerSolicitudesParaArea = async (departamento = null) => {
    const querySQL = `
        SELECT s.*, e.NroExpediente, e.FechaCarga, d.EmprendimientoDepto
        ${sinRevisarAreaSql}
        ${departamento ? 'AND d.EmprendimientoDepto = ?' : ''}
        ORDER BY s.FechaRecibidoArea ASC;
    `;
    const [filas] = await pool.query(querySQL, departamento ? [departamento] : []);
    return filas;
};

export const ModelObtenerDepartamentosSinRevisar = async () => {
    const [filas] = await pool.query(
        `SELECT DISTINCT d.EmprendimientoDepto
        ${sinRevisarAreaSql}
                    AND d.EmprendimientoDepto IS NOT NULL
        ORDER BY d.EmprendimientoDepto;`
    );
    return filas.map(fila => fila.EmprendimientoDepto);
};

export const ModelObtenerRubros = async () => {
    const [filas] = await pool.query('SELECT idRubro, Nombre FROM Rubro ORDER BY Nombre;');
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
                d.EmprendimientoNombre,
                d.EmprendimientoRubro,
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

const errorAprobacion = (mensaje, codigo) => {
    const error = new Error(mensaje);
    error.code = codigo;
    return error;
};

// TEMPORAL: contraseña genérica de las cuentas de emprendedor creadas al aprobar el Ministro.
// Reemplazar cuando exista el envío por correo del enlace para que el emprendedor defina la suya.
const CONTRASEÑA_INICIAL_EMPRENDEDOR = '1234Empre--2';

// Verifica duplicados e inserta Emprendimiento, Emprendedor y la cuenta de Usuario del emprendedor.
// Lo usan la aprobación del Ministro y la carga histórica de emprendimientos antiguos.
const insertarEmprendimientoConEmprendedor = async (conexion, idSolicitud, emprendimiento, emprendedor) => {
    const [rubros] = await conexion.query('SELECT idRubro FROM Rubro WHERE idRubro = ?', [emprendimiento.idRubro]);
    if (rubros.length === 0) {
        throw errorAprobacion('El rubro seleccionado no existe.', 'RUBRO_NOT_FOUND');
    }

    const [emprendimientoPrevio] = await conexion.query(
        'SELECT idEmprendimiento FROM Emprendimiento WHERE idSolicitudInicio = ? OR NroProyecto = ? LIMIT 1',
        [idSolicitud, emprendimiento.nroProyecto]
    );
    if (emprendimientoPrevio.length > 0) {
        throw errorAprobacion('Ya existe un emprendimiento para esta solicitud o con ese Nro de Proyecto.', 'EMPRENDIMIENTO_DUPLICADO');
    }

    const [emprendedorPrevio] = await conexion.query(
        'SELECT idEmprendedor FROM Emprendedor WHERE DNI = ? OR Correo = ? LIMIT 1',
        [emprendedor.dni, emprendedor.correo]
    );
    if (emprendedorPrevio.length > 0) {
        throw errorAprobacion('Ya existe un emprendedor registrado con ese DNI o correo.', 'EMPRENDEDOR_DUPLICADO');
    }

    const [usuarioPrevio] = await conexion.query('SELECT idUsuario FROM Usuario WHERE Correo = ? LIMIT 1', [emprendedor.correo]);
    if (usuarioPrevio.length > 0) {
        throw errorAprobacion('Ya existe una cuenta de usuario con ese correo.', 'EMPRENDEDOR_DUPLICADO');
    }

    const [filaEmprendimiento] = await conexion.query(
        `INSERT INTO Emprendimiento (Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad,
                EnMarcha, ActividadPrincipal, Latitud, Longitud, idSolicitudInicio, idRubro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            emprendimiento.nombre, emprendimiento.nroProyecto, emprendimiento.calle, emprendimiento.numeroCalle,
            emprendimiento.barrio, emprendimiento.departamento, emprendimiento.localidad, emprendimiento.enMarcha,
            emprendimiento.actividadPrincipal, emprendimiento.latitud, emprendimiento.longitud, idSolicitud,
            emprendimiento.idRubro
        ]
    );

    const [filaEmprendedor] = await conexion.query(
        `INSERT INTO Emprendedor (Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, idEmprendimiento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            emprendedor.nombre, emprendedor.apellido, emprendedor.dni, emprendedor.departamento,
            emprendedor.localidad, emprendedor.domicilio, emprendedor.telefono, emprendedor.correo,
            filaEmprendimiento.insertId
        ]
    );

    const contraseñaEncriptada = await bcrypt.hash(CONTRASEÑA_INICIAL_EMPRENDEDOR, 10);
    await conexion.query(
        `INSERT INTO Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado)
         VALUES (?, ?, 'Emprendedor', TRUE, ?, NULL)`,
        [emprendedor.correo, contraseñaEncriptada, filaEmprendedor.insertId]
    );

    return { idEmprendimiento: filaEmprendimiento.insertId, idEmprendedor: filaEmprendedor.insertId };
};

// Crea el Emprendimiento, su Emprendedor y la cuenta de Usuario a partir de los datos del formulario de inicio
const crearEmprendimientoAprobado = async (conexion, idSolicitud, nroProyecto, idRubro) => {
    const [datosFilas] = await conexion.query(
        'SELECT * FROM DatosSolicitudInicio WHERE idSolicitudInicio = ?',
        [idSolicitud]
    );
    const datos = datosFilas[0];
    if (!datos) {
        throw errorAprobacion('No se encontraron los datos del formulario de inicio de la solicitud.', 'REVIEW_DATA_NOT_FOUND');
    }

    await insertarEmprendimientoConEmprendedor(conexion, idSolicitud, {
        nombre: datos.EmprendimientoNombre,
        nroProyecto,
        calle: datos.EmprendimientoCalle,
        numeroCalle: datos.EmprendimientoNroCalle,
        barrio: datos.EmprendimientoBarrio,
        departamento: datos.EmprendimientoDepto,
        localidad: datos.EmprendimientoLocalidad,
        enMarcha: datos.EmprendimientoMarcha,
        actividadPrincipal: datos.EmprendimientoActPrincipal,
        latitud: datos.EmprendimientoLatitud,
        longitud: datos.EmprendimientoLongitud,
        idRubro
    }, {
        nombre: datos.PersonaNombre,
        apellido: datos.PersonaApellido,
        dni: datos.PersonaDNI,
        departamento: datos.PersonaDepartamento,
        localidad: datos.PersonaLocalidad,
        domicilio: datos.PersonaDomicilio,
        telefono: datos.PersonaTeléfono,
        correo: datos.PersonaCorreo
    });
};

export const ModelRegistrarResolucionMinistro = async (idSolicitud, idUsuario, aprobacionMinistro, ipCliente, nroProyecto = null, idRubro = null) => {
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

        if (aprobacionMinistro === 1) {
            await crearEmprendimientoAprobado(conexion, idSolicitud, nroProyecto, idRubro);
        }

        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

// Carga histórica: registra de una vez un emprendimiento antiguo ya aprobado por el Ministro.
// No usa DatosSolicitudInicio; las fechas de revisión y envío quedan NULL porque no se conocen.
export const ModelRegistrarEmprendimientoHistorico = async (idUsuario, ipCliente, carga) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [ipCliente]);

        await obtenerRevisorArea(conexion, idUsuario, true);

        const [expedientePrevio] = await conexion.query(
            'SELECT idExpediente FROM Expediente WHERE NroExpediente = ? LIMIT 1',
            [carga.nroExpediente]
        );
        if (expedientePrevio.length > 0) {
            throw errorAprobacion('Ya existe una solicitud registrada con ese número de expediente.', 'EXPEDIENTE_DUPLICADO');
        }

        const [solicitud] = await conexion.query(
            `INSERT INTO SolicitudInicio (DireccionPDF, FechaRecibidoMesa, EstadoRevisionArea, AprobacionArea,
                    EnvioMinistro, AprobacionMinistro, FechaResolucionMin, CargaHistorica)
             VALUES (?, ?, 2, TRUE, 1, TRUE, ?, TRUE)`,
            [carga.direccionPdfSolicitud, carga.fechaRecibidoMesa, carga.fechaResolucionMin]
        );
        const idSolicitud = solicitud.insertId;

        await conexion.query(
            'INSERT INTO Expediente (NroExpediente, idSolicitudInicio, idEmpleadoCargo) VALUES (?, ?, ?)',
            [carga.nroExpediente, idSolicitud, idUsuario]
        );

        const { idEmprendimiento } = await insertarEmprendimientoConEmprendedor(
            conexion, idSolicitud, carga.emprendimiento, carga.emprendedor
        );

        // Facturas y puesta en marcha solo se permiten con la ayuda aprobada (CHECK de la tabla)
        const { ayuda } = carga;
        const aprobado = ayuda.estado === 'Aprobado' ? true : ayuda.estado === 'Rechazado' ? false : null;
        const valorSeguimiento = aprobado === true ? 0 : null;
        const tablaAyuda = ayuda.tipo === 'Subsidio' ? 'Subsidio' : 'Credito';
        const columnaPdf = ayuda.tipo === 'Subsidio' ? 'PathFormularioSub' : 'PathFormularioCredito';
        await conexion.query(
            `INSERT INTO ${tablaAyuda} (${columnaPdf}, monto, FechaRecibido, Aprobado, FechaResolucion,
                    MensajeResolucion, FacturasEntregadas, PuestaMarchaAcreditada, idSolicitudInicio)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ayuda.direccionPdf, ayuda.monto, ayuda.fechaRecibido, aprobado,
                aprobado === null ? null : ayuda.fechaResolucion, ayuda.mensajeResolucion,
                valorSeguimiento, valorSeguimiento, idSolicitud
            ]
        );

        await conexion.commit();
        return { idSolicitud, idEmprendimiento };
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