const form = document.querySelector('#formulario-digital');
const resultado = document.querySelector('#resultado-formulario');
// Mismo origen que la página (sirve en local y en Render)
const apiBaseUrl = '';
let fechaActual = new Date();
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const campoDia = document.querySelector('input[name="dia"]');
const campoMes = document.querySelector('input[name="mes"]');
const campoAnio = document.querySelector('input[name="anio"]');

const completarFecha = () => {
  fechaActual = new Date();
  if (campoDia) campoDia.value = String(fechaActual.getDate()).padStart(2, '0');
  if (campoMes) campoMes.value = meses[fechaActual.getMonth()];
  if (campoAnio) campoAnio.value = fechaActual.getFullYear();
  document.querySelectorAll('.fecha-automatica').forEach((elemento) => {
    elemento.textContent = `SANTIAGO DEL ESTERO, ${String(fechaActual.getDate()).padStart(2, '0')} de ${meses[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}`;
  });
};
completarFecha();

// Envía el formulario mostrando el avance: subida de los adjuntos, armado del PDF y descarga.
// (fetch no informa cuánto se subió; con conexión lenta, sin esto parece que la página no responde)
const enviarConAvance = (url, cabeceras, cuerpo, mostrar) => new Promise((resolve, reject) => {
  const pedido = new XMLHttpRequest();
  pedido.open('POST', url);
  Object.entries(cabeceras).forEach(([nombre, valor]) => pedido.setRequestHeader(nombre, valor));
  pedido.responseType = 'blob';
  const porcentaje = (evento) => (evento.lengthComputable && evento.total ? ` ${Math.floor((evento.loaded / evento.total) * 100)} %` : '');
  pedido.upload.onprogress = (evento) => mostrar(`Enviando el formulario y los adjuntos...${porcentaje(evento)}`);
  pedido.upload.onload = () => mostrar('Generando el documento...');
  pedido.onprogress = (evento) => {
    if (pedido.status === 201) mostrar(`Formulario registrado. Descargando el documento...${porcentaje(evento)}`);
  };
  pedido.onload = async () => {
    const tipo = pedido.getResponseHeader('content-type') || '';
    const datos = tipo.includes('application/json') ? await pedido.response.text().then(JSON.parse).catch(() => ({})) : null;
    resolve({
      ok: pedido.status >= 200 && pedido.status < 300,
      status: pedido.status,
      headers: { get: (nombre) => pedido.getResponseHeader(nombre) },
      json: async () => datos || {},
      blob: async () => pedido.response
    });
  };
  pedido.onerror = () => reject(new Error('No se pudo conectar con el servidor. Revise su conexión a internet e inténtelo nuevamente.'));
  pedido.ontimeout = pedido.onerror;
  pedido.send(cuerpo);
});

if (form) {
  const esFormularioCredito = form.querySelector('input[name="tipoFormulario"]')?.value === 'Formulario de Creditos Reintegrables';
  const esFormularioSubsidio = form.querySelector('input[name="tipoFormulario"]')?.value === 'Formulario de Subsidios no Reintegrables';
  const definicionesTablas = {
    bienesPropios: { cantidad: 10, columnas: ['bien', 'cantidad', 'antiguedad', 'montoEstimado'] },
    activoFijo: { cantidad: 7, columnas: ['bien', 'cantidad', 'precioUnitario', 'subtotal'] },
    bienesUso: { cantidad: 9, columnas: ['bien', 'cantidad', 'precioUnitario', 'subtotal'] }
  };
  const etiquetasColumnas = {
    bien: 'Bien', cantidad: 'Cantidad', antiguedad: 'Antigüedad',
    montoEstimado: 'Monto estimado', precioUnitario: 'Precio unitario', subtotal: 'Subtotal'
  };
  const cuerposTabla = [...form.querySelectorAll('tbody[data-tabla-lineas]')];

  cuerposTabla.forEach((cuerpo) => {
    const nombreTabla = cuerpo.dataset.tablaLineas;
    const definicion = definicionesTablas[nombreTabla];
    if (!definicion) return;
    const cantidadFilas = Number(cuerpo.dataset.cantidad) || definicion.cantidad;
    const columnasFila = cuerpo.dataset.columnas?.split(',').filter(Boolean) || definicion.columnas;
    for (let fila = 0; fila < cantidadFilas; fila++) {
      const tr = document.createElement('tr');
      columnasFila.forEach((columna) => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        const esNumero = ['cantidad', 'montoEstimado', 'precioUnitario', 'subtotal'].includes(columna);
        input.type = esNumero ? 'number' : 'text';
        input.dataset.campoFila = columna;
        input.setAttribute('aria-label', `${etiquetasColumnas[columna]} fila ${fila + 1}`);
        if (esNumero) {
          input.min = columna === 'cantidad' ? '1' : '0';
          input.step = columna === 'cantidad' ? '1' : '0.01';
        } else {
          input.maxLength = columna === 'bien' ? 42 : 20;
        }
        if (columna === 'subtotal') {
          input.readOnly = true;
          input.tabIndex = -1;
          input.setAttribute('aria-label', `Subtotal calculado fila ${fila + 1}`);
        }
        td.append(input);
        tr.append(td);
      });
      cuerpo.append(tr);
    }
  });

  const numero = (valor) => {
    const resultadoNumero = Number(valor);
    return Number.isFinite(resultadoNumero) && resultadoNumero > 0 ? resultadoNumero : 0;
  };
  const filasDeTabla = (nombreTabla) => {
    const cuerpo = cuerposTabla.find((elemento) => elemento.dataset.tablaLineas === nombreTabla);
    return [...(cuerpo?.querySelectorAll('tr') || [])].map((fila) =>
      Object.fromEntries([...fila.querySelectorAll('[data-campo-fila]')]
        .map((input) => [input.dataset.campoFila, input.value.trim()]))
    );
  };
  const sumarMontos = (nombreTabla, campo) => filasDeTabla(nombreTabla)
    .reduce((total, fila) => total + numero(fila[campo]), 0);
  // Crédito y subsidio: la columna "Solicitado" del costo total sale de los cuadros de activo fijo y bienes de uso
  const actualizarCalculosCredito = () => {
    if (!esFormularioCredito && !esFormularioSubsidio) return;
    ['activoFijo', 'bienesUso'].forEach((nombreTabla) => {
      const cuerpo = cuerposTabla.find((elemento) => elemento.dataset.tablaLineas === nombreTabla);
      cuerpo?.querySelectorAll('tr').forEach((fila) => {
        const cantidad = numero(fila.querySelector('[data-campo-fila="cantidad"]')?.value);
        const precio = numero(fila.querySelector('[data-campo-fila="precioUnitario"]')?.value);
        const subtotal = fila.querySelector('[data-campo-fila="subtotal"]');
        if (subtotal) subtotal.value = cantidad && precio ? (cantidad * precio).toFixed(2) : '';
      });
    });
    const totalActivoFijo = sumarMontos('activoFijo', 'subtotal');
    const totalBienesUso = sumarMontos('bienesUso', 'subtotal');
    const totalSolicitado = totalActivoFijo + totalBienesUso;
    const aporteTotal = numero(form.querySelector('[name="aporteActivoFijo"]')?.value)
      + numero(form.querySelector('[name="aporteBienesUso"]')?.value)
      + numero(form.querySelector('[name="aporteManoObra"]')?.value);
    const formato = (valor) => valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const mostrar = (selector, valor) => {
      const elemento = form.querySelector(selector);
      if (elemento) elemento.textContent = formato(valor);
    };
    mostrar('#solicitado-activo-fijo', totalActivoFijo);
    mostrar('#solicitado-bienes-uso', totalBienesUso);
    mostrar('#total-solicitado-activo-fijo', totalActivoFijo);
    mostrar('#total-solicitado-bienes-uso', totalBienesUso);
    mostrar('#total-solicitado', totalSolicitado);
    mostrar('#costo-total-propio', aporteTotal);
    mostrar('#costo-total-solicitado', totalSolicitado);
  };
  form.addEventListener('input', (evento) => {
    if (evento.target.matches('[data-campo-fila], [name="aporteActivoFijo"], [name="aporteBienesUso"], [name="aporteManoObra"]')) {
      actualizarCalculosCredito();
    }
  });
  form.querySelectorAll('[data-valor]').forEach((salida) => {
    const campo = form.querySelector(`[name="${salida.dataset.valor}"]`);
    const refrescar = () => { salida.textContent = campo?.value || ''; };
    campo?.addEventListener('input', refrescar);
    campo?.addEventListener('change', refrescar);
    refrescar();
  });
  const camposAutocompletados = [...form.querySelectorAll('[data-autocompletar]')];
  const sincronizarCamposAutocompletados = () => {
    camposAutocompletados.forEach((destino) => {
      if (destino.dataset.editado) return;
      const origen = form.querySelector(`[name="${destino.dataset.autocompletar}"]`);
      destino.value = origen?.value || '';
    });
  };
  camposAutocompletados.forEach((campo) => {
    campo.addEventListener('input', () => { campo.dataset.editado = 'true'; });
  });
  ['nombreApellido', 'dniCuit'].forEach((nombre) => {
    form.querySelector(`[name="${nombre}"]`)?.addEventListener('input', sincronizarCamposAutocompletados);
  });
  sincronizarCamposAutocompletados();
  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      camposAutocompletados.forEach((campo) => { delete campo.dataset.editado; });
      sincronizarCamposAutocompletados();
    }, 0);
  });
  actualizarCalculosCredito();

  const campoDni = form.querySelector('input[name="dniCuit"]');
  const campoTelefono = form.querySelector('input[name="telefono"]');
  const extranjero = form.querySelector('input[name="documentoExtranjero"]');
  const numeroEmprendimiento = form.querySelector('input[name="numeroEmprendimiento"]');
  const calleSinNumero = form.querySelector('input[name="calleSinNumero"]');
  const numeroDomicilio = form.querySelector('input[name="numeroDomicilio"]');

  // Conecta un select de departamento con su select de localidades (georef) y el campo "Otra localidad"
  const crearSelectorLocalidad = (selectDepartamento, selectLocalidad, inputLibre) => {
    let numeroCarga = 0;

    const mostrarOtra = () => {
      const usarLibre = selectLocalidad?.value === '__otra__';
      if (inputLibre) {
        inputLibre.hidden = !usarLibre;
        inputLibre.required = usarLibre;
        if (!usarLibre) inputLibre.value = '';
      }
    };

    const cargar = async () => {
      if (!selectDepartamento || !selectLocalidad) return;
      const cargaActual = ++numeroCarga;
      const departamento = selectDepartamento.value;
      selectLocalidad.replaceChildren(new Option(departamento ? 'Cargando localidades...' : 'Primero seleccione el departamento', ''));
      selectLocalidad.disabled = true;
      mostrarOtra();
      if (!departamento) return;

      try {
        const parametros = new URLSearchParams({
          provincia: 'Santiago del Estero',
          departamento,
          max: '5000',
          campos: 'nombre,departamento'
        });
        const respuesta = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${parametros}`);
        if (!respuesta.ok) throw new Error('No se pudo consultar el listado de localidades.');
        const datos = await respuesta.json();
        if (cargaActual !== numeroCarga) return;
        const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const nombres = [...new Set((datos.localidades || [])
          .filter((item) => normalizar(item.departamento?.nombre) === normalizar(departamento))
          .map((item) => item.nombre)
          .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

        selectLocalidad.replaceChildren(new Option('Seleccione una localidad...', ''));
        nombres.forEach((nombre) => selectLocalidad.add(new Option(nombre, nombre)));
        selectLocalidad.add(new Option('Otra localidad (escribir)', '__otra__'));
        selectLocalidad.disabled = false;
      } catch {
        if (cargaActual !== numeroCarga) return;
        selectLocalidad.replaceChildren(new Option('No se pudo cargar; elija escribirla', ''));
        selectLocalidad.add(new Option('Otra localidad (escribir)', '__otra__'));
        selectLocalidad.disabled = false;
      }
      mostrarOtra();
    };

    const reiniciar = () => {
      if (!selectLocalidad) return;
      numeroCarga++;
      selectLocalidad.replaceChildren(new Option('Primero seleccione el departamento', ''));
      selectLocalidad.disabled = true;
      mostrarOtra();
    };

    selectDepartamento?.addEventListener('change', cargar);
    selectLocalidad?.addEventListener('change', mostrarOtra);

    return {
      cargando: () => Boolean(selectLocalidad?.disabled),
      // Devuelve lo elegido en la lista, o lo escrito si eligi\u00f3 "Otra localidad"
      valor: (valorFormulario) => selectLocalidad?.value === '__otra__' ? (inputLibre?.value.trim() || '') : valorFormulario,
      mostrarOtra,
      reiniciar
    };
  };

  // Localidad de la persona (en Subsidios el \u00fanico departamento se llama "departamento")
  const localidadPersona = crearSelectorLocalidad(
    form.querySelector('select[name="departamentoPersona"], select[name="departamento"]'),
    form.querySelector('select[name="localidad"]'),
    form.querySelector('input[name="localidadLibre"]')
  );
  // Localidad del emprendimiento (solo existe en el Formulario de Inicio)
  const selectLocalidadEmprendimiento = form.querySelector('select[name="localidadEmprendimiento"]');
  const localidadEmprendimiento = selectLocalidadEmprendimiento
    ? crearSelectorLocalidad(
      form.querySelector('select[name="departamento"]'),
      selectLocalidadEmprendimiento,
      form.querySelector('input[name="localidadEmprendimientoLibre"]')
    )
    : null;
  const localidad = form.querySelector('select[name="localidad"]');

  const actualizarNumeroCalle = () => {
    if (!numeroEmprendimiento) return;
    numeroEmprendimiento.disabled = Boolean(calleSinNumero?.checked);
    numeroEmprendimiento.required = !calleSinNumero?.checked;
    numeroEmprendimiento.value = calleSinNumero?.checked ? 'S/N' : (numeroEmprendimiento.value === 'S/N' ? '' : numeroEmprendimiento.value);
  };
  calleSinNumero?.addEventListener('change', actualizarNumeroCalle);
  actualizarNumeroCalle();
  const actualizarNumeroDomicilio = () => {
    if (!numeroDomicilio) return;
    numeroDomicilio.disabled = Boolean(calleSinNumero?.checked);
    numeroDomicilio.required = !calleSinNumero?.checked;
    numeroDomicilio.value = calleSinNumero?.checked ? 'S/N' : (numeroDomicilio.value === 'S/N' ? '' : numeroDomicilio.value);
  };
  calleSinNumero?.addEventListener('change', actualizarNumeroDomicilio);
  actualizarNumeroDomicilio();

  const actualizarFormatoDocumento = () => {
    if (!campoDni) return;
    campoDni.maxLength = extranjero?.checked ? 20 : 8;
    campoDni.inputMode = extranjero?.checked ? 'text' : 'numeric';
    campoDni.pattern = extranjero?.checked ? '[A-Za-z0-9-]{4,20}' : '[0-9]{7,8}';
    campoDni.title = extranjero?.checked
      ? 'Ingrese letras y números del pasaporte o documento extranjero.'
      : 'El DNI debe tener 7 u 8 números, sin puntos.';
    campoDni.setCustomValidity('');
  };

  extranjero?.addEventListener('change', () => {
    if (campoDni && !extranjero.checked) campoDni.value = campoDni.value.replace(/\D/g, '').slice(0, 8);
    actualizarFormatoDocumento();
  });
  actualizarFormatoDocumento();

  campoDni?.addEventListener('input', () => {
    if (!extranjero?.checked) campoDni.value = campoDni.value.replace(/\D/g, '').slice(0, 8);
    campoDni.setCustomValidity('');
  });

  campoTelefono?.setAttribute('inputmode', 'numeric');
  campoTelefono?.setAttribute('maxlength', '10');
  campoTelefono?.setAttribute('pattern', '[1-9][0-9]{9}');
  campoTelefono?.setAttribute('title', 'Ingrese 10 números, sin 0 inicial, 15 ni espacios.');
  campoTelefono?.addEventListener('input', () => {
    campoTelefono.value = campoTelefono.value.replace(/\D/g, '').slice(0, 10);
    campoTelefono.setCustomValidity('');
  });
  // Formulario de Inicio: sugerencias del rubro con los rubros registrados (se puede escribir otro igual)
  const listaRubros = form.querySelector('#lista-rubros');
  if (listaRubros) {
    fetch(`${apiBaseUrl}/api/rubros`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : []))
      .then((rubros) => rubros.forEach(({ Nombre }) => listaRubros.append(new Option(Nombre))))
      .catch(() => {}); // sin sugerencias el campo sigue funcionando como texto libre
  }

  // El número de calle del emprendimiento solo admite números (con "Sin número" queda S/N y el campo bloqueado)
  numeroEmprendimiento?.addEventListener('input', () => { numeroEmprendimiento.value = numeroEmprendimiento.value.replace(/\D/g, ''); });
  form.querySelectorAll('input[name="dniGarante"], input[name="dniFirmaGarante"], input[name="cuilGarante"], input[name="telefonoGarante"]').forEach((input) => {
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  });

  // Crédito: cada documento del garante tiene su botón; al lado se muestra el archivo elegido
  const documentosGaranteElegidos = [...form.querySelectorAll('[data-documento-garante]')];
  const mostrarArchivoGarante = (control) => {
    const fila = control.closest('.documento-garante');
    const archivo = control.files?.[0];
    fila?.classList.toggle('con-archivo', Boolean(archivo));
    const texto = fila?.querySelector('[data-archivo-elegido]');
    if (texto) texto.textContent = archivo ? archivo.name : 'Sin archivo';
  };
  documentosGaranteElegidos.forEach((control) => control.addEventListener('change', () => mostrarArchivoGarante(control)));
  form.addEventListener('reset', () => {
    window.setTimeout(() => documentosGaranteElegidos.forEach(mostrarArchivoGarante), 0);
  });
  form.querySelectorAll('input[type="file"]').forEach((control) => control.addEventListener('change', () => adelantarFotos(control)));

  // Límites de los adjuntos: el crédito suma los 5 documentos del garante a los presupuestos
  const limitesAdjuntos = esFormularioCredito
    ? { archivos: 12, presupuestos: 7, megas: 30 }
    : { archivos: 8, presupuestos: 8, megas: 16 };
  // Fotos: se aceptan como salen del celular y se achican acá antes de enviarlas (ver achicarFoto)
  const MEGAS_FOTO_ORIGINAL = 25;
  const MEGAS_FOTO_ENVIADA = 4; // igual que el servidor (incrustarAdjuntos)
  const MEGAS_PDF = 8;
  const megas = (bytes) => bytes * 1024 * 1024;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Todos son públicos: Subsidio y Crédito se identifican con Nº de expediente, correo y DNI de la solicitud de inicio
    const esInicio = form.querySelector('input[name="tipoFormulario"]')?.value === 'Formulario de Inicio';
    const esAyuda = esFormularioSubsidio || esFormularioCredito;
    const token = sessionStorage.getItem('token_ministerio');
    const verificacion = esAyuda ? window.verificacionExpediente?.obtener() : null;
    if (esAyuda && !verificacion) {
      resultado.textContent = 'Primero verifique el Nº de expediente, el correo y el DNI de su solicitud de inicio.';
      return;
    }
    if ((esInicio || esFormularioSubsidio) && localidad && localidadPersona.cargando()) {
      resultado.textContent = 'Seleccione el departamento y espere a que se carguen sus localidades.';
      return;
    }
    if (esInicio && localidadEmprendimiento?.cargando()) {
      resultado.textContent = 'Seleccione el departamento del emprendimiento y espere a que se carguen sus localidades.';
      return;
    }

    // Crédito: si el Área pidió reenviar una sola parte, solo se completa y se envía esa (la otra se conserva)
    const parte = esFormularioCredito ? window.verificacionExpediente?.parte?.() || 'Completo' : 'Completo';
    const conTitular = parte !== 'Garante';
    const conGarante = esFormularioCredito && parte !== 'Titular';

    // El DNI que acompaña a la firma se escribe a mano, pero tiene que ser el del titular de la solicitud
    // (en el Formulario de Inicio, el mismo DNI que se cargó arriba)
    const dniFirma = form.querySelector('[name="dniProyecto"]');
    const dniTitular = form.querySelector('[name="dniCuit"]')?.value.trim().toUpperCase();
    if ((esInicio || (esAyuda && conTitular)) && dniFirma && dniFirma.value.replace(/[.\s]/g, '').toUpperCase() !== dniTitular) {
      resultado.textContent = esInicio
        ? 'El D.N.I. Nº junto a la firma debe ser el mismo DNI (o documento) ingresado arriba.'
        : 'El D.N.I. Nº junto a la firma debe ser el mismo del titular de la solicitud de inicio.';
      dniFirma.focus();
      return;
    }

    // El Formulario de Inicio lleva la misma firma que subsidio y crédito
    const firmas = window.firmasDigitales || {};
    const conFirma = esInicio || (esAyuda && conTitular);
    const firma = conFirma ? firmas.titular?.obtener() : null;
    if (conFirma && !firma) {
      resultado.textContent = esInicio
        ? 'Firme en el recuadro o marque "No tengo firma" y escriba su nombre completo.'
        : 'Firme en el recuadro del titular o marque "No tengo firma" y escriba su nombre completo.';
      firmas.titular?.enfocar();
      return;
    }
    const firmaGarante = conGarante ? firmas.garante?.obtener() : null;
    if (conGarante && !firmaGarante) {
      resultado.textContent = 'Falta la firma del garante: que firme en su recuadro, o marque "No tiene firma" y escriba su nombre completo.';
      firmas.garante?.enfocar();
      return;
    }

    resultado.textContent = 'Generando y enviando documento...';
    const boton = form.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    const datos = Object.fromEntries(new FormData(form).entries());
    const selectorImagenes = form.querySelector('input[name="imagenes"]');
    // Presupuestos (o imágenes del emprendimiento en el Formulario de Inicio) y, en el crédito, un archivo por documento del garante
    let presupuestos = conTitular ? [...(selectorImagenes?.files || [])] : [];
    const controlesGarante = conGarante ? [...form.querySelectorAll('[data-documento-garante]')] : [];
    const documentosGarante = controlesGarante.map((control) => ({ archivo: control.files?.[0], categoria: control.dataset.documentoGarante }));
    let archivos = [...presupuestos, ...documentosGarante.map(({ archivo }) => archivo)].filter(Boolean);

    if (conTitular && presupuestos.length === 0) {
      resultado.textContent = esAyuda
        ? 'Adjunte al menos un presupuesto (fotografía o PDF) de los bienes solicitados.'
        : 'Debe adjuntar al menos una foto o un PDF para enviar y descargar el formulario.';
      if (boton) boton.disabled = false;
      selectorImagenes?.focus();
      return;
    }
    const faltaGarante = controlesGarante.find((control) => !control.files?.length);
    if (faltaGarante) {
      resultado.textContent = `Falta adjuntar un documento del garante: ${faltaGarante.dataset.documentoGarante}.`;
      if (boton) boton.disabled = false;
      faltaGarante.focus();
      return;
    }

    if (presupuestos.length > limitesAdjuntos.presupuestos || archivos.length > limitesAdjuntos.archivos) {
      resultado.textContent = esFormularioCredito
        ? `Puede adjuntar hasta ${limitesAdjuntos.presupuestos} archivos de presupuestos (más los 5 documentos del garante).`
        : `Puede seleccionar hasta ${limitesAdjuntos.archivos} archivos adjuntos.`;
      if (boton) boton.disabled = false;
      return;
    }
    const fueraDeLimite = (archivo, megasFoto) => {
      const esPdf = archivo.type === 'application/pdf';
      const esImagen = ['image/jpeg', 'image/png'].includes(archivo.type);
      return (!esPdf && !esImagen) || archivo.size > megas(esPdf ? MEGAS_PDF : megasFoto);
    };
    if (archivos.some((archivo) => fueraDeLimite(archivo, MEGAS_FOTO_ORIGINAL))) {
      resultado.textContent = `Adjunte fotos JPG o PNG (de hasta ${MEGAS_FOTO_ORIGINAL} MB) o PDF de hasta ${MEGAS_PDF} MB cada uno.`;
      if (boton) boton.disabled = false;
      return;
    }

    // Se achican las fotos antes de medir el total: es lo que realmente se envía
    const cantidadFotos = archivos.filter((archivo) => archivo.type !== 'application/pdf').length;
    let fotosListas = 0;
    const prepararFoto = async (archivo) => {
      if (archivo.type === 'application/pdf') return archivo;
      resultado.textContent = `Preparando las fotos (${++fotosListas} de ${cantidadFotos})...`;
      return fotoAchicada(archivo); // la mayoría ya está lista desde que se eligió
    };
    const presupuestosListos = [];
    for (const archivo of presupuestos) presupuestosListos.push(await prepararFoto(archivo));
    presupuestos = presupuestosListos;
    for (const documento of documentosGarante) documento.archivo = await prepararFoto(documento.archivo);
    archivos = [...presupuestos, ...documentosGarante.map(({ archivo }) => archivo)];

    if (archivos.some((archivo) => fueraDeLimite(archivo, MEGAS_FOTO_ENVIADA))) {
      resultado.textContent = `Una de las fotos no se pudo achicar a menos de ${MEGAS_FOTO_ENVIADA} MB. Pruebe sacarla de nuevo con menor resolución o adjúntela en PDF.`;
      if (boton) boton.disabled = false;
      return;
    }
    const tamanioTotal = archivos.reduce((total, archivo) => total + archivo.size, 0);
    if (tamanioTotal > megas(limitesAdjuntos.megas)) {
      resultado.textContent = `El total de los archivos adjuntos no puede superar ${limitesAdjuntos.megas} MB.`;
      if (boton) boton.disabled = false;
      return;
    }

    const leerArchivo = (archivo, categoria = '') => new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve({ nombre: archivo.name, tipo: archivo.type, categoria, data: lector.result });
      lector.onerror = () => reject(new Error(`No se pudo leer el archivo ${archivo.name}.`));
      lector.readAsDataURL(archivo);
    });

    try {
      if (conGarante) {
        const correo = String(datos.correoGarante || '').trim().toLowerCase();
        const confirmacion = String(datos.correoGaranteConfirmacion || '').trim().toLowerCase();
        if (correo !== confirmacion) {
          resultado.textContent = 'El correo del garante y su confirmación no coinciden.';
          if (boton) boton.disabled = false;
          form.querySelector('[name="correoGaranteConfirmacion"]')?.focus();
          return;
        }
        if (String(datos.dniGarante || '').trim() === dniTitular) {
          resultado.textContent = 'El garante no puede ser el mismo titular del proyecto: ingrese los datos de otra persona.';
          if (boton) boton.disabled = false;
          form.querySelector('[name="dniGarante"]')?.focus();
          return;
        }
        // El correo del titular sale de su solicitud de inicio (campo de solo lectura)
        if (correo === String(form.querySelector('[name="correo"]')?.value || '').trim().toLowerCase()) {
          resultado.textContent = 'El correo del garante debe ser distinto del correo del titular.';
          if (boton) boton.disabled = false;
          form.querySelector('[name="correoGarante"]')?.focus();
          return;
        }
        if (String(datos.dniFirmaGarante || '').trim() !== String(datos.dniGarante || '').trim()) {
          resultado.textContent = 'El D.N.I. Nº junto a la firma del garante debe ser el mismo DNI del garante.';
          if (boton) boton.disabled = false;
          form.querySelector('[name="dniFirmaGarante"]')?.focus();
          return;
        }
        datos.correoGarante = correo;
        datos.correoGaranteConfirmacion = confirmacion;
        datos.firmaGarante = firmaGarante;
      }
      if (esAyuda) datos.verificacion = verificacion;
      if (esAyuda && conTitular) {
        datos.bienesPropios = filasDeTabla('bienesPropios').filter((fila) => Object.values(fila).some(Boolean));
        datos.activoFijo = filasDeTabla('activoFijo').filter((fila) => fila.bien || fila.cantidad || fila.precioUnitario);
        datos.bienesUso = filasDeTabla('bienesUso').filter((fila) => fila.bien || fila.cantidad || fila.precioUnitario);
        if (!sumarMontos('activoFijo', 'subtotal') && !sumarMontos('bienesUso', 'subtotal')) {
          resultado.textContent = 'Ingrese al menos un bien solicitado (activo fijo o bienes de uso) con cantidad y precio unitario.';
          if (boton) boton.disabled = false;
          return;
        }
        datos.firma = firma;
      }
      datos.fechaLugar = datos.dia
        ? `${datos.dia} de ${datos.mes} de ${datos.anio}`
        : `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}`;
      datos.documentoExtranjero = Boolean(extranjero?.checked);
      if (esInicio) {
        datos.firma = firma;
        datos.localidad = localidadPersona.valor(datos.localidad);
        if (localidadEmprendimiento) datos.localidadEmprendimiento = localidadEmprendimiento.valor(datos.localidadEmprendimiento);
        delete datos.localidadLibre;
        delete datos.localidadEmprendimientoLibre;
      }
      datos.calleSinNumero = Boolean(calleSinNumero?.checked);
      if (datos.calleSinNumero) datos.numeroEmprendimiento = 'S/N';
      datos.imagenes = await Promise.all(presupuestos.map((archivo) => leerArchivo(archivo)));
      if (conGarante) {
        datos.documentosGarante = await Promise.all(documentosGarante.map(({ archivo, categoria }) => leerArchivo(archivo, categoria)));
      }
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf'
      };
      // En Subsidio y Crédito la sesión es opcional: si la carga un empleado por el emprendedor, queda en la auditoría
      if (esAyuda && token) headers.Authorization = `Bearer ${token}`;
      const ruta = esInicio ? 'inicio' : esFormularioCredito ? 'credito' : 'subsidio';
      const respuesta = await enviarConAvance(`${apiBaseUrl}/api/formularios-digitales/${ruta}`, headers, JSON.stringify(datos),
        (texto) => { resultado.textContent = texto; });

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        resultado.textContent = data.error || (respuesta.status === 413
          ? 'Los archivos adjuntos son demasiado grandes para enviarlos.'
          : 'No se pudo guardar el formulario');
        return;
      }

      if (!respuesta.headers.get('content-type')?.includes('application/pdf')) {
        throw new Error('El servidor respondió, pero la respuesta no contiene un archivo PDF válido.');
      }
      const archivoPdf = await respuesta.blob();
      const urlPdf = URL.createObjectURL(archivoPdf);
      const urlGarante = respuesta.headers.get('X-Formulario-Garante-Url');

      resultado.textContent = 'Formulario registrado correctamente. ';
      form.reset();
      window.verificacionExpediente?.restaurar();
      Object.values(firmas).forEach((firmaDigital) => firmaDigital.reiniciar());
      completarFecha();
      actualizarFormatoDocumento();
      actualizarNumeroCalle();
      actualizarNumeroDomicilio();
      actualizarCalculosCredito();
      if (localidad) localidadPersona.reiniciar();
      localidadEmprendimiento?.reiniciar();
      const enlace = document.createElement('a');
      enlace.className = 'btn descargar';
      enlace.href = urlPdf;
      // Nombre que entienda el emprendedor: tipo de solicitud y fecha del envío (ej: Solicitud_Subsidio_Microemprendimiento_05_11_2026.pdf)
      const hoy = new Date();
      const fechaArchivo = [hoy.getDate(), hoy.getMonth() + 1].map((n) => String(n).padStart(2, '0')).concat(hoy.getFullYear()).join('_');
      const tipoArchivo = esFormularioSubsidio ? 'Subsidio_' : esFormularioCredito ? 'Credito_' : '';
      enlace.download = `Solicitud_${tipoArchivo}Microemprendimiento_${fechaArchivo}.pdf`;
      enlace.textContent = 'Descargar documento nuevamente';
      resultado.append(enlace);
      // Crédito: también queda a mano el documento del garante (hoja 7 y sus documentos), que va al final del completo
      if (urlGarante) {
        const enlaceGarante = document.createElement('a');
        enlaceGarante.className = 'btn descargar';
        enlaceGarante.href = urlGarante;
        enlaceGarante.download = `Documentacion_Garante_${fechaArchivo}.pdf`;
        enlaceGarante.textContent = 'Descargar documento del garante';
        resultado.append(' ', enlaceGarante);
      }
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(urlPdf), 60000);
    } catch (error) {
      resultado.textContent = error.message || 'No se pudo conectar con el servidor para generar el PDF.';
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}
