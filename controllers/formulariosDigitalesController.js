import fs from 'fs/promises';
import path from 'path';
import dns from 'node:dns/promises';
import { PDFDocument, PDFEmbeddedPage, StandardFonts, rgb } from 'pdf-lib';
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
    departamento: [148, 338],
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
  garantia: 'Garantia / respaldo',
  departamento: 'Departamento'
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

const validarDatosCredito = (datos, imagenes) => {
  if (!Array.isArray(imagenes)) throw new ErrorValidacion('Adjunte los cinco documentos requeridos del garante.');
  for (const [campo, etiqueta, maximo] of [
    ['nombreEmprendimiento', 'Nombre del proyecto', 100],
    ['localidad', 'Localidad del proyecto', 40],
    ['departamento', 'Departamento del proyecto', 40],
    ['rubro', 'Actividad principal', 150],
    ['nombreApellido', 'Nombre y apellido del titular', 80]
  ]) {
    datos[campo] = limpiarTexto(datos[campo] || '');
    if (!datos[campo]) throw new ErrorValidacion(`Complete "${etiqueta}".`);
    if (datos[campo].length > maximo) throw new ErrorValidacion(`El campo "${etiqueta}" excede el largo permitido.`);
  }
  for (const [campo, etiqueta, maximo] of [
    ['nombreGarante', 'Nombre completo del garante', 100],
    ['dniGarante', 'DNI del garante', 8],
    ['cuilGarante', 'CUIL del garante', 11],
    ['telefonoGarante', 'Teléfono del garante', 10],
    ['correoGarante', 'Correo electrónico del garante', 150]
  ]) {
    datos[campo] = limpiarTexto(datos[campo] || '');
    if (!datos[campo]) throw new ErrorValidacion(`Complete "${etiqueta}".`);
    if (datos[campo].length > maximo) throw new ErrorValidacion(`El campo "${etiqueta}" excede el largo permitido.`);
  }
  if (!/^\d{7,8}$/.test(datos.dniGarante)) throw new ErrorValidacion('El DNI del garante debe tener 7 u 8 números.');
  if (!/^\d{11}$/.test(datos.cuilGarante)) throw new ErrorValidacion('El CUIL del garante debe tener 11 números, sin guiones.');
  const ponderadoresCuil = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const restoCuil = datos.cuilGarante.slice(0, 10).split('').reduce((suma, digito, indice) =>
    suma + (Number(digito) * ponderadoresCuil[indice]), 0) % 11;
  const digitoControl = restoCuil === 0 ? 0 : (restoCuil === 1 ? 9 : 11 - restoCuil);
  if (Number(datos.cuilGarante[10]) !== digitoControl) throw new ErrorValidacion('El CUIL del garante no supera la validación de su dígito de control.');
  if (!/^\d{10}$/.test(datos.telefonoGarante)) throw new ErrorValidacion('El teléfono del garante debe tener 10 números.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correoGarante)) throw new ErrorValidacion('Ingrese un correo electrónico válido para el garante.');
  const confirmacion = limpiarTexto(datos.correoGaranteConfirmacion || '').toLowerCase();
  datos.correoGarante = datos.correoGarante.toLowerCase();
  if (datos.correoGarante !== confirmacion) throw new ErrorValidacion('El correo del garante y su confirmación no coinciden.');
  delete datos.correoGaranteConfirmacion;

  datos.bienesPropios = prepararFilasCredito(datos.bienesPropios || [], 'bienesPropios');
  datos.activoFijo = prepararFilasCredito(datos.activoFijo || [], 'activoFijo');
  datos.bienesUso = prepararFilasCredito(datos.bienesUso || [], 'bienesUso');
  datos.aporteActivoFijo = numeroCredito(datos.aporteActivoFijo, 'Aporte propio de activo fijo');
  datos.aporteBienesUso = numeroCredito(datos.aporteBienesUso, 'Aporte propio de bienes de uso');
  datos.aporteManoObra = numeroCredito(datos.aporteManoObra, 'Aporte propio de mano de obra');
  datos.solicitadoActivoFijo = datos.activoFijo.reduce((total, item) => total + item.subtotal, 0);
  datos.solicitadoBienesUso = datos.bienesUso.reduce((total, item) => total + item.subtotal, 0);
  datos.totalProyectoPropio = datos.aporteActivoFijo + datos.aporteBienesUso + datos.aporteManoObra;
  datos.montoSolicitado = datos.solicitadoActivoFijo + datos.solicitadoBienesUso;
  datos.totalProyectoSolicitado = datos.montoSolicitado;
  if (datos.montoSolicitado <= 0) throw new ErrorValidacion('Ingrese al menos un bien solicitado con cantidad y precio unitario.');

  const categoriasRequeridas = ['DNI', 'CUIL', 'Recibo de sueldo', 'Certificado de residencia', 'Boleta de impuesto'];
  const faltantes = categoriasRequeridas.filter((categoria) => !imagenes.some((archivo) => archivo?.categoria === categoria));
  if (faltantes.length) throw new ErrorValidacion(`Falta adjuntar documentación del garante: ${faltantes.join(', ')}.`);
};

const formatearImporte = (valor) => Number(valor || 0).toLocaleString('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const escribirCelda = (pagina, fuente, texto, x, y, ancho, size = 8) => {
  const contenido = limpiarTexto(texto).slice(0, 48);
  if (!contenido) return;
  pagina.drawText(contenido, {
    x, y, size, font: fuente, color: rgb(0, 0, 0), maxWidth: ancho, lineHeight: size
  });
};

const dibujarDatosCredito = (pdfDoc, fuente, datos) => {
  const [hoja1, hoja2, hoja3, , , , hojaGarante] = pdfDoc.getPages();
  if (!hoja3 || !hojaGarante) throw new Error('La plantilla de créditos debe conservar sus siete páginas oficiales.');

  const dibujarFilas = (pagina, filas, inicios, topInicial, paso, tipo, ultimaFilaGrande = false) => {
    const xs = inicios;
    filas.forEach((fila, indice) => {
      const top = topInicial + (indice * paso);
      const y = 842 - (top + (ultimaFilaGrande && indice === filas.length - 1 ? 30 : 16));
      const valores = tipo === 'bienesPropios'
        ? [fila.bien, fila.cantidad, fila.antiguedad, formatearImporte(fila.montoEstimado)]
        : [fila.bien, fila.cantidad, formatearImporte(fila.precioUnitario), formatearImporte(fila.subtotal)];
      valores.forEach((valor, columna) => escribirCelda(pagina, fuente, valor, xs[columna], y, xs[columna + 1] - xs[columna] - 8, columna === 0 ? 7.5 : 7));
    });
  };

  // Renglones de la carátula del proyecto (coordenadas medidas sobre la plantilla oficial).
  escribirCampo(hoja1, fuente, 'departamento', datos.departamento, 148, 338);
  escribirCelda(hoja1, fuente, datos.nombreApellido, 95, 142, 95, 8);
  escribirCelda(hoja1, fuente, datos.nombreApellido, 250, 142, 150, 8);
  escribirCelda(hoja1, fuente, datos.dniCuit, 438, 142, 85, 8);

  dibujarFilas(hoja2, datos.bienesPropios, [51.38, 263.61, 353.67, 435.05, 528.94], 196.61, 24.72, 'bienesPropios');
  dibujarFilas(hoja2, datos.activoFijo, [51.38, 272.52, 353.66, 448.03, 528.93], 526.7, 24.72, 'activoFijo', true);
  dibujarFilas(hoja3, datos.bienesUso, [51.38, 272.52, 353.66, 448.03, 528.93], 182.45, 24.72, 'bienesUso');

  const resumen = [
    [datos.aporteActivoFijo, datos.solicitadoActivoFijo],
    [datos.aporteBienesUso, datos.solicitadoBienesUso],
    [datos.aporteManoObra, null],
    [datos.totalProyectoPropio, datos.totalProyectoSolicitado]
  ];
  resumen.forEach(([propio, solicitado], indice) => {
    const top = 529.58 + (indice * 21.17);
    const y = 842 - (top + 15);
    escribirCelda(hoja3, fuente, formatearImporte(propio), 247, y, 114, 8);
    if (solicitado !== null) escribirCelda(hoja3, fuente, formatearImporte(solicitado), 375, y, 145, 8);
  });
  escribirCelda(hoja3, fuente, formatearImporte(datos.montoSolicitado), 340, 402, 175, 9);

  const datosGarante = [
    `Nombre completo: ${datos.nombreGarante}`,
    `DNI: ${datos.dniGarante}     CUIL: ${datos.cuilGarante}`,
    `Teléfono: ${datos.telefonoGarante}`,
    `Correo electrónico: ${datos.correoGarante}`,
    'Documentación adjunta: DNI, CUIL, recibo de sueldo, certificado de residencia y boleta de impuesto.'
  ];
  datosGarante.forEach((linea, indice) => {
    hojaGarante.drawText(linea, {
      x: 80, y: 318 - (indice * 25), size: indice === 4 ? 8 : 10,
      font: fuente, color: rgb(0, 0, 0), maxWidth: 440
    });
  });
};

const dibujarDatosSubsidio = (pdfDoc, fuente, datos) => {
  const paginas = pdfDoc.getPages();
  if (paginas.length !== 6) throw new Error('La plantilla de subsidios debe conservar sus seis páginas oficiales.');
  const [portada, bienes, costos, acta, notificacion, declaracion] = paginas;
  const moneda = (valor) => valor === undefined || valor === '' ? '' : formatearImporte(valor);

  // Portada: los datos se escriben sobre los renglones del formulario oficial.
  escribirCampo(portada, fuente, 'nombreEmprendimiento', datos.nombreEmprendimiento, 184, 467);
  escribirCampo(portada, fuente, 'localidad', datos.localidad, 140, 425);
  escribirCampo(portada, fuente, 'departamento', datos.departamento, 392, 425);
  escribirCampo(portada, fuente, 'beneficiarios', datos.beneficiarios, 140, 405);
  escribirCampo(portada, fuente, 'rubro', datos.rubro, 176, 393);
  escribirCampo(portada, fuente, 'numeroProyecto', datos.numeroProyecto, 240, 344);
  escribirCampo(portada, fuente, 'ramaActividad', datos.ramaActividad, 110, 315);
  escribirCampo(portada, fuente, 'nombreApellido', datos.nombreApellido, 184, 278);
  escribirCampo(portada, fuente, 'dniCuit', datos.dniCuit, 415, 278);

  const dibujarTabla = (pagina, filas, xs, primerY, paso, tipo) => {
    filas.forEach((fila, indice) => {
      const y = primerY - (indice * paso);
      const valores = tipo === 'bienesPropios'
        ? [fila.bien, fila.cantidad, fila.antiguedad, moneda(fila.montoEstimado)]
        : [fila.bien, fila.cantidad, moneda(fila.precioUnitario), moneda(fila.subtotal)];
      valores.forEach((valor, columna) => escribirCelda(
        pagina, fuente, valor, xs[columna], y, xs[columna + 1] - xs[columna] - 8, columna === 0 ? 7.2 : 7
      ));
    });
  };

  dibujarTabla(bienes, datos.bienesPropios || [], [55, 262, 351, 432, 526], 758, 24.72, 'bienesPropios');
  dibujarTabla(bienes, datos.recursosNecesarios || [], [55, 169, 289, 411, 526], 368, 24.72, 'recursosNecesarios');
  escribirCelda(bienes, fuente, moneda(datos.montoSolicitado), 361, 107, 155, 9);

  const resumen = [
    [datos.aporteActivoFijo, datos.solicitadoActivoFijo],
    [datos.aporteBienesUso, datos.solicitadoBienesUso],
    [datos.aporteManoObra, null],
    [datos.totalProyectoPropio, datos.totalProyectoSolicitado]
  ];
  resumen.forEach(([propio, solicitado], indice) => {
    const y = 789 - (indice * 20);
    escribirCelda(costos, fuente, moneda(propio), 247, y, 112, 8);
    if (solicitado !== null) escribirCelda(costos, fuente, moneda(solicitado), 375, y, 143, 8);
  });

  // Datos identificatorios del acta y de las declaraciones impresas en las hojas 4 y 6.
  escribirCelda(acta, fuente, datos.nombreApellido, 105, 622, 115, 8);
  escribirCelda(acta, fuente, datos.dniCuit, 175, 597, 80, 8);
  escribirCelda(acta, fuente, datos.domicilio, 345, 597, 200, 8);
  escribirCelda(acta, fuente, datos.localidad, 355, 570, 160, 8);
  escribirCelda(acta, fuente, datos.departamento, 145, 547, 145, 8);
  escribirCelda(acta, fuente, datos.firmaAcuerdo, 90, 185, 175, 8);
  escribirCelda(acta, fuente, datos.aclaracionAcuerdo, 140, 147, 200, 8);
  escribirCelda(acta, fuente, datos.dniAcuerdo, 105, 105, 120, 8);
  escribirCelda(notificacion, fuente, datos.firmaNotificacion, 75, 148, 150, 8);
  escribirCelda(notificacion, fuente, datos.aclaracionNotificacion, 140, 120, 210, 8);
  escribirCelda(notificacion, fuente, datos.dniNotificacion, 75, 65, 100, 8);

  const fecha = datos.fechaLugar || (() => {
    const hoy = new Date();
    return `SANTIAGO DEL ESTERO, ${String(hoy.getDate()).padStart(2, '0')} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][hoy.getMonth()]} de ${hoy.getFullYear()}`;
  })();
  escribirCelda(notificacion, fuente, fecha, 270, 65, 260, 8);
  escribirCelda(declaracion, fuente, fecha, 93, 772, 430, 8);
  escribirCelda(declaracion, fuente, datos.nombreApellido, 145, 746, 350, 9);
  escribirCelda(declaracion, fuente, datos.dniCuit, 115, 715, 150, 8);
  escribirCelda(declaracion, fuente, datos.domicilio, 340, 715, 190, 8);
  escribirCelda(declaracion, fuente, datos.departamento, 300, 679, 190, 8);
  escribirCelda(declaracion, fuente, datos.responsableProyecto, 200, 142, 260, 9);
  escribirCelda(declaracion, fuente, datos.aclaracionProyecto, 200, 108, 260, 8);
  escribirCelda(declaracion, fuente, datos.dniProyecto, 160, 72, 180, 8);
};

const validarDatosSubsidio = (datos, imagenes, documentoExtranjero) => {
  if (!Array.isArray(imagenes) || !imagenes.length) {
    throw new ErrorValidacion('Adjunte al menos una fotografía o un PDF de la documentación del proyecto.');
  }
  for (const [campo, etiqueta, maximo] of [
    ['nombreEmprendimiento', 'Nombre del proyecto', 100],
    ['localidad', 'Localidad', 40],
    ['departamento', 'Departamento', 40],
    ['beneficiarios', 'Beneficiarios', 100],
    ['rubro', 'Actividad principal', 150],
    ['nombreApellido', 'Nombre y apellido del titular', 80],
    ['correo', 'Correo electrónico', 150],
    ['telefono', 'Celular', 10],
    ['domicilio', 'Domicilio del titular', 140],
    ['firmaAcuerdo', 'Firma del acta acuerdo', 80],
    ['aclaracionAcuerdo', 'Aclaración del acta acuerdo', 80],
    ['dniAcuerdo', 'DNI del acta acuerdo', 20],
    ['firmaNotificacion', 'Firma de la notificación', 80],
    ['aclaracionNotificacion', 'Aclaración de la notificación', 80],
    ['dniNotificacion', 'DNI de la notificación', 20],
    ['responsableProyecto', 'Responsable del proyecto', 80],
    ['aclaracionProyecto', 'Aclaración del responsable del proyecto', 80],
    ['dniProyecto', 'DNI del responsable del proyecto', 20]
  ]) {
    datos[campo] = limpiarTexto(datos[campo] || '');
    if (!datos[campo]) throw new ErrorValidacion(`Complete el campo "${etiqueta}".`);
    if (datos[campo].length > maximo) throw new ErrorValidacion(`El campo "${etiqueta}" excede el largo permitido.`);
  }
  if (!departamentosSantiago.includes(datos.departamento)) throw new ErrorValidacion('Seleccione un departamento válido de Santiago del Estero.');
  if (!/^[1-9]\d{9}$/.test(datos.telefono)) throw new ErrorValidacion('El celular debe tener 10 números, sin 0 inicial, 15 ni espacios.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) throw new ErrorValidacion('Ingrese un correo electrónico válido.');
  const documentoFirmaValido = documentoExtranjero
    ? (documento) => /^[A-Za-z0-9-]{4,15}$/.test(documento)
    : (documento) => /^\d{7,8}$/.test(documento);
  for (const campo of ['dniAcuerdo', 'dniNotificacion', 'dniProyecto']) {
    if (!documentoFirmaValido(datos[campo])) throw new ErrorValidacion(`Revise el campo "${campo}"; debe coincidir con el formato del documento indicado.`);
  }

  datos.bienesPropios = prepararFilasCredito(datos.bienesPropios || [], 'bienesPropios');
  if (!Array.isArray(datos.recursosNecesarios)) throw new ErrorValidacion('Revise el cuadro de recursos necesarios.');
  datos.recursosNecesarios = datos.recursosNecesarios.map((fila) => {
    const bien = limpiarTexto(fila?.bien || '').slice(0, 42);
    const cantidad = numeroCredito(fila?.cantidad, 'Cantidad');
    const precioUnitario = numeroCredito(fila?.precioUnitario, 'Precio unitario');
    if (!bien && !cantidad && !precioUnitario) return null;
    if (!bien || !Number.isInteger(cantidad) || !cantidad || !precioUnitario) {
      throw new ErrorValidacion('Complete recurso, cantidad entera y precio unitario en cada renglón utilizado.');
    }
    return { bien, cantidad, precioUnitario, subtotal: cantidad * precioUnitario };
  }).filter(Boolean);
  if (datos.recursosNecesarios.length > 9) throw new ErrorValidacion('El cuadro de recursos necesarios admite hasta 9 renglones.');

  for (const campo of ['aporteActivoFijo', 'solicitadoActivoFijo', 'aporteBienesUso', 'solicitadoBienesUso', 'aporteManoObra']) {
    datos[campo] = numeroCredito(datos[campo], campo);
  }
  datos.totalProyectoPropio = datos.aporteActivoFijo + datos.aporteBienesUso + datos.aporteManoObra;
  datos.totalProyectoSolicitado = datos.solicitadoActivoFijo + datos.solicitadoBienesUso;
  const totalRecursos = datos.recursosNecesarios.reduce((total, fila) => total + fila.subtotal, 0);
  datos.montoSolicitado = validarMonto(datos.montoSolicitado || totalRecursos);
  if (!totalRecursos) throw new ErrorValidacion('Complete al menos un recurso solicitado con cantidad y precio unitario.');
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) throw new ErrorValidacion('Ingrese un correo electrónico válido.');
  if (!departamentosSantiago.includes(datos.departamento) || !departamentosSantiago.includes(datos.departamentoPersona)) {
    throw new ErrorValidacion('Seleccione un departamento válido de Santiago del Estero.');
  }
  if (!['Sí', 'No'].includes(datos.enMarcha)) throw new ErrorValidacion('Indique si el emprendimiento está en marcha.');
  if (!['Subsidio', 'Credito'].includes(datos.tipoFinanciamiento)) throw new ErrorValidacion('Elija Subsidio o Crédito como tipo de ayuda.');

  datos.nombreApellido = `${datos.nombre} ${datos.apellido}`;
};

const validarDominioCorreo = async (correo) => {
  const dominio = correo.split('@')[1];
  try {
    const servidores = await dns.resolveMx(dominio);
    if (servidores.length) return;
  } catch (error) {
    if (!['ENODATA', 'ENOTFOUND', 'ESERVFAIL'].includes(error.code)) {
      throw new ErrorValidacion('No se pudo comprobar el dominio del correo. Revise su conexión e inténtelo nuevamente.');
    }
  }

  // Algunos dominios reciben correo sin MX y usan registros A/AAAA como servidor.
  for (const consulta of [dns.resolve4, dns.resolve6]) {
    try {
      const direcciones = await consulta(dominio);
      if (direcciones.length) return;
    } catch (error) {
      if (!['ENODATA', 'ENOTFOUND', 'ESERVFAIL'].includes(error.code)) {
        throw new ErrorValidacion('No se pudo comprobar el dominio del correo. Revise su conexión e inténtelo nuevamente.');
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

// Arma el PDF a partir de la plantilla, los datos y los adjuntos. Devuelve los bytes finales.
const generarPdf = async (tipoFormulario, datos, imagenes) => {
  if (tipoFormulario === 'Formulario de Inicio' && (!Array.isArray(imagenes) || imagenes.length === 0)) {
    throw new ErrorValidacion('Debe adjuntar al menos una foto o un PDF para completar el formulario.');
  }
  if (tipoFormulario === 'Formulario de Subsidios no Reintegrables' && (!Array.isArray(imagenes) || imagenes.length === 0)) {
    throw new ErrorValidacion('Adjunte al menos una fotografía o un PDF para completar el formulario de subsidio.');
  }
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

  if (tipoFormulario === 'Formulario de Subsidios no Reintegrables') {
    dibujarDatosSubsidio(pdfDoc, fuente, datos);
  } else if (tipoFormulario === 'Formulario de Inicio') {
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
  } else if (tipoFormulario === 'Formulario de Creditos Reintegrables') {
    dibujarDatosCredito(pdfDoc, fuente, datos);
  }

  const adjuntosParaHoja = [];
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
      if (!indices.length || adjuntosParaHoja.length + indices.length > 8) {
        throw new ErrorValidacion('En el espacio del formulario se pueden incluir hasta 8 páginas de archivos adjuntos en total.');
      }
      const paginas = await pdfDoc.embedPages(indices.map((indice) => pdfAdjunto.getPage(indice)));
      adjuntosParaHoja.push(...paginas.map((paginaPdf) => ({
        contenido: paginaPdf,
        ancho: paginaPdf.width,
        alto: paginaPdf.height,
        categoria: imagen.categoria || '',
        nombre: imagen.nombre || ''
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
    if (adjuntosParaHoja.length >= 8) {
      throw new ErrorValidacion('En el espacio del formulario se pueden incluir hasta 8 páginas de archivos adjuntos en total.');
    }
    adjuntosParaHoja.push({
      contenido: imagenPdf,
      ancho: imagenPdf.width,
      alto: imagenPdf.height,
      categoria: imagen.categoria || '',
      nombre: imagen.nombre || ''
    });
  }

  if (tipoFormulario === 'Formulario de Inicio' && adjuntosParaHoja.length) {
    const paginaAdjuntos = pdfDoc.getPages()[1];
    if (!paginaAdjuntos) throw new Error('La plantilla del Formulario de Inicio no contiene la segunda hoja de adjuntos.');

    // Los adjuntos se distribuyen dentro del recuadro existente de la hoja 2.
    // Cada imagen o página de PDF ocupa una celda; así no se agregan hojas al documento.
    const area = { x: 42, y: 325, width: 520, height: 520 };
    const columnas = Math.ceil(Math.sqrt(adjuntosParaHoja.length * area.width / area.height));
    const filas = Math.ceil(adjuntosParaHoja.length / columnas);
    const espacio = 10;
    const anchoCelda = (area.width - espacio * (columnas - 1)) / columnas;
    const altoCelda = (area.height - espacio * (filas - 1)) / filas;

    adjuntosParaHoja.forEach(({ contenido, ancho, alto }, indice) => {
      const columna = indice % columnas;
      const fila = Math.floor(indice / columnas);
      const escala = Math.min(anchoCelda / ancho, altoCelda / alto);
      const anchoFinal = ancho * escala;
      const altoFinal = alto * escala;
      const x = area.x + columna * (anchoCelda + espacio) + (anchoCelda - anchoFinal) / 2;
      const y = area.y + area.height - (fila + 1) * altoCelda - fila * espacio + (altoCelda - altoFinal) / 2;

      if (contenido instanceof PDFEmbeddedPage) {
        paginaAdjuntos.drawPage(contenido, { x, y, width: anchoFinal, height: altoFinal });
      } else {
        paginaAdjuntos.drawImage(contenido, { x, y, width: anchoFinal, height: altoFinal });
      }
    });
  } else if (tipoFormulario === 'Formulario de Subsidios no Reintegrables' && adjuntosParaHoja.length) {
    // La hoja 3 del formulario oficial tiene un área libre debajo del cuadro de costos.
    // Colocamos los adjuntos en ese espacio sin crear páginas adicionales.
    const paginaAdjuntos = pdfDoc.getPages()[2];
    if (!paginaAdjuntos) throw new Error('La plantilla de subsidios no contiene la tercera hoja para los adjuntos.');
    const area = { x: 45, y: 45, width: 505, height: 455 };
    const columnas = Math.ceil(Math.sqrt(adjuntosParaHoja.length * area.width / area.height));
    const filas = Math.ceil(adjuntosParaHoja.length / columnas);
    const espacio = 8;
    const anchoCelda = (area.width - espacio * (columnas - 1)) / columnas;
    const altoCelda = (area.height - espacio * (filas - 1)) / filas;
    adjuntosParaHoja.forEach(({ contenido, ancho, alto }, indice) => {
      const columna = indice % columnas;
      const fila = Math.floor(indice / columnas);
      const escala = Math.min(anchoCelda / ancho, altoCelda / alto);
      const anchoFinal = ancho * escala;
      const altoFinal = alto * escala;
      const x = area.x + columna * (anchoCelda + espacio) + (anchoCelda - anchoFinal) / 2;
      const y = area.y + area.height - (fila + 1) * altoCelda - fila * espacio + (altoCelda - altoFinal) / 2;
      if (contenido instanceof PDFEmbeddedPage) {
        paginaAdjuntos.drawPage(contenido, { x, y, width: anchoFinal, height: altoFinal });
      } else {
        paginaAdjuntos.drawImage(contenido, { x, y, width: anchoFinal, height: altoFinal });
      }
    });
  } else if (tipoFormulario !== 'Formulario de Inicio' && adjuntosParaHoja.length) {
    // La documentación del garante se conserva en hojas adicionales del expediente de crédito.
    adjuntosParaHoja.forEach(({ contenido, ancho, alto, categoria, nombre }) => {
      const paginaAdjuntos = pdfDoc.addPage([595.28, 841.89]);
      const tituloAdjunto = tipoFormulario === 'Formulario de Creditos Reintegrables'
        ? `Documentación del garante${categoria ? ` - ${categoria}` : ''}`
        : 'Imágenes y documentación adjunta';
      paginaAdjuntos.drawText(tituloAdjunto, {
        x: 40, y: 800, size: 13, font: fuente, color: rgb(0.18, 0.31, 0.47), maxWidth: 515
      });
      if (nombre) paginaAdjuntos.drawText(limpiarTexto(nombre).slice(0, 85), {
        x: 40, y: 783, size: 8, font: fuente, color: rgb(0, 0, 0), maxWidth: 515
      });
      const escala = Math.min(515 / ancho, 680 / alto);
      const anchoFinal = ancho * escala;
      const altoFinal = alto * escala;
      const x = (595.28 - anchoFinal) / 2;
      const y = 765 - altoFinal;
      if (contenido instanceof PDFEmbeddedPage) {
        paginaAdjuntos.drawPage(contenido, { x, y, width: anchoFinal, height: altoFinal });
      } else {
        paginaAdjuntos.drawImage(contenido, { x, y, width: anchoFinal, height: altoFinal });
      }
    });
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
    await validarDominioCorreo(datos.correo);

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
    if (tipoFormulario === 'Formulario de Creditos Reintegrables') {
      validarDatosCredito(datos, imagenes);
      await validarDominioCorreo(datos.correoGarante);
    } else {
      validarDatosSubsidio(datos, imagenes, documentoExtranjero);
      await validarDominioCorreo(datos.correo);
    }
    const monto = validarMonto(datos.montoSolicitado);

    const bytesPdf = await generarPdf(tipoFormulario, datos, imagenes);
    const datosAuditoria = { idUsuario: req.usuarioLogueado.idUsuario, ipCliente: req.ip || '127.0.0.1' };

    await guardarYResponder(res, tipoFormulario, bytesPdf,
      (direccionWeb) => modelRegistrarPedidoAyuda(tipo, direccionWeb, monto, idSolicitudInicio, datosAuditoria));
  } catch (error) {
    responderError(res, error, 'No se pudo registrar el formulario.');
  }
};
