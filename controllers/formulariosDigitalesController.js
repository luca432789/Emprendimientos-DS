import fs from 'fs/promises';
import path from 'path';
import dns from 'node:dns/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  modelRegistrarSolicitudInicio,
  modelRestriccionNuevaSolicitud,
  modelBuscarSolicitudParaAyuda,
  modelRegistrarAyudaDeSolicitud,
  mensajeAyudaEnRevision
} from '../models/formulariosDigitalesModel.js';
import { escribirConNumero, guardarPdfEnUploads } from '../helpers/archivosPdf.js';
import { generarPdfDesdePlantilla, imagenComoDataUri } from '../helpers/pdfDesdeHtml.js';
import { departamentosSantiago } from '../helpers/departamentos.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';
import { usuarioDelTokenOpcional } from '../middlewares/loginMiddleware.js';

// Los PDF se guardan junto a los demás documentos subidos (servidos en /uploads)
// con un nombre base y un número correlativo (ej: SolicitudInicialFormIni12.pdf)
const carpetasDestino = {
  'Formulario de Inicio': { carpeta: 'solicitudesinicio', nombreBase: 'SolicitudInicialFormIni' },
  'Formulario de Subsidios no Reintegrables': { carpeta: 'subsidios', nombreBase: 'SolicitudSubsidio' },
  'Formulario de Creditos Reintegrables': { carpeta: 'creditos', nombreBase: 'SolicitudCredito' }
};
const carpetaPlantillas = path.join(process.cwd(), 'plantillas_pdf');

// Subsidio y crédito (plantillas_pdf/ayuda) y el Formulario de Inicio (plantillas_pdf/inicio) se arman con HTML/CSS y Puppeteer
const carpetaPlantillaAyuda = path.join(carpetaPlantillas, 'ayuda');
const carpetaPlantillaInicio = path.join(carpetaPlantillas, 'inicio');

const limpiarTexto = (valor = '') => String(valor).replace(/[\r\n]+/g, ' ').trim();

const numeroCredito = (valor, campo) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') return 0;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0 || numero > 999999999999) {
    throw new ErrorValidacion(`Revise el valor numérico del campo "${campo}".`);
  }
  return numero;
};

const prepararFilasCredito = (filas, tipo) => {
  if (!Array.isArray(filas)) throw new ErrorValidacion(`La tabla "${tipo}" no tiene un formato válido.`);
  const maximo = tipo === 'bienesPropios' ? 10 : (tipo === 'activoFijo' ? 7 : 9);
  if (filas.length > maximo) throw new ErrorValidacion(`La tabla "${tipo}" admite hasta ${maximo} renglones.`);

  return filas.map((fila) => {
    const bien = limpiarTexto(fila?.bien || '').slice(0, 42);
    const cantidad = numeroCredito(fila?.cantidad, 'Cantidad');
    if (tipo === 'bienesPropios') {
      const antiguedad = limpiarTexto(fila?.antiguedad || '').slice(0, 20);
      const montoEstimado = numeroCredito(fila?.montoEstimado, 'Monto estimado');
      if (!bien && !cantidad && !antiguedad && !montoEstimado) return null;
      if (!bien) throw new ErrorValidacion('Indique el bien en cada renglón de bienes propios que complete.');
      return { bien, cantidad, antiguedad, montoEstimado };
    }

    const precioUnitario = numeroCredito(fila?.precioUnitario, 'Precio unitario');
    if (!bien && !cantidad && !precioUnitario) return null;
    if (!bien || !cantidad || !precioUnitario) {
      throw new ErrorValidacion('Complete bien, cantidad y precio unitario en cada renglón solicitado.');
    }
    return { bien, cantidad, precioUnitario, subtotal: cantidad * precioUnitario };
  }).filter(Boolean);
};

const formatearImporte = (valor) => Number(valor || 0).toLocaleString('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const fechaLugarHoy = () => {
  const hoy = new Date();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `SANTIAGO DEL ESTERO, ${String(hoy.getDate()).padStart(2, '0')} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
};

// Completa los cuadros con renglones vacíos para que conserven el alto del formulario oficial
const completarRenglones = (filas = [], minimo) => [...filas, ...Array(Math.max(0, minimo - filas.length)).fill({})];

// Documentos obligatorios del garante, en el orden en que van en su PDF (un archivo por cada uno).
// "categoria" es lo que manda el formulario con cada archivo; "detalle", lo que se lista en la hoja del garante.
const DOCUMENTOS_GARANTE = [
  { categoria: 'Fotocopia de DNI autenticada', detalle: 'Fotocopia de DNI autenticada' },
  { categoria: 'Constancia de CUIL', detalle: 'Constancia de CUIL' },
  { categoria: 'Certificado de residencia', detalle: 'Certificado de residencia' },
  { categoria: 'Boleta de impuesto', detalle: 'Boleta de impuesto' },
  { categoria: 'Recibo de sueldo', detalle: 'Recibo de sueldo (el último del mes)' }
];

// Arma hojas del subsidio o del crédito desde la plantilla HTML (sin Nº de proyecto ni rama de actividad:
// el número lo asigna el Ministerio con la aprobación final). Las hojas son las mismas; esCredito elige las diferencias.
// plantilla: subsidio.ejs (hojas 1 a 6), credito.ejs (hojas 1 a 6) o garante.ejs (hoja 7)
const generarHojasAyuda = async (plantilla, datos, esCredito) => generarPdfDesdePlantilla(path.join(carpetaPlantillaAyuda, plantilla), {
  datos,
  esCredito,
  logo: await imagenComoDataUri(path.join(carpetaPlantillaAyuda, 'logo-ministerio.png')),
  escudo: await imagenComoDataUri(path.join(carpetaPlantillaAyuda, 'escudo-santiago.png')),
  rubroEmprendimiento: datos.rubroEmprendimiento || '',
  fecha: datos.fechaLugar || fechaLugarHoy(),
  fechaHoy: fechaLugarHoy(),
  filasBienes: completarRenglones(datos.bienesPropios, 8),
  filasActivoFijo: completarRenglones(datos.activoFijo, 8),
  filasBienesUso: completarRenglones(datos.bienesUso, 9),
  documentosGarante: DOCUMENTOS_GARANTE.map(({ detalle }) => detalle),
  moneda: (valor) => valor === undefined || valor === '' ? '' : formatearImporte(valor)
});

// Firma dibujada (PNG que arma public/js/firma-digital.js) o, si no tiene firma, su nombre completo escrito.
// quien: "su" para el titular, "la del garante" para el garante (solo cambia el mensaje de error)
const firmaPng = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;
const cabeceraPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const validarFirma = (firma, deQuien = 'titular') => {
  const esGarante = deQuien === 'garante';
  if (firma?.tipo === 'texto') {
    const texto = limpiarTexto(firma.texto || '');
    if (texto.length < 3 || texto.length > 80) {
      throw new ErrorValidacion(esGarante
        ? 'Escriba el nombre completo del garante en lugar de su firma (de 3 a 80 caracteres).'
        : 'Escriba su nombre completo en lugar de la firma (de 3 a 80 caracteres).');
    }
    return { tipo: 'texto', texto };
  }
  if (firma?.tipo === 'dibujo' && typeof firma.imagen === 'string' && firma.imagen.length <= 400000 && firmaPng.test(firma.imagen)) {
    const bytes = Buffer.from(firma.imagen.slice(firma.imagen.indexOf(',') + 1), 'base64');
    if (bytes.subarray(0, 8).equals(cabeceraPng)) return { tipo: 'dibujo', imagen: firma.imagen };
  }
  throw new ErrorValidacion(esGarante
    ? 'Falta la firma del garante: que firme en su recuadro, o marque "No tiene firma" y escriba su nombre completo.'
    : 'Dibuje su firma o marque "No tengo firma" y escriba su nombre completo.');
};

// Valida solo lo que completa el emprendedor: los datos del proyecto y del titular salen de su solicitud de inicio.
// El crédito no tiene "Beneficiarios" (su carátula oficial no lo pide); el garante se valida aparte.
const validarDatosAyuda = (datos, imagenes, dniTitular, esCredito) => {
  if (!Array.isArray(imagenes) || !imagenes.length) {
    throw new ErrorValidacion('Adjunte al menos una fotografía o un PDF de los presupuestos del proyecto.');
  }
  for (const [campo, etiqueta, maximo] of [
    ...(esCredito ? [] : [['beneficiarios', 'Beneficiarios', 100]]),
    ['domicilio', 'Domicilio del titular', 150],
    ['aclaracionProyecto', 'Aclaración', 80],
    ['dniProyecto', 'D.N.I. Nº de la firma', 20],
    ['lugarFirma', 'Lugar y fecha', 80]
  ]) {
    datos[campo] = limpiarTexto(datos[campo] || '');
    if (!datos[campo]) throw new ErrorValidacion(`Complete el campo "${etiqueta}".`);
    if (datos[campo].length > maximo) throw new ErrorValidacion(`El campo "${etiqueta}" admite hasta ${maximo} caracteres.`);
  }
  datos.firma = validarFirma(datos.firma);
  // La aclaración y el DNI de la hoja final acompañan a la firma en todas las hojas que la llevan.
  // El DNI se escribe a mano, pero tiene que ser el del titular de la solicitud de inicio.
  datos.dniProyecto = datos.dniProyecto.replace(/[.\s]/g, '').toUpperCase();
  if (datos.dniProyecto !== String(dniTitular).trim().toUpperCase()) {
    throw new ErrorValidacion('El D.N.I. Nº junto a la firma debe ser el mismo del titular de la solicitud de inicio.');
  }

  // Cuadros de bienes propios, activo fijo y bienes de uso (iguales en subsidio y crédito)
  datos.bienesPropios = prepararFilasCredito(datos.bienesPropios || [], 'bienesPropios');
  datos.activoFijo = prepararFilasCredito(datos.activoFijo || [], 'activoFijo');
  datos.bienesUso = prepararFilasCredito(datos.bienesUso || [], 'bienesUso');

  for (const [campo, etiqueta] of [
    ['aporteActivoFijo', 'Aporte propio de activo fijo'],
    ['aporteBienesUso', 'Aporte propio de bienes de uso'],
    ['aporteManoObra', 'Aporte propio de mano de obra']
  ]) {
    datos[campo] = numeroCredito(datos[campo], etiqueta);
  }
  // La columna "Solicitado" del costo total son los totales de los cuadros (no se toma lo que manda el navegador)
  datos.solicitadoActivoFijo = datos.activoFijo.reduce((total, fila) => total + fila.subtotal, 0);
  datos.solicitadoBienesUso = datos.bienesUso.reduce((total, fila) => total + fila.subtotal, 0);
  datos.totalProyectoPropio = datos.aporteActivoFijo + datos.aporteBienesUso + datos.aporteManoObra;
  datos.totalProyectoSolicitado = datos.solicitadoActivoFijo + datos.solicitadoBienesUso;
  if (!datos.totalProyectoSolicitado) {
    throw new ErrorValidacion('Ingrese al menos un bien solicitado (activo fijo o bienes de uso) con cantidad y precio unitario.');
  }
  // El monto solicitado que se guarda es el total de la columna "Solicitado" del costo total del proyecto
  datos.montoSolicitado = validarMonto(datos.totalProyectoSolicitado);
};

// Datos del garante (hoja 7 del crédito). El garante no puede ser el mismo titular: ni su DNI ni su correo.
const validarDatosGarante = async (datos, dniTitular, correoTitular) => {
  for (const [campo, etiqueta, maximo] of [
    ['nombreGarante', 'Nombre completo del garante', 70],
    ['dniGarante', 'DNI del garante', 8],
    ['cuilGarante', 'CUIL del garante', 11],
    ['telefonoGarante', 'Teléfono del garante', 10],
    ['correoGarante', 'Correo electrónico del garante', 150],
    ['aclaracionGarante', 'Aclaración de la firma del garante', 80],
    ['dniFirmaGarante', 'D.N.I. Nº de la firma del garante', 8]
  ]) {
    datos[campo] = limpiarTexto(datos[campo] || '');
    if (!datos[campo]) throw new ErrorValidacion(`Complete el campo "${etiqueta}".`);
    if (datos[campo].length > maximo) throw new ErrorValidacion(`El campo "${etiqueta}" admite hasta ${maximo} caracteres.`);
  }
  if (!/^\d{7,8}$/.test(datos.dniGarante)) throw new ErrorValidacion('El DNI del garante debe tener 7 u 8 números, sin puntos.');
  if (datos.dniGarante === String(dniTitular).trim()) {
    throw new ErrorValidacion('El garante no puede ser el mismo titular del proyecto: ingrese los datos de otra persona.');
  }
  if (!/^\d{11}$/.test(datos.cuilGarante)) throw new ErrorValidacion('El CUIL del garante debe tener 11 números, sin guiones.');
  const ponderadoresCuil = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const restoCuil = datos.cuilGarante.slice(0, 10).split('').reduce((suma, digito, indice) =>
    suma + (Number(digito) * ponderadoresCuil[indice]), 0) % 11;
  // Resto 1 daría dígito 10: ese CUIL no existe (AFIP cambia el prefijo a 23 y el dígito a 9 o 4)
  const digitoControl = restoCuil === 0 ? 0 : 11 - restoCuil;
  if (digitoControl === 10 || Number(datos.cuilGarante[10]) !== digitoControl) throw new ErrorValidacion('El CUIL del garante no es válido: revise sus números.');
  // El CUIL lleva el DNI en el medio (XX-DNI-X)
  if (datos.cuilGarante.slice(2, 10) !== datos.dniGarante.padStart(8, '0')) {
    throw new ErrorValidacion('El CUIL del garante no corresponde a su DNI: revise los dos números.');
  }
  if (!/^[1-9]\d{9}$/.test(datos.telefonoGarante)) {
    throw new ErrorValidacion('El teléfono del garante debe tener 10 números, sin 0 inicial, 15 ni espacios.');
  }
  datos.correoGarante = datos.correoGarante.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correoGarante)) throw new ErrorValidacion('Ingrese un correo electrónico válido para el garante.');
  if (datos.correoGarante !== limpiarTexto(datos.correoGaranteConfirmacion || '').toLowerCase()) {
    throw new ErrorValidacion('El correo del garante y su confirmación no coinciden.');
  }
  if (datos.correoGarante === String(correoTitular || '').trim().toLowerCase()) {
    throw new ErrorValidacion('El correo del garante debe ser distinto del correo del titular.');
  }
  delete datos.correoGaranteConfirmacion;
  datos.firmaGarante = validarFirma(datos.firmaGarante, 'garante');
  // Como en el titular, el DNI junto a la firma se escribe a mano, pero tiene que ser el del garante
  datos.dniFirmaGarante = datos.dniFirmaGarante.replace(/[.\s]/g, '');
  if (datos.dniFirmaGarante !== datos.dniGarante) {
    throw new ErrorValidacion('El D.N.I. Nº junto a la firma del garante debe ser el mismo DNI del garante.');
  }
  await validarDominioCorreo(datos.correoGarante);
};

// estado: código HTTP con el que se responde (400 por defecto; 409 si la solicitud ya no admite el envío, etc.)
class ErrorValidacion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

// Campos obligatorios del Formulario de Inicio con el largo máximo de su columna en DatosSolicitudInicio
const camposInicio = {
  nombre: ['Nombre', 40],
  apellido: ['Apellido', 40],
  departamentoPersona: ['Departamento de residencia', 20],
  localidad: ['Localidad', 40],
  domicilio: ['Domicilio', 512],
  correo: ['Correo electrónico', 150],
  nombreEmprendimiento: ['Nombre del emprendimiento', 50],
  calleEmprendimiento: ['Calle del emprendimiento', 30],
  numeroEmprendimiento: ['Número de calle del emprendimiento', 6],
  barrio: ['Barrio', 50],
  departamento: ['Departamento del emprendimiento', 20],
  localidadEmprendimiento: ['Localidad del emprendimiento', 40],
  rubro: ['Rubro', 150],
  actividadPrincipal: ['Actividad principal', 400]
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
  if ((telefono || telefonoObligatorio) && !/^[1-9]\d{9}$/.test(telefono)) {
    throw new ErrorValidacion('El celular debe tener 10 números, sin 0 inicial, 15 ni espacios.');
  }
  datos.telefono = telefono;
};

const validarInicio = (datos) => {
  datos.numeroEmprendimiento = (datos.calleSinNumero === true || datos.calleSinNumero === 'true')
    ? 'S/N'
    : datos.numeroEmprendimiento;
  for (const [clave, [etiqueta, largoMaximo]] of Object.entries(camposInicio)) {
    const valor = limpiarTexto(datos[clave] || '');
    if (!valor) throw new ErrorValidacion(`Complete el campo "${etiqueta}".`);
    if (valor.length > largoMaximo) throw new ErrorValidacion(`El campo "${etiqueta}" admite hasta ${largoMaximo} caracteres.`);
    datos[clave] = valor;
  }
  if (datos.numeroEmprendimiento !== 'S/N' && !/^\d{1,6}$/.test(datos.numeroEmprendimiento)) {
    throw new ErrorValidacion('El número de calle del emprendimiento admite solo números; si no tiene, marque "Sin número (S/N)".');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) throw new ErrorValidacion('Ingrese un correo electrónico válido.');
  if (!departamentosSantiago.includes(datos.departamento) || !departamentosSantiago.includes(datos.departamentoPersona)) {
    throw new ErrorValidacion('Seleccione un departamento válido de Santiago del Estero.');
  }
  if (!['Sí', 'No'].includes(datos.enMarcha)) throw new ErrorValidacion('Indique si el emprendimiento está en marcha.');
  if (!['Subsidio', 'Credito'].includes(datos.tipoFinanciamiento)) throw new ErrorValidacion('Elija Subsidio o Crédito como tipo de ayuda.');
  // Los tres renglones de "necesitamos comprar lo siguiente" son opcionales
  ['bien1', 'bien2', 'bien3'].forEach((clave) => { datos[clave] = limpiarTexto(datos[clave] || '').slice(0, 80); });
  datos.firma = validarFirma(datos.firma);
  // Aclaración y DNI de la firma: se escriben a mano, pero el DNI tiene que ser el mismo que se cargó arriba
  for (const [campo, etiqueta, maximo] of [['aclaracionProyecto', 'Aclaración', 80], ['dniProyecto', 'D.N.I. Nº de la firma', 20]]) {
    datos[campo] = limpiarTexto(datos[campo] || '');
    if (!datos[campo]) throw new ErrorValidacion(`Complete el campo "${etiqueta}".`);
    if (datos[campo].length > maximo) throw new ErrorValidacion(`El campo "${etiqueta}" admite hasta ${maximo} caracteres.`);
  }
  datos.dniProyecto = datos.dniProyecto.replace(/[.\s]/g, '').toUpperCase();
  if (datos.dniProyecto !== datos.dniCuit.toUpperCase()) {
    throw new ErrorValidacion('El D.N.I. Nº junto a la firma debe ser el mismo DNI (o documento) ingresado arriba.');
  }

  datos.nombreApellido = `${datos.nombre} ${datos.apellido}`;
};

const codigosDominioInexistente = ['ENODATA', 'ENOTFOUND', 'ESERVFAIL'];

// Si el servidor DNS que usa Node no responde (ECONNREFUSED, ETIMEOUT...), se consulta con el
// resolvedor del sistema operativo, que es el mismo que usa el navegador.
const dominioResuelveEnSistema = async (dominio) => {
  try {
    await dns.lookup(dominio);
    return true;
  } catch (error) {
    if (codigosDominioInexistente.includes(error.code)) return false;
    throw new ErrorValidacion('No se pudo comprobar el dominio del correo. Revise su conexión e inténtelo nuevamente.');
  }
};

const validarDominioCorreo = async (correo) => {
  const dominio = correo.split('@')[1];
  try {
    const servidores = await dns.resolveMx(dominio);
    if (servidores.length) return;
  } catch (error) {
    if (!codigosDominioInexistente.includes(error.code)) {
      if (await dominioResuelveEnSistema(dominio)) return;
      throw new ErrorValidacion('El dominio del correo no existe o no recibe correo. Revise la dirección ingresada.');
    }
  }

  // Algunos dominios reciben correo sin MX y usan registros A/AAAA como servidor.
  for (const consulta of [dns.resolve4, dns.resolve6]) {
    try {
      const direcciones = await consulta(dominio);
      if (direcciones.length) return;
    } catch (error) {
      if (!codigosDominioInexistente.includes(error.code)) {
        if (await dominioResuelveEnSistema(dominio)) return;
        break;
      }
    }
  }
  throw new ErrorValidacion('El dominio del correo no existe o no recibe correo. Revise la dirección ingresada.');
};

const validarMonto = (valor) => {
  const monto = Number(valor);
  if (!Number.isFinite(monto) || monto <= 0 || monto > 9999999999.99) {
    throw new ErrorValidacion('Ingrese un monto solicitado válido, mayor a 0.');
  }
  return Math.round(monto * 100) / 100;
};

// Incrusta en pdfDoc los adjuntos que llegan en base64 (imágenes JPG/PNG o PDF) y los devuelve listos para dibujar.
// Cada página de un PDF adjunto cuenta como una hoja; maximoPaginas es el total de hojas permitido.
const incrustarAdjuntos = async (pdfDoc, imagenes, maximoPaginas) => {
  const adjuntos = [];
  const excedido = () => new ErrorValidacion(`Se pueden incluir hasta ${maximoPaginas} páginas de archivos adjuntos en total.`);
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
    // Las fotos llegan achicadas por la página (formulario-digital.js, achicarFoto): 4 MB es solo un margen
    const tamanioMaximo = esPdf ? 8 : 4;
    if (!bytes.length || bytes.length > tamanioMaximo * 1024 * 1024) {
      throw new ErrorValidacion(`Cada ${esPdf ? 'PDF' : 'imagen'} debe pesar como máximo ${tamanioMaximo} MB.`);
    }
    const datosAdjunto = { categoria: imagen.categoria || '', nombre: imagen.nombre || '' };

    if (esPdf) {
      let pdfAdjunto;
      try {
        pdfAdjunto = await PDFDocument.load(bytes);
      } catch {
        throw new ErrorValidacion(`${imagen.nombre || 'El archivo PDF'} no se pudo abrir. Use un PDF válido y sin contraseña.`);
      }
      const indices = pdfAdjunto.getPageIndices();
      if (!indices.length || adjuntos.length + indices.length > maximoPaginas) throw excedido();
      const paginas = await pdfDoc.embedPages(indices.map((indice) => pdfAdjunto.getPage(indice)));
      adjuntos.push(...paginas.map((paginaPdf) => ({
        contenido: paginaPdf, esPaginaPdf: true, ancho: paginaPdf.width, alto: paginaPdf.height, ...datosAdjunto
      })));
      continue;
    }

    const esPng = /^data:image\/png/i.test(imagen.data);
    let imagenPdf;
    try {
      imagenPdf = esPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    } catch {
      throw new ErrorValidacion(`${imagen.nombre || 'La imagen'} no se pudo leer. Use un JPG o PNG válido.`);
    }
    if (adjuntos.length >= maximoPaginas) throw excedido();
    adjuntos.push({ contenido: imagenPdf, esPaginaPdf: false, ancho: imagenPdf.width, alto: imagenPdf.height, ...datosAdjunto });
  }
  return adjuntos;
};

// Agrega cada adjunto en una hoja A4 nueva al final, con un título arriba (titulo(adjunto) devuelve el texto)
const agregarHojasAdjuntos = (pdfDoc, fuente, adjuntos, titulo) => {
  adjuntos.forEach((adjunto) => {
    const { contenido, esPaginaPdf, ancho, alto } = adjunto;
    const paginaAdjuntos = pdfDoc.addPage([595.28, 841.89]);
    paginaAdjuntos.drawText(titulo(adjunto), {
      x: 40, y: 800, size: 13, font: fuente, color: rgb(0.18, 0.31, 0.47), maxWidth: 515
    });
    const escala = Math.min(515 / ancho, 680 / alto);
    const anchoFinal = ancho * escala;
    const altoFinal = alto * escala;
    const x = (595.28 - anchoFinal) / 2;
    const y = 765 - altoFinal;
    if (esPaginaPdf) {
      paginaAdjuntos.drawPage(contenido, { x, y, width: anchoFinal, height: altoFinal });
    } else {
      paginaAdjuntos.drawImage(contenido, { x, y, width: anchoFinal, height: altoFinal });
    }
  });
};

// Crédito: hasta 7 presupuestos y los 5 documentos del garante (12 archivos, 30 MB en total)
const LIMITES_CREDITO = { presupuestos: 7, paginasPresupuestos: 12, paginasGarante: 10, megas: 30 };

// PDF del garante: hoja 7 (sus datos y su firma) y sus 5 documentos
const generarPdfGarante = async (datos, documentosGarante) => {
  const pdfGarante = await PDFDocument.load(await generarHojasAyuda('garante.ejs', datos, true));
  const adjuntosGarante = await incrustarAdjuntos(pdfGarante, documentosGarante, LIMITES_CREDITO.paginasGarante);
  agregarHojasAdjuntos(pdfGarante, await pdfGarante.embedFont(StandardFonts.Helvetica), adjuntosGarante,
    ({ categoria }) => `Documentación del garante - ${categoria}`);
  return pdfGarante.save();
};

// Parte del titular: hojas 1 a 6 y los presupuestos
const generarParteTitular = async (datos, presupuestos) => {
  const pdfTitular = await PDFDocument.load(await generarHojasAyuda('credito.ejs', datos, true));
  const adjuntosPresupuestos = await incrustarAdjuntos(pdfTitular, presupuestos, LIMITES_CREDITO.paginasPresupuestos);
  agregarHojasAdjuntos(pdfTitular, await pdfTitular.embedFont(StandardFonts.Helvetica), adjuntosPresupuestos,
    () => 'Documentación adjunta (presupuestos)');
  return pdfTitular;
};

const agregarPaginas = async (destino, origen, indices = origen.getPageIndices()) => {
  (await destino.copyPages(origen, indices)).forEach((hoja) => destino.addPage(hoja));
};

// Arma los dos PDF del crédito:
//  - el del garante: hoja 7 y sus documentos;
//  - el completo: la parte del titular y, al final, el PDF del garante entero.
// Si el Área pidió reenviar una sola parte, la otra sale del envío anterior (anterior: { completo, garante } ya abiertos):
//  - 'Titular': parte nueva del titular + el PDF del garante anterior (no hay PDF de garante nuevo);
//  - 'Garante': las páginas del titular del completo anterior (todas menos las del garante, que van al final) + el garante nuevo.
const generarPdfsCredito = async (parte, datos, presupuestos, documentosGarante, anterior = null) => {
  if (parte === 'Garante') {
    const bytesGarante = await generarPdfGarante(datos, documentosGarante);
    const pdfCompleto = await PDFDocument.create();
    const paginasTitular = anterior.completo.getPageCount() - anterior.garante.getPageCount();
    await agregarPaginas(pdfCompleto, anterior.completo, [...Array(paginasTitular).keys()]);
    await agregarPaginas(pdfCompleto, await PDFDocument.load(bytesGarante));
    return { bytesCompleto: await pdfCompleto.save(), bytesGarante };
  }

  // Las dos partes se arman a la vez (cada una en su pestaña de Chrome)
  const [pdfCompleto, bytesGarante] = await Promise.all([
    generarParteTitular(datos, presupuestos),
    parte === 'Titular' ? null : generarPdfGarante(datos, documentosGarante)
  ]);
  await agregarPaginas(pdfCompleto, bytesGarante ? await PDFDocument.load(bytesGarante) : anterior.garante);
  return { bytesCompleto: await pdfCompleto.save(), bytesGarante };
};

// Abre un PDF del envío anterior guardado en /uploads (null si no está o no se puede leer)
const abrirPdfGuardado = async (direccionWeb) => {
  const relativa = String(direccionWeb || '').match(/^\/uploads\/((?:creditos|garantes)\/[\w.-]+\.pdf)$/i)?.[1];
  if (!relativa) return null;
  try {
    return await PDFDocument.load(await fs.readFile(path.join(process.cwd(), 'uploads', relativa)));
  } catch {
    return null;
  }
};

// Comprobaciones comunes a los adjuntos del Formulario de Inicio y del subsidio: al menos uno, hasta 8 y 16 MB en total
const validarAdjuntosFormulario = (imagenes, mensajeSinAdjuntos) => {
  if (!Array.isArray(imagenes) || imagenes.length === 0) throw new ErrorValidacion(mensajeSinAdjuntos);
  if (imagenes.length > 8) throw new ErrorValidacion('Seleccione hasta 8 archivos adjuntos.');
  const totalBytes = imagenes.reduce((total, archivo) => {
    if (typeof archivo?.data !== 'string') return total;
    const base64 = archivo.data.slice(archivo.data.indexOf(',') + 1);
    return total + Buffer.from(base64, 'base64').length;
  }, 0);
  if (totalBytes > 16 * 1024 * 1024) {
    throw new ErrorValidacion('El total de los archivos adjuntos no puede superar 16 MB.');
  }
};

// Espacio libre para la imagen en las hojas de adjuntos del Formulario de Inicio, en mm desde los bordes de la hoja oficio
// (debajo del logo y del título de plantillas_pdf/inicio/inicio.ejs)
const ESPACIO_ADJUNTO = { arriba: 44, izquierda: 13, derecha: 13, abajo: 13 };
const PUNTOS_POR_MM = 72 / 25.4;

// Formulario de Inicio: la hoja 1 y una hoja por adjunto salen de la plantilla HTML (plantillas_pdf/inicio);
// cada imagen (o cada página de un PDF) se dibuja debajo del título de su hoja
const generarPdfInicio = async (datos, imagenes) => {
  validarAdjuntosFormulario(imagenes, 'Debe adjuntar al menos una foto o un PDF para completar el formulario.');
  // Los adjuntos se leen antes de abrir Chrome: si alguno no sirve, se avisa enseguida
  const pdfDoc = await PDFDocument.create();
  const adjuntos = await incrustarAdjuntos(pdfDoc, imagenes, 8);
  const plantilla = await PDFDocument.load(await generarPdfDesdePlantilla(path.join(carpetaPlantillaInicio, 'inicio.ejs'), {
    datos,
    // El mismo logo que subsidio y crédito
    logo: await imagenComoDataUri(path.join(carpetaPlantillaAyuda, 'logo-ministerio.png')),
    fecha: fechaLugarHoy(),
    paginasAdjuntos: adjuntos.length
  }));
  if (plantilla.getPageCount() !== adjuntos.length + 1) {
    throw new Error(`La plantilla del Formulario de Inicio generó ${plantilla.getPageCount()} hojas para ${adjuntos.length} adjuntos.`);
  }
  (await pdfDoc.copyPages(plantilla, plantilla.getPageIndices())).forEach((hoja) => pdfDoc.addPage(hoja));

  adjuntos.forEach(({ contenido, esPaginaPdf, ancho, alto }, indice) => {
    const pagina = pdfDoc.getPage(indice + 1);
    const izquierda = ESPACIO_ADJUNTO.izquierda * PUNTOS_POR_MM;
    const abajo = ESPACIO_ADJUNTO.abajo * PUNTOS_POR_MM;
    const anchoLibre = pagina.getWidth() - (ESPACIO_ADJUNTO.izquierda + ESPACIO_ADJUNTO.derecha) * PUNTOS_POR_MM;
    const altoLibre = pagina.getHeight() - (ESPACIO_ADJUNTO.arriba + ESPACIO_ADJUNTO.abajo) * PUNTOS_POR_MM;
    // Ocupa todo el espacio libre, arriba y centrada, sin deformarse
    const escala = Math.min(anchoLibre / ancho, altoLibre / alto);
    const anchoFinal = ancho * escala;
    const altoFinal = alto * escala;
    const posicion = {
      x: izquierda + (anchoLibre - anchoFinal) / 2,
      y: abajo + altoLibre - altoFinal,
      width: anchoFinal,
      height: altoFinal
    };
    if (esPaginaPdf) pagina.drawPage(contenido, posicion);
    else pagina.drawImage(contenido, posicion);
  });
  return pdfDoc.save();
};

// Subsidio: las hojas 1 a 6 de la plantilla HTML y cada presupuesto en una hoja nueva al final
const generarPdfSubsidio = async (datos, imagenes) => {
  validarAdjuntosFormulario(imagenes, 'Adjunte al menos una fotografía o un PDF para completar el formulario de subsidio.');
  const pdfDoc = await PDFDocument.load(await generarHojasAyuda('subsidio.ejs', datos, false));
  const adjuntos = await incrustarAdjuntos(pdfDoc, imagenes, 8);
  agregarHojasAdjuntos(pdfDoc, await pdfDoc.embedFont(StandardFonts.Helvetica), adjuntos, () => 'Documentación adjunta (presupuestos)');
  return pdfDoc.save();
};

// Guarda el PDF en /uploads, lo registra en MySQL y responde con el archivo.
// Si la base de datos falla, se borra el PDF para no dejar archivos huérfanos.
const guardarYResponder = async (res, tipoFormulario, bytesPdf, registrar, cabecerasExtra = {}) => {
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
  Object.entries(cabecerasExtra).forEach(([nombre, valor]) => res.set(nombre, valor));
  res.set('Access-Control-Expose-Headers', ['X-Formulario-Registro', 'X-Formulario-Url', ...Object.keys(cabecerasExtra)].join(', '));
  res.status(201).download(rutaArchivo, nombreArchivo, (errorDescarga) => {
    if (errorDescarga) console.error('Error al enviar el PDF generado:', errorDescarga);
  });
};

const responderError = (res, error, mensajeGeneral) => {
  if (error instanceof ErrorValidacion) {
    return res.status(error.estado).json({ error: error.message });
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
    // Mismo DNI o correo: usuario registrado, solicitud en trámite o aprobada, o rechazo de hace menos de 7 días
    const restriccion = await modelRestriccionNuevaSolicitud(datos.dniCuit, datos.correo);
    if (restriccion) throw new ErrorValidacion(restriccion, 409);
    await validarDominioCorreo(datos.correo);

    const bytesPdf = await generarPdfInicio(datos, imagenes);
    const datosAuditoria = { idUsuario: null, ipCliente: obtenerIpCliente(req) };

    await guardarYResponder(res, tipoFormulario, bytesPdf,
      (direccionWeb) => modelRegistrarSolicitudInicio(direccionWeb, datos, datosAuditoria).catch((error) => {
        throw error.code === 'SOLICITUD_RESTRINGIDA' ? new ErrorValidacion(error.message, 409) : error;
      }));
  } catch (error) {
    responderError(res, error, 'No se pudo registrar el Formulario de Inicio.');
  }
};

// ---------------------------------------------------------------------------------------------------------
// SUBSIDIO Y CRÉDITO: los completa el emprendedor (sin sesión) desde el link del correo, o el Área / Administrador por él.
// Se identifica con el Nº de expediente, el correo y el DNI de su solicitud de inicio, y completa el formulario de la
// ayuda que eligió en ella. tipo: 'Subsidio' | 'Credito' (como en DatosSolicitudInicio.EleccionAyuda)

const AYUDAS = {
  Subsidio: {
    tipoFormulario: 'Formulario de Subsidios no Reintegrables',
    nombre: 'subsidio',
    otraAyuda: 'En su solicitud de inicio eligió Crédito: corresponde completar el Formulario de Créditos Reintegrables.'
  },
  Credito: {
    tipoFormulario: 'Formulario de Creditos Reintegrables',
    nombre: 'crédito',
    otraAyuda: 'En su solicitud de inicio eligió Subsidio: corresponde completar el Formulario de Subsidios no Reintegrables.'
  }
};

// Freno a quien prueba combinaciones: hasta 10 verificaciones fallidas por IP cada 15 minutos
const intentosFallidos = new Map();
const VENTANA_INTENTOS = 15 * 60 * 1000;
const MAXIMO_INTENTOS = 10;

const controlarIntentos = (ip) => {
  const registro = intentosFallidos.get(ip);
  if (registro && Date.now() - registro.desde < VENTANA_INTENTOS && registro.cantidad >= MAXIMO_INTENTOS) {
    throw new ErrorValidacion('Hubo demasiados intentos con datos que no coinciden. Espere 15 minutos y vuelva a intentarlo.', 429);
  }
};
const registrarIntentoFallido = (ip) => {
  const ahora = Date.now();
  const registro = intentosFallidos.get(ip);
  if (!registro || ahora - registro.desde >= VENTANA_INTENTOS) intentosFallidos.set(ip, { cantidad: 1, desde: ahora });
  else registro.cantidad++;
  if (intentosFallidos.size > 5000) {
    intentosFallidos.forEach((valor, clave) => { if (ahora - valor.desde >= VENTANA_INTENTOS) intentosFallidos.delete(clave); });
  }
};

// Busca la solicitud y comprueba que admita el formulario de la ayuda. Solo cuando coinciden los tres datos
// se dice el motivo puntual; si no, el mensaje es siempre el mismo para no revelar qué dato existe.
const resolverSolicitudAyuda = async (tipo, verificacion, ip) => {
  const { nombre, otraAyuda } = AYUDAS[tipo];
  const expediente = limpiarTexto(verificacion?.expediente || '').slice(0, 50);
  const correo = limpiarTexto(verificacion?.correo || '').toLowerCase().slice(0, 150);
  const dni = limpiarTexto(verificacion?.dni || '').replace(/[.\s]/g, '').slice(0, 15);
  if (!expediente || !correo || !dni) {
    throw new ErrorValidacion('Ingrese el Nº de expediente, el correo electrónico y el DNI de su solicitud de inicio.');
  }
  controlarIntentos(ip);

  const solicitud = await modelBuscarSolicitudParaAyuda(tipo, expediente, correo, dni);
  if (!solicitud) {
    registrarIntentoFallido(ip);
    throw new ErrorValidacion('No encontramos una solicitud de inicio con ese Nº de expediente, correo y DNI. Revise que sean los mismos del correo que recibió y de su solicitud.', 404);
  }
  if (solicitud.EleccionAyuda !== tipo) throw new ErrorValidacion(otraAyuda, 409);
  if (Number(solicitud.AprobacionArea) !== 1) {
    throw new ErrorValidacion('Su solicitud de inicio todavía no fue aprobada por el Área de Economía Social.', 409);
  }
  if (Number(solicitud.EnvioMinistro) !== 0) {
    throw new ErrorValidacion(`Su solicitud ya fue enviada al Ministro para su resolución: el formulario de ${nombre} ya no se puede enviar ni modificar.`, 409);
  }
  if (solicitud.MensajeResolucionFinal) {
    throw new ErrorValidacion(`Su solicitud de inicio ya fue finalizada: el formulario de ${nombre} ya no se puede enviar.`, 409);
  }
  if (solicitud.idAyuda && (solicitud.AyudaAprobado !== null || Number(solicitud.AyudaEstado) === 2)) {
    throw new ErrorValidacion(`El ${nombre} de este expediente ya fue resuelto y no admite cambios.`, 409);
  }
  // Un formulario ya enviado solo se puede reemplazar cuando el Área pidió el reenvío
  if (solicitud.idAyuda && !Number(solicitud.ReenvioSolicitado)) {
    throw new ErrorValidacion(mensajeAyudaEnRevision(tipo), 409);
  }
  return solicitud;
};

// Datos que salen de DatosSolicitudInicio (en el formulario se muestran sin poder cambiarlos)
const datosDeSolicitud = (solicitud) => ({
  expediente: solicitud.NroExpediente,
  nombreEmprendimiento: solicitud.EmprendimientoNombre,
  departamento: solicitud.EmprendimientoDepto,
  localidad: solicitud.EmprendimientoLocalidad,
  rubro: solicitud.EmprendimientoActPrincipal,
  rubroEmprendimiento: solicitud.EmprendimientoRubro,
  nombreApellido: `${solicitud.PersonaNombre} ${solicitud.PersonaApellido}`.trim(),
  dniCuit: solicitud.PersonaDNI,
  telefono: solicitud.PersonaTelefono,
  correo: solicitud.PersonaCorreo,
  localidadTitular: solicitud.PersonaLocalidad,
  departamentoTitular: solicitud.PersonaDepartamento
});

// Crédito: parte del formulario que corresponde enviar. El primer envío es siempre completo; un reenvío, la parte que pidió el Área
const parteDelCredito = (solicitud) => (solicitud.idAyuda ? solicitud.ParteReenvio || 'Completo' : 'Completo');

// Crédito: en un reenvío que incluye la hoja 7 se vuelven a cargar los datos del garante registrado (se pueden corregir).
// La firma no: el garante tiene que volver a firmar la hoja nueva.
const datosGaranteAnterior = (solicitud) => {
  if (!solicitud.idAyuda || !solicitud.GaranteDNI || parteDelCredito(solicitud) === 'Titular') return {};
  return {
    nombreGarante: solicitud.GaranteNombre,
    dniGarante: solicitud.GaranteDNI,
    cuilGarante: solicitud.GaranteCuil,
    telefonoGarante: solicitud.GaranteTelefono,
    correoGarante: solicitud.GaranteCorreo,
    correoGaranteConfirmacion: solicitud.GaranteCorreo,
    aclaracionGarante: solicitud.GaranteNombre,
    dniFirmaGarante: solicitud.GaranteDNI
  };
};

// POST /api/formularios-digitales/subsidio/verificar  y  /credito/verificar -> datos para completar el formulario
const verificarSolicitudAyuda = (tipo) => async (req, res) => {
  try {
    const solicitud = await resolverSolicitudAyuda(tipo, req.body, obtenerIpCliente(req));
    res.json({
      ...datosDeSolicitud(solicitud),
      // Se proponen, pero el emprendedor los puede corregir
      domicilio: solicitud.PersonaDomicilio,
      lugarFirma: `${solicitud.PersonaLocalidad}, ${solicitud.PersonaDepartamento}`,
      reemplazaEnvioAnterior: Boolean(solicitud.idAyuda),
      // Lo que el Área le pidió corregir (se muestra al emprendedor)
      pedidoReenvio: solicitud.idAyuda ? solicitud.MensajeSolicitudReenvio || '' : '',
      // Crédito: parte del formulario que tiene que completar ('Completo', 'Titular' o 'Garante')
      ...(tipo === 'Credito' ? { parteReenvio: parteDelCredito(solicitud), ...datosGaranteAnterior(solicitud) } : {})
    });
  } catch (error) {
    responderError(res, error, 'No se pudo verificar la solicitud.');
  }
};
export const verificarSolicitudSubsidio = verificarSolicitudAyuda('Subsidio');
export const verificarSolicitudCredito = verificarSolicitudAyuda('Credito');

// Campos que completa el emprendedor; el resto del pedido se ignora y se toma de la solicitud de inicio
const CAMPOS_EDITABLES = [
  'domicilio', 'lugarFirma', 'aclaracionProyecto', 'dniProyecto', 'firma', 'bienesPropios', 'activoFijo', 'bienesUso',
  'aporteActivoFijo', 'aporteBienesUso', 'aporteManoObra'
];
const CAMPOS_EDITABLES_SUBSIDIO = ['beneficiarios', ...CAMPOS_EDITABLES];
const CAMPOS_EDITABLES_CREDITO = [
  ...CAMPOS_EDITABLES, 'nombreGarante', 'dniGarante', 'cuilGarante', 'telefonoGarante', 'correoGarante',
  'correoGaranteConfirmacion', 'firmaGarante', 'aclaracionGarante', 'dniFirmaGarante'
];

// Borra el PDF del envío anterior (solo dentro de su carpeta de /uploads)
const borrarPdfAnterior = async (carpeta, direccionWeb) => {
  const nombre = String(direccionWeb || '').match(new RegExp(`^/uploads/${carpeta}/([\\w.-]+\\.pdf)$`, 'i'))?.[1];
  if (!nombre) return;
  await fs.unlink(path.join(process.cwd(), 'uploads', carpeta, nombre)).catch(() => {});
};

// Registra el pedido en la base y, si reemplazó un envío anterior, borra el PDF anterior (y el del garante, si se rehízo)
const registrarAyuda = async (tipo, solicitud, direccionWeb, datos, datosAuditoria, garante = null, parteReenvio = null) => {
  try {
    const { idAyuda, pathAnterior, garantePathAnterior } = await modelRegistrarAyudaDeSolicitud(
      tipo, solicitud.idSolicitudInicio, direccionWeb, datos.montoSolicitado, datosAuditoria, garante, parteReenvio
    );
    if (pathAnterior && pathAnterior !== direccionWeb) {
      await borrarPdfAnterior(carpetasDestino[AYUDAS[tipo].tipoFormulario].carpeta, pathAnterior);
    }
    if (garantePathAnterior && garantePathAnterior !== garante?.pathFormulario) {
      await borrarPdfAnterior('garantes', garantePathAnterior);
    }
    return idAyuda;
  } catch (error) {
    if (error.codigo) throw new ErrorValidacion(error.message, 409);
    // Sin la actualización de la base, el trigger viejo (o la falta de permiso) no deja actualizar el garante
    if (garante && (/Garante es inmutable/.test(error.sqlMessage || '') || /^ER_(TABLE|COLUMN)ACCESS_DENIED/.test(error.code || ''))) {
      throw new ErrorValidacion('Falta ejecutar database/Actualizacion garante unico 2026-11-09.sql en la base de datos.', 503);
    }
    throw error;
  }
};

// Toma del pedido los campos editables y les suma los de la solicitud de inicio
const datosDelPedido = (body, solicitud, campos) => {
  const editables = Object.fromEntries(campos.map((campo) => [campo, body[campo]]));
  return { ...datosDeSolicitud(solicitud), ...editables };
};

// POST /api/formularios-digitales/subsidio (público; si viene la sesión de un empleado, queda en la auditoría)
export const crearFormularioSubsidio = async (req, res) => {
  const tipoFormulario = AYUDAS.Subsidio.tipoFormulario;
  try {
    const ipCliente = obtenerIpCliente(req);
    const solicitud = await resolverSolicitudAyuda('Subsidio', req.body.verificacion, ipCliente);
    const { imagenes = [] } = req.body;

    const datos = datosDelPedido(req.body, solicitud, CAMPOS_EDITABLES_SUBSIDIO);
    validarDatosAyuda(datos, imagenes, solicitud.PersonaDNI, false);
    // "LUGAR Y FECHA": el lugar lo propone el formulario (localidad y departamento del titular) y se puede cambiar;
    // la fecha es siempre la del envío
    datos.fechaLugar = `${datos.lugarFirma}, ${fechaLugarHoy()}`;

    const bytesPdf = await generarPdfSubsidio(datos, imagenes);
    const datosAuditoria = { idUsuario: usuarioDelTokenOpcional(req)?.idUsuario ?? null, ipCliente };

    await guardarYResponder(res, tipoFormulario, bytesPdf,
      (direccionWeb) => registrarAyuda('Subsidio', solicitud, direccionWeb, datos, datosAuditoria));
  } catch (error) {
    responderError(res, error, 'No se pudo registrar el formulario de subsidio.');
  }
};

const bytesDeAdjuntos = (adjuntos) => adjuntos.reduce((total, archivo) => {
  if (typeof archivo?.data !== 'string') return total;
  return total + Buffer.from(archivo.data.slice(archivo.data.indexOf(',') + 1), 'base64').length;
}, 0);

// Presupuestos (1 a 7) y los 5 documentos del garante, uno por cada uno, en el orden de DOCUMENTOS_GARANTE.
// En un reenvío parcial solo se validan (y se usan) los de la parte que se envía.
const validarAdjuntosCredito = (presupuestos, documentosGarante, parte) => {
  const conTitular = parte !== 'Garante';
  const conGarante = parte !== 'Titular';
  const listaPresupuestos = conTitular && Array.isArray(presupuestos) ? presupuestos : [];
  if (conTitular && !listaPresupuestos.length) {
    throw new ErrorValidacion('Adjunte al menos un presupuesto (fotografía o PDF) de los bienes solicitados.');
  }
  if (listaPresupuestos.length > LIMITES_CREDITO.presupuestos) {
    throw new ErrorValidacion(`Puede adjuntar hasta ${LIMITES_CREDITO.presupuestos} archivos de presupuestos.`);
  }
  const lista = conGarante && Array.isArray(documentosGarante) ? documentosGarante : [];
  if (conGarante) {
    const faltantes = DOCUMENTOS_GARANTE.filter(({ categoria }) => lista.filter((archivo) => archivo?.categoria === categoria).length !== 1);
    if (faltantes.length || lista.length !== DOCUMENTOS_GARANTE.length) {
      throw new ErrorValidacion(`Adjunte un archivo por cada documento del garante. Revise: ${(faltantes.length ? faltantes : DOCUMENTOS_GARANTE).map(({ categoria }) => categoria).join(', ')}.`);
    }
  }
  if (bytesDeAdjuntos([...listaPresupuestos, ...lista]) > LIMITES_CREDITO.megas * 1024 * 1024) {
    throw new ErrorValidacion(`El total de los archivos adjuntos no puede superar ${LIMITES_CREDITO.megas} MB.`);
  }
  return {
    presupuestos: listaPresupuestos,
    documentos: conGarante ? DOCUMENTOS_GARANTE.map(({ categoria }) => lista.find((archivo) => archivo.categoria === categoria)) : []
  };
};

// POST /api/formularios-digitales/credito (público, como el subsidio). Genera dos PDF: el completo (Credito) y el
// del garante (Garante); se descarga el completo y la dirección del otro va en la cabecera X-Formulario-Garante-Url.
// Si el Área pidió reenviar solo una parte (ParteReenvio), se recibe solo esa y la otra se toma del envío anterior:
//  - 'Titular': hojas 1 a 6 y presupuestos nuevos; el garante sigue siendo el mismo (no se toca su fila en Garante);
//  - 'Garante': hoja 7 y documentos nuevos (se actualiza la fila del garante); el monto sigue siendo el del envío anterior.
// En el reenvío completo también se actualiza la misma fila del garante, no se agrega otra.
export const crearFormularioCredito = async (req, res) => {
  const tipoFormulario = AYUDAS.Credito.tipoFormulario;
  let pdfGarante = null;
  try {
    const ipCliente = obtenerIpCliente(req);
    const solicitud = await resolverSolicitudAyuda('Credito', req.body.verificacion, ipCliente);
    const parte = parteDelCredito(solicitud);
    const { imagenes, documentosGarante } = req.body;

    const datos = datosDelPedido(req.body, solicitud, CAMPOS_EDITABLES_CREDITO);
    const adjuntos = validarAdjuntosCredito(imagenes, documentosGarante, parte);
    if (parte !== 'Garante') {
      validarDatosAyuda(datos, adjuntos.presupuestos, solicitud.PersonaDNI, true);
      datos.fechaLugar = `${datos.lugarFirma}, ${fechaLugarHoy()}`;
    } else {
      datos.montoSolicitado = Number(solicitud.AyudaMonto);
    }
    if (parte !== 'Titular') await validarDatosGarante(datos, solicitud.PersonaDNI, solicitud.PersonaCorreo);

    // Reenvío parcial: la otra parte sale de los PDF guardados del envío anterior
    let anterior = null;
    if (parte !== 'Completo') {
      anterior = { completo: await abrirPdfGuardado(solicitud.AyudaPath), garante: await abrirPdfGuardado(solicitud.GarantePath) };
      if (!anterior.completo || !anterior.garante || anterior.completo.getPageCount() <= anterior.garante.getPageCount()) {
        throw new ErrorValidacion('No se encontró el formulario de crédito anterior para conservar la parte que no se reenvía. '
          + 'Comuníquese con el Área de Economía Social para que le solicite el reenvío del formulario completo.', 409);
      }
    }

    const { bytesCompleto, bytesGarante } = await generarPdfsCredito(parte, datos, adjuntos.presupuestos, adjuntos.documentos, anterior);
    const datosAuditoria = { idUsuario: usuarioDelTokenOpcional(req)?.idUsuario ?? null, ipCliente };

    let garante = null;
    if (bytesGarante) {
      pdfGarante = await guardarPdfEnUploads('garantes', 'DocumentacionGarante', bytesGarante);
      garante = {
        nombre: datos.nombreGarante, dni: datos.dniGarante, cuil: datos.cuilGarante, telefono: datos.telefonoGarante,
        correo: datos.correoGarante, pathFormulario: pdfGarante.direccionWeb
      };
    }
    await guardarYResponder(res, tipoFormulario, bytesCompleto,
      (direccionWeb) => registrarAyuda('Credito', solicitud, direccionWeb, datos, datosAuditoria, garante, parte),
      { 'X-Formulario-Garante-Url': pdfGarante?.direccionWeb || solicitud.GarantePath });
  } catch (error) {
    // Si no se registró, no queda el PDF del garante suelto
    if (pdfGarante && !res.headersSent) await fs.unlink(pdfGarante.rutaArchivo).catch(() => {});
    responderError(res, error, 'No se pudo registrar el formulario de crédito.');
  }
};
