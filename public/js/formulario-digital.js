const form = document.querySelector('#formulario-digital');
const resultado = document.querySelector('#resultado-formulario');
// Mismo origen que la página (sirve en local y en Render)
const apiBaseUrl = '';
const fechaActual = new Date();
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const campoDia = document.querySelector('input[name="dia"]');
const campoMes = document.querySelector('input[name="mes"]');
const campoAnio = document.querySelector('input[name="anio"]');

const completarFecha = () => {
  if (campoDia) campoDia.value = String(fechaActual.getDate()).padStart(2, '0');
  if (campoMes) campoMes.value = meses[fechaActual.getMonth()];
  if (campoAnio) campoAnio.value = fechaActual.getFullYear();
};
completarFecha();

if (form) {
  const campoDni = form.querySelector('input[name="dniCuit"]');
  const campoTelefono = form.querySelector('input[name="telefono"]');
  const extranjero = form.querySelector('input[name="documentoExtranjero"]');

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
  campoTelefono?.setAttribute('pattern', '[0-9]{10}');
  campoTelefono?.setAttribute('title', 'Ingrese 10 números, sin 0 inicial, 15 ni espacios.');
  campoTelefono?.addEventListener('input', () => {
    campoTelefono.value = campoTelefono.value.replace(/\D/g, '').slice(0, 10);
    campoTelefono.setCustomValidity('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Inicio es público; Subsidios y Créditos se registran a nombre del emprendedor logueado
    const esInicio = form.querySelector('input[name="tipoFormulario"]')?.value === 'Formulario de Inicio';
    const token = sessionStorage.getItem('token_ministerio');
    if (!esInicio && !token) {
      resultado.innerHTML = 'Debe <a href="/login">iniciar sesión</a> como emprendedor para enviar este formulario.';
      return;
    }

    resultado.textContent = 'Generando el PDF...';
    const boton = form.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    const datos = Object.fromEntries(new FormData(form).entries());
    const selectorImagenes = form.querySelector('input[name="imagenes"]');
    const archivos = Array.from(selectorImagenes?.files || []);

    if (archivos.length > 8) {
      resultado.textContent = 'Puede seleccionar hasta 8 archivos adjuntos.';
      if (boton) boton.disabled = false;
      return;
    }
    const tamanioTotal = archivos.reduce((total, archivo) => total + archivo.size, 0);
    if (tamanioTotal > 16 * 1024 * 1024) {
      resultado.textContent = 'El total de los archivos adjuntos no puede superar 16 MB.';
      if (boton) boton.disabled = false;
      return;
    }
    if (archivos.some((archivo) => {
      const esPdf = archivo.type === 'application/pdf';
      const esImagen = ['image/jpeg', 'image/png'].includes(archivo.type);
      return (!esPdf && !esImagen) || archivo.size > (esPdf ? 8 : 2) * 1024 * 1024;
    })) {
      resultado.textContent = 'Adjunte imágenes JPG o PNG de hasta 2 MB, o PDF de hasta 8 MB cada uno.';
      if (boton) boton.disabled = false;
      return;
    }

    const leerArchivo = (archivo) => new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve({ nombre: archivo.name, tipo: archivo.type, data: lector.result });
      lector.onerror = () => reject(new Error(`No se pudo leer el archivo ${archivo.name}.`));
      lector.readAsDataURL(archivo);
    });

    try {
      datos.fechaLugar = datos.dia
        ? `${datos.dia} de ${datos.mes} de ${datos.anio}`
        : `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}`;
      datos.documentoExtranjero = Boolean(extranjero?.checked);
      datos.imagenes = await Promise.all(archivos.map(leerArchivo));
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
      const enlace = document.createElement('a');
      enlace.className = 'btn descargar';
      enlace.href = urlPdf;
      enlace.download = 'Solicitud_Microemprendimiento.pdf';
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
