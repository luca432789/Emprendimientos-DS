// Formularios de Subsidio y de Crédito: el emprendedor (o el Área por él) se identifica con el Nº de expediente, el correo
// y el DNI de su solicitud de inicio. Si coinciden, se muestran las hojas con los datos de la solicitud ya cargados
// (campos de solo lectura) y formulario-digital.js envía el pedido junto con esos tres datos.
// La sección lleva data-verificacion="subsidio" o "credito": es la ruta de la API y el nombre en los mensajes.
(() => {
  const form = document.querySelector('#formulario-digital');
  const seccion = form?.querySelector('[data-verificacion]');
  if (!seccion) return;

  const ayuda = seccion.dataset.verificacion === 'credito' ? 'credito' : 'subsidio';
  const nombreAyuda = ayuda === 'credito' ? 'crédito' : 'subsidio';
  const contenido = form.querySelector('[data-contenido-ayuda]');
  const mensaje = seccion.querySelector('[data-verificacion-mensaje]');
  const botonVerificar = seccion.querySelector('[data-verificar]');
  const botonCambiar = seccion.querySelector('[data-cambiar-expediente]');
  const campos = Object.fromEntries([...seccion.querySelectorAll('[data-verificacion-campo]')]
    .map((input) => [input.dataset.verificacionCampo, input]));

  // Datos verificados: { verificacion: {expediente, correo, dni}, solicitud: {...} } o null
  let verificado = null;

  // El link del correo puede traer el expediente: /formulario-Subsidio?expediente=EX-2026-... (o /formulario-Credito)
  const expedienteDelLink = new URLSearchParams(window.location.search).get('expediente');
  if (expedienteDelLink) campos.expediente.value = expedienteDelLink.slice(0, 50);

  // Los DNI se escriben sin puntos ni espacios
  [campos.dni, form.querySelector('[name="dniProyecto"]')].forEach((input) => {
    input?.addEventListener('input', () => { input.value = input.value.replace(/[.\s]/g, ''); });
  });

  // Carga los datos de la solicitud en los campos con el mismo name (y avisa a los textos que los repiten)
  const completarCampos = () => {
    Object.entries(verificado.solicitud).forEach(([nombre, valor]) => {
      const campo = form.querySelector(`[name="${nombre}"]`);
      if (!campo) return;
      campo.value = valor ?? '';
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    Object.entries(verificado.verificacion).forEach(([nombre, valor]) => { campos[nombre].value = valor; });
  };

  const bloquearVerificacion = (bloquear) => {
    Object.values(campos).forEach((input) => { input.readOnly = bloquear; });
    botonVerificar.hidden = bloquear;
    botonCambiar.hidden = !bloquear;
    contenido.hidden = !bloquear;
  };

  // Crédito: en un reenvío parcial solo se muestran (y se envían) las hojas de la parte pedida ([data-parte]).
  // Los campos de las hojas ocultas se deshabilitan: así no se validan ni se mandan.
  const hojasPorParte = [...form.querySelectorAll('[data-parte]')];
  const avisoParte = form.querySelector('[data-aviso-parte]');
  const textosParte = {
    Titular: 'El Área le pidió reenviar solo la parte del titular: las hojas 1 a 6 y los presupuestos. La hoja y la documentación '
      + 'de su garante se conservan tal como las envió: no hace falta que el garante vuelva a firmar.',
    Garante: 'El Área le pidió reenviar solo la parte del garante: la hoja 7 con sus datos, su firma y su documentación. '
      + 'Las hojas 1 a 6 y los presupuestos se conservan tal como los envió. Los datos del garante ya están cargados: '
      + 'corríjalos si cambiaron. Su garante tiene que volver a firmar y adjuntar su documentación.'
  };
  let parte = 'Completo';
  const mostrarParte = (nueva) => {
    parte = textosParte[nueva] ? nueva : 'Completo';
    hojasPorParte.forEach((hoja) => {
      const visible = parte === 'Completo' || hoja.dataset.parte === parte.toLowerCase();
      hoja.hidden = !visible;
      hoja.querySelectorAll('input, select, textarea, button').forEach((campo) => { campo.disabled = !visible; });
    });
    if (avisoParte) {
      avisoParte.hidden = parte === 'Completo';
      avisoParte.textContent = textosParte[parte] || '';
    }
  };

  // Ya hay un formulario enviado: solo se llega acá si el Área pidió el reenvío
  const avisoReemplazo = (pedido) => `El Área le solicitó reenviar el formulario de ${nombreAyuda}; el nuevo envío reemplazará al anterior.`
    + (pedido ? ` Lo que le solicitaron: "${pedido}"` : '');

  const verificar = async () => {
    const verificacion = {
      expediente: campos.expediente.value.trim(),
      correo: campos.correo.value.trim().toLowerCase(),
      dni: campos.dni.value.trim()
    };
    if (!verificacion.expediente || !verificacion.correo || !verificacion.dni) {
      mensaje.textContent = 'Complete el Nº de expediente, el correo electrónico y el DNI.';
      return;
    }

    botonVerificar.disabled = true;
    mensaje.textContent = 'Verificando datos...';
    try {
      const respuesta = await fetch(`/api/formularios-digitales/${ayuda}/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificacion)
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        mensaje.textContent = datos.error || 'No se pudieron verificar los datos.';
        return;
      }

      const { reemplazaEnvioAnterior, pedidoReenvio, parteReenvio, ...solicitud } = datos;
      verificado = { verificacion, solicitud };
      mostrarParte(parteReenvio);
      completarCampos();
      bloquearVerificacion(true);
      mensaje.textContent = `Datos verificados. Complete el formulario a nombre de ${solicitud.nombreApellido}.`
        + (reemplazaEnvioAnterior ? ` ${avisoReemplazo(pedidoReenvio)}` : '');
      // Primer campo para completar (Beneficiarios en el subsidio, Domicilio en el crédito, Nombre en la parte del garante)
      form.querySelector('[data-contenido-ayuda] .linea:not([readonly]):not(:disabled)')?.focus();
    } catch {
      mensaje.textContent = 'No se pudo conectar con el servidor. Intente nuevamente.';
    } finally {
      botonVerificar.disabled = false;
    }
  };

  botonVerificar.addEventListener('click', verificar);
  Object.values(campos).forEach((input) => {
    input.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' && !input.readOnly) {
        evento.preventDefault();
        verificar();
      }
    });
  });

  botonCambiar.addEventListener('click', () => {
    verificado = null;
    form.reset();
    // Los totales de los cuadros no son campos: se recalculan para que vuelvan a 0,00
    form.querySelector('[data-campo-fila]')?.dispatchEvent(new Event('input', { bubbles: true }));
    Object.values(window.firmasDigitales || {}).forEach((firma) => firma.reiniciar());
    form.querySelector('#resultado-formulario')?.replaceChildren();
    bloquearVerificacion(false);
    mostrarParte('Completo');
    mensaje.textContent = '';
    campos.expediente.focus();
  });

  window.verificacionExpediente = {
    // Los tres datos que el servidor vuelve a comprobar al recibir el formulario
    obtener: () => verificado && { ...verificado.verificacion },
    // Crédito: 'Completo', 'Titular' o 'Garante' (la parte que se completa y se envía)
    parte: () => parte,
    // Después de enviar, form.reset() borra los campos: se vuelven a cargar los de la solicitud
    restaurar: () => {
      if (!verificado) return;
      completarCampos();
      mensaje.textContent = 'Formulario enviado. El Área lo revisará; si necesita que corrija algo, se lo solicitará por correo.';
    }
  };
})();
