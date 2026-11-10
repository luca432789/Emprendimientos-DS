import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { rutaFisica } from '../helpers/imagenes.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';
import { enviarCorreo, escaparHtml, urlDelSitio, plantillaCorreo, cuadroTexto, intentarCorreo, textoResultadoIntento } from '../helpers/correo.js';
import { listarArchivosFacturas, direccionPdfValidado as direccionPdf } from './facturasController.js';
import { DIAS_PLAZO_FACTURAS } from '../models/facturasModel.js';
import {
    TABLAS,
    POR_PAGINA,
    DIAS_PLAZO_PUESTA_MARCHA,
    SITUACIONES_VALIDAS,
    modelContarEmprendimientos,
    modelListarEmprendimientos,
    modelListarRubros,
    modelDetalleEmprendimiento,
    modelValidarFacturas,
    modelObservarFacturas,
    modelAcreditarPuestaMarcha,
    modelActualizarAntecedentes
} from '../models/emprendimientosAdminModel.js';

const ROLES_AREA = ['Empleado de Area', 'Administrador'];
const MEGA = 1024 * 1024;
// Gmail acepta hasta 25 MB por correo y el adjunto crece un tercio al enviarse: más grande, va sin adjunto
const MEGAS_ADJUNTO = 17;

const esDelArea = (req, res) => {
    if (ROLES_AREA.includes(req.usuarioLogueado?.tipoUsuario)) return true;
    res.status(403).json({ error: 'Solo empleados del Área y administradores pueden administrar emprendimientos.' });
    return false;
};

const ESTADOS_HTTP = { NO_EXISTE: 404, ESTADO: 409, EMPLEADO_INACTIVO: 403, INVALIDO: 400 };
const responderError = (res, error, contexto) => {
    if (ESTADOS_HTTP[error.codigo]) return res.status(ESTADOS_HTTP[error.codigo]).json({ error: error.message });
    console.error(`Error al ${contexto}:`, error);
    res.status(500).json({ error: `No se pudo ${contexto}.` });
};

const auditoriaDe = (req) => ({ idUsuario: req.usuarioLogueado.idUsuario, ipCliente: obtenerIpCliente(req) });

const idDeRuta = (req, res) => {
    const id = Number(req.params.id);
    if (Number.isInteger(id) && id > 0) return id;
    res.status(400).json({ error: 'Emprendimiento inválido.' });
    return null;
};

const fechaTexto = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const montoTexto = (monto) => `$ ${Number(monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nombreEmprendedor = (fila) => [fila.EmprendedorNombre, fila.EmprendedorApellido].filter(Boolean).join(' ');

// PDF unificado de las facturas validadas: queda en la carpeta de facturas (reemplaza a los archivos sueltos)
const direccionPdfValidado = (fila) => direccionPdf(fila.PathDirectorioFacturas, fila.tipo, fila.idAyuda);
const existe = (ruta) => fs.access(ruta).then(() => true, () => false);

// Lo que se muestra en la tabla
const filaParaLista = (fila) => ({
    idEmprendimiento: fila.idEmprendimiento,
    emprendimiento: fila.Emprendimiento,
    nroProyecto: fila.NroProyecto,
    expediente: fila.NroExpediente,
    rubro: fila.Rubro,
    departamento: fila.Departamento,
    emprendedor: nombreEmprendedor(fila),
    antecedentes: Number(fila.Antecedentes) === 1,
    cargaHistorica: Number(fila.CargaHistorica) === 1,
    ayuda: fila.tipo ? { tipo: fila.tipo, nombre: TABLAS[fila.tipo].Nombre, monto: Number(fila.monto), aprobado: fila.Aprobado === null ? null : Number(fila.Aprobado) === 1 } : null,
    facturas: { estado: fila.EstadoFacturas, diasRestantes: fila.DiasFacturas === null ? null : Number(fila.DiasFacturas), fechaEntrega: fila.FechaEntregaFacturas },
    puestaMarcha: { estado: fila.EstadoPuestaMarcha, diasRestantes: fila.DiasPuestaMarcha === null ? null : Number(fila.DiasPuestaMarcha) }
});

// GET /api/emprendimientos-admin?page=&expediente=&proyecto=&buscar=&rubro=&ayuda=&situacion=   (de a 10)
export const listarEmprendimientos = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const paginaPedida = Number(req.query.page ?? 1);
    const texto = (valor, maximo) => (typeof valor === 'string' ? valor.trim().slice(0, maximo) : '');
    const filtros = {
        expediente: texto(req.query.expediente, 50),
        proyecto: texto(req.query.proyecto, 50),
        buscar: texto(req.query.buscar, 100),
        idRubro: Number(req.query.rubro) || null,
        ayuda: texto(req.query.ayuda, 20),
        situacion: texto(req.query.situacion, 30)
    };
    if (!Number.isInteger(paginaPedida) || paginaPedida < 1) return res.status(400).json({ error: 'El número de página debe ser un entero positivo.' });
    if (filtros.ayuda && !['subsidio', 'credito', 'sin-ayuda'].includes(filtros.ayuda)) return res.status(400).json({ error: 'La ayuda elegida no es válida.' });
    if (filtros.situacion && !SITUACIONES_VALIDAS.includes(filtros.situacion)) return res.status(400).json({ error: 'La situación elegida no es válida.' });

    try {
        const totalRegistros = await modelContarEmprendimientos(filtros);
        const totalPaginas = Math.ceil(totalRegistros / POR_PAGINA);
        const pagina = totalPaginas === 0 ? 1 : Math.min(paginaPedida, totalPaginas);
        const [filas, rubros] = await Promise.all([
            modelListarEmprendimientos(filtros, POR_PAGINA, (pagina - 1) * POR_PAGINA),
            modelListarRubros()
        ]);
        res.json({ emprendimientos: filas.map(filaParaLista), pagina, totalPaginas, totalRegistros, registrosPorPagina: POR_PAGINA, rubros });
    } catch (error) {
        responderError(res, error, 'cargar los emprendimientos');
    }
};

// Todo lo de un emprendimiento para la vista de gestión
const datosDetalle = async (fila) => {
    const validadas = fila.EstadoFacturas === 'validadas';
    const pdfValidado = validadas && fila.PathDirectorioFacturas && await existe(rutaFisica(direccionPdfValidado(fila)))
        ? direccionPdfValidado(fila) : null;
    return {
        ...filaParaLista(fila),
        localidad: fila.Localidad,
        actividad: fila.ActividadPrincipal,
        emprendedorDatos: fila.idEmprendedor ? {
            dni: fila.EmprendedorDNI, correo: fila.EmprendedorCorreo, telefono: fila.EmprendedorTelefono,
            antecedentes: Number(fila.Antecedentes) === 1, descripcionAntecedente: fila.DescripcionAntecedente
        } : null,
        fechaAprobacionMinistro: fila.FechaResolucionMin,
        pdfSolicitudInicio: fila.PathSolicitudInicio,
        ayudaDetalle: fila.tipo ? {
            fechaResolucion: fila.FechaResolucion,
            pdfFormulario: fila.PathFormulario,
            empleadoRevisor: fila.EmpleadoRevisor || null
        } : null,
        facturasDetalle: {
            estado: fila.EstadoFacturas,
            plazoDias: DIAS_PLAZO_FACTURAS,
            fechaLimite: fila.LimiteFacturas,
            diasRestantes: fila.DiasFacturas === null ? null : Number(fila.DiasFacturas),
            fechaEntrega: fila.FechaEntregaFacturas,
            fechaValidacion: fila.FechaFacturasValidadas,
            observacion: fila.MotivoObservacionFacturas,
            empleado: fila.EmpleadoFacturas || null,
            archivos: validadas ? [] : await listarArchivosFacturas(fila.PathDirectorioFacturas),
            pdfValidado
        },
        puestaMarchaDetalle: {
            estado: fila.EstadoPuestaMarcha,
            plazoDias: DIAS_PLAZO_PUESTA_MARCHA,
            fechaLimite: fila.LimitePuestaMarcha,
            diasRestantes: fila.DiasPuestaMarcha === null ? null : Number(fila.DiasPuestaMarcha),
            fecha: fila.FechaPuestaMarcha,
            empleado: fila.EmpleadoPuestaMarcha || null
        }
    };
};

// GET /api/emprendimientos-admin/:id
export const obtenerEmprendimiento = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    try {
        const fila = await modelDetalleEmprendimiento(id);
        if (!fila) return res.status(404).json({ error: 'El emprendimiento no existe.' });
        res.json(await datosDetalle(fila));
    } catch (error) {
        responderError(res, error, 'cargar el emprendimiento');
    }
};

// ---------- PDF unificado de las facturas ----------
// La fuente estándar del PDF solo tiene caracteres latinos
const textoPdf = (texto) => String(texto ?? '').normalize('NFC').replace(/[^\x20-\x7E -ÿ]/g, '?');

const partirEnLineas = (texto, fuente, tamano, ancho) => {
    const lineas = [];
    let actual = '';
    for (const palabra of textoPdf(texto).split(/\s+/)) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho || !actual) actual = prueba;
        else {
            lineas.push(actual);
            actual = palabra;
        }
    }
    if (actual) lineas.push(actual);
    return lineas;
};

const A4 = [595.28, 841.89];
const MARGEN = 40;

// Carátula con los datos del emprendimiento y la lista de archivos, y una o más páginas por cada factura
const unirFacturas = async (fila, empleado, archivos) => {
    const pdf = await PDFDocument.create();
    pdf.setTitle(textoPdf(`Facturas de Ley - ${fila.Emprendimiento}`));
    const fuente = await pdf.embedFont(StandardFonts.Helvetica);
    const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
    const caratula = pdf.addPage(A4);

    // Primero las facturas (para saber en qué página empieza cada una); la carátula se escribe al final
    const inicios = [];
    for (const [indice, archivo] of archivos.entries()) {
        const bytes = await fs.readFile(path.join(rutaFisica(fila.PathDirectorioFacturas), archivo.archivo));
        inicios.push(pdf.getPageCount() + 1);
        if (archivo.archivo.endsWith('.pdf')) {
            const origen = await PDFDocument.load(bytes);
            const paginas = await pdf.copyPages(origen, origen.getPageIndices());
            paginas.forEach((pagina) => pdf.addPage(pagina));
            continue;
        }
        const imagen = archivo.archivo.endsWith('.png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const horizontal = imagen.width > imagen.height;
        const [ancho, alto] = horizontal ? [A4[1], A4[0]] : A4;
        const pagina = pdf.addPage([ancho, alto]);
        const escala = Math.min((ancho - MARGEN * 2) / imagen.width, (alto - MARGEN * 2 - 20) / imagen.height);
        const w = imagen.width * escala;
        const h = imagen.height * escala;
        pagina.drawImage(imagen, { x: (ancho - w) / 2, y: MARGEN + 20 + (alto - MARGEN * 2 - 20 - h) / 2, width: w, height: h });
        pagina.drawText(textoPdf(`Factura ${indice + 1} de ${archivos.length}: ${archivo.nombre}`).slice(0, 120),
            { x: MARGEN, y: MARGEN - 10, size: 9, font: fuente, color: rgb(0.35, 0.35, 0.35) });
    }

    let y = A4[1] - MARGEN - 10;
    const escribir = (texto, { tamano = 11, fuenteTexto = fuente, espacio = 4, color = rgb(0.12, 0.16, 0.2) } = {}) => {
        for (const linea of partirEnLineas(texto, fuenteTexto, tamano, A4[0] - MARGEN * 2)) {
            caratula.drawText(linea, { x: MARGEN, y, size: tamano, font: fuenteTexto, color });
            y -= tamano + espacio;
        }
    };
    escribir('Facturas de Ley', { tamano: 20, fuenteTexto: negrita, color: rgb(0.18, 0.31, 0.47) });
    escribir('El Camino de los Emprendedores - Ministerio de Desarrollo Social', { tamano: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    const datos = [
        ['Emprendimiento', fila.Emprendimiento],
        ['Nº de Proyecto', fila.NroProyecto],
        ['Nº de Expediente', fila.NroExpediente || '-'],
        ['Emprendedor', `${nombreEmprendedor(fila)}${fila.EmprendedorDNI ? ` (DNI ${fila.EmprendedorDNI})` : ''}`],
        ['Ayuda', `${TABLAS[fila.tipo].Nombre} por ${montoTexto(fila.monto)}`],
        ['Aprobación del Ministro', fechaTexto(fila.FechaResolucionMin)],
        ['Facturas entregadas', fechaTexto(fila.FechaEntregaFacturas)],
        ['Facturas validadas', `${fechaTexto(new Date())} por ${empleado.Nombre}`]
    ];
    for (const [etiqueta, valor] of datos) escribir(`${etiqueta}: ${valor}`);
    y -= 14;
    escribir(`Archivos presentados (${archivos.length})`, { tamano: 12, fuenteTexto: negrita });
    archivos.forEach((archivo, indice) => escribir(`${indice + 1}. ${archivo.nombre} - página ${inicios[indice]}`, { tamano: 10 }));
    return pdf.save();
};

// ---------- Correos al emprendedor ----------
const correoValidacion = (fila, bytesPdf) => {
    const nombre = TABLAS[fila.tipo].Nombre;
    const adjuntar = bytesPdf && bytesPdf.length <= MEGAS_ADJUNTO * MEGA;
    const aviso = adjuntar
        ? 'Le adjuntamos un PDF con todas las facturas presentadas, por si necesita presentarlas en otro trámite.'
        : 'Por su tamaño, el PDF con todas las facturas no se pudo adjuntar a este correo: si lo necesita, solicítelo al Área de Economía Social.';
    return {
        para: fila.EmprendedorCorreo,
        asunto: 'Sus Facturas de Ley fueron validadas',
        texto: `Hola ${nombreEmprendedor(fila)}:\n\nLas Facturas de Ley de su ${nombre} del emprendimiento "${fila.Emprendimiento}"`
            + `${fila.NroExpediente ? ` (expediente ${fila.NroExpediente})` : ''} fueron validadas por el Área de Economía Social.\n\n${aviso}`,
        html: plantillaCorreo('Sus Facturas de Ley fueron validadas', `
            <p>Hola ${escaparHtml(nombreEmprendedor(fila))}:</p>
            <p>Las Facturas de Ley de su <strong>${nombre}</strong> del emprendimiento <strong>"${escaparHtml(fila.Emprendimiento)}"</strong>
               ${fila.NroExpediente ? `(expediente ${escaparHtml(fila.NroExpediente)})` : ''} fueron <strong>validadas</strong> por el Área de Economía Social.</p>
            <p>${aviso}</p>`),
        adjuntos: adjuntar ? [{ filename: `Facturas de Ley - ${fila.Emprendimiento}.pdf`.replace(/[\\/:*?"<>|]/g, '_'), content: Buffer.from(bytesPdf), contentType: 'application/pdf' }] : []
    };
};

const correoObservacion = (fila, req) => {
    const nombre = TABLAS[fila.tipo].Nombre;
    const enlace = `${urlDelSitio(req)}/login`;
    const instruccion = 'Ingrese a su cuenta y, desde la opción "Enviar Facturas de Ley" del botón "+", corrija lo indicado y vuelva a enviarlas a revisar.';
    return {
        para: fila.EmprendedorCorreo,
        asunto: 'Sus Facturas de Ley fueron observadas',
        texto: `Hola ${nombreEmprendedor(fila)}:\n\nEl Área de Economía Social revisó las Facturas de Ley de su ${nombre} del emprendimiento `
            + `"${fila.Emprendimiento}" y le pide corregir lo siguiente:\n\n${fila.MotivoObservacionFacturas}\n\n${instruccion}\n${enlace}`,
        html: plantillaCorreo('Sus Facturas de Ley fueron observadas', `
            <p>Hola ${escaparHtml(nombreEmprendedor(fila))}:</p>
            <p>El Área de Economía Social revisó las Facturas de Ley de su <strong>${nombre}</strong> del emprendimiento
               <strong>"${escaparHtml(fila.Emprendimiento)}"</strong> y le pide corregir lo siguiente:</p>
            ${cuadroTexto(fila.MotivoObservacionFacturas)}
            <p>${escaparHtml(instruccion)}</p>
            <p><a href="${escaparHtml(enlace)}" style="display:inline-block; background:#2f4e78; color:#fff; padding:10px 18px; border-radius:4px; text-decoration:none;">Ingresar a mi cuenta</a></p>`)
    };
};

const enviarSiHayCorreo = (fila, mensaje) => (fila.EmprendedorCorreo
    ? intentarCorreo(() => enviarCorreo(mensaje), fila.EmprendedorCorreo)
    : Promise.resolve({ correoEnviado: false, correo: 'el emprendedor', motivoCorreo: 'No tiene un correo registrado.' }));

// POST /api/emprendimientos-admin/:id/facturas/validar
// Junta las facturas en un PDF (con carátula), lo guarda en la carpeta, borra los archivos sueltos y le manda el PDF al emprendedor
export const validarFacturas = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    let rutaPdf = null;
    let archivosSueltos = [];
    let bytesPdf = null;
    try {
        await modelValidarFacturas(id, auditoriaDe(req), async (fila, empleado) => {
            archivosSueltos = await listarArchivosFacturas(fila.PathDirectorioFacturas);
            if (!archivosSueltos.length) {
                const error = new Error('No se encontraron los archivos de las facturas en el servidor.');
                error.codigo = 'ESTADO';
                throw error;
            }
            bytesPdf = await unirFacturas(fila, empleado, archivosSueltos);
            rutaPdf = rutaFisica(direccionPdfValidado(fila));
            await fs.writeFile(rutaPdf, bytesPdf);
            return { direccionWeb: direccionPdfValidado(fila) };
        });
        rutaPdf = null;
    } catch (error) {
        if (rutaPdf) await fs.unlink(rutaPdf).catch(() => {});
        return responderError(res, error, 'validar las facturas');
    }

    try {
        const fila = await modelDetalleEmprendimiento(id);
        // El PDF unificado reemplaza a los archivos sueltos
        const carpeta = rutaFisica(fila.PathDirectorioFacturas);
        await Promise.all(archivosSueltos.map((a) => fs.unlink(path.join(carpeta, a.archivo)).catch(() => {})));
        const resultado = await enviarSiHayCorreo(fila, correoValidacion(fila, bytesPdf));
        res.json({
            mensaje: `Las facturas fueron validadas y se unieron en un PDF.${textoResultadoIntento(resultado)}`,
            ...resultado,
            detalle: await datosDetalle(fila)
        });
    } catch (error) {
        responderError(res, error, 'terminar la validación de las facturas (ya quedaron validadas)');
    }
};

// POST /api/emprendimientos-admin/:id/facturas/observar  body: { motivo }
export const observarFacturas = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
    if (motivo.length < 10 || motivo.length > 512) {
        return res.status(400).json({ error: 'Escriba qué debe corregir el emprendedor (entre 10 y 512 caracteres).' });
    }
    try {
        const fila = await modelObservarFacturas(id, motivo, auditoriaDe(req));
        const resultado = await enviarSiHayCorreo(fila, correoObservacion(fila, req));
        res.json({
            mensaje: `Las facturas fueron observadas: el emprendedor ya puede corregirlas y volver a enviarlas.${textoResultadoIntento(resultado)}`,
            ...resultado,
            detalle: await datosDetalle(fila)
        });
    } catch (error) {
        responderError(res, error, 'observar las facturas');
    }
};

// POST /api/emprendimientos-admin/:id/facturas/correo -> reintenta el último correo de las facturas (validadas u observadas)
export const reenviarCorreoFacturas = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    try {
        const fila = await modelDetalleEmprendimiento(id);
        if (!fila) return res.status(404).json({ error: 'El emprendimiento no existe.' });
        let mensaje;
        if (fila.EstadoFacturas === 'validadas') {
            const ruta = fila.PathDirectorioFacturas && rutaFisica(direccionPdfValidado(fila));
            const bytes = ruta && await existe(ruta) ? await fs.readFile(ruta) : null;
            mensaje = correoValidacion(fila, bytes);
        } else if (fila.EstadoFacturas === 'observadas') {
            mensaje = correoObservacion(fila, req);
        } else {
            return res.status(409).json({ error: 'Las facturas no están validadas ni observadas: no hay correo para reenviar.' });
        }
        const resultado = await enviarSiHayCorreo(fila, mensaje);
        res.status(resultado.correoEnviado ? 200 : 502).json({ mensaje: textoResultadoIntento(resultado).trim(), ...resultado });
    } catch (error) {
        responderError(res, error, 'reenviar el correo');
    }
};

// POST /api/emprendimientos-admin/:id/puesta-marcha
export const acreditarPuestaMarcha = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    try {
        const fila = await modelAcreditarPuestaMarcha(id, auditoriaDe(req));
        res.json({ mensaje: 'La puesta en marcha quedó acreditada.', detalle: await datosDetalle(fila) });
    } catch (error) {
        responderError(res, error, 'acreditar la puesta en marcha');
    }
};

// PUT /api/emprendimientos-admin/:id/antecedentes  body: { antecedentes: true|false, descripcion }
export const actualizarAntecedentes = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    const antecedentes = req.body?.antecedentes === true;
    const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
    if (antecedentes && (descripcion.length < 10 || descripcion.length > 512)) {
        return res.status(400).json({ error: 'Describa el antecedente (entre 10 y 512 caracteres).' });
    }
    try {
        const fila = await modelActualizarAntecedentes(id, antecedentes, descripcion, auditoriaDe(req));
        res.json({ mensaje: antecedentes ? 'Se marcó el antecedente del emprendedor.' : 'Se quitó el antecedente del emprendedor.', detalle: await datosDetalle(fila) });
    } catch (error) {
        responderError(res, error, 'actualizar los antecedentes');
    }
};
