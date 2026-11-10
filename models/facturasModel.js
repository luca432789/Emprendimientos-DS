import { pool } from '../config/db.js';

// Facturas de Ley: después de que el Ministro aprueba la solicitud, el emprendedor rinde la compra hecha con su
// Subsidio o Crédito. Las va subiendo de a una (quedan en la carpeta PathDirectorioFacturas) y recién las manda
// a revisar con "Enviar a revisar las Facturas" (FacturasEntregadas = 1).
// Las solicitudes de la carga histórica no rinden facturas desde el sistema.
const TABLAS = {
    subsidio: { tabla: 'Subsidio', columnaId: 'idSubsidio', Nombre: 'Subsidio' },
    credito: { tabla: 'Credito', columnaId: 'idCredito', Nombre: 'Crédito' }
};

// Días para entregar las facturas, contados desde la aprobación del Ministro
export const DIAS_PLAZO_FACTURAS = 30;

export const errorFacturas = (mensaje, codigo) => Object.assign(new Error(mensaje), { codigo });

// Subsidio o Crédito aprobado de la solicitud del emprendedor (su pedido más reciente)
const consultaAyuda = (tipo) => {
    const { tabla, columnaId: id } = TABLAS[tipo];
    return `
        SELECT '${tipo}' AS tipo, a.${id} AS id, a.FacturasEntregadas, a.FechaEntregaFacturas, a.FechaFacturasValidadas,
               a.MotivoObservacionFacturas, a.PathDirectorioFacturas, s.FechaResolucionMin,
               DATE_ADD(s.FechaResolucionMin, INTERVAL ${DIAS_PLAZO_FACTURAS} DAY) AS FechaLimite,
               DATEDIFF(DATE_ADD(s.FechaResolucionMin, INTERVAL ${DIAS_PLAZO_FACTURAS} DAY), CURRENT_DATE) AS DiasRestantes
        FROM Usuario u
        INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
        INNER JOIN Emprendimiento e ON e.idEmprendimiento = em.idEmprendimiento
        INNER JOIN SolicitudInicio s ON s.idSolicitudInicio = e.idSolicitudInicio
        INNER JOIN ${tabla} a ON a.idSolicitudInicio = s.idSolicitudInicio
        WHERE u.idUsuario = ? AND u.TipoUsuario = 'Emprendedor' AND u.Activa = 1
          AND s.CargaHistorica = 0 AND s.AprobacionMinistro = 1 AND a.Aprobado = 1
          AND a.${id} = (SELECT MAX(x.${id}) FROM ${tabla} x WHERE x.idSolicitudInicio = a.idSolicitudInicio)`;
};

// 'pendiente': puede subir, borrar y enviar | 'en-revision': ya las envió | 'validadas': terminado
export const estadoFacturas = (ayuda) => {
    if (ayuda.FechaFacturasValidadas) return 'validadas';
    return Number(ayuda.FacturasEntregadas) === 1 ? 'en-revision' : 'pendiente';
};

// La ayuda del emprendedor que rinde facturas, o null (sin ayuda aprobada por el Ministro o carga histórica)
export const modelAyudaDelEmprendedor = async (idUsuario, conexion = pool) => {
    const [filas] = await conexion.query(
        `${consultaAyuda('subsidio')} UNION ALL ${consultaAyuda('credito')};`,
        [idUsuario, idUsuario]
    );
    const ayuda = filas[0];
    return ayuda ? { ...ayuda, ...TABLAS[ayuda.tipo], estado: estadoFacturas(ayuda) } : null;
};

// Dentro de una transacción: bloquea la ayuda (así no se suben ni borran facturas mientras se envían a revisar)
// y exige que todavía no las haya enviado
export const bloquearAyudaPendiente = async (conexion, idUsuario) => {
    const ayuda = await modelAyudaDelEmprendedor(idUsuario, conexion);
    if (!ayuda) throw errorFacturas('Su emprendimiento no tiene un Subsidio o Crédito que deba rendir facturas.', 'SIN_AYUDA');
    const [[fila]] = await conexion.query(
        `SELECT FacturasEntregadas, FechaFacturasValidadas, PathDirectorioFacturas FROM ${ayuda.tabla} WHERE ${ayuda.columnaId} = ? FOR UPDATE;`,
        [ayuda.id]
    );
    const actual = { ...ayuda, ...fila, estado: estadoFacturas(fila) };
    if (actual.estado !== 'pendiente') {
        throw errorFacturas(actual.estado === 'validadas'
            ? 'Sus facturas ya fueron validadas.'
            : 'Sus facturas ya fueron enviadas a revisar: no se pueden modificar.', 'NO_PENDIENTE');
    }
    return actual;
};

// Ejecuta las consultas en una transacción con los datos de auditoría (los usan los triggers)
export const conTransaccion = async ({ idUsuario, ipCliente }, consultas) => {
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
        conexion.release();
    }
};

// Primera factura: queda guardada la carpeta
export const guardarCarpetaFacturas = (conexion, ayuda, carpetaWeb) => conexion.query(
    `UPDATE ${ayuda.tabla} SET PathDirectorioFacturas = ? WHERE ${ayuda.columnaId} = ? AND PathDirectorioFacturas IS NULL;`,
    [carpetaWeb, ayuda.id]
);

// Subir y borrar un archivo no cambia la fila: se registra a mano en la auditoría
export const auditarArchivoFactura = (conexion, ayuda, accion, detalle, { idUsuario, ipCliente }) => conexion.query(
    `INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [idUsuario, accion, ayuda.tabla, ayuda.id, detalle, ipCliente]
);

// "Enviar a revisar las Facturas" (el trigger registra "Rendición de facturas: Entregadas y en revisión")
export const marcarFacturasEntregadas = (conexion, ayuda) => conexion.query(
    `UPDATE ${ayuda.tabla} SET FacturasEntregadas = 1, FechaEntregaFacturas = CURRENT_DATE WHERE ${ayuda.columnaId} = ?;`,
    [ayuda.id]
);
