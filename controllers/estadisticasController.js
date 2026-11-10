import { modelAniosConDatos, modelEstadisticaAnual, seriesDeEstadistica } from '../models/estadisticasModel.js';

// Estadísticas que se pueden pedir (las de subsidios y créditos aceptan además el filtro de ayuda)
const TITULOS = {
    'ayudas-solicitadas': 'Subsidios y créditos solicitados',
    'ayudas-otorgadas': 'Subsidios y créditos otorgados',
    'ayudas-rechazadas': 'Subsidios y créditos rechazados',
    'nuevas-solicitudes': 'Nuevas solicitudes de inicio',
    'nuevos-emprendimientos': 'Nuevos emprendimientos'
};
const AYUDAS = ['todos', 'subsidio', 'credito'];

const esAdministrador = (req) => req.usuarioLogueado?.tipoUsuario === 'Administrador';

// GET /api/estadisticas?tipo=nuevos-emprendimientos&anio=2026&ayuda=todos  (solo Administrador)
// Devuelve el total del año, la cantidad por mes (12 valores por serie) y la tabla por departamento.
export const obtenerEstadistica = async (req, res) => {
    if (!esAdministrador(req)) {
        return res.status(403).json({ error: 'Solo los administradores pueden ver las estadísticas.' });
    }

    const tipo = req.query.tipo;
    const anioActual = new Date().getFullYear();
    const anio = req.query.anio === undefined ? anioActual : Number(req.query.anio);
    const ayuda = TITULOS[tipo]?.startsWith('Subsidios') ? (req.query.ayuda ?? 'todos') : 'todos';

    if (!TITULOS[tipo]) return res.status(400).json({ error: 'Estadística inválida.' });
    if (!Number.isInteger(anio) || anio < 2000 || anio > anioActual + 1) {
        return res.status(400).json({ error: 'El año seleccionado no es válido.' });
    }
    if (!AYUDAS.includes(ayuda)) return res.status(400).json({ error: 'El tipo de ayuda no es válido.' });

    try {
        const series = seriesDeEstadistica(tipo, ayuda);
        const [{ porMes, porDepartamento }, aniosConDatos] = await Promise.all([
            modelEstadisticaAnual(tipo, ayuda, anio),
            modelAniosConDatos(tipo, ayuda)
        ]);

        const meses = Object.fromEntries(series.map((s) => [s, Array(12).fill(0)]));
        porMes.forEach((f) => { meses[f.serie][f.mes - 1] = Number(f.cantidad); });

        // Una fila por departamento con la cantidad de cada serie, de mayor a menor
        const departamentos = new Map();
        porDepartamento.forEach((f) => {
            const fila = departamentos.get(f.departamento)
                ?? { departamento: f.departamento, cantidades: Object.fromEntries(series.map((s) => [s, 0])), total: 0 };
            fila.cantidades[f.serie] = Number(f.cantidad);
            fila.total += Number(f.cantidad);
            departamentos.set(f.departamento, fila);
        });

        const totales = Object.fromEntries(series.map((s) => [s, meses[s].reduce((a, b) => a + b, 0)]));
        res.json({
            tipo,
            titulo: TITULOS[tipo],
            anio,
            ayuda,
            series,
            total: Object.values(totales).reduce((a, b) => a + b, 0),
            totales,
            porMes: meses,
            porDepartamento: [...departamentos.values()]
                .sort((a, b) => b.total - a.total || a.departamento.localeCompare(b.departamento, 'es')),
            // El año actual siempre se puede elegir, aunque todavía no tenga datos
            anios: [...new Set([anioActual, ...aniosConDatos])].sort((a, b) => b - a)
        });
    } catch (error) {
        console.error('Error al calcular la estadística:', error);
        res.status(500).json({ error: 'No se pudo calcular la estadística.' });
    }
};
