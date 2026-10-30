import { pool } from '../config/db.js';

// Estadísticas anuales del panel del Administrador.
// Cada estadística se arma como una "fuente": una consulta que devuelve una fila por caso
// con (serie, fecha, departamento). Sobre esa fuente se cuenta por mes y por departamento.

// Departamento de una solicitud: el del emprendimiento ya creado o, si todavía no existe, el del formulario
const departamentoDe = (alias) => `COALESCE(
    (SELECT e.Departamento FROM Emprendimiento e
     WHERE e.idSolicitudInicio = ${alias}.idSolicitudInicio ORDER BY e.idEmprendimiento LIMIT 1),
    (SELECT d.EmprendimientoDepto FROM DatosSolicitudInicio d WHERE d.idSolicitudInicio = ${alias}.idSolicitudInicio),
    'Sin departamento')`;

// Subsidios y créditos: qué fecha cuenta y qué filas entran según la estadística
const AYUDAS = {
    'ayudas-solicitadas': { fecha: 'FechaRecibido', condicion: 'TRUE' },
    'ayudas-otorgadas': { fecha: 'FechaResolucion', condicion: 'x.Aprobado = 1' },
    'ayudas-rechazadas': { fecha: 'FechaResolucion', condicion: 'x.Aprobado = 0' }
};
const TABLAS_AYUDA = [
    { ayuda: 'subsidio', tabla: 'Subsidio', serie: 'Subsidios' },
    { ayuda: 'credito', tabla: 'Credito', serie: 'Créditos' }
];

// rango = { desde, hasta } (hasta exclusiva) o null para todas las fechas
const filtroFecha = (columna, rango) => (rango ? ` AND ${columna} >= ? AND ${columna} < ?` : ` AND ${columna} IS NOT NULL`);
const parametrosFecha = (rango) => (rango ? [rango.desde, rango.hasta] : []);

// Devuelve { sql, parametros } de la fuente de una estadística
const fuente = (tipo, ayuda, rango) => {
    if (AYUDAS[tipo]) {
        const { fecha, condicion } = AYUDAS[tipo];
        const partes = TABLAS_AYUDA.filter((t) => ayuda === 'todos' || t.ayuda === ayuda);
        return {
            sql: partes.map((t) => `
                SELECT '${t.serie}' AS serie, x.${fecha} AS fecha, ${departamentoDe('x')} AS departamento
                FROM ${t.tabla} x
                WHERE ${condicion}${filtroFecha(`x.${fecha}`, rango)}`).join(' UNION ALL '),
            parametros: partes.flatMap(() => parametrosFecha(rango))
        };
    }
    if (tipo === 'nuevas-solicitudes') {
        // Solicitudes recibidas por Mesa de Entrada (las cargas históricas no son solicitudes nuevas)
        return {
            sql: `SELECT 'Solicitudes' AS serie, s.FechaRecibidoMesa AS fecha,
                         COALESCE(d.EmprendimientoDepto, 'Sin departamento') AS departamento
                  FROM SolicitudInicio s
                  LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = s.idSolicitudInicio
                  WHERE s.CargaHistorica = 0${filtroFecha('s.FechaRecibidoMesa', rango)}`,
            parametros: parametrosFecha(rango)
        };
    }
    // nuevos-emprendimientos: aprobados por el ministro, por la fecha de su resolución
    return {
        sql: `SELECT 'Emprendimientos' AS serie, s.FechaResolucionMin AS fecha, ${departamentoDe('s')} AS departamento
              FROM SolicitudInicio s
              WHERE s.AprobacionMinistro = 1 AND s.CargaHistorica = 0${filtroFecha('s.FechaResolucionMin', rango)}`,
        parametros: parametrosFecha(rango)
    };
};

// Nombres de las series que muestra cada estadística (en el mismo orden que el gráfico)
export const seriesDeEstadistica = (tipo, ayuda) => {
    if (AYUDAS[tipo]) return TABLAS_AYUDA.filter((t) => ayuda === 'todos' || t.ayuda === ayuda).map((t) => t.serie);
    return [tipo === 'nuevas-solicitudes' ? 'Solicitudes' : 'Emprendimientos'];
};

// Cantidades del año: por mes y por departamento (cada fila separada por serie)
export const modelEstadisticaAnual = async (tipo, ayuda, anio) => {
    const { sql, parametros } = fuente(tipo, ayuda, { desde: `${anio}-01-01`, hasta: `${anio + 1}-01-01` });
    const [[porMes], [porDepartamento]] = await Promise.all([
        pool.query(
            `SELECT serie, MONTH(fecha) AS mes, COUNT(*) AS cantidad FROM (${sql}) t GROUP BY serie, mes;`,
            parametros
        ),
        pool.query(
            `SELECT departamento, serie, COUNT(*) AS cantidad FROM (${sql}) t GROUP BY departamento, serie;`,
            parametros
        )
    ]);
    return { porMes, porDepartamento };
};

// Años que tienen datos para esa estadística (para el selector de año)
export const modelAniosConDatos = async (tipo, ayuda) => {
    const { sql, parametros } = fuente(tipo, ayuda, null);
    const [filas] = await pool.query(
        `SELECT DISTINCT YEAR(fecha) AS anio FROM (${sql}) t ORDER BY anio DESC;`,
        parametros
    );
    return filas.map((f) => Number(f.anio));
};
