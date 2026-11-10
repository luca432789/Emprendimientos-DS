import { pool } from '../config/db.js';

// Revisión de Subsidios y Créditos por el Área (la misma para los dos; el crédito suma su garante y la parte
// del formulario que se pide reenviar). tipo: 'subsidio' | 'credito' (como en las rutas de la API)
const TABLAS = {
    subsidio: { tabla: 'Subsidio', id: 'idSubsidio', path: 'PathFormularioSub', nombre: 'subsidio', Nombre: 'Subsidio', rechazo: 'Rechazado por Subsidio' },
    credito: { tabla: 'Credito', id: 'idCredito', path: 'PathFormularioCredito', nombre: 'crédito', Nombre: 'Crédito', rechazo: 'Rechazado por Crédito' }
};

export const TIPOS_AYUDA = Object.keys(TABLAS);

// Partes del formulario de crédito que el Área puede pedir reenviar
export const PARTES_REENVIO_CREDITO = ['Completo', 'Titular', 'Garante'];

// De cada solicitud de inicio se toma solo su pedido más reciente (no debería haber más de uno)
const ultimoPedido = ({ tabla, id }) =>
    `a.${id} = (SELECT MAX(u.${id}) FROM ${tabla} u WHERE u.idSolicitudInicio = a.idSolicitudInicio)`;

// Crédito: el garante vigente es el de mayor idGarante (hoy cada crédito tiene una sola fila; los viejos pueden tener varias)
const columnasGarante = (tipo) => tipo === 'credito'
    ? `, a.ParteReenvio, g.PathFormularioGarante AS DireccionPDFGarante, g.NombreCompleto AS Garante`
    : `, NULL AS ParteReenvio, NULL AS DireccionPDFGarante, NULL AS Garante`;
const joinGarante = (tipo) => tipo === 'credito'
    ? 'LEFT JOIN Garante g ON g.idGarante = (SELECT MAX(h.idGarante) FROM Garante h WHERE h.idCredito = a.idCredito)'
    : '';

// Pedidos de Subsidio / Crédito que nadie comenzó a revisar (EstadoRevision 0)
export const modelAyudasSinRevisar = async (tipo) => {
    const config = TABLAS[tipo];
    const { tabla, id, path } = config;
    const [filas] = await pool.query(`
        SELECT a.${id} AS id, a.idSolicitudInicio, a.monto, a.FechaRecibido, a.${path} AS DireccionPDF,
               COALESCE(e.Nombre, d.EmprendimientoNombre) AS Emprendimiento,
               TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)) AS Solicitante
               ${columnasGarante(tipo)}
        FROM ${tabla} a
        LEFT JOIN Emprendimiento e ON e.idSolicitudInicio = a.idSolicitudInicio
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = a.idSolicitudInicio
        ${joinGarante(tipo)}
        WHERE a.Aprobado IS NULL AND a.EstadoRevision = 0 AND ${ultimoPedido(config)}
        ORDER BY a.FechaRecibido, a.${id};
    `);
    return filas;
};

// Pedidos "En Revisión": compartidos por todo el Área (cualquier empleado puede continuarlos)
export const modelAyudasEnRevision = async (tipo) => {
    const config = TABLAS[tipo];
    const { tabla, id, path } = config;
    const [filas] = await pool.query(`
        SELECT a.${id} AS id, a.idSolicitudInicio, a.monto, a.MontoAnterior, a.FechaRecibido,
               a.${path} AS DireccionPDF, a.ReenvioSolicitado, a.MensajeSolicitudReenvio,
               s.DireccionPDF AS DireccionPDFInicio, x.NroExpediente,
               d.EmprendimientoNombre AS Emprendimiento, d.EmprendimientoDepto AS Departamento,
               TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)) AS Solicitante, d.PersonaCorreo AS Correo
               ${columnasGarante(tipo)}
        FROM ${tabla} a
        INNER JOIN SolicitudInicio s ON s.idSolicitudInicio = a.idSolicitudInicio
        LEFT JOIN Expediente x ON x.idSolicitudInicio = a.idSolicitudInicio
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = a.idSolicitudInicio
        ${joinGarante(tipo)}
        WHERE a.Aprobado IS NULL AND a.EstadoRevision = 1 AND ${ultimoPedido(config)}
        ORDER BY a.FechaRecibido, a.${id};
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

// Bloquea el pedido y trae lo necesario para validar el paso
const bloquearAyuda = async (conexion, tipo, idAyuda) => {
    const { tabla, id, nombre } = TABLAS[tipo];
    const [[ayuda]] = await conexion.query(
        `SELECT a.${id} AS id, a.idSolicitudInicio, a.monto, a.EstadoRevision, a.Aprobado,
                (${ultimoPedido(TABLAS[tipo])}) AS EsUltimo
         FROM ${tabla} a WHERE a.${id} = ? FOR UPDATE;`,
        [idAyuda]
    );
    if (!ayuda) throw errorAyuda(`No se encontró el ${nombre}.`, 'NO_ENCONTRADO');
    if (ayuda.Aprobado !== null || Number(ayuda.EstadoRevision) === 2) {
        throw errorAyuda(`Este ${nombre} ya fue resuelto por otro empleado. Actualice la lista.`, 'YA_RESUELTO');
    }
    if (!Number(ayuda.EsUltimo)) {
        throw errorAyuda(`Este ${nombre} fue reemplazado por uno más reciente de la misma solicitud.`, 'NO_VIGENTE');
    }
    return ayuda;
};

const exigirEnRevision = (tipo, ayuda) => {
    if (Number(ayuda.EstadoRevision) !== 1) {
        throw errorAyuda(`Primero hay que comenzar la revisión del ${TABLAS[tipo].nombre}.`, 'SIN_COMENZAR');
    }
};

// Datos del correo al emprendedor (y del estado actual, para reintentar el correo si falló)
export const modelDatosCorreoAyuda = async (tipo, idAyuda, conexion = pool) => {
    const { tabla, id } = TABLAS[tipo];
    const [[datos]] = await conexion.query(
        `SELECT a.${id} AS id, a.Aprobado, a.ReenvioSolicitado, a.MensajeSolicitudReenvio, a.MotivoRechazo, a.FechaResolucion,
                ${tipo === 'credito' ? 'a.ParteReenvio' : 'NULL AS ParteReenvio'},
                x.NroExpediente, d.PersonaCorreo AS Correo, d.EmprendimientoNombre AS Emprendimiento,
                TRIM(CONCAT_WS(' ', d.PersonaNombre, d.PersonaApellido)) AS Solicitante
         FROM ${tabla} a
         LEFT JOIN Expediente x ON x.idSolicitudInicio = a.idSolicitudInicio
         LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = a.idSolicitudInicio
         WHERE a.${id} = ?;`,
        [idAyuda]
    );
    return datos;
};

// "Comenzar revisión": pasa de Sin Revisar (0) a En Revisión (1)
export const modelIniciarRevisionAyuda = (tipo, idAyuda, auditoria) => ejecutarConAuditoria(auditoria, async (conexion) => {
    const { tabla, id, nombre } = TABLAS[tipo];
    const ayuda = await bloquearAyuda(conexion, tipo, idAyuda);
    if (Number(ayuda.EstadoRevision) !== 0) {
        throw errorAyuda(`Otro empleado ya comenzó la revisión de este ${nombre}: está en "En Revisión".`, 'YA_COMENZADO');
    }
    await conexion.query(`UPDATE ${tabla} SET EstadoRevision = 1 WHERE ${id} = ?;`, [idAyuda]);
});

// "Solicitar reenvío/datos": habilita al emprendedor a reenviar el formulario (una sola vez por pedido).
// En el crédito, parte dice qué se reenvía: 'Completo', 'Titular' (hojas 1 a 6 y presupuestos) o 'Garante' (hoja 7 y sus documentos)
export const modelSolicitarReenvioAyuda = (tipo, idAyuda, mensaje, parte, auditoria) => ejecutarConAuditoria(auditoria, async (conexion) => {
    const { tabla, id } = TABLAS[tipo];
    exigirEnRevision(tipo, await bloquearAyuda(conexion, tipo, idAyuda));
    if (tipo === 'credito') {
        // El reenvío de una sola parte rearma el documento con la otra parte guardada: hace falta el garante registrado
        const [[garante]] = await conexion.query('SELECT COUNT(*) AS cantidad FROM Garante WHERE idCredito = ?;', [idAyuda]);
        if (parte !== 'Completo' && !Number(garante.cantidad)) {
            throw errorAyuda('Este crédito no tiene un garante registrado: solo se puede pedir el reenvío del formulario completo.', 'SIN_GARANTE');
        }
        await conexion.query(
            'UPDATE Credito SET ReenvioSolicitado = 1, MensajeSolicitudReenvio = ?, ParteReenvio = ? WHERE idCredito = ?;',
            [mensaje, parte, idAyuda]
        );
    } else {
        await conexion.query(`UPDATE ${tabla} SET ReenvioSolicitado = 1, MensajeSolicitudReenvio = ? WHERE ${id} = ?;`, [mensaje, idAyuda]);
    }
    return modelDatosCorreoAyuda(tipo, idAyuda, conexion);
});

// Empleado (activo) del usuario que toma la decisión: queda como idEmpleadoRevisor
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
// ("Rechazado por Subsidio" / "Rechazado por Crédito") y sale de la bandeja de envío al Ministro.
export const modelResolverAyuda = (tipo, idAyuda, aprobado, motivoRechazo, auditoria) => ejecutarConAuditoria(auditoria, async (conexion) => {
    const { tabla, id, rechazo } = TABLAS[tipo];
    const ayuda = await bloquearAyuda(conexion, tipo, idAyuda);
    exigirEnRevision(tipo, ayuda);
    const idEmpleado = await empleadoDelUsuario(conexion, auditoria.idUsuario);

    // Facturas y puesta en marcha solo existen con la ayuda aprobada (CHECK de la tabla): al aprobar arrancan
    // en 0 (sin entregar / sin acreditar) y al rechazar van en NULL
    await conexion.query(
        `UPDATE ${tabla}
         SET Aprobado = ?, FechaResolucion = CURRENT_DATE(), EstadoRevision = 2, ReenvioSolicitado = 0,
             MotivoRechazo = ?, idEmpleadoRevisor = ?,
             FacturasEntregadas = IF(? = 1, COALESCE(FacturasEntregadas, 0), NULL),
             PuestaMarchaAcreditada = IF(? = 1, COALESCE(PuestaMarchaAcreditada, 0), NULL)
         WHERE ${id} = ?;`,
        [aprobado, aprobado ? null : motivoRechazo, idEmpleado, aprobado, aprobado, idAyuda]
    );
    if (!aprobado) {
        await conexion.query(
            `UPDATE SolicitudInicio SET MensajeResolucionFinal = ?, FechaResolucionFinal = CURRENT_DATE
             WHERE idSolicitudInicio = ? AND MensajeResolucionFinal IS NULL;`,
            [rechazo, ayuda.idSolicitudInicio]
        );
    }
    return modelDatosCorreoAyuda(tipo, idAyuda, conexion);
});
