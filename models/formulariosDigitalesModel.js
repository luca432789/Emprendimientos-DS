import { pool } from '../config/db.js';
import { DIAS_ESPERA_NUEVA_SOLICITUD } from '../helpers/correo.js';

// Ejecuta las consultas en una conexión dedicada con las variables de auditoría cargadas,
// así los triggers registran quién hizo la acción (idUsuario null = formulario público)
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
        await conexion.query('DO RELEASE_ALL_LOCKS();').catch(() => {}); // por si la consulta tomó un GET_LOCK
        conexion.release();
    }
};

// Formulario de Inicio: crea la SolicitudInicio y sus datos (tabla inmutable).
// La restricción por DNI / correo se vuelve a comprobar con un bloqueo, para que dos envíos simultáneos
// de la misma persona no pasen los dos
export const modelRegistrarSolicitudInicio = async (direccionPDF, datos, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [[bloqueo]] = await conexion.query("SELECT GET_LOCK('nueva_solicitud_inicio', 15) AS tomado;");
        if (Number(bloqueo.tomado) !== 1) {
            throw Object.assign(new Error('El servidor está ocupado. Vuelva a intentarlo en unos segundos.'), { code: 'SOLICITUD_RESTRINGIDA' });
        }
        const restriccion = await modelRestriccionNuevaSolicitud(datos.dniCuit, datos.correo, conexion);
        if (restriccion) throw Object.assign(new Error(restriccion), { code: 'SOLICITUD_RESTRINGIDA' });

        const [solicitud] = await conexion.query(
            'INSERT INTO SolicitudInicio (DireccionPDF) VALUES (?);',
            [direccionPDF]
        );

        await conexion.query(
            `INSERT INTO DatosSolicitudInicio
                (PersonaNombre, PersonaApellido, PersonaDNI, PersonaDepartamento, PersonaLocalidad,
                 PersonaDomicilio, PersonaTeléfono, PersonaCorreo, EmprendimientoNombre, EmprendimientoCalle,
                 EmprendimientoNroCalle, EmprendimientoBarrio, EmprendimientoDepto, EmprendimientoLocalidad,
                 EmprendimientoActPrincipal, EmprendimientoMarcha, EmprendimientoRubro, EleccionAyuda, idSolicitudInicio)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                datos.nombre, datos.apellido, datos.dniCuit, datos.departamentoPersona, datos.localidad,
                datos.domicilio, datos.telefono, datos.correo, datos.nombreEmprendimiento, datos.calleEmprendimiento,
                datos.numeroEmprendimiento, datos.barrio, datos.departamento, datos.localidadEmprendimiento,
                datos.actividadPrincipal, datos.enMarcha === 'Sí', datos.rubro, datos.tipoFinanciamiento,
                solicitud.insertId
            ]
        );

        return solicitud.insertId;
    });
};

// Una persona (mismo DNI o mismo correo) solo puede presentar una nueva Solicitud de Inicio si:
//  - no tiene un usuario registrado (emprendedor, incluso de carga histórica, empleado o cualquier cuenta con ese correo),
//  - no tiene otra solicitud en trámite (sin resolución final) ni una aprobada por el Ministro,
//  - y su último rechazo fue hace al menos DIAS_ESPERA_NUEVA_SOLICITUD días.
// Devuelve el mensaje para el emprendedor, o null si puede presentarla.
export const modelRestriccionNuevaSolicitud = async (dni, correo, conexion = pool) => {
    const [[registrado]] = await conexion.query(
        `SELECT EXISTS (SELECT 1 FROM Emprendedor WHERE DNI = ? OR Correo = ?)
                OR EXISTS (SELECT 1 FROM Empleado WHERE DNI = ? OR Correo = ?)
                OR EXISTS (SELECT 1 FROM Usuario WHERE Correo = ?) AS existe;`,
        [dni, correo, dni, correo, correo]
    );
    if (Number(registrado.existe) === 1) {
        return 'Ya existe un usuario registrado con este DNI o correo electrónico. Si ya tiene un emprendimiento aprobado, '
            + 'inicie sesión con su cuenta.';
    }

    const [[anteriores]] = await conexion.query(
        `SELECT COALESCE(SUM(s.MensajeResolucionFinal IS NULL), 0) AS EnTramite,
                COALESCE(SUM(s.AprobacionMinistro = 1), 0) AS Aprobadas,
                MAX(DATE_ADD(s.FechaResolucionFinal, INTERVAL ? DAY)) > CURRENT_DATE AS EnEspera,
                DATE_FORMAT(MAX(DATE_ADD(s.FechaResolucionFinal, INTERVAL ? DAY)), '%d/%m/%Y') AS HabilitadaDesde
         FROM DatosSolicitudInicio d
         INNER JOIN SolicitudInicio s ON s.idSolicitudInicio = d.idSolicitudInicio
         WHERE d.PersonaDNI = ? OR d.PersonaCorreo = ?;`,
        [DIAS_ESPERA_NUEVA_SOLICITUD, DIAS_ESPERA_NUEVA_SOLICITUD, dni, correo]
    );
    if (Number(anteriores.EnTramite) > 0) {
        return 'Ya hay una Solicitud de Inicio en trámite con este DNI o correo electrónico. '
            + 'Podrá presentar otra solo si esa solicitud es rechazada.';
    }
    if (Number(anteriores.Aprobadas) > 0) {
        return 'Ya hay una Solicitud de Inicio aprobada con este DNI o correo electrónico. Inicie sesión con su cuenta de emprendedor.';
    }
    if (Number(anteriores.EnEspera) === 1) {
        return `Su Solicitud de Inicio anterior fue rechazada hace menos de ${DIAS_ESPERA_NUEVA_SOLICITUD} días. `
            + `Podrá presentar una nueva a partir del ${anteriores.HabilitadaDesde}.`;
    }
    return null;
};

// Subsidio y Crédito: el emprendedor se identifica con el Nº de expediente, el correo y el DNI de su solicitud de inicio
// y completa el formulario de la ayuda que eligió. Ambas tablas tienen las mismas columnas de revisión.
const tablasAyuda = {
    Subsidio: { tabla: 'Subsidio', id: 'idSubsidio', path: 'PathFormularioSub', nombre: 'subsidio' },
    Credito: { tabla: 'Credito', id: 'idCredito', path: 'PathFormularioCredito', nombre: 'crédito' }
};

// Devuelve la solicitud con sus datos y el último pedido enviado de esa ayuda (si hay), o undefined si no coinciden los tres.
// Crédito: también la parte que el Área pidió reenviar y el garante vigente (el de mayor idGarante), para el reenvío
// (sus datos se vuelven a cargar en el formulario)
export const modelBuscarSolicitudParaAyuda = async (tipo, nroExpediente, correo, dni) => {
    const { tabla, id, path } = tablasAyuda[tipo];
    const esCredito = tipo === 'Credito';
    const [filas] = await pool.query(
        `SELECT s.idSolicitudInicio, s.AprobacionArea, s.EnvioMinistro, s.MensajeResolucionFinal, x.NroExpediente,
                d.PersonaNombre, d.PersonaApellido, d.PersonaDNI, d.PersonaDepartamento, d.PersonaLocalidad,
                d.PersonaDomicilio, d.PersonaTeléfono AS PersonaTelefono, d.PersonaCorreo, d.EmprendimientoNombre,
                d.EmprendimientoDepto, d.EmprendimientoLocalidad, d.EmprendimientoActPrincipal, d.EmprendimientoRubro,
                d.EleccionAyuda, a.${id} AS idAyuda, a.Aprobado AS AyudaAprobado, a.EstadoRevision AS AyudaEstado,
                a.ReenvioSolicitado, a.MensajeSolicitudReenvio, a.monto AS AyudaMonto, a.${path} AS AyudaPath,
                ${esCredito
                    ? `a.ParteReenvio, g.PathFormularioGarante AS GarantePath, g.NombreCompleto AS GaranteNombre, g.DNI AS GaranteDNI,
                       g.Cuil AS GaranteCuil, g.Telefono AS GaranteTelefono, g.Correo AS GaranteCorreo`
                    : 'NULL AS ParteReenvio, NULL AS GarantePath'}
         FROM Expediente x
         INNER JOIN SolicitudInicio s ON s.idSolicitudInicio = x.idSolicitudInicio
         INNER JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = s.idSolicitudInicio
         LEFT JOIN ${tabla} a ON a.${id} =
              (SELECT MAX(u.${id}) FROM ${tabla} u WHERE u.idSolicitudInicio = s.idSolicitudInicio)
         ${esCredito ? 'LEFT JOIN Garante g ON g.idGarante = (SELECT MAX(h.idGarante) FROM Garante h WHERE h.idCredito = a.idCredito)' : ''}
         WHERE x.NroExpediente = ? AND LOWER(TRIM(d.PersonaCorreo)) = LOWER(?) AND UPPER(TRIM(d.PersonaDNI)) = UPPER(?)
         LIMIT 1;`,
        [nroExpediente, correo, dni]
    );
    return filas[0];
};

const errorAyuda = (mensaje, codigo) => Object.assign(new Error(mensaje), { codigo });

export const mensajeAyudaEnRevision = (tipo) => `Ya recibimos su formulario de ${tablasAyuda[tipo].nombre} y el Área lo está revisando. `
    + 'Solo puede volver a enviarlo si el Área se lo solicita por correo.';

// Registra el subsidio o el crédito de la solicitud. Si ya hay uno sin finalizar, solo lo reemplaza cuando el Área pidió
// el reenvío (ReenvioSolicitado), y devuelve el PDF anterior para borrarlo.
// En el crédito también se guarda el garante: el primer envío agrega su fila y los reenvíos la actualizan (devuelve el
// PDF anterior del garante para borrarlo). En un reenvío parcial, parteReenvio es la parte que se armó ('Titular' sin
// datos del garante, 'Garante' con ellos).
// Las condiciones se vuelven a comprobar con las filas bloqueadas, por si cambiaron desde la verificación.
export const modelRegistrarAyudaDeSolicitud = async (tipo, idSolicitudInicio, pathFormulario, monto, datosAuditoria, garante = null, parteReenvio = null) => {
    const { tabla, id, path, nombre } = tablasAyuda[tipo];
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [[solicitud]] = await conexion.query(
            'SELECT AprobacionArea, EnvioMinistro, MensajeResolucionFinal FROM SolicitudInicio WHERE idSolicitudInicio = ? FOR UPDATE;',
            [idSolicitudInicio]
        );
        if (!solicitud || Number(solicitud.AprobacionArea) !== 1 || Number(solicitud.EnvioMinistro) !== 0 || solicitud.MensajeResolucionFinal) {
            throw errorAyuda(`La solicitud ya no admite el envío del formulario de ${nombre}.`, 'SOLICITUD_NO_DISPONIBLE');
        }

        const [[previo]] = await conexion.query(
            `SELECT ${id} AS idAyuda, ${path} AS pathFormulario, Aprobado, EstadoRevision, ReenvioSolicitado,
                    ${tipo === 'Credito' ? 'ParteReenvio' : 'NULL AS ParteReenvio'} FROM ${tabla}
             WHERE idSolicitudInicio = ? ORDER BY ${id} DESC LIMIT 1 FOR UPDATE;`,
            [idSolicitudInicio]
        );
        if (previo && (previo.Aprobado !== null || Number(previo.EstadoRevision) === 2)) {
            throw errorAyuda(`El ${nombre} de este expediente ya fue resuelto y no admite cambios.`, 'AYUDA_FINALIZADA');
        }
        if (previo && !Number(previo.ReenvioSolicitado)) {
            throw errorAyuda(mensajeAyudaEnRevision(tipo), 'REENVIO_NO_SOLICITADO');
        }
        // El formulario se armó con la parte pedida al verificar: si el Área cambió el pedido mientras tanto, se vuelve a empezar
        if (previo && tipo === 'Credito' && (previo.ParteReenvio || 'Completo') !== (parteReenvio || 'Completo')) {
            throw errorAyuda('El Área cambió el pedido de reenvío mientras completaba el formulario. Vuelva a verificar sus datos y complete la parte que se le solicita.', 'REENVIO_CAMBIADO');
        }

        let idAyuda;
        if (previo) {
            // MontoAnterior va antes que monto: MySQL asigna en orden y así toma el monto del envío anterior.
            // Recibido el reenvío, se cierra el pedido (el Área puede volver a pedirlo).
            await conexion.query(
                `UPDATE ${tabla}
                 SET ${path} = ?, MontoAnterior = IF(monto <> ?, monto, MontoAnterior), monto = ?,
                     FechaRecibido = CURRENT_DATE(), ReenvioSolicitado = 0
                 WHERE ${id} = ?;`,
                [pathFormulario, monto, monto, previo.idAyuda]
            );
            idAyuda = previo.idAyuda;
        } else {
            const [resultado] = await conexion.query(
                `INSERT INTO ${tabla} (${path}, monto, FechaRecibido, idSolicitudInicio) VALUES (?, ?, CURRENT_DATE(), ?);`,
                [pathFormulario, monto, idSolicitudInicio]
            );
            idAyuda = resultado.insertId;
        }

        // El crédito tiene un solo garante: en el reenvío se actualiza su fila (el trigger registra qué cambió)
        let garantePathAnterior = null;
        if (garante) {
            const [[vigente]] = await conexion.query(
                'SELECT idGarante, PathFormularioGarante FROM Garante WHERE idCredito = ? ORDER BY idGarante DESC LIMIT 1;',
                [idAyuda]
            );
            const valores = [garante.nombre, garante.dni, garante.cuil, garante.telefono, garante.correo, garante.pathFormulario];
            if (vigente) {
                await conexion.query(
                    `UPDATE Garante SET NombreCompleto = ?, DNI = ?, Cuil = ?, Telefono = ?, Correo = ?, PathFormularioGarante = ?
                     WHERE idGarante = ?;`,
                    [...valores, vigente.idGarante]
                );
                garantePathAnterior = vigente.PathFormularioGarante;
            } else {
                await conexion.query(
                    `INSERT INTO Garante (NombreCompleto, DNI, Cuil, Telefono, Correo, PathFormularioGarante, idCredito)
                     VALUES (?, ?, ?, ?, ?, ?, ?);`,
                    [...valores, idAyuda]
                );
            }
        }
        return { idAyuda, pathAnterior: previo?.pathFormulario ?? null, garantePathAnterior };
    });
};
