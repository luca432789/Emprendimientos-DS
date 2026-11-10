import fs from 'fs/promises';
import { rutaFisica } from '../helpers/imagenes.js';
import { modelDocumentosDelEmprendedor } from '../models/documentosModel.js';
import { direccionPdfValidado } from './facturasController.js';

const NOMBRES_AYUDA = { subsidio: 'Subsidio', credito: 'Crédito' };

// Solo se ofrecen los PDF que están en el servidor
const siExiste = async (direccionWeb) => {
    if (!direccionWeb) return null;
    try {
        await fs.access(rutaFisica(direccionWeb));
        return direccionWeb;
    } catch {
        return null;
    }
};

// GET /api/documentos/mios -> Nº de expediente y de proyecto, y los PDF de su trámite
export const obtenerMisDocumentos = async (req, res) => {
    if (req.usuarioLogueado.tipoUsuario !== 'Emprendedor') {
        return res.status(403).json({ error: 'Solo disponible para emprendedores.' });
    }
    try {
        const d = await modelDocumentosDelEmprendedor(req.usuarioLogueado.idUsuario);
        if (!d) return res.status(404).json({ error: 'No se encontró su emprendimiento.' });
        const ayuda = d.tipo ? NOMBRES_AYUDA[d.tipo] : null;
        const facturasValidadas = d.FechaFacturasValidadas && d.PathDirectorioFacturas
            ? await siExiste(direccionPdfValidado(d.PathDirectorioFacturas, d.tipo, d.idAyuda)) : null;

        const documentos = [
            { clave: 'solicitud', titulo: 'Solicitud de Inicio', url: await siExiste(d.PathSolicitudInicio),
              detalle: d.FechaResolucionMin ? `Aprobada por el Ministro el ${new Date(d.FechaResolucionMin).toLocaleDateString('es-AR')}` : '' },
            ...(ayuda ? [{ clave: 'ayuda', titulo: `Formulario de ${ayuda}`, url: await siExiste(d.PathFormulario),
                detalle: `Monto: $ ${Number(d.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` }] : []),
            ...(d.tipo === 'credito' ? [{ clave: 'garante', titulo: 'Documentación del garante', url: await siExiste(d.PathGarante),
                detalle: d.Garante ? `Garante: ${d.Garante}` : '' }] : []),
            ...(d.EstadoFacturas !== 'no-corresponde' ? [{
                clave: 'facturas', titulo: 'Facturas de Ley validadas', url: facturasValidadas,
                detalle: facturasValidadas
                    ? `Validadas el ${new Date(d.FechaFacturasValidadas).toLocaleDateString('es-AR')}`
                    : 'Todavía no fueron validadas por el Área.',
                pendiente: !facturasValidadas
            }] : [])
        ];
        res.json({
            emprendimiento: d.Emprendimiento,
            nroProyecto: d.NroProyecto,
            expediente: d.NroExpediente,
            ayuda,
            cargaHistorica: Number(d.CargaHistorica) === 1,
            facturasPendientes: ['pendiente', 'observadas'].includes(d.EstadoFacturas),
            documentos
        });
    } catch (error) {
        console.error('Error al obtener los documentos del emprendedor:', error);
        res.status(500).json({ error: 'No se pudieron cargar sus documentos.' });
    }
};
