import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  modelRegistrarSolicitudInicio,
  modelObtenerSolicitudDeUsuario,
  modelTienePedidoPendiente,
  modelRegistrarPedidoAyuda
} from '../models/formulariosDigitalesModel.js';

// Los PDF se guardan junto a los demás documentos subidos (servidos en /uploads)
// con un nombre base y un número correlativo (ej: SolicitudInicialFormIni12.pdf)
const carpetasDestino = {
  'Formulario de Inicio': { carpeta: 'solicitudesinicio', nombreBase: 'SolicitudInicialFormIni' },
  'Formulario de Subsidios no Reintegrables': { carpeta: 'subsidios', nombreBase: 'SolicitudSubsidio' },
  'Formulario de Creditos Reintegrables': { carpeta: 'creditos', nombreBase: 'SolicitudCredito' }
};
const carpetaPlantillas = path.join(process.cwd(), 'plantillas_pdf');

const plantillas = {
  'Formulario de Inicio': 'formulario_de_inicio.pdf',
  'Formulario de Subsidios no Reintegrables': 'FORMULARIO-SUBSIDIOS.pdf',
  'Formulario de Creditos Reintegrables': 'FORMULARIO-CREDITOS.pdf'
};

const coordenadasBase = {
  'Formulario de Inicio': {
    // medidas sobre la hoja oficial (612 x 1008 pt); la fecha se escribe aparte, por partes
    nombreApellido: [130, 576],
    dniCuit: [72, 551],
    domicilio: [88, 526],
    telefono: [58, 500],
    correo: [300, 500],
    calleEmprendimiento: [210, 475],
    numeroEmprendimiento: [442, 475],
    barrio: [70, 450],
    departamento: [334, 450],
    rubro: [242, 374],
    tipoFinanciamiento: [80, 349],
    bien1: [50, 299],
    bien2: [50, 274],
    bien3: [50, 249],
    firma: [76, 121]
  },
  // Carátulas oficiales (595 x 842 pt): solo los renglones que existen en la hoja.
  // El resto de los datos va en la hoja "Resumen de datos" que se agrega al final.
  'Formulario de Subsidios no Reintegrables': {
    nombreEmprendimiento: [184, 467],
    localidad: [140, 425],
    rubro: [176, 393],
    nombreApellido: [160, 275],
    dniCuit: [393, 275]
  },
  'Formulario de Creditos Reintegrables': {
    nombreEmprendimiento: [60, 375],
    localidad: [140, 354],
    rubro: [176, 322],
    nombreApellido: [160, 275],
    dniCuit: [393, 275]
  }
};

const etiquetas = {
  nombreApellido: 'Nombre y apellido',
  dniCuit: 'DNI / CUIT',
  telefono: 'Telefono',
  correo: 'Correo electronico',
  domicilio: 'Domicilio',
  nombreEmprendimiento: 'Nombre del emprendimiento',
  rubro: 'Rubro / actividad',
  localidad: 'Localidad',
  fechaInicio: 'Fecha de inicio de actividad',
  descripcion: 'Descripcion del emprendimiento',
  necesidadPrincipal: 'Necesidad principal',
  antiguedad: 'Antiguedad del emprendimiento',
  montoSolicitado: 'Monto solicitado',
  destinoSubsidio: 'Destino del subsidio',
  justificacion: 'Justificacion de la solicitud',
  documentacion: 'Documentacion presentada',
  ingresosMensuales: 'Ingresos mensuales aproximados',
  destinoCredito: 'Destino del credito',
  planDevolucion: 'Plan de devolucion propuesto',
  garantia: 'Garantia / respaldo'
};

const limpiarTexto = (valor = '') => String(valor).replace(/[\r\n]+/g, ' ').trim();

const dividirLineas = (texto, maximoCaracteres = 72) => {
  const palabras = limpiarTexto(texto).split(' ').filter(Boolean);
  const lineas = [];
  let lineaActual = '';

  for (const palabra of palabras) {
    const candidata = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (candidata.length > maximoCaracteres) {
      if (lineaActual) lineas.push(lineaActual);
      lineaActual = palabra;
    } else {
      lineaActual = candidata;
    }
  }

  if (lineaActual) lineas.push(lineaActual);
  return lineas;
};

const escribirCampo = (pagina, fuente, clave, valor, x, y) => {
  const contenido = limpiarTexto(valor);
  if (!contenido) return;

  const esTextoLargo = contenido.length > 55 || ['descripcion', 'necesidadPrincipal', 'destinoSubsidio', 'justificacion', 'documentacion', 'destinoCredito', 'planDevolucion', 'garantia'].includes(clave);
  const lineas = esTextoLargo ? dividirLineas(contenido, 72) : [contenido];

  lineas.forEach((linea, index) => {
    pagina.drawText(linea, {
      x,
      y: y - (index * 13),
      size: 9,
      font: fuente,
      color: rgb(0, 0, 0),
      maxWidth: 455
    });
  });
};

const agregarResumenSiHaceFalta = (pdfDoc, fuente, datos) => {
  let pagina;
  let y;
  const nuevaPagina = () => {
    pagina = pdfDoc.addPage([595.28, 841.89]);
    pagina.drawText('Resumen de datos cargados digitalmente', {
      x: 50,
      y: 795,
      size: 16,
      font: fuente,
      color: rgb(0.18, 0.31, 0.47)
    });
    y = 755;
  };
  nuevaPagina();

  Object.entries(datos).forEach(([clave, valor]) => {
    const contenido = limpiarTexto(valor);
    if (!contenido || clave === 'tipoFormulario') return;

    const etiqueta = etiquetas[clave] || clave;
    if (y < 60) nuevaPagina();
    pagina.drawText(`${etiqueta}:`, { x: 50, y, size: 10, font: fuente, color: rgb(0, 0, 0) });
    y -= 14;

    dividirLineas(contenido, 88).forEach((linea) => {
      if (y < 45) nuevaPagina();
      pagina.drawText(linea, { x: 70, y, size: 9, font: fuente, color: rgb(0, 0, 0), maxWidth: 475 });
      y -= 12;
    });

    y -= 7;
  });
};

class ErrorValidacion extends Error {}

const departamentosSantiago = [
  'Aguirre', 'Alberdi', 'Atamisqui', 'Avellaneda', 'Banda', 'Belgrano', 'Capital', 'Choya', 'Copo',
  'Figueroa', 'General Taboada', 'Guasayán', 'Jiménez', 'Juan Felipe Ibarra', 'Loreto', 'Mitre', 'Moreno',
  'Ojo de Agua', 'Pellegrini', 'Quebrachos', 'Río Hondo', 'Rivadavia', 'Robles', 'Salavina', 'San Martín',
  'Sarmiento', 'Silípica'
];

// Campos obligatorios del Formulario de Inicio con el largo máximo de su columna en DatosSolicitudInicio
const camposInicio = {
  nombre: ['Nombre', 40],
  apellido: ['Apellido', 40],
  departamentoPersona: ['Departamento de residencia', 20],
  localidad: ['Localidad', 40],
  domicilio: ['Domicilio', 512],
  correo: ['Correo electrónico', 150],
  calleEmprendimiento: ['Calle del emprendimiento', 30],
  numeroEmprendimiento: ['Número de calle del emprendimiento', 6],
  barrio: ['Barrio', 50],
  departamento: ['Departamento del emprendimiento', 20],
  rubro: ['Rubro', 150]
};

const validarDocumentoYTelefono = (datos, documentoExtranjero, telefonoObligatorio) => {
  const dni = limpiarTexto(datos.dniCuit || '');
  if (!(documentoExtranjero
    ? /^[A-Za-z0-9-]{4,15}$/.test(dni)
    : /^\d{7,8}$/.test(dni))) {
    throw new ErrorValidacion(documentoExtranjero
      ? 'Ingrese un pasaporte o documento extranjero válido, con letras y números (4 a 15 caracteres).'
      : 'El DNI debe tener 7 u 8 números, sin puntos.');
  }
  datos.dniCuit = dni;

  const telefono = limpiarTexto(datos.telefono || '');
  if ((telefono || telefonoObligatorio) && !/^\d{10}$/.test(telefono)) {
    throw new ErrorValidacion('El celular debe tener 10 números, sin 0 inicial ni 15.');
  }
  datos.telefono = telefono;
};

const validarInicio = (datos) => {
  for (const [clave, [etiqueta, largoMaximo]] of Object.entries(camposInicio)) {
    const valor = limpiarTexto(datos[clave] || '');
    if (!valor) throw new ErrorValidacion(`Complete el campo "${etiqueta}".`);
    if (valor.length > largoMaximo) throw new ErrorValidacion(`El campo "${etiqueta}" admite hasta ${largoMaximo} caracteres.`);
    datos[clave] = valor;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) throw new ErrorValidacion('Ingrese un correo electrónico válido.');
  if (!departamentosSantiago.includes(datos.departamento) || !departamentosSantiago.includes(datos.departamentoPersona)) {
    throw new ErrorValidacion('Seleccione un departamento válido de Santiago del Estero.');
  }
  if (!['Sí', 'No'].includes(datos.enMarcha)) throw new ErrorValidacion('Indique si el emprendimiento está en marcha.');
  if (!['Subsidio', 'Credito'].includes(datos.tipoFinanciamiento)) throw new ErrorValidacion('Elija Subsidio o Crédito como tipo de ayuda.');

  datos.nombreApellido = `${datos.nombre} ${datos.apellido}`;
};

const validarMonto = (valor) => {
  const monto = Number(valor);
  if (!Number.isFinite(monto) || monto <= 0 || monto > 9999999999.99) {
    throw new ErrorValidacion('Ingrese un monto solicitado válido, mayor a 0.');
  }
  return Math.round(monto * 100) / 100;
};

// Arma el PDF a partir de la plantilla, los datos y los adjuntos. Devuelve los bytes finales.
const generarPdf = async (tipoFormulario, datos, imagenes) => {
  if (!Array.isArray(imagenes) || imagenes.length > 8) {
    throw new ErrorValidacion('Seleccione hasta 8 archivos adjuntos.');
  }
  const totalBytes = imagenes.reduce((total, archivo) => {
    if (typeof archivo?.data !== 'string') return total;
    const base64 = archivo.data.slice(archivo.data.indexOf(',') + 1);
    return total + Buffer.from(base64, 'base64').length;
  }, 0);
  if (totalBytes > 16 * 1024 * 1024) {
    throw new ErrorValidacion('El total de los archivos adjuntos no puede superar 16 MB.');
  }

  const rutaPlantilla = path.join(carpetaPlantillas, plantillas[tipoFormulario]);
  const bytesPlantilla = await fs.readFile(rutaPlantilla);
  const pdfDoc = await PDFDocument.load(bytesPlantilla);
  const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pagina = pdfDoc.getPages()[0];
  const coordenadas = coordenadasBase[tipoFormulario] || {};

  Object.entries(coordenadas).forEach(([clave, posicion]) => {
    // en la BD se guarda 'Credito' (sin tilde), en el papel se muestra con tilde
    const valor = clave === 'tipoFinanciamiento' && datos[clave] === 'Credito' ? 'Crédito' : datos[clave];
    escribirCampo(pagina, fuente, clave, valor, posicion[0], posicion[1]);
  });

  if (tipoFormulario === 'Formulario de Inicio') {
    // "SANTIAGO DEL ESTERO ....... de ............ de 202.": día, mes y el último dígito del año
    const hoy = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const estiloFecha = { y: 877, size: 10, font: fuente, color: rgb(0, 0, 0) };
    pagina.drawText(String(hoy.getDate()), { ...estiloFecha, x: 372 });
    pagina.drawText(meses[hoy.getMonth()], { ...estiloFecha, x: 445 });
    pagina.drawText(String(hoy.getFullYear()).slice(3), { ...estiloFecha, x: 564 });
  }

  if (tipoFormulario === 'Formulario de Inicio' && datos.enMarcha) {
    const x = datos.enMarcha === 'Sí' ? 300 : 362;
    pagina.drawText('X', { x, y: 425, size: 10, font: fuente, color: rgb(0, 0, 0) });
  }

  if (tipoFormulario !== 'Formulario de Inicio') {
    agregarResumenSiHaceFalta(pdfDoc, fuente, datos);
  } else {
    const paginaCroquis = pdfDoc.getPages()[1];
    if (paginaCroquis) {
      paginaCroquis.drawRectangle({
        x: 32, y: 310, width: 545, height: 590,
        color: rgb(1, 1, 1)
      });
      paginaCroquis.drawText('Imágenes del emprendimiento', {
        x: 36, y: 875, size: 12, font: fuente, color: rgb(0, 0, 0), maxWidth: 470
      });
    }
  }

  let paginasAdjuntas = 0;
  for (const imagen of imagenes) {
    const coincidencia = typeof imagen?.data === 'string'
      ? imagen.data.match(/^data:(image\/(?:png|jpe?g)|application\/pdf);base64,/i)
      : null;
    if (!coincidencia) {
      throw new ErrorValidacion('Adjunte imágenes JPG/PNG o archivos PDF.');
    }

    const base64 = imagen.data.slice(imagen.data.indexOf(',') + 1);
    const bytes = Buffer.from(base64, 'base64');
    const esPdf = /^application\/pdf$/i.test(coincidencia[1]);
    const tamanioMaximo = esPdf ? 8 : 2;
    if (!bytes.length || bytes.length > tamanioMaximo * 1024 * 1024) {
      throw new ErrorValidacion(`Cada ${esPdf ? 'PDF' : 'imagen'} debe pesar como máximo ${tamanioMaximo} MB.`);
    }

    if (esPdf) {
      let pdfAdjunto;
      try {
        pdfAdjunto = await PDFDocument.load(bytes);
      } catch {
        throw new ErrorValidacion(`${imagen.nombre || 'El archivo PDF'} no se pudo abrir. Use un PDF válido y sin contraseña.`);
      }
      const indices = pdfAdjunto.getPageIndices();
      paginasAdjuntas += indices.length;
      if (!indices.length || paginasAdjuntas > 30) {
        throw new ErrorValidacion('Los PDF adjuntos pueden tener como máximo 30 páginas en total.');
      }
      const paginas = await pdfDoc.copyPages(pdfAdjunto, indices);
      paginas.forEach((paginaPdf) => pdfDoc.addPage(paginaPdf));
      continue;
    }

    const esPng = /^data:image\/png/i.test(imagen.data);
    let imagenPdf;
    try {
      imagenPdf = esPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    } catch {
      throw new ErrorValidacion(`${imagen.nombre || 'La imagen'} no se pudo leer. Use un JPG o PNG válido.`);
    }
    const paginaImagen = pdfDoc.addPage([595.28, 841.89]);
    paginaImagen.drawText('Imágenes del emprendimiento', {
      x: 40, y: 800, size: 16, font: fuente, color: rgb(0.18, 0.31, 0.47)
    });
    const margen = 40;
    const anchoDisponible = 595.28 - margen * 2;
    const altoDisponible = 720;
    const escala = Math.min(anchoDisponible / imagenPdf.width, altoDisponible / imagenPdf.height);
    const ancho = imagenPdf.width * escala;
    const alto = imagenPdf.height * escala;
    paginaImagen.drawImage(imagenPdf, {
      x: (595.28 - ancho) / 2,
      y: 750 - alto,
      width: ancho,
      height: alto
    });
    if (imagen.nombre) {
      paginaImagen.drawText(limpiarTexto(imagen.nombre).slice(0, 100), {
        x: margen, y: 25, size: 9, font: fuente, color: rgb(0, 0, 0), maxWidth: anchoDisponible
      });
    }
  }

  return pdfDoc.save();
};

// Escribe el PDF con el siguiente número libre de la carpeta (el mayor existente + 1).
// La bandera 'wx' nunca pisa un archivo: si dos envíos toman el mismo número, el segundo prueba con el siguiente.
const escribirConNumero = async (carpetaFisica, nombreBase, bytesPdf) => {
  const patron = new RegExp(`^${nombreBase}(\\d+)\\.pdf$`, 'i');
  const existentes = await fs.readdir(carpetaFisica);
  let numero = existentes.reduce((mayor, archivo) => {
    const coincidencia = archivo.match(patron);
    return coincidencia ? Math.max(mayor, Number(coincidencia[1])) : mayor;
  }, 0);

  for (let intento = 0; intento < 20; intento++) {
    numero += 1;
    const nombreArchivo = `${nombreBase}${String(numero).padStart(2, '0')}.pdf`;
    try {
      await fs.writeFile(path.join(carpetaFisica, nombreArchivo), bytesPdf, { flag: 'wx' });
      return nombreArchivo;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`No se encontró un número libre para ${nombreBase}`);
};

// Guarda el PDF en /uploads, lo registra en MySQL y responde con el archivo.
// Si la base de datos falla, se borra el PDF para no dejar archivos huérfanos.
const guardarYResponder = async (res, tipoFormulario, bytesPdf, registrar) => {
  const { carpeta, nombreBase } = carpetasDestino[tipoFormulario];
  const carpetaFisica = path.join(process.cwd(), 'uploads', carpeta);
  await fs.mkdir(carpetaFisica, { recursive: true });

  const nombreArchivo = await escribirConNumero(carpetaFisica, nombreBase, bytesPdf);
  const rutaArchivo = path.join(carpetaFisica, nombreArchivo);
  const direccionWeb = `/uploads/${carpeta}/${nombreArchivo}`;

  let idRegistro;
  try {
    idRegistro = await registrar(direccionWeb);
  } catch (errorRegistro) {
    await fs.unlink(rutaArchivo).catch(() => {});
    throw errorRegistro;
  }

  res.set('X-Formulario-Registro', String(idRegistro));
  res.set('X-Formulario-Url', direccionWeb);
  res.set('Access-Control-Expose-Headers', 'X-Formulario-Registro, X-Formulario-Url');
  res.status(201).download(rutaArchivo, nombreArchivo, (errorDescarga) => {
    if (errorDescarga) console.error('Error al enviar el PDF generado:', errorDescarga);
  });
};

const responderError = (res, error, mensajeGeneral) => {
  if (error instanceof ErrorValidacion) {
    return res.status(400).json({ error: error.message });
  }
  console.error(mensajeGeneral, error);
  return res.status(500).json({ error: mensajeGeneral });
};

// POST /api/formularios-digitales/inicio (público: todavía no es emprendedor)
export const crearFormularioInicio = async (req, res) => {
  const tipoFormulario = 'Formulario de Inicio';
  try {
    const { imagenes = [], documentoExtranjero = false, tipoFormulario: _tipo, ...datos } = req.body;

    validarDocumentoYTelefono(datos, documentoExtranjero, true);
    validarInicio(datos);

    const bytesPdf = await generarPdf(tipoFormulario, datos, imagenes);
    const datosAuditoria = { idUsuario: null, ipCliente: req.ip || '127.0.0.1' };

    await guardarYResponder(res, tipoFormulario, bytesPdf,
      (direccionWeb) => modelRegistrarSolicitudInicio(direccionWeb, datos, datosAuditoria));
  } catch (error) {
    responderError(res, error, 'No se pudo registrar el Formulario de Inicio.');
  }
};

// POST /api/formularios-digitales/ayuda (requiere emprendedor logueado)
export const crearFormularioAyuda = async (req, res) => {
  try {
    const { tipoFormulario, imagenes = [], documentoExtranjero = false, ...datos } = req.body;
    const tiposAyuda = {
      'Formulario de Subsidios no Reintegrables': 'Subsidio',
      'Formulario de Creditos Reintegrables': 'Credito'
    };
    const tipo = tiposAyuda[tipoFormulario];

    if (!tipo) {
      return res.status(400).json({ error: 'Tipo de formulario invalido' });
    }
    if (req.usuarioLogueado.tipoUsuario !== 'Emprendedor') {
      return res.status(403).json({ error: 'Solo un emprendedor puede solicitar subsidios o créditos.' });
    }

    const idSolicitudInicio = await modelObtenerSolicitudDeUsuario(req.usuarioLogueado.idUsuario);
    if (!idSolicitudInicio) {
      return res.status(404).json({ error: 'Su usuario no tiene un emprendimiento con solicitud de inicio asociada.' });
    }
    if (await modelTienePedidoPendiente(tipo, idSolicitudInicio)) {
      return res.status(409).json({ error: `Ya tiene un pedido de ${tipo === 'Subsidio' ? 'subsidio' : 'crédito'} pendiente de resolución.` });
    }

    validarDocumentoYTelefono(datos, documentoExtranjero, false);
    const monto = validarMonto(datos.montoSolicitado);

    const bytesPdf = await generarPdf(tipoFormulario, datos, imagenes);
    const datosAuditoria = { idUsuario: req.usuarioLogueado.idUsuario, ipCliente: req.ip || '127.0.0.1' };

    await guardarYResponder(res, tipoFormulario, bytesPdf,
      (direccionWeb) => modelRegistrarPedidoAyuda(tipo, direccionWeb, monto, idSolicitudInicio, datosAuditoria));
  } catch (error) {
    responderError(res, error, 'No se pudo registrar el formulario.');
  }
};
