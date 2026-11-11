// Prepara los archivos de "Insert de datos presentacion.sql": copia las imágenes de Adjunto/ a uploads/ y genera los PDF
// (solicitudes de inicio, subsidios, créditos, garantes y facturas validadas) con las plantillas de plantillas_pdf/.
// Los datos de los PDF salen de la base: primero se ejecuta el SQL y después este script, desde la raíz del proyecto:
//   node database/preparar-archivos-presentacion.js
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pool } from '../config/db.js';
import { generarPdfDesdePlantilla, imagenComoDataUri } from '../helpers/pdfDesdeHtml.js';
import { rutaFisica } from '../helpers/imagenes.js';

const raiz = process.cwd();
const adjunto = (...partes) => path.join(raiz, 'Adjunto', ...partes);
const carpetaPlantillaAyuda = path.join(raiz, 'plantillas_pdf', 'ayuda');
const carpetaPlantillaInicio = path.join(raiz, 'plantillas_pdf', 'inicio');

// ---------- Imágenes de Adjunto/ (carpeta de origen -> ruta web de uploads) ----------

const ICONOS_RUBRO = ['Bisuteria.png', 'Indumentaria.png', 'Talabarteria-Cuero.png'];

// idPublicacion -> versiones de fotos (presentacion-1 = la aprobada o la nueva, presentacion-2 = la edición pendiente)
const FOTOS_PUBLICACIONES = {
    1: { 1: ['Bombos Santos', 'images.jpg', 'images (1).jpg'] },
    2: { 1: ['Bombos Santos', 'paz_bombocuelga.jpg', 'images (4).jpg'] },
    3: { 1: ['Los Telares de Marta', '2._tecnica_de_tejido_artesanal_en_telar_de_estaca.jpg', 'images.jpg'] },
    4: { 1: ['Los Telares de Marta', 'telares-guandacol-2.jpg', 'images (2).jpg'] },
    5: { 1: ['Mauricio Muebles', 'muebles.jpeg', 'images.jpg'], 2: ['Mauricio Muebles', 'WhatsApp-Image-2024-11-13-at-09.08.10.jpeg', 'images (1).jpg', 'muebles.jpeg'] },
    6: { 1: ['La Carpinteria Pajaro Loco', 'carpinteria.jpg', 'carpinteria 2.webp', 'carpinteria 3.webp'] },
    7: { 1: ['La Carpinteria Pajaro Loco', 'rubro-carpinteria.jpg'] },
    8: { 1: ['Bijoutery Paola', 'images.jpg', 'images (1).jpg', 'images (2).jpg', 'images (3).jpg'] },
    9: { 1: ['Indumentaria Sofia', '734753.jpg', 'images.jpg'] },
    10: { 1: ['Indumentaria Sofia', 'imagen2.webp', 'images (1).jpg'] },
    11: { 1: ['La Talabarteria de Edu', 'images.jpg', 'images (1).jpg', 'images (2).jpg', 'images (3).jpg'] },
    12: { 1: ['Cintos Hernan', 'images (2).jpg', 'images (4).jpg'] },
    13: { 1: ['Cintos Hernan', 'images.jpg', 'images (1).jpg'] }
};

// idEmprendimiento -> fotos de sus productos, en el orden del SQL (producto-1, producto-2, producto-3)
const FOTOS_PRODUCTOS = {
    1: ['Bombos Santos', 'images (2).jpg', 'images (3).jpg', 'images (1).jpg'],
    2: ['Los Telares de Marta', 'images (1).jpg', 'images (3).jpg', 'images.jpg'],
    3: ['Mauricio Muebles', 'images (2).jpg', 'images (3).jpg', 'producto.jpg'],
    4: ['La Carpinteria Pajaro Loco', '5522f9971e46f-908x1024.jpg', 'images (1).jpg', 'images.jpg'],
    5: ['Bijoutery Paola', 'images (4).jpg', 'images.jpg', 'producto 1.png'],
    6: ['Indumentaria Sofia', 'a01fig01.jpg', 'images (2).jpg', 'images.jpg'],
    7: ['La Talabarteria de Edu', 'images (4).jpg', 'producto.jpg', 'producto3.webp'],
    8: ['Cintos Hernan', 'images (1).jpg', 'images (3).jpg', 'images (5).jpg']
};

// Carpeta de noticia (noticia-presentacion-N) -> carpeta de Adjunto/noticias y sus imágenes
const FOTOS_NOTICIAS = {
    1: ['noticia-1-feria', 'imagen.webp', '693ace745632d__912x912.webp'],
    2: ['noticia-2-feria', 'images.jpg', 'images (1).jpg'],
    3: ['noticia-3-capacitacion', 'ACCION-8-10-2026.jpeg'],
    4: ['noticia-4-capacitacion', 'images.jpg'],
    5: ['noticia-5-capacitacion', '1789491534_6aa9794e1de17.jpeg']
};

// Facturas de Ley: carpeta del SQL -> archivos sueltos [nombre con el que se muestra, archivo de Adjunto/facturas].
// validadas: en vez de los archivos sueltos queda el PDF unificado (como lo deja el sistema al validar)
const FACTURAS = [
    { tipo: 'subsidio', id: 1, validadas: true, archivos: [
        ['Factura A 0003-00004512 - Maderera Santiago', 'factura-de-ventas-D3925.png'],
        ['Factura B 0001-00021877 - Cueros del Norte', 'images.jpg'],
        ['Factura B 0002-00001290 - Pinturería La Banda', 'images (1).png']] },
    { tipo: 'subsidio', id: 5, validadas: true, archivos: [
        ['Factura B 0004-00010233 - Curtiembre Frías', 'images (2).jpg'],
        ['Factura B 0001-00000875 - Herrajes Choya', 'images.png']] },
    { tipo: 'subsidio', id: 2, archivos: [
        ['Factura B 0002-00003341 - Hilandería Figueroa', 'images (3).jpg'],
        ['Factura C 0001-00000412 - Telares del Norte', 'images (2).png'],
        ['Factura B 0005-00011020 - Tintes naturales', 'images (1).jpg']] },
    { tipo: 'credito', id: 1, archivos: [
        ['Factura A 0007-00002291 - Cepilladora', 'images.jpg'],
        ['Factura B 0003-00015870 - Placas de melamina', 'factura-de-ventas-D3925.png']] },
    { tipo: 'credito', id: 2, archivos: [
        ['Factura A 0001-00007733 - Maderas Río Hondo', 'images (1).png'],
        ['Factura B 0002-00000918 - Ferretería Las Termas', 'images (2).jpg']] }
];

// Fotos del emprendimiento que van adjuntas al Formulario de Inicio, según el rubro (solo JPG o PNG: pdf-lib no lee WEBP)
const FOTOS_INICIO_POR_RUBRO = {
    'Bombos artesanales': ['Bombos Santos', 'images.jpg', 'paz_bombocuelga.jpg'],
    'Telares artesanales': ['Los Telares de Marta', 'images.jpg', 'images (2).jpg'],
    'Muebles': ['Mauricio Muebles', 'muebles.jpeg', 'images (1).jpg'],
    'Carpintería General': ['La Carpinteria Pajaro Loco', 'carpinteria.jpg', 'rubro-carpinteria.jpg'],
    'Bisutería': ['Bijoutery Paola', 'images (1).jpg', 'images (3).jpg'],
    'Indumentaria': ['Indumentaria Sofia', '734753.jpg', 'images (1).jpg'],
    'Talabartería y Cuero': ['La Talabarteria de Edu', 'images.jpg', 'images (2).jpg']
};

// Bienes que se piden en el formulario según el rubro: [activo fijo, bien de uso, bien de uso]
const BIENES_POR_RUBRO = {
    'Bombos artesanales': ['Torno para madera', 'Cueros de cabra curtidos', 'Pinturas y barnices'],
    'Telares artesanales': ['Telar criollo de pie', 'Lana de oveja hilada', 'Tintes naturales'],
    'Muebles': ['Escuadradora', 'Placas de melamina', 'Herrajes y tornillería'],
    'Carpintería General': ['Cepilladora', 'Madera de cedro', 'Herramientas de mano'],
    'Bisutería': ['Kit de pinzas y herramientas', 'Alambre de alpaca', 'Piedras y cuentas'],
    'Indumentaria': ['Máquina de coser industrial', 'Telas de algodón', 'Hilos para bordar'],
    'Talabartería y Cuero': ['Máquina de coser cuero', 'Cuero curtido', 'Hebillas y herrajes']
};

// Presupuestos adjuntos a subsidios y créditos (las mismas imágenes de facturas sirven de ejemplo)
const PRESUPUESTOS = ['factura-de-ventas-D3925.png', 'images (2).jpg'];

const DOCUMENTOS_GARANTE = ['Fotocopia de DNI autenticada', 'Constancia de CUIL', 'Certificado de residencia', 'Boleta de impuesto', 'Recibo de sueldo (el último del mes)'];

// ---------- Utilidades ----------

const copiar = async (origen, rutaWeb) => {
    const destino = rutaFisica(rutaWeb);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.copyFile(origen, destino);
};

// Vacía una carpeta de uploads antes de volver a llenarla (así no quedan archivos de una ejecución anterior)
const vaciar = (rutaWeb) => fs.rm(rutaFisica(rutaWeb), { recursive: true, force: true });

const guardar = async (rutaWeb, bytes) => {
    const destino = rutaFisica(rutaWeb);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, bytes);
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLugar = (fecha) => `SANTIAGO DEL ESTERO, ${String(fecha.getDate()).padStart(2, '0')} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
const fechaCorta = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-AR') : '-');
const importe = (valor) => Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const completarRenglones = (filas, minimo) => [...filas, ...Array(Math.max(0, minimo - filas.length)).fill({})];
// Fuente estándar de pdf-lib: solo caracteres latinos
const textoPdf = (texto) => String(texto ?? '').normalize('NFC').replace(/[^\x20-\x7E -ÿ]/g, '?');

const extension = (archivo) => path.extname(archivo).toLowerCase().replace('.jpeg', '.jpg');

const incrustarImagen = async (pdf, rutaImagen) => {
    const bytes = await fs.readFile(rutaImagen);
    return extension(rutaImagen) === '.png' ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
};

// Hoja A4 con un título arriba y la imagen debajo (como los adjuntos de subsidio y crédito)
const agregarHojaImagen = (pdf, fuente, titulo, imagen) => {
    const pagina = pdf.addPage([595.28, 841.89]);
    pagina.drawText(textoPdf(titulo), { x: 40, y: 800, size: 13, font: fuente, color: rgb(0.18, 0.31, 0.47), maxWidth: 515 });
    const escala = Math.min(515 / imagen.width, 680 / imagen.height);
    const ancho = imagen.width * escala;
    const alto = imagen.height * escala;
    pagina.drawImage(imagen, { x: (595.28 - ancho) / 2, y: 765 - alto, width: ancho, height: alto });
};

// ---------- Copia de imágenes ----------

const copiarImagenes = async () => {
    for (const icono of ICONOS_RUBRO) await copiar(adjunto('rubros', icono), `/uploads/IconoMapa/${icono}`);

    for (const [idPublicacion, versiones] of Object.entries(FOTOS_PUBLICACIONES)) {
        for (const [version, [carpeta, ...fotos]] of Object.entries(versiones)) {
            const carpetaWeb = `/uploads/publicaciones/${idPublicacion}/presentacion-${version}`;
            await vaciar(carpetaWeb);
            for (const [i, foto] of fotos.entries()) {
                await copiar(adjunto('publicaciones', carpeta, foto), `${carpetaWeb}/foto-${i + 1}${extension(foto)}`);
            }
        }
    }

    for (const [idEmprendimiento, [carpeta, ...fotos]] of Object.entries(FOTOS_PRODUCTOS)) {
        for (const [i, foto] of fotos.entries()) {
            await copiar(adjunto('productos', carpeta, foto), `/uploads/productos/${idEmprendimiento}/producto-${i + 1}-presentacion${extension(foto)}`);
        }
    }

    for (const [numero, [carpeta, ...fotos]] of Object.entries(FOTOS_NOTICIAS)) {
        const carpetaWeb = `/uploads/NoticiasImagen/noticia-presentacion-${numero}`;
        await vaciar(carpetaWeb);
        for (const [i, foto] of fotos.entries()) {
            await copiar(adjunto('noticias', carpeta, foto), `${carpetaWeb}/foto-${i + 1}${extension(foto)}`);
        }
    }
};

// ---------- Facturas de Ley ----------

// Mismo formato que el PDF que arma el sistema al validar: las facturas y una carátula al principio
const pdfFacturasValidadas = async (datos, archivos) => {
    const pdf = await PDFDocument.create();
    pdf.setTitle(textoPdf(`Facturas de Ley - ${datos.Emprendimiento}`));
    const fuente = await pdf.embedFont(StandardFonts.Helvetica);
    const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
    const caratula = pdf.addPage([595.28, 841.89]);
    for (const [i, [nombre, archivo]] of archivos.entries()) {
        agregarHojaImagen(pdf, fuente, `Factura ${i + 1} de ${archivos.length}: ${nombre}`, await incrustarImagen(pdf, adjunto('facturas', archivo)));
    }
    let y = 790;
    const escribir = (texto, tamano = 11, fuenteTexto = fuente, color = rgb(0.12, 0.16, 0.2)) => {
        caratula.drawText(textoPdf(texto), { x: 40, y, size: tamano, font: fuenteTexto, color, maxWidth: 515 });
        y -= tamano + 6;
    };
    escribir('Facturas de Ley', 20, negrita, rgb(0.18, 0.31, 0.47));
    escribir('El Camino de los Emprendedores - Ministerio de Desarrollo Social', 10, fuente, rgb(0.4, 0.4, 0.4));
    y -= 14;
    escribir(`Emprendimiento: ${datos.Emprendimiento}`);
    escribir(`Nº de Proyecto: ${datos.NroProyecto}`);
    escribir(`Nº de Expediente: ${datos.NroExpediente || '-'}`);
    escribir(`Emprendedor: ${datos.Emprendedor} (DNI ${datos.DNI})`);
    escribir(`Ayuda: ${datos.tipo === 'subsidio' ? 'Subsidio' : 'Crédito'} por $ ${importe(datos.monto)}`);
    escribir(`Aprobación del Ministro: ${fechaCorta(datos.FechaResolucionMin)}`);
    escribir(`Facturas entregadas: ${fechaCorta(datos.FechaEntregaFacturas)}`);
    escribir(`Facturas validadas: ${fechaCorta(datos.FechaFacturasValidadas)} por ${datos.Validador}`);
    y -= 14;
    escribir(`Archivos presentados (${archivos.length})`, 12, negrita);
    archivos.forEach(([nombre], i) => escribir(`${i + 1}. ${nombre} - página ${i + 2}`, 10));
    return pdf.save();
};

const prepararFacturas = async () => {
    for (const [orden, { tipo, id, validadas, archivos }] of FACTURAS.entries()) {
        const tabla = tipo === 'subsidio' ? 'Subsidio' : 'Credito';
        const columnaId = tipo === 'subsidio' ? 'idSubsidio' : 'idCredito';
        const [[datos]] = await pool.query(
            `SELECT a.PathDirectorioFacturas, a.monto, a.FechaEntregaFacturas, a.FechaFacturasValidadas, s.FechaResolucionMin,
                    e.Nombre AS Emprendimiento, e.NroProyecto, x.NroExpediente, em.DNI,
                    CONCAT(em.Nombre, ' ', em.Apellido) AS Emprendedor, CONCAT(v.Nombre, ' ', v.Apellido) AS Validador
             FROM ${tabla} a
             INNER JOIN SolicitudInicio s ON s.idSolicitudInicio = a.idSolicitudInicio
             INNER JOIN Emprendimiento e ON e.idSolicitudInicio = s.idSolicitudInicio
             INNER JOIN Emprendedor em ON em.idEmprendimiento = e.idEmprendimiento
             LEFT JOIN Expediente x ON x.idSolicitudInicio = s.idSolicitudInicio
             LEFT JOIN Empleado v ON v.idEmpleado = a.idEmpleadoFacturas
             WHERE a.${columnaId} = ?;`,
            [id]
        );
        if (!datos?.PathDirectorioFacturas) throw new Error(`El ${tabla} ${id} no tiene carpeta de facturas: ¿se ejecutó el SQL de presentación?`);
        const carpetaWeb = datos.PathDirectorioFacturas;
        await vaciar(carpetaWeb);

        if (validadas) {
            await guardar(`${carpetaWeb}/FacturasDeLey-${tipo}-${id}.pdf`, await pdfFacturasValidadas({ ...datos, tipo }, archivos));
            continue;
        }
        // Nombre como lo guarda el sistema: <milisegundos>-<8 hex>__<nombre>.<jpg|png|pdf>
        const base = Date.UTC(2026, 9, 1) + orden * 86400000;
        for (const [i, [nombre, archivo]] of archivos.entries()) {
            const azar = ((orden + 1) * 0x1f3a7c5 + (i + 1) * 0x2b9d41).toString(16).padStart(8, '0').slice(-8);
            await copiar(adjunto('facturas', archivo), `${carpetaWeb}/${base + i * 60000}-${azar}__${nombre}${extension(archivo)}`);
        }
    }
};

// ---------- Formularios PDF ----------

const plantillaAyuda = async (plantilla, datos, esCredito) => generarPdfDesdePlantilla(path.join(carpetaPlantillaAyuda, plantilla), {
    datos,
    esCredito,
    logo: await imagenComoDataUri(path.join(carpetaPlantillaAyuda, 'logo-ministerio.png')),
    escudo: await imagenComoDataUri(path.join(carpetaPlantillaAyuda, 'escudo-santiago.png')),
    rubroEmprendimiento: datos.rubroEmprendimiento,
    fecha: datos.fechaLugar,
    fechaHoy: datos.fechaLugar,
    filasBienes: completarRenglones(datos.bienesPropios, 8),
    filasActivoFijo: completarRenglones(datos.activoFijo, 8),
    filasBienesUso: completarRenglones(datos.bienesUso, 9),
    documentosGarante: DOCUMENTOS_GARANTE,
    moneda: (valor) => (valor === undefined || valor === '' ? '' : importe(valor))
});

// Datos de cada solicitud: los del Formulario de Inicio o, en la carga histórica, los del emprendimiento y su emprendedor
const consultarSolicitudes = async () => {
    const [filas] = await pool.query(`
        SELECT s.idSolicitudInicio, s.DireccionPDF, s.FechaRecibidoMesa, x.NroExpediente,
               COALESCE(d.PersonaNombre, em.Nombre) AS Nombre, COALESCE(d.PersonaApellido, em.Apellido) AS Apellido,
               COALESCE(d.PersonaDNI, em.DNI) AS DNI, COALESCE(d.PersonaDepartamento, em.Departamento) AS PersonaDepartamento,
               COALESCE(d.PersonaLocalidad, em.Localidad) AS PersonaLocalidad, COALESCE(d.PersonaDomicilio, em.Domicilio) AS PersonaDomicilio,
               COALESCE(d.PersonaTeléfono, em.Teléfono) AS Telefono, COALESCE(d.PersonaCorreo, em.Correo) AS Correo,
               COALESCE(d.EmprendimientoNombre, e.Nombre) AS Emprendimiento, COALESCE(d.EmprendimientoCalle, e.Calle) AS Calle,
               COALESCE(d.EmprendimientoNroCalle, e.NúmeroCalle) AS NroCalle, COALESCE(d.EmprendimientoBarrio, e.Barrio) AS Barrio,
               COALESCE(d.EmprendimientoDepto, e.Departamento) AS Departamento, COALESCE(d.EmprendimientoLocalidad, e.Localidad) AS Localidad,
               COALESCE(d.EmprendimientoActPrincipal, e.ActividadPrincipal) AS Actividad, COALESCE(d.EmprendimientoMarcha, e.EnMarcha) AS EnMarcha,
               COALESCE(d.EmprendimientoRubro, r.Nombre) AS Rubro,
               COALESCE(d.EleccionAyuda, IF(EXISTS (SELECT 1 FROM Credito c WHERE c.idSolicitudInicio = s.idSolicitudInicio), 'Credito', 'Subsidio')) AS Ayuda
        FROM SolicitudInicio s
        LEFT JOIN DatosSolicitudInicio d ON d.idSolicitudInicio = s.idSolicitudInicio
        LEFT JOIN Expediente x ON x.idSolicitudInicio = s.idSolicitudInicio
        LEFT JOIN Emprendimiento e ON e.idSolicitudInicio = s.idSolicitudInicio
        LEFT JOIN Emprendedor em ON em.idEmprendimiento = e.idEmprendimiento
        LEFT JOIN Rubro r ON r.idRubro = e.idRubro
        WHERE s.DireccionPDF LIKE '/uploads/solicitudesinicio/Presentacion-%'
        ORDER BY s.idSolicitudInicio;`);
    return filas;
};

// Formulario de Inicio: hoja 1 de la plantilla y una hoja por foto del emprendimiento (debajo del logo y el título)
const pdfInicio = async (s) => {
    const nombreCompleto = `${s.Nombre} ${s.Apellido}`;
    const [bien1, bien2, bien3] = BIENES_POR_RUBRO[s.Rubro];
    const [carpeta, ...fotos] = FOTOS_INICIO_POR_RUBRO[s.Rubro];
    const pdf = await PDFDocument.create();
    const plantilla = await PDFDocument.load(await generarPdfDesdePlantilla(path.join(carpetaPlantillaInicio, 'inicio.ejs'), {
        datos: {
            nombreApellido: nombreCompleto, dniCuit: s.DNI, domicilio: s.PersonaDomicilio, localidad: s.PersonaLocalidad,
            departamentoPersona: s.PersonaDepartamento, telefono: s.Telefono, correo: s.Correo,
            nombreEmprendimiento: s.Emprendimiento, calleEmprendimiento: s.Calle, numeroEmprendimiento: s.NroCalle, barrio: s.Barrio,
            localidadEmprendimiento: s.Localidad, departamento: s.Departamento, actividadPrincipal: s.Actividad,
            enMarcha: Number(s.EnMarcha) === 1 ? 'Sí' : 'No', rubro: s.Rubro, tipoFinanciamiento: s.Ayuda, bien1, bien2, bien3,
            firma: { tipo: 'texto', texto: nombreCompleto }, aclaracionProyecto: nombreCompleto, dniProyecto: s.DNI
        },
        logo: await imagenComoDataUri(path.join(carpetaPlantillaAyuda, 'logo-ministerio.png')),
        fecha: fechaLugar(new Date(s.FechaRecibidoMesa)),
        paginasAdjuntos: fotos.length
    }));
    (await pdf.copyPages(plantilla, plantilla.getPageIndices())).forEach((hoja) => pdf.addPage(hoja));

    // Mismo espacio libre que deja el sistema (en mm desde los bordes de la hoja oficio)
    const mm = 72 / 25.4;
    for (const [i, foto] of fotos.entries()) {
        const imagen = await incrustarImagen(pdf, adjunto('publicaciones', carpeta, foto));
        const pagina = pdf.getPage(i + 1);
        const anchoLibre = pagina.getWidth() - 26 * mm;
        const altoLibre = pagina.getHeight() - 57 * mm;
        const escala = Math.min(anchoLibre / imagen.width, altoLibre / imagen.height);
        const ancho = imagen.width * escala;
        const alto = imagen.height * escala;
        pagina.drawImage(imagen, { x: 13 * mm + (anchoLibre - ancho) / 2, y: 13 * mm + altoLibre - alto, width: ancho, height: alto });
    }
    return pdf.save();
};

// Datos de las hojas 1 a 6 (y 7 del garante): los cuadros de costos suman exactamente el monto pedido
const datosAyuda = (s, monto, fechaRecibido, garante) => {
    const nombreCompleto = `${s.Nombre} ${s.Apellido}`;
    const [activo, uso1, uso2] = BIENES_POR_RUBRO[s.Rubro];
    const total = Number(monto);
    const precioActivo = Math.round((total * 0.6) / 100) * 100;
    const precioUso1 = Math.round((total * 0.25) / 100) * 100;
    const activoFijo = [{ bien: activo, cantidad: 1, precioUnitario: precioActivo, subtotal: precioActivo }];
    const bienesUso = [
        { bien: uso1, cantidad: 1, precioUnitario: precioUso1, subtotal: precioUso1 },
        { bien: uso2, cantidad: 1, precioUnitario: total - precioActivo - precioUso1, subtotal: total - precioActivo - precioUso1 }
    ];
    const datos = {
        expediente: s.NroExpediente, nombreEmprendimiento: s.Emprendimiento, departamento: s.Departamento, localidad: s.Localidad,
        rubro: s.Actividad, rubroEmprendimiento: s.Rubro, nombreApellido: nombreCompleto, dniCuit: s.DNI, telefono: s.Telefono,
        correo: s.Correo, localidadTitular: s.PersonaLocalidad, departamentoTitular: s.PersonaDepartamento, domicilio: s.PersonaDomicilio,
        beneficiarios: '1 (titular del emprendimiento)', aclaracionProyecto: nombreCompleto, dniProyecto: s.DNI,
        firma: { tipo: 'texto', texto: nombreCompleto },
        bienesPropios: [{ bien: 'Herramientas de mano', cantidad: 1, antiguedad: '3 años', montoEstimado: 80000 }],
        activoFijo, bienesUso,
        aporteActivoFijo: 50000, aporteBienesUso: 30000, aporteManoObra: 120000,
        solicitadoActivoFijo: precioActivo, solicitadoBienesUso: total - precioActivo,
        totalProyectoPropio: 200000, totalProyectoSolicitado: total,
        fechaLugar: `${s.PersonaLocalidad}, ${fechaLugar(new Date(fechaRecibido))}`
    };
    if (garante) {
        Object.assign(datos, {
            nombreGarante: garante.NombreCompleto, dniGarante: garante.DNI, cuilGarante: garante.Cuil, telefonoGarante: garante.Telefono,
            correoGarante: garante.Correo, aclaracionGarante: garante.NombreCompleto, dniFirmaGarante: garante.DNI,
            firmaGarante: { tipo: 'texto', texto: garante.NombreCompleto }
        });
    }
    return datos;
};

const agregarPresupuestos = async (pdf) => {
    const fuente = await pdf.embedFont(StandardFonts.Helvetica);
    for (const archivo of PRESUPUESTOS) {
        agregarHojaImagen(pdf, fuente, 'Documentación adjunta (presupuestos)', await incrustarImagen(pdf, adjunto('facturas', archivo)));
    }
};

// Hoja 7 y una hoja por cada documento del garante (de muestra: no son documentos reales)
const pdfGarante = async (datos) => {
    const pdf = await PDFDocument.load(await plantillaAyuda('garante.ejs', datos, true));
    const fuente = await pdf.embedFont(StandardFonts.Helvetica);
    const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
    for (const documento of DOCUMENTOS_GARANTE) {
        const pagina = pdf.addPage([595.28, 841.89]);
        pagina.drawText(textoPdf(`Documentación del garante - ${documento}`), { x: 40, y: 800, size: 13, font: fuente, color: rgb(0.18, 0.31, 0.47) });
        pagina.drawRectangle({ x: 70, y: 420, width: 455, height: 300, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1, color: rgb(0.96, 0.96, 0.96) });
        pagina.drawText('DOCUMENTO DE MUESTRA', { x: 175, y: 600, size: 22, font: negrita, color: rgb(0.55, 0.55, 0.55) });
        pagina.drawText(textoPdf(documento), { x: 90, y: 560, size: 13, font: fuente, color: rgb(0.35, 0.35, 0.35) });
        pagina.drawText(textoPdf(`${datos.nombreGarante} - DNI ${datos.dniGarante}`), { x: 90, y: 535, size: 12, font: fuente, color: rgb(0.35, 0.35, 0.35) });
        pagina.drawText('Datos ficticios cargados para la presentación del sistema.', { x: 90, y: 450, size: 10, font: fuente, color: rgb(0.45, 0.45, 0.45) });
    }
    return pdf.save();
};

const generarPdfs = async () => {
    const solicitudes = await consultarSolicitudes();
    const porId = new Map(solicitudes.map((s) => [s.idSolicitudInicio, s]));

    for (const s of solicitudes) {
        await guardar(s.DireccionPDF, await pdfInicio(s));
        console.log(`  ${s.DireccionPDF}`);
    }

    const [subsidios] = await pool.query(
        "SELECT idSolicitudInicio, PathFormularioSub AS Path, monto, FechaRecibido FROM Subsidio WHERE PathFormularioSub LIKE '/uploads/subsidios/Presentacion-%';"
    );
    for (const a of subsidios) {
        const pdf = await PDFDocument.load(await plantillaAyuda('subsidio.ejs', datosAyuda(porId.get(a.idSolicitudInicio), a.monto, a.FechaRecibido), false));
        await agregarPresupuestos(pdf);
        await guardar(a.Path, await pdf.save());
        console.log(`  ${a.Path}`);
    }

    // Crédito: el PDF completo es la parte del titular (hojas 1 a 6 y presupuestos) seguida del PDF del garante
    const [creditos] = await pool.query(
        `SELECT c.idSolicitudInicio, c.PathFormularioCredito AS Path, c.monto, c.FechaRecibido,
                g.NombreCompleto, g.DNI, g.Cuil, g.Telefono, g.Correo, g.PathFormularioGarante
         FROM Credito c
         LEFT JOIN Garante g ON g.idGarante = (SELECT MAX(h.idGarante) FROM Garante h WHERE h.idCredito = c.idCredito)
         WHERE c.PathFormularioCredito LIKE '/uploads/creditos/Presentacion-%';`
    );
    for (const a of creditos) {
        const garante = a.PathFormularioGarante ? a : null;
        const datos = datosAyuda(porId.get(a.idSolicitudInicio), a.monto, a.FechaRecibido, garante);
        const completo = await PDFDocument.load(await plantillaAyuda('credito.ejs', datos, true));
        await agregarPresupuestos(completo);
        if (garante) {
            const bytesGarante = await pdfGarante(datos);
            const pdfDelGarante = await PDFDocument.load(bytesGarante);
            (await completo.copyPages(pdfDelGarante, pdfDelGarante.getPageIndices())).forEach((hoja) => completo.addPage(hoja));
            await guardar(a.PathFormularioGarante, bytesGarante);
            console.log(`  ${a.PathFormularioGarante}`);
        }
        await guardar(a.Path, await completo.save());
        console.log(`  ${a.Path}`);
    }
};

// ---------- Verificación: todas las rutas de la base apuntan a un archivo o carpeta que existe ----------

const verificar = async () => {
    const [rutas] = await pool.query(`
        SELECT DireccionPDF AS ruta FROM SolicitudInicio
        UNION ALL SELECT IconoMapa FROM Rubro WHERE IconoMapa <> ''
        UNION ALL SELECT PathFormularioSub FROM Subsidio UNION ALL SELECT PathDirectorioFacturas FROM Subsidio
        UNION ALL SELECT PathFormularioCredito FROM Credito UNION ALL SELECT PathDirectorioFacturas FROM Credito
        UNION ALL SELECT PathFormularioGarante FROM Garante
        UNION ALL SELECT DirectorioFotosActual FROM Publicacion UNION ALL SELECT DirectorioFotosPendiente FROM Publicacion
        UNION ALL SELECT PathFoto FROM Producto UNION ALL SELECT ImagenUrl FROM Noticia;`);
    const faltantes = [];
    for (const { ruta } of rutas) {
        if (!ruta) continue;
        try {
            const datos = await fs.stat(rutaFisica(ruta));
            if (datos.isDirectory() && !(await fs.readdir(rutaFisica(ruta))).length) faltantes.push(`${ruta} (carpeta vacía)`);
        } catch {
            faltantes.push(ruta);
        }
    }
    return faltantes;
};

try {
    console.log('Copiando imágenes de Adjunto/ a uploads/...');
    await copiarImagenes();
    console.log('Preparando las Facturas de Ley...');
    await prepararFacturas();
    console.log('Generando los PDF de los formularios...');
    await generarPdfs();
    const faltantes = await verificar();
    if (faltantes.length) {
        console.error(`\nFaltan ${faltantes.length} archivos referenciados en la base:\n  ${faltantes.join('\n  ')}`);
        process.exitCode = 1;
    } else {
        console.log('\nListo: todos los archivos referenciados en la base existen.');
    }
} catch (error) {
    console.error('\nNo se pudieron preparar los archivos:', error);
    process.exitCode = 1;
} finally {
    await pool.end();
    // generarPdfDesdePlantilla deja Chrome abierto para reutilizarlo: se cierra con el proceso
    process.exit();
}
