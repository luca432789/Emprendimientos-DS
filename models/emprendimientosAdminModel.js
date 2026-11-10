import { pool } from '../config/db.js';
import { DIAS_PLAZO_FACTURAS, conTransaccion, errorFacturas } from './facturasModel.js';

// Administración de Emprendimientos (Empleado de Área / Administrador): buscar los emprendimientos, entrar a su perfil
// y hacer lo que queda después de la aprobación del Ministro: validar u observar las Facturas de Ley, acreditar la
// puesta en marcha y marcar antecedentes al emprendedor.
export const TABLAS = {
    subsidio: { tabla: 'Subsidio', columnaId: 'idSubsidio', columnaPdf: 'PathFormularioSub', Nombre: 'Subsidio' },
    credito: { tabla: 'Credito', columnaId: 'idCredito', columnaPdf: 'PathFormularioCredito', Nombre: 'Crédito' }
};

// Días para acreditar la puesta en marcha, contados desde la aprobación del Ministro
export const DIAS_PLAZO_PUESTA_MARCHA = 90;
export const POR_PAGINA = 10;

const columnasAyuda = (tipo) => {
    const { tabla, columnaId, columnaPdf } = TABLAS[tipo];
    return `SELECT '${tipo}' AS tipo, ${columnaId} AS id, idSolicitudInicio, monto, Aprobado, FechaResolucion, ${columnaPdf} AS PathFormulario,
                   PathDirectorioFacturas, FacturasEntregadas, FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas,
                   PuestaMarchaAcreditada, FechaPuestaMarcha, idEmpleadoRevisor, idEmpleadoFacturas, idEmpleadoPuestaMarcha
            FROM ${tabla}`;
};

// Un emprendimiento por fila con su ayuda (la aprobada o, si no hay, la última) y el estado de facturas y puesta en marcha.
// Las solicitudes de la carga histórica no rinden facturas ni acreditan la puesta en marcha desde el sistema.
const CONSULTA_BASE = `
    SELECT e.idEmprendimiento, e.Nombre AS Emprendimiento, e.NroProyecto, e.Departamento, e.Localidad, e.ActividadPrincipal,
           e.idRubro, r.Nombre AS Rubro, x.NroExpediente, s.idSolicitudInicio, s.CargaHistorica, s.FechaResolucionMin,
           s.DireccionPDF AS PathSolicitudInicio,
           em.idEmprendedor, em.Nombre AS EmprendedorNombre, em.Apellido AS EmprendedorApellido, em.DNI AS EmprendedorDNI,
           em.Correo AS EmprendedorCorreo, em.Teléfono AS EmprendedorTelefono, em.Antecedentes, em.DescripcionAntecedente,
           a.tipo, a.id AS idAyuda, a.monto, a.Aprobado, a.FechaResolucion, a.PathFormulario, a.PathDirectorioFacturas,
           a.FacturasEntregadas, a.FechaEntregaFacturas, a.FechaFacturasValidadas, a.MotivoObservacionFacturas,
           a.PuestaMarchaAcreditada, a.FechaPuestaMarcha, a.idEmpleadoRevisor, a.idEmpleadoFacturas, a.idEmpleadoPuestaMarcha,
           DATE_ADD(s.FechaResolucionMin, INTERVAL ${DIAS_PLAZO_FACTURAS} DAY) AS LimiteFacturas,
           DATEDIFF(DATE_ADD(s.FechaResolucionMin, INTERVAL ${DIAS_PLAZO_FACTURAS} DAY), CURRENT_DATE) AS DiasFacturas,
           DATE_ADD(s.FechaResolucionMin, INTERVAL ${DIAS_PLAZO_PUESTA_MARCHA} DAY) AS LimitePuestaMarcha,
           DATEDIFF(DATE_ADD(s.FechaResolucionMin, INTERVAL ${DIAS_PLAZO_PUESTA_MARCHA} DAY), CURRENT_DATE) AS DiasPuestaMarcha,
           CASE
               WHEN s.CargaHistorica = 1 OR a.id IS NULL OR NOT a.Aprobado <=> 1 OR s.FechaResolucionMin IS NULL THEN 'no-corresponde'
               WHEN a.FechaFacturasValidadas IS NOT NULL THEN 'validadas'
               WHEN a.FacturasEntregadas = 1 THEN 'en-revision'
               WHEN a.MotivoObservacionFacturas IS NOT NULL THEN 'observadas'
               ELSE 'pendiente'
           END AS EstadoFacturas,
           CASE
               WHEN s.CargaHistorica = 1 OR a.id IS NULL OR NOT a.Aprobado <=> 1 OR s.FechaResolucionMin IS NULL THEN 'no-corresponde'
               WHEN a.PuestaMarchaAcreditada = 1 THEN 'acreditada'
               ELSE 'pendiente'
           END AS EstadoPuestaMarcha
    FROM Emprendimiento e
    INNER JOIN Rubro r ON r.idRubro = e.idRubro
    INNER JOIN SolicitudInicio s ON s.idSolicitudInicio = e.idSolicitudInicio
    LEFT JOIN Expediente x ON x.idSolicitudInicio = s.idSolicitudInicio
    LEFT JOIN Emprendedor em ON em.idEmprendimiento = e.idEmprendimiento
    LEFT JOIN (
        SELECT u.*, ROW_NUMBER() OVER (PARTITION BY u.idSolicitudInicio ORDER BY (u.Aprobado <=> 1) DESC, u.id DESC) AS orden
        FROM (${columnasAyuda('subsidio')} UNION ALL ${columnasAyuda('credito')}) u
    ) a ON a.idSolicitudInicio = s.idSolicitudInicio AND a.orden = 1`;

// Situaciones del filtro (sobre las columnas calculadas)
const SITUACIONES = {
    'facturas-sin-entregar': "t.EstadoFacturas IN ('pendiente', 'observadas')",
    'facturas-vencidas': "t.EstadoFacturas IN ('pendiente', 'observadas') AND t.DiasFacturas < 0",
    'facturas-para-validar': "t.EstadoFacturas = 'en-revision'",
    'facturas-validadas': "t.EstadoFacturas = 'validadas'",
    'sin-puesta-marcha': "t.EstadoPuestaMarcha = 'pendiente'",
    'con-antecedentes': 't.Antecedentes = 1',
    'carga-historica': 't.CargaHistorica = 1'
};
export const SITUACIONES_VALIDAS = Object.keys(SITUACIONES);

const condiciones = ({ expediente, proyecto, buscar, idRubro, ayuda, situacion }) => {
    const donde = [];
    const valores = [];
    if (expediente) {
        donde.push('t.NroExpediente LIKE ?');
        valores.push(`%${expediente}%`);
    }
    if (proyecto) {
        donde.push('t.NroProyecto LIKE ?');
        valores.push(`%${proyecto}%`);
    }
    if (buscar) {
        donde.push(`(t.Emprendimiento LIKE ? OR t.NroProyecto LIKE ? OR t.EmprendedorDNI LIKE ?
                     OR CONCAT_WS(' ', t.EmprendedorNombre, t.EmprendedorApellido) LIKE ?)`);
        valores.push(...Array(4).fill(`%${buscar}%`));
    }
    if (idRubro) {
        donde.push('t.idRubro = ?');
        valores.push(idRubro);
    }
    if (ayuda === 'sin-ayuda') donde.push('t.tipo IS NULL');
    else if (ayuda) {
        donde.push('t.tipo = ?');
        valores.push(ayuda);
    }
    if (situacion) donde.push(SITUACIONES[situacion]);
    return { where: donde.length ? `WHERE ${donde.join(' AND ')}` : '', valores };
};

export const modelContarEmprendimientos = async (filtros) => {
    const { where, valores } = condiciones(filtros);
    const [[fila]] = await pool.query(`SELECT COUNT(*) AS total FROM (${CONSULTA_BASE}) t ${where};`, valores);
    return Number(fila.total);
};

// Primero lo que espera al Área (facturas para validar), después los más recientes
export const modelListarEmprendimientos = async (filtros, limite, desde) => {
    const { where, valores } = condiciones(filtros);
    const [filas] = await pool.query(
        `SELECT * FROM (${CONSULTA_BASE}) t ${where}
         ORDER BY (t.EstadoFacturas = 'en-revision') DESC, t.FechaResolucionMin IS NULL, t.FechaResolucionMin DESC, t.idEmprendimiento DESC
         LIMIT ? OFFSET ?;`,
        [...valores, limite, desde]
    );
    return filas;
};

export const modelListarRubros = async () => {
    const [filas] = await pool.query('SELECT idRubro, Nombre FROM Rubro ORDER BY Nombre;');
    return filas;
};

// Detalle de un emprendimiento con los nombres de los empleados que resolvieron cada paso
export const modelDetalleEmprendimiento = async (idEmprendimiento, conexion = pool) => {
    const [[fila]] = await conexion.query(
        `SELECT t.*,
                CONCAT_WS(' ', er.Nombre, er.Apellido) AS EmpleadoRevisor,
                CONCAT_WS(' ', ef.Nombre, ef.Apellido) AS EmpleadoFacturas,
                CONCAT_WS(' ', ep.Nombre, ep.Apellido) AS EmpleadoPuestaMarcha
         FROM (${CONSULTA_BASE}) t
         LEFT JOIN Empleado er ON er.idEmpleado = t.idEmpleadoRevisor
         LEFT JOIN Empleado ef ON ef.idEmpleado = t.idEmpleadoFacturas
         LEFT JOIN Empleado ep ON ep.idEmpleado = t.idEmpleadoPuestaMarcha
         WHERE t.idEmprendimiento = ?;`,
        [idEmprendimiento]
    );
    return fila || null;
};

// Facturas enviadas que esperan la validación (para la campanita del Área)
export const modelFacturasParaValidar = async () => {
    const [filas] = await pool.query(
        `SELECT t.idEmprendimiento, t.tipo, t.idAyuda, t.FechaEntregaFacturas FROM (${CONSULTA_BASE}) t
         WHERE t.EstadoFacturas = 'en-revision';`
    );
    return filas;
};

// Empleado (activo) del usuario que hace la acción: queda en idEmpleadoFacturas / idEmpleadoPuestaMarcha
const empleadoDelUsuario = async (conexion, idUsuario) => {
    const [[fila]] = await conexion.query(
        `SELECT e.idEmpleado, CONCAT_WS(' ', e.Nombre, e.Apellido) AS Nombre FROM Usuario u
         INNER JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         WHERE u.idUsuario = ? AND u.Activa = 1 AND e.Activo = 1;`,
        [idUsuario]
    );
    if (!fila) throw errorFacturas('Se requiere una cuenta y ficha de empleado activas.', 'EMPLEADO_INACTIVO');
    return fila;
};

// Dentro de una transacción: el detalle con la fila de la ayuda bloqueada (así dos empleados no resuelven a la vez)
const bloquearDetalle = async (conexion, idEmprendimiento) => {
    const previo = await modelDetalleEmprendimiento(idEmprendimiento, conexion);
    if (!previo) throw errorFacturas('El emprendimiento no existe.', 'NO_EXISTE');
    if (previo.idAyuda) {
        const { tabla, columnaId } = TABLAS[previo.tipo];
        await conexion.query(`SELECT ${columnaId} FROM ${tabla} WHERE ${columnaId} = ? FOR UPDATE;`, [previo.idAyuda]);
    }
    return modelDetalleEmprendimiento(idEmprendimiento, conexion);
};

const exigirFacturasEnRevision = (detalle) => {
    if (detalle.EstadoFacturas !== 'en-revision') {
        throw errorFacturas(detalle.EstadoFacturas === 'validadas'
            ? 'Las facturas de este emprendimiento ya fueron validadas.'
            : 'El emprendedor todavía no envió sus facturas a revisar (o ya fueron observadas).', 'ESTADO');
    }
};

const auditar = (conexion, detalle, accion, texto, { idUsuario, ipCliente }) => conexion.query(
    `INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP) VALUES (?, ?, ?, ?, ?, ?);`,
    [idUsuario, accion, TABLAS[detalle.tipo].tabla, detalle.idAyuda, texto, ipCliente]
);

// Validar las facturas. armarPdf(detalle, empleado) junta los archivos en un PDF dentro de la transacción y devuelve su
// dirección; si algo falla después, se deshace todo.
export const modelValidarFacturas = (idEmprendimiento, auditoria, armarPdf) => conTransaccion(auditoria, async (conexion) => {
    const detalle = await bloquearDetalle(conexion, idEmprendimiento);
    exigirFacturasEnRevision(detalle);
    const empleado = await empleadoDelUsuario(conexion, auditoria.idUsuario);
    const pdf = await armarPdf(detalle, empleado);
    const { tabla, columnaId } = TABLAS[detalle.tipo];
    await conexion.query(
        `UPDATE ${tabla} SET FechaFacturasValidadas = CURRENT_DATE, idEmpleadoFacturas = ?, MotivoObservacionFacturas = NULL
         WHERE ${columnaId} = ?;`,
        [empleado.idEmpleado, detalle.idAyuda]
    );
    await auditar(conexion, detalle, 'UPDATE',
        `Facturas de ley VALIDADAS por el empleado ID ${empleado.idEmpleado} (${empleado.Nombre}). PDF unificado: ${pdf.direccionWeb}`, auditoria);
    return { pdf, empleado };
});

// Observar las facturas: vuelven al emprendedor para que las corrija (FacturasEntregadas = 0 con el motivo)
export const modelObservarFacturas = (idEmprendimiento, motivo, auditoria) => conTransaccion(auditoria, async (conexion) => {
    const detalle = await bloquearDetalle(conexion, idEmprendimiento);
    exigirFacturasEnRevision(detalle);
    const empleado = await empleadoDelUsuario(conexion, auditoria.idUsuario);
    const { tabla, columnaId } = TABLAS[detalle.tipo];
    await conexion.query(
        `UPDATE ${tabla} SET FacturasEntregadas = 0, MotivoObservacionFacturas = ?, idEmpleadoFacturas = ? WHERE ${columnaId} = ?;`,
        [motivo, empleado.idEmpleado, detalle.idAyuda]
    );
    await auditar(conexion, detalle, 'UPDATE',
        `Facturas de ley OBSERVADAS por el empleado ID ${empleado.idEmpleado} (${empleado.Nombre}): ${motivo}`, auditoria);
    return modelDetalleEmprendimiento(idEmprendimiento, conexion);
});

// Acreditar la puesta en marcha (el trigger la registra; el empleado queda en idEmpleadoPuestaMarcha)
export const modelAcreditarPuestaMarcha = (idEmprendimiento, auditoria) => conTransaccion(auditoria, async (conexion) => {
    const detalle = await bloquearDetalle(conexion, idEmprendimiento);
    if (detalle.EstadoPuestaMarcha !== 'pendiente') {
        throw errorFacturas(detalle.EstadoPuestaMarcha === 'acreditada'
            ? 'La puesta en marcha de este emprendimiento ya fue acreditada.'
            : 'Este emprendimiento no acredita la puesta en marcha desde el sistema.', 'ESTADO');
    }
    const empleado = await empleadoDelUsuario(conexion, auditoria.idUsuario);
    const { tabla, columnaId } = TABLAS[detalle.tipo];
    await conexion.query(
        `UPDATE ${tabla} SET PuestaMarchaAcreditada = 1, FechaPuestaMarcha = CURRENT_DATE, idEmpleadoPuestaMarcha = ? WHERE ${columnaId} = ?;`,
        [empleado.idEmpleado, detalle.idAyuda]
    );
    return modelDetalleEmprendimiento(idEmprendimiento, conexion);
});

// Marcar o quitar antecedentes al emprendedor (el trigger de Emprendedor lo registra)
export const modelActualizarAntecedentes = (idEmprendimiento, antecedentes, descripcion, auditoria) => conTransaccion(auditoria, async (conexion) => {
    const detalle = await modelDetalleEmprendimiento(idEmprendimiento, conexion);
    if (!detalle) throw errorFacturas('El emprendimiento no existe.', 'NO_EXISTE');
    if (!detalle.idEmprendedor) throw errorFacturas('El emprendimiento no tiene un emprendedor registrado.', 'ESTADO');
    await empleadoDelUsuario(conexion, auditoria.idUsuario);
    await conexion.query(
        'UPDATE Emprendedor SET Antecedentes = ?, DescripcionAntecedente = ? WHERE idEmprendedor = ?;',
        [antecedentes ? 1 : 0, antecedentes ? descripcion : null, detalle.idEmprendedor]
    );
    return modelDetalleEmprendimiento(idEmprendimiento, conexion);
});
