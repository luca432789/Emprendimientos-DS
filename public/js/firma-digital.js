// Firma dibujada con el mouse o el dedo dentro de cada [data-firma] (el crédito tiene dos: data-firma="titular" y "garante").
// Si la persona no tiene firma, marca "No tengo firma" y escribe su nombre completo.
// window.firmasDigitales[nombre].obtener() devuelve { tipo: 'dibujo', imagen } o { tipo: 'texto', texto }, o null si falta.
// window.firmaDigital es la del titular (la primera).
window.firmasDigitales = {};
document.querySelectorAll('[data-firma]').forEach((contenedor) => {

  const lienzo = contenedor.querySelector('canvas');
  const contexto = lienzo.getContext('2d');
  const zonaDibujo = contenedor.querySelector('.firma-zona-dibujo');
  const zonaNombre = contenedor.querySelector('.firma-zona-nombre');
  const sinFirma = contenedor.querySelector('[data-firma-sin-firma]');
  const campoNombre = contenedor.querySelector('[data-firma-nombre]');

  // Cada trazo es una lista de puntos guardados en proporción (0 a 1) del recuadro,
  // así la firma se puede redibujar si cambia el tamaño de la pantalla y exportar a cualquier tamaño
  let trazos = [];
  let trazoActual = null;

  const dibujar = (ctx, ancho, alto, grosor) => {
    ctx.clearRect(0, 0, ancho, alto);
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
    trazos.forEach((trazo) => {
      ctx.beginPath();
      trazo.forEach(({ x, y }, indice) => {
        if (indice === 0) ctx.moveTo(x * ancho, y * alto);
        else ctx.lineTo(x * ancho, y * alto);
      });
      if (trazo.length === 1) ctx.lineTo(trazo[0].x * ancho + 0.1, trazo[0].y * alto);
      ctx.stroke();
    });
  };

  const escala = () => window.devicePixelRatio || 1;
  const redibujar = () => dibujar(contexto, lienzo.width, lienzo.height, 2.2 * escala());
  const ajustarTamanio = () => {
    if (!lienzo.clientWidth) return;
    lienzo.width = lienzo.clientWidth * escala();
    lienzo.height = lienzo.clientHeight * escala();
    redibujar();
  };

  const punto = (evento) => {
    const caja = lienzo.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (evento.clientX - caja.left) / caja.width)),
      y: Math.min(1, Math.max(0, (evento.clientY - caja.top) / caja.height))
    };
  };

  lienzo.addEventListener('pointerdown', (evento) => {
    evento.preventDefault();
    lienzo.setPointerCapture(evento.pointerId);
    trazoActual = [punto(evento)];
    trazos.push(trazoActual);
    redibujar();
  });
  lienzo.addEventListener('pointermove', (evento) => {
    if (!trazoActual) return;
    trazoActual.push(punto(evento));
    redibujar();
  });
  const terminarTrazo = () => { trazoActual = null; };
  lienzo.addEventListener('pointerup', terminarTrazo);
  lienzo.addEventListener('pointercancel', terminarTrazo);
  window.addEventListener('resize', ajustarTamanio);

  const borrar = () => {
    trazos = [];
    redibujar();
  };
  contenedor.querySelector('[data-firma-borrar]')?.addEventListener('click', borrar);

  const actualizarModo = () => {
    zonaDibujo.hidden = sinFirma.checked;
    zonaNombre.hidden = !sinFirma.checked;
    campoNombre.required = sinFirma.checked;
    if (sinFirma.checked) campoNombre.focus();
    else ajustarTamanio();
  };
  sinFirma.addEventListener('change', actualizarModo);

  // La imagen se exporta siempre a 900 x 300 px con fondo transparente, sin importar la pantalla
  const exportarImagen = () => {
    const salida = document.createElement('canvas');
    salida.width = 900;
    salida.height = 300;
    dibujar(salida.getContext('2d'), salida.width, salida.height, 5);
    return salida.toDataURL('image/png');
  };

  window.firmasDigitales[contenedor.dataset.firma || 'titular'] = {
    obtener() {
      if (sinFirma.checked) {
        const texto = campoNombre.value.trim();
        return texto ? { tipo: 'texto', texto } : null;
      }
      // Un par de toques sueltos no cuentan como firma
      const puntos = trazos.reduce((total, trazo) => total + trazo.length, 0);
      return puntos >= 10 ? { tipo: 'dibujo', imagen: exportarImagen() } : null;
    },
    enfocar() {
      (sinFirma.checked ? campoNombre : lienzo).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (sinFirma.checked) campoNombre.focus();
    },
    reiniciar() {
      sinFirma.checked = false;
      campoNombre.value = '';
      borrar();
      actualizarModo();
    }
  };

  actualizarModo();
});
window.firmaDigital = window.firmasDigitales.titular || Object.values(window.firmasDigitales)[0];
