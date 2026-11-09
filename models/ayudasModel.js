import { pool } from '../config/db.js';

// Pedidos de Subsidio / Crédito que todavía no revisó nadie del área
// (sin resolución y sin empleado revisor asignado)
const TABLAS = {
    subsidio: { tabla: 'Subsidio', id: 'idSubsidio', path: 'PathFormularioSub' },
    credito: { tabla: 'Credito', id: 'idCredito', path: 'PathFormularioCredito' }
};

export const TIPOS_AYUDA = Object.keys(TABLAS);

// De cada solicitud de inicio se toma solo su subsidio más reciente (no debería haber más de uno)
const ULTIMO_SUBSIDIO = 'a.idSubsidio = (SELECT MAX(u.idSubsidio) FROM Subsidio u WHERE u.idSolicitudInicio = a.idSolicitudInicio)';

export const modelAyudasSinRevisar = async (tipo) => {
    const { tabla, id, path } = TABLAS[tipo];
    // Subsidios: los que nadie comenzó a revisar (EstadoRevision 0)
    const condicion = tipo === 'subsidio'
        ? `a.Aprobado IS NULL AND a.EstadoRevision = 0 AND ${ULTIMO_SUBSIDIO}`
        : 'a.Aprobado IS NULL AND a.idEmpleadoRevisor IS NULL';
    const [filas] = await pool.query(`
        SELECT a.${id} AS id, a.idSolicitudInicio, a.monto, a.FechaRecibido, a.${path} AS DireccionPDF,
               COALESCE(e.Nombre, d.EmprendimientoNombre) AS Emprendimiento,
               TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)) AS Solicitante
        FROM ${tabla} a
        LEFT JOIN Emprendimiento e ON e.idSolicitudInicio = a.idSolicitudInicio
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = a.idSolicitudInicio
        WHERE ${condicion}
        ORDER BY a.FechaRecibido, a.${id};
    `);
    return filas;
};

// Subsidios "En Revisión": compartidos por todo el Área (cualquier empleado puede continuarlos)
export const modelSubsidiosEnRevision = async () => {
    const [filas] = await pool.query(`
        SELECT a.idSubsidio AS id, a.idSolicitudInicio, a.monto, a.MontoAnterior, a.FechaRecibido,
               a.PathFormularioSub AS DireccionPDF, a.ReenvioSolicitado, a.MensajeSolicitudReenvio,
               s.DireccionPDF AS DireccionPDFInicio, x.NroExpediente,
               d.EmprendimientoNombre AS Emprendimiento, d.EmprendimientoDepto AS Departamento,
               TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)) AS Solicitante, d.PersonaCorreo AS Correo
        FROM Subsidio a
        INNER JOIN SolicitudInicio s ON s.idSolicitudInicio = a.idSolicitudInicio
        LEFT JOIN Expediente x ON x.idSolicitudInicio = a.idSolicitudInicio
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = a.idSolicitudInicio
        WHERE a.Aprobado IS NULL AND a.EstadoRevision = 1 AND ${ULTIMO_SUBSIDIO}
        ORDER BY a.FechaRecibido, a.idSubsidio;
    `);
    return filas;
};

const errorAyuda = (mensaje, codigo) => Object.assign(new Error(mensaje), { codigo });

const ejecutarConAuditoria = async ({ idUsuario, ipCliente }, consultas) => {
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?, @usuario_ip = ?;', [idUsuario, ipCliente]);
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

// Bloquea el subsidio y trae lo necesario para validar el paso y escribir el correo al emprendedor
const bloquearSubsidio = async (conexion, idSubsidio) => {
    const [[subsidio]] = await conexion.query(
        `SELECT a.idSubsidio, a.idSolicitudInicio, a.monto, a.EstadoRevision, a.Aprobado,
                (a.idSubsidio = (SELECT MAX(u.idSubsidio) FROM Subsidio u WHERE u.idSolicitudInicio = a.idSolicitudInicio)) AS EsUltimo
         FROM Subsidio a WHERE a.idSubsidio = ? FOR UPDATE;`,
        [idSubsidio]
    );
    if (!subsidio) throw errorAyuda('No se encontró el subsidio.', 'NO_ENCONTRADO');
    if (subsidio.Aprobado !== null || Number(subsidio.EstadoRevision) === 2) {
        throw errorAyuda('Este subsidio ya fue resuelto por otro empleado. Actualice la lista.', 'YA_RESUELTO');
    }
    if (!Number(subsidio.EsUltimo)) {
        throw errorAyuda('Este subsidio fue reemplazado por uno más reciente de la misma solicitud.', 'NO_VIGENTE');
    }
    return subsidio;
};

const exigirEnRevision = (subsidio) => {
    if (Number(subsidio.EstadoRevision) !== 1) {
        throw errorAyuda('Primero hay que comenzar la revisión del subsidio.', 'SIN_COMENZAR');
    }
};

// Datos del correo al emprendedor (y del estado actual, para reintentar el correo si falló)
export const modelDatosCorreoSubsidio = async (idSubsidio, conexion = pool) => {
    const [[datos]] = await conexion.query(
        `SELECT a.idSubsidio, a.Aprobado, a.ReenvioSolicitado, a.MensajeSolicitudReenvio, a.MotivoRechazo, a.FechaResolucion,
                x.NroExpediente, d.PersonaCorreo AS Correo, d.EmprendimientoNombre AS Emprendimiento,
                TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)) AS Solicitante
         FROM Subsidio a
         LEFT JOIN Expediente x ON x.idSolicitudInicio = a.idSolicitudInicio
         LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = a.idSolicitudInicio
         WHERE a.idSubsidio = ?;`,
        [idSubsidio]
    );
    return datos;
};

// "Comenzar revisión": pasa de Sin Revisar (0) a En Revisión (1)
export const modelIniciarRevisionSubsidio = (idSubsidio, auditoria) => ejecutarConAuditoria(auditoria, async (conexion) => {
    const subsidio = await bloquearSubsidio(conexion, idSubsidio);
    if (Number(subsidio.EstadoRevision) !== 0) {
        throw errorAyuda('Otro empleado ya comenzó la revisión de este subsidio: está en "En Revisión".', 'YA_COMENZADO');
    }
    await conexion.query('UPDATE Subsidio SET EstadoRevision = 1 WHERE idSubsidio = ?;', [idSubsidio]);
});

// "Solicitar reenvío/datos": habilita al emprendedor a reenviar el formulario (una sola vez por pedido)
export const modelSolicitarReenvioSubsidio = (idSubsidio, mensaje, auditoria) => ejecutarConAuditoria(auditoria, async (conexion) => {
    exigirEnRevision(await bloquearSubsidio(conexion, idSubsidio));
    await conexion.query(
        'UPDATE Subsidio SET ReenvioSolicitado = 1, MensajeSolicitudReenvio = ? WHERE idSubsidio = ?;',
        [mensaje, idSubsidio]
    );
    return modelDatosCorreoSubsidio(idSubsidio, conexion);
});

// Empleado (activo) del usuario que toma la decisión: queda como idEmpleadoRevisor del subsidio
const empleadoDelUsuario = async (conexion, idUsuario) => {
    const [[fila]] = await conexion.query(
        `SELECT e.idEmpleado FROM Usuario u
         INNER JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         WHERE u.idUsuario = ? AND u.Activa = 1 AND e.Activo = 1;`,
        [idUsuario]
    );
    if (!fila) throw errorAyuda('Se requiere una cuenta y ficha de empleado activas.', 'EMPLEADO_INACTIVO');
    return fila.idEmpleado;
};

// "Tomar decisión": aprueba o rechaza. Si se rechaza, la solicitud de inicio queda finalizada
// ("Rechazado por Subsidio") y sale de la bandeja de envío al Ministro.
export const modelResolverSubsidio = (idSubsidio, aprobado, motivoRechazo, auditoria) => ejecutarConAuditoria(auditoria, async (conexion) => {
    const subsidio = await bloquearSubsidio(conexion, idSubsidio);
    exigirEnRevision(subsidio);
    const idEmpleado = await empleadoDelUsuario(conexion, auditoria.idUsuario);

    // Facturas y puesta en marcha solo existen con el subsidio aprobado (CHECK de la tabla): al aprobar arrancan
    // en 0 (sin entregar / sin acreditar) y al rechazar van en NULL
    await conexion.query(
        `UPDATE Subsidio
         SET Aprobado = ?, FechaResolucion = CURRENT_DATE(), EstadoRevision = 2, ReenvioSolicitado = 0,
             MotivoRechazo = ?, idEmpleadoRevisor = ?,
             FacturasEntregadas = IF(? = 1, COALESCE(FacturasEntregadas, 0), NULL),
             PuestaMarchaAcreditada = IF(? = 1, COALESCE(PuestaMarchaAcreditada, 0), NULL)
         WHERE idSubsidio = ?;`,
        [aprobado, aprobado ? null : motivoRechazo, idEmpleado, aprobado, aprobado, idSubsidio]
    );
    if (!aprobado) {
        await conexion.query(
            `UPDATE SolicitudInicio SET MensajeResolucionFinal = 'Rechazado por Subsidio', FechaResolucionFinal = CURRENT_DATE
             WHERE idSolicitudInicio = ? AND MensajeResolucionFinal IS NULL;`,
            [subsidio.idSolicitudInicio]
        );
    }
    return modelDatosCorreoSubsidio(idSubsidio, conexion);
});
