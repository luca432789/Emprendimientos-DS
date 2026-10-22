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

if (form) {
  const esFormularioCredito = form.querySelector('input[name="tipoFormulario"]')?.value === 'Formulario de Creditos Reintegrables';
  const esFormularioSubsidio = form.querySelector('input[name="tipoFormulario"]')?.value === 'Formulario de Subsidios no Reintegrables';
  const definicionesTablas = {
    bienesPropios: { cantidad: 10, columnas: ['bien', 'cantidad', 'antiguedad', 'montoEstimado'] },
    activoFijo: { cantidad: 7, columnas: ['bien', 'cantidad', 'precioUnitario', 'subtotal'] },
    bienesUso: { cantidad: 9, columnas: ['bien', 'cantidad', 'precioUnitario', 'subtotal'] },
    recursosNecesarios: { cantidad: 9, columnas: ['bien', 'cantidad', 'precioUnitario', 'subtotal'] }
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
  const actualizarCalculosCredito = () => {
    if (esFormularioSubsidio) {
      const cuerpo = cuerposTabla.find((elemento) => elemento.dataset.tablaLineas === 'recursosNecesarios');
      cuerpo?.querySelectorAll('tr').forEach((fila) => {
        const cantidad = numero(fila.querySelector('[data-campo-fila="cantidad"]')?.value);
        const precio = numero(fila.querySelector('[data-campo-fila="precioUnitario"]')?.value);
        const subtotal = fila.querySelector('[data-campo-fila="subtotal"]');
        if (subtotal) subtotal.value = cantidad && precio ? (cantidad * precio).toFixed(2) : '';
      });
      const total = sumarMontos('recursosNecesarios', 'subtotal');
      const oculto = form.querySelector('[name="montoSolicitado"]');
      if (oculto) oculto.value = total.toFixed(2);
      const formato = (valor) => valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalVisible = form.querySelector('#total-recursos');
      const totalSolicitadoVisible = form.querySelector('#total-solicitado');
      if (totalVisible) totalVisible.textContent = formato(total);
      if (totalSolicitadoVisible) totalSolicitadoVisible.textContent = `$ ${formato(total)}`;
      const propio = numero(form.querySelector('[name="aporteActivoFijo"]')?.value)
        + numero(form.querySelector('[name="aporteBienesUso"]')?.value)
        + numero(form.querySelector('[name="aporteManoObra"]')?.value);
      const solicitado = numero(form.querySelector('[name="solicitadoActivoFijo"]')?.value)
        + numero(form.querySelector('[name="solicitadoBienesUso"]')?.value);
      const outputPropio = form.querySelector('#costo-total-propio');
      const outputSolicitado = form.querySelector('#costo-total-solicitado');
      if (outputPropio) outputPropio.textContent = formato(propio);
      if (outputSolicitado) outputSolicitado.textContent = formato(solicitado);
      return;
    }
    if (!esFormularioCredito) return;
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
    mostrar('#total-solicitado', totalSolicitado);
    mostrar('#costo-total-propio', aporteTotal);
    mostrar('#costo-total-solicitado', totalSolicitado);
  };
  form.addEventListener('input', (evento) => {
    if (evento.target.matches('[data-campo-fila], [name="aporteActivoFijo"], [name="aporteBienesUso"], [name="aporteManoObra"], [name="solicitadoActivoFijo"], [name="solicitadoBienesUso"]')) {
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
  form.querySelectorAll('input[name="dniGarante"], input[name="cuilGarante"], input[name="telefonoGarante"]').forEach((input) => {
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Inicio es público; Subsidios y Créditos se registran a nombre del emprendedor logueado
    const esInicio = form.querySelector('input[name="tipoFormulario"]')?.value === 'Formulario de Inicio';
    const esSubsidio = esFormularioSubsidio;
    const token = sessionStorage.getItem('token_ministerio');
    if (!esInicio && !token) {
      resultado.innerHTML = 'Debe <a href="/login">iniciar sesión</a> como emprendedor para enviar este formulario.';
      return;
    }
    if ((esInicio || esSubsidio) && localidad && localidadPersona.cargando()) {
      resultado.textContent = 'Seleccione el departamento y espere a que se carguen sus localidades.';
      return;
    }
    if (esInicio && localidadEmprendimiento?.cargando()) {
      resultado.textContent = 'Seleccione el departamento del emprendimiento y espere a que se carguen sus localidades.';
      return;
    }

    resultado.textContent = 'Generando el PDF...';
    const boton = form.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    const datos = Object.fromEntries(new FormData(form).entries());
    const selectorImagenes = form.querySelector('input[name="imagenes"]');
    const controlesArchivos = esFormularioCredito
      ? [...form.querySelectorAll('[data-documento-garante]')]
      : [selectorImagenes].filter(Boolean);
    const archivos = controlesArchivos.flatMap((control) =>
      [...(control.files || [])].map((archivo) => ({ archivo, categoria: control.dataset.documentoGarante || '' }))
    );

    if ((esInicio || esSubsidio) && archivos.length === 0) {
      resultado.textContent = 'Debe adjuntar al menos una foto o un PDF para enviar y descargar el formulario.';
      if (boton) boton.disabled = false;
      selectorImagenes?.focus();
      return;
    }
    if (esFormularioCredito && controlesArchivos.some((control) => !control.files?.length)) {
      resultado.textContent = 'Adjunte los cinco documentos solicitados del garante.';
      if (boton) boton.disabled = false;
      controlesArchivos.find((control) => !control.files?.length)?.focus();
      return;
    }

    if (archivos.length > 8) {
      resultado.textContent = 'Puede seleccionar hasta 8 archivos adjuntos.';
      if (boton) boton.disabled = false;
      return;
    }
    const tamanioTotal = archivos.reduce((total, item) => total + item.archivo.size, 0);
    if (tamanioTotal > 16 * 1024 * 1024) {
      resultado.textContent = 'El total de los archivos adjuntos no puede superar 16 MB.';
      if (boton) boton.disabled = false;
      return;
    }
    if (archivos.some(({ archivo }) => {
      const esPdf = archivo.type === 'application/pdf';
      const esImagen = ['image/jpeg', 'image/png'].includes(archivo.type);
      return (!esPdf && !esImagen) || archivo.size > (esPdf ? 8 : 2) * 1024 * 1024;
    })) {
      resultado.textContent = 'Adjunte imágenes JPG o PNG de hasta 2 MB, o PDF de hasta 8 MB cada uno.';
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
      if (esFormularioCredito) {
        const correo = String(datos.correoGarante || '').trim().toLowerCase();
        const confirmacion = String(datos.correoGaranteConfirmacion || '').trim().toLowerCase();
        if (correo !== confirmacion) {
          resultado.textContent = 'El correo del garante y su confirmación no coinciden.';
          if (boton) boton.disabled = false;
          form.querySelector('[name="correoGaranteConfirmacion"]')?.focus();
          return;
        }
        datos.correoGarante = correo;
        datos.correoGaranteConfirmacion = confirmacion;
        datos.bienesPropios = filasDeTabla('bienesPropios').filter((fila) => Object.values(fila).some(Boolean));
        datos.activoFijo = filasDeTabla('activoFijo').filter((fila) => fila.bien || fila.cantidad || fila.precioUnitario);
        datos.bienesUso = filasDeTabla('bienesUso').filter((fila) => fila.bien || fila.cantidad || fila.precioUnitario);
        datos.montoSolicitado = sumarMontos('activoFijo', 'subtotal') + sumarMontos('bienesUso', 'subtotal');
        if (!datos.montoSolicitado) {
          resultado.textContent = 'Ingrese al menos un bien solicitado con cantidad y precio unitario.';
          if (boton) boton.disabled = false;
          return;
        }
      }
      if (esSubsidio) {
        datos.localidad = localidadPersona.valor(datos.localidad);
        datos.bienesPropios = filasDeTabla('bienesPropios').filter((fila) => Object.values(fila).some(Boolean));
        datos.recursosNecesarios = filasDeTabla('recursosNecesarios').filter((fila) => fila.bien || fila.cantidad || fila.precioUnitario);
        datos.aporteActivoFijo = form.querySelector('[name="aporteActivoFijo"]')?.value || '';
        datos.solicitadoActivoFijo = form.querySelector('[name="solicitadoActivoFijo"]')?.value || '';
        datos.aporteBienesUso = form.querySelector('[name="aporteBienesUso"]')?.value || '';
        datos.solicitadoBienesUso = form.querySelector('[name="solicitadoBienesUso"]')?.value || '';
        datos.aporteManoObra = form.querySelector('[name="aporteManoObra"]')?.value || '';
        datos.totalProyectoPropio = numero(datos.aporteActivoFijo) + numero(datos.aporteBienesUso) + numero(datos.aporteManoObra);
        datos.totalProyectoSolicitado = numero(datos.solicitadoActivoFijo) + numero(datos.solicitadoBienesUso);
        datos.domicilio = `${datos.calleDomicilio || ''} ${calleSinNumero?.checked ? 'S/N' : (datos.numeroDomicilio || '')}`.trim();
      }
      datos.fechaLugar = datos.dia
        ? `${datos.dia} de ${datos.mes} de ${datos.anio}`
        : `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}`;
      datos.documentoExtranjero = Boolean(extranjero?.checked);
      if (esInicio) {
        datos.localidad = localidadPersona.valor(datos.localidad);
        if (localidadEmprendimiento) datos.localidadEmprendimiento = localidadEmprendimiento.valor(datos.localidadEmprendimiento);
        delete datos.localidadLibre;
        delete datos.localidadEmprendimientoLibre;
      }
      datos.calleSinNumero = Boolean(calleSinNumero?.checked);
      if (datos.calleSinNumero) datos.numeroEmprendimiento = 'S/N';
      if (esSubsidio) {
        const fechaEnvio = new Date();
        datos.fechaLugar = `SANTIAGO DEL ESTERO, ${String(fechaEnvio.getDate()).padStart(2, '0')} de ${meses[fechaEnvio.getMonth()]} de ${fechaEnvio.getFullYear()}`;
        datos.domicilio = `${datos.calleDomicilio || ''} ${calleSinNumero?.checked ? 'S/N' : (datos.numeroDomicilio || '')}`.trim();
      }
      datos.imagenes = await Promise.all(archivos.map(({ archivo, categoria }) => leerArchivo(archivo, categoria)));
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf'
      };
      if (!esInicio) headers.Authorization = `Bearer ${token}`;
      const respuesta = await fetch(`${apiBaseUrl}/api/formularios-digitales/${esInicio ? 'inicio' : 'ayuda'}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datos)
      });

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        resultado.textContent = data.error || 'No se pudo guardar el formulario';
        if (respuesta.status === 401 || respuesta.status === 403) {
          resultado.insertAdjacentHTML('beforeend', ' <a href="/login">Iniciar sesión</a>');
        }
        return;
      }

      if (!respuesta.headers.get('content-type')?.includes('application/pdf')) {
        throw new Error('El servidor respondió, pero la respuesta no contiene un archivo PDF válido.');
      }
      const archivoPdf = await respuesta.blob();
      const urlPdf = URL.createObjectURL(archivoPdf);

      resultado.textContent = 'Formulario registrado correctamente. ';
      form.reset();
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
      const correoDescarga = esFormularioCredito ? datos.correoGarante : datos.correo;
      const correoArchivo = String(correoDescarga || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
      enlace.download = `Solicitud_Microemprendimiento_${correoArchivo}.pdf`;
      enlace.textContent = 'Descargar PDF nuevamente';
      resultado.append(enlace);
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(urlPdf), 60000);
    } catch (error) {
      resultado.textContent = error.message || 'No se pudo conectar con el servidor para generar el PDF.';
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}
