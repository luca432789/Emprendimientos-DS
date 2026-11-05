// Formulario de Subsidio: el emprendedor (o el Área por él) se identifica con el Nº de expediente, el correo y el DNI
// de su solicitud de inicio. Si coinciden, se muestran las hojas con los datos de la solicitud ya cargados
// (campos de solo lectura) y formulario-digital.js envía el pedido junto con esos tres datos.
(() => {
  const form = document.querySelector('#formulario-digital');
  const seccion = form?.querySelector('[data-verificacion]');
  if (!seccion) return;

  const contenido = form.querySelector('[data-contenido-subsidio]');
  const mensaje = seccion.querySelector('[data-verificacion-mensaje]');
  const botonVerificar = seccion.querySelector('[data-verificar]');
  const botonCambiar = seccion.querySelector('[data-cambiar-expediente]');
  const campos = Object.fromEntries([...seccion.querySelectorAll('[data-verificacion-campo]')]
    .map((input) => [input.dataset.verificacionCampo, input]));

  // Datos verificados: { verificacion: {expediente, correo, dni}, solicitud: {...} } o null
  let verificado = null;

  // El link del correo puede traer el expediente: /formulario-Subsidio?expediente=EX-2026-...
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

  const avisoReemplazo = 'Ya hay un formulario de subsidio enviado para este expediente que todavía no fue resuelto: si envía uno nuevo, reemplazará al anterior.';

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
      const respuesta = await fetch('/api/formularios-digitales/subsidio/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificacion)
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        mensaje.textContent = datos.error || 'No se pudieron verificar los datos.';
        return;
      }

      const { reemplazaEnvioAnterior, ...solicitud } = datos;
      verificado = { verificacion, solicitud };
      completarCampos();
      bloquearVerificacion(true);
      mensaje.textContent = `Datos verificados. Complete el formulario a nombre de ${solicitud.nombreApellido}.`
        + (reemplazaEnvioAnterior ? ` ${avisoReemplazo}` : '');
      form.querySelector('[name="beneficiarios"]')?.focus();
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
    window.firmaDigital?.reiniciar();
    form.querySelector('#resultado-formulario')?.replaceChildren();
    bloquearVerificacion(false);
    mensaje.textContent = '';
    campos.expediente.focus();
  });

  window.verificacionSubsidio = {
    // Los tres datos que el servidor vuelve a comprobar al recibir el formulario
    obtener: () => verificado && { ...verificado.verificacion },
    // Después de enviar, form.reset() borra los campos: se vuelven a cargar los de la solicitud
    restaurar: () => {
      if (!verificado) return;
      completarCampos();
      mensaje.textContent = `Formulario enviado. ${avisoReemplazo}`;
    }
  };
})();
