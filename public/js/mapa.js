// =========================================================
// mapa.js - Mapa de emprendimientos (Leaflet)
// Va en public/js/mapa.js. Se carga al FINAL del body, después de leaflet.js
// =========================================================

// 0. SESIÓN (el login guarda el JWT en sessionStorage con esta clave)
const CLAVE_TOKEN = 'token_ministerio';

// Roles que pueden ubicar emprendimientos (Empleado de Mesa NO).
// Tiene que coincidir con la lista de middlewares/mapaAuth.js
const ROLES_EDITORES = ['Empleado de Area', 'Administrador'];

// Lee el contenido del JWT (la firma la verifica el servidor)
function leerPayloadToken() {
  const token = sessionStorage.getItem(CLAVE_TOKEN);
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// El botón de login/cerrar sesión lo maneja js/navbar.js.
// Acá solo mostramos u ocultamos el panel de edición.
function comprobarAutenticacionEnMapa() {
  const panelEdicion = document.getElementById('panel-edicion');
  if (!panelEdicion) return;

  const payload = leerPayloadToken();
  const vigente = payload && (!payload.exp || payload.exp * 1000 > Date.now());
  const puedeEditar = vigente && ROLES_EDITORES.includes(payload.tipoUsuario);

  panelEdicion.style.display = puedeEditar ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', comprobarAutenticacionEnMapa);

// Si Leaflet no cargó, avisar claro en consola y cortar acá
if (typeof L === 'undefined') {
  throw new Error('Leaflet (L) no está definido: revisá que leaflet.js se cargue ANTES de mapa.js.');
}

// 1. INICIALIZAR EL MAPA (Santiago del Estero / La Banda)
const map = L.map('map').setView([-27.7833, -64.2667], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Variables globales
let emprendimientosTodos = [];
let marcadoresCargados = [];
let marcadorNuevo = null;

// Elementos del DOM
const selectEmp = document.getElementById('select-emprendimiento');
const selectRubro = document.getElementById('select-rubro');
const selectLocalidad = document.getElementById('select-localidad');
const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
const contenedorLista = document.getElementById('lista-resultados');

const inputLat = document.getElementById('input-latitud');
const inputLng = document.getElementById('input-longitud');
const btnGuardar = document.getElementById('btn-guardar-ubicacion');

// ---------- Utilidades ----------

// Escapa texto antes de meterlo en innerHTML (evita inyección de HTML/JS)
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Minúsculas y sin tildes, para comparar localidades sin errores de escritura
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function coordenadasDe(emp) {
  const lat = parseFloat(emp.Latitud);
  const lng = parseFloat(emp.Longitud);
  return (Number.isFinite(lat) && Number.isFinite(lng)) ? [lat, lng] : null;
}

// Agrega las opciones a un <select>, dejando la primera ("Todos...") y
// conservando la selección anterior si todavía existe.
function llenarSelect(select, textoTodos, opciones) {
  const previo = select.value;
  select.innerHTML = '';

  const todos = document.createElement('option');
  todos.value = '';
  todos.textContent = textoTodos;
  select.appendChild(todos);

  opciones.forEach(({ valor, texto }) => {
    const opt = document.createElement('option');
    opt.value = valor;
    opt.textContent = texto;
    select.appendChild(opt);
  });

  if ([...select.options].some((o) => o.value === previo)) {
    select.value = previo;
  }
}

// ---------- 2. CARGA DE DATOS ----------
async function cargarEmprendimientos() {
  try {
    const res = await fetch('/api/mapa');
    if (!res.ok) throw new Error(`Error en la respuesta: ${res.status}`);

    emprendimientosTodos = await res.json();
    console.log('Datos cargados desde API:', emprendimientosTodos);

    llenarFiltros();
    llenarSelectEdicion();
    aplicarFiltroActual();
  } catch (error) {
    console.error('Error al cargar emprendimientos:', error);
    if (selectEmp) {
      selectEmp.innerHTML = '<option value="">-- Error al obtener lista --</option>';
      llenarDesplegable();
    }
    if (contenedorLista) {
      contenedorLista.innerHTML = '<p style="font-size: 12px; color: #e53e3e; text-align: center;">No se pudieron cargar los emprendimientos.</p>';
    }
  }
}

// ---------- FILTROS DINÁMICOS (salen de los datos de la base) ----------
function llenarFiltros() {
  // Rubros: se compara por idRubro, se muestra el nombre
  if (selectRubro) {
    const rubros = new Map();
    emprendimientosTodos.forEach((e) => {
      if (e.idRubro != null && e.Rubro) rubros.set(String(e.idRubro), e.Rubro);
    });

    const opciones = [...rubros.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([valor, texto]) => ({ valor, texto }));

    llenarSelect(selectRubro, 'Todos los rubros', opciones);
  }

  // Localidades: valores distintos que hay cargados (sin duplicar por tildes/mayúsculas)
  if (selectLocalidad) {
    const localidades = new Map();
    emprendimientosTodos.forEach((e) => {
      const nombre = String(e.Localidad ?? '').trim();
      if (!nombre) return;
      const clave = normalizar(nombre);
      if (!localidades.has(clave)) localidades.set(clave, nombre);
    });

    const opciones = [...localidades.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([valor, texto]) => ({ valor, texto }));

    llenarSelect(selectLocalidad, 'Todas las localidades', opciones);
  }
}

function aplicarFiltroActual() {
  const rubroSel = selectRubro ? selectRubro.value : '';
  const localidadSel = selectLocalidad ? selectLocalidad.value : '';

  const listaFiltrada = emprendimientosTodos.filter((emp) => {
    const coincideRubro = !rubroSel || String(emp.idRubro) === rubroSel;
    const coincideLocalidad = !localidadSel || normalizar(emp.Localidad) === localidadSel;
    return coincideRubro && coincideLocalidad;
  });

  renderizarTodo(listaFiltrada);
}

if (btnAplicarFiltros) {
  btnAplicarFiltros.addEventListener('click', (e) => {
    e.preventDefault();
    aplicarFiltroActual();
  });
}
// También se filtra apenas se cambia una opción
if (selectRubro) selectRubro.addEventListener('change', aplicarFiltroActual);
if (selectLocalidad) selectLocalidad.addEventListener('change', aplicarFiltroActual);

// ---------- Direcciones reales (Nominatim) ----------

// Cola para consultar de a una por vez (su política pide máx. 1 por segundo)
let colaDirecciones = Promise.resolve();
function encolar(tarea) {
  colaDirecciones = colaDirecciones
    .then(tarea)
    .catch(() => {})
    .then(() => new Promise((r) => setTimeout(r, 1100)));
}

async function obtenerDireccionReal(lat, lng, fallback) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const calle = data.address.road || data.address.pedestrian || data.address.suburb || '';
        const num = data.address.house_number || '';
        if (calle) return `${calle} ${num}`.trim();
      }
    }
  } catch (e) {
    // Si falla o se pasa del tiempo, se mantiene el fallback
  }
  return fallback;
}

// ---------- 3. MARCADORES Y LISTA DERECHA ----------

// Marcador con el ícono del rubro (círculo blanco + punta). Se reutiliza un L.divIcon por imagen.
// Sin IconoMapa se usa el pin azul por defecto de Leaflet.
const iconosRubro = new Map();
function iconoMarcador(emp) {
  if (!emp.IconoMapa) return new L.Icon.Default();
  if (!iconosRubro.has(emp.IconoMapa)) {
    iconosRubro.set(emp.IconoMapa, L.divIcon({
      className: 'marcador-rubro',
      html: `<div class="marcador-rubro-circulo">
               <img src="${esc(encodeURI(emp.IconoMapa))}" alt="" onerror="this.style.display='none'">
             </div>`,
      iconSize: [44, 54],     // círculo 40px + borde 2px*2 = 44, + punta 10px = 54
      iconAnchor: [22, 54],   // la punta de abajo es el punto exacto
      popupAnchor: [0, -50]
    }));
  }
  return iconosRubro.get(emp.IconoMapa);
}

function renderizarTodo(lista) {
  marcadoresCargados.forEach((item) => map.removeLayer(item.marker));
  marcadoresCargados = [];

  if (contenedorLista) contenedorLista.innerHTML = '';

  if (!Array.isArray(lista) || lista.length === 0) {
    if (contenedorLista) {
      contenedorLista.innerHTML = '<p style="font-size: 12px; color: #e53e3e; text-align: center;">No se encontraron proyectos con estos filtros.</p>';
    }
    return;
  }

  // Resumen de resultados
  if (contenedorLista) {
    const sinUbicar = lista.filter((e) => !coordenadasDe(e)).length;
    const resumen = document.createElement('p');
    resumen.style.cssText = 'margin: 0; font-size: 12px; color: #718096; text-align: center;';
    resumen.textContent = `${lista.length} proyecto${lista.length === 1 ? '' : 's'}` +
      (sinUbicar > 0 ? ` (${sinUbicar} sin ubicación en el mapa)` : '');
    contenedorLista.appendChild(resumen);
  }

  const puntos = [];

  lista.forEach((emp) => {
    const id = emp.idEmprendimiento;

    const nombre = esc(emp.Nombre || 'Sin Nombre');
    const rubro = esc(emp.Rubro || 'Sin rubro');
    const actividad = esc(emp.ActividadPrincipal || 'Sin actividad registrada');
    const localidad = esc(emp.Localidad || '');

    const calleDB = emp.Calle || '';
    const numeroDB = emp.NumeroCalle || '';
    const barrioDB = emp.Barrio ? `, ${emp.Barrio}` : '';
    const direccionSinEscapar = `${calleDB} ${numeroDB}${barrioDB}`.trim() || 'Dirección no especificada';
    const direccionCompleta = esc(direccionSinEscapar);

    // Ícono del rubro (Rubro.IconoMapa -> /uploads/IconoMapa/...). encodeURI por los espacios del nombre.
    const iconoRubro = (tamano) => emp.IconoMapa
      ? `<img src="${esc(encodeURI(emp.IconoMapa))}" alt="${rubro}" title="${rubro}"
             style="width: ${tamano}px; height: ${tamano}px; object-fit: contain; flex-shrink: 0;"
             onerror="this.style.display='none'">`
      : '';

    let markerRef = null;
    const coords = coordenadasDe(emp);

    // Marcador si tiene ubicación
    if (coords) {
      const marker = L.marker(coords, { icon: iconoMarcador(emp), title: emp.Nombre || '' })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              ${iconoRubro(36)}
              <div>
                <b style="font-size: 15px; color: #2c3e50;">${nombre}</b><br>
                <span style="font-size: 12px; font-weight: bold; color: #2b6cb0;">${rubro}</span>
              </div>
            </div>
            <i style="font-size: 13px; color: #555;">${actividad}</i><br>
            <span id="pop-dir-${id}" style="font-size: 13px;">📍 ${direccionCompleta}</span><br>
            <small style="font-size: 12px; font-weight: bold; color: #27ae60;">${localidad}</small>
          </div>
        `, { maxWidth: 260 });

      markerRef = marker;
      marcadoresCargados.push({ id: id, marker: marker });
      puntos.push(coords);

      // Dirección georreferenciada en segundo plano (en cola)
      encolar(async () => {
        const nuevaDir = await obtenerDireccionReal(coords[0], coords[1], direccionSinEscapar);
        if (nuevaDir !== direccionSinEscapar) {
          const elTarjeta = document.getElementById(`card-dir-${id}`);
          const elPopup = document.getElementById(`pop-dir-${id}`);
          if (elTarjeta) elTarjeta.textContent = `📍 ${nuevaDir} (${emp.Localidad || ''})`;
          if (elPopup) elPopup.textContent = `📍 ${nuevaDir}`;
        }
      });
    }

    // Tarjeta del panel derecho
    if (contenedorLista) {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        cursor: ${markerRef ? 'pointer' : 'default'};
        transition: border-color 0.2s ease;
      `;

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          ${iconoRubro(40)}
          <div>
            <h4 style="margin: 0 0 2px 0; font-size: 14px; color: #2d3748; font-weight: 700;">${nombre}</h4>
            <p style="margin: 0; font-size: 11px; font-weight: bold; color: #2b6cb0; text-transform: uppercase;">${rubro}</p>
          </div>
        </div>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #4a5568; font-style: italic; line-height: 1.3;">${actividad}</p>
        <p id="card-dir-${id}" style="margin: 0; font-size: 12px; color: #718096;">📍 ${direccionCompleta} <b style="color: #4a5568;">(${localidad})</b></p>
        ${markerRef ? '' : '<p style="margin: 4px 0 0 0; font-size: 11px; color: #c53030;">Sin ubicación en el mapa</p>'}
      `;

      if (markerRef) {
        card.onmouseenter = () => (card.style.borderColor = '#3182ce');
        card.onmouseleave = () => (card.style.borderColor = '#e2e8f0');
        card.onclick = () => {
          map.setView(markerRef.getLatLng(), 15);
          markerRef.openPopup();
        };
      }

      contenedorLista.appendChild(card);
    }
  });

  // Encuadrar el mapa en los resultados
  if (puntos.length > 0) {
    map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 15 });
  }
}

// ---------- 4. EDICIÓN Y GUARDADO DE UBICACIÓN ----------

// El select de edición lista SIEMPRE todos los emprendimientos (no depende de los filtros)
function llenarSelectEdicion() {
  if (!selectEmp) return;

  const previo = selectEmp.value;
  selectEmp.innerHTML = '<option value="">-- Seleccionar un emprendimiento --</option>';

  [...emprendimientosTodos]
    .sort((a, b) => String(a.Nombre ?? '').localeCompare(String(b.Nombre ?? ''), 'es'))
    .forEach((emp) => {
      const option = document.createElement('option');
      option.value = emp.idEmprendimiento;
      option.textContent = `${emp.Nombre || 'Sin nombre'} ${coordenadasDe(emp) ? '(Con ubicación)' : '(Sin ubicación)'}`;
      selectEmp.appendChild(option);
    });

  if ([...selectEmp.options].some((o) => o.value === previo)) {
    selectEmp.value = previo;
  }

  llenarDesplegable();
}

// ---------- Desplegable con íconos ----------
// Un <select> no puede mostrar imágenes, así que se oculta y se dibuja esta lista encima.
// El <select> sigue guardando el valor elegido: el resto del código (change, guardar) no cambia.
let desplegable = null;

function htmlOpcionEmp(emp) {
  const icono = emp.IconoMapa
    ? `<img src="${esc(encodeURI(emp.IconoMapa))}" alt="" onerror="this.style.visibility='hidden'">`
    : '<span class="desplegable-sin-icono"></span>';
  const ubicado = coordenadasDe(emp);
  return `
    ${icono}
    <span class="desplegable-texto">
      <span class="desplegable-nombre">${esc(emp.Nombre || 'Sin nombre')}</span>
      <span class="desplegable-rubro">${esc(emp.Rubro || 'Sin rubro')}</span>
    </span>
    <span class="desplegable-estado ${ubicado ? 'con' : 'sin'}">${ubicado ? 'Con ubicación' : 'Sin ubicación'}</span>
  `;
}

function crearDesplegable() {
  if (!selectEmp || desplegable) return;

  desplegable = document.createElement('div');
  desplegable.className = 'desplegable-emp';
  desplegable.innerHTML = `
    <button type="button" class="desplegable-boton" aria-haspopup="listbox" aria-expanded="false"></button>
    <div class="desplegable-lista" role="listbox" hidden></div>
  `;
  selectEmp.style.display = 'none';
  selectEmp.after(desplegable);

  const boton = desplegable.querySelector('.desplegable-boton');
  const lista = desplegable.querySelector('.desplegable-lista');

  boton.addEventListener('click', () => abrirDesplegable(lista.hidden));

  lista.addEventListener('click', (e) => {
    const opcion = e.target.closest('.desplegable-opcion');
    if (!opcion) return;
    selectEmp.value = opcion.dataset.valor;
    selectEmp.dispatchEvent(new Event('change'));
    abrirDesplegable(false);
    boton.focus();
  });

  // Cerrar al hacer clic afuera o con Escape
  document.addEventListener('click', (e) => {
    if (!desplegable.contains(e.target)) abrirDesplegable(false);
  });
  desplegable.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      abrirDesplegable(false);
      boton.focus();
    }
  });

  // Si el <select> cambia por código (ej. después de guardar), se actualiza el botón
  selectEmp.addEventListener('change', actualizarBotonDesplegable);
}

function abrirDesplegable(abrir) {
  if (!desplegable) return;
  desplegable.querySelector('.desplegable-lista').hidden = !abrir;
  desplegable.querySelector('.desplegable-boton').setAttribute('aria-expanded', String(abrir));
}

function llenarDesplegable() {
  crearDesplegable();
  if (!desplegable) return;

  const lista = desplegable.querySelector('.desplegable-lista');
  lista.innerHTML = '';

  [...selectEmp.options].forEach((opt) => {
    if (!opt.value) return;
    const emp = emprendimientosTodos.find((x) => String(x.idEmprendimiento) === opt.value);
    if (!emp) return;

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'desplegable-opcion';
    item.setAttribute('role', 'option');
    item.dataset.valor = opt.value;
    item.innerHTML = htmlOpcionEmp(emp);
    lista.appendChild(item);
  });

  actualizarBotonDesplegable();
}

function actualizarBotonDesplegable() {
  if (!desplegable) return;
  const boton = desplegable.querySelector('.desplegable-boton');
  const emp = emprendimientosTodos.find((x) => String(x.idEmprendimiento) === selectEmp.value);

  boton.innerHTML = (emp
    ? htmlOpcionEmp(emp)
    : `<span class="desplegable-texto"><span class="desplegable-placeholder">${esc(selectEmp.options[0]?.textContent || '-- Seleccionar un emprendimiento --')}</span></span>`) +
    '<span class="desplegable-flecha">▾</span>';

  desplegable.querySelectorAll('.desplegable-opcion').forEach((o) => {
    o.setAttribute('aria-selected', String(o.dataset.valor === selectEmp.value));
  });
}

function validarFormulario() {
  if (selectEmp && btnGuardar && inputLat && inputLng) {
    btnGuardar.disabled = !(selectEmp.value && inputLat.value && inputLng.value);
  }
}

if (selectEmp && btnGuardar) {
  map.on('click', (e) => {
    const panelEdicion = document.getElementById('panel-edicion');
    if (!panelEdicion || panelEdicion.style.display === 'none') return;

    const { lat, lng } = e.latlng;

    if (inputLat && inputLng) {
      inputLat.value = lat.toFixed(6);
      inputLng.value = lng.toFixed(6);
    }

    if (marcadorNuevo) {
      marcadorNuevo.setLatLng(e.latlng);
    } else {
      marcadorNuevo = L.marker(e.latlng, { draggable: true }).addTo(map);
      marcadorNuevo.on('dragend', (evt) => {
        const pos = evt.target.getLatLng();
        if (inputLat && inputLng) {
          inputLat.value = pos.lat.toFixed(6);
          inputLng.value = pos.lng.toFixed(6);
        }
        validarFormulario();
      });
    }

    validarFormulario();
  });

  selectEmp.addEventListener('change', () => {
    validarFormulario();

    const emp = emprendimientosTodos.find((x) => String(x.idEmprendimiento) === selectEmp.value);
    const coords = emp ? coordenadasDe(emp) : null;
    if (!coords) return;

    map.setView(coords, 15);
    const encontrado = marcadoresCargados.find((m) => String(m.id) === selectEmp.value);
    if (encontrado) encontrado.marker.openPopup();
  });

  // Avisos con SweetAlert2 (cargado en mapa.ejs). Si no cargó (ej. sin internet), se usa alert().
  const COLOR_BOTON = '#aa5656'; // mismo color que el botón "Guardar Ubicación"
  function aviso(icono, titulo, texto, extra = {}) {
    if (typeof Swal === 'undefined') {
      alert(texto ? `${titulo}\n${texto}` : titulo);
      return Promise.resolve({ isConfirmed: true });
    }
    return Swal.fire({ icon: icono, title: titulo, text: texto, confirmButtonColor: COLOR_BOTON, ...extra });
  }

  btnGuardar.addEventListener('click', async () => {
    const id = selectEmp.value;
    const latitud = inputLat.value;
    const longitud = inputLng.value;

    if (!id || !latitud || !longitud) return;

    try {
      const token = sessionStorage.getItem(CLAVE_TOKEN);

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/mapa/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ latitud, longitud })
      });

      const resultado = await res.json().catch(() => ({}));

      if (res.status === 401) {
        const r = await aviso('warning', 'Sesión vencida',
          'Tu sesión venció (dura 5 minutos). Volvé a iniciar sesión para guardar.', {
            showCancelButton: true,
            confirmButtonText: 'Iniciar sesión',
            cancelButtonText: 'Cerrar'
          });
        if (r.isConfirmed) window.location.href = '/login';
        return;
      }
      if (res.status === 403) {
        aviso('error', 'Sin permiso', resultado.mensaje || resultado.error || 'No tenés permiso para ubicar emprendimientos.');
        return;
      }

      if (res.ok) {
        aviso('success', '¡Listo!', resultado.mensaje || 'Ubicación guardada con éxito', {
          timer: 2500,
          timerProgressBar: true
        });

        if (marcadorNuevo) {
          map.removeLayer(marcadorNuevo);
          marcadorNuevo = null;
        }
        if (inputLat) inputLat.value = '';
        if (inputLng) inputLng.value = '';
        selectEmp.value = '';
        actualizarBotonDesplegable();

        await cargarEmprendimientos();
        validarFormulario();
      } else {
        aviso('error', 'No se pudo guardar', resultado.mensaje || 'No fue posible guardar la ubicación.');
      }
    } catch (error) {
      console.error('Error al guardar ubicación:', error);
      aviso('error', 'Sin conexión', 'Error al conectar con el servidor. Revisá que esté encendido.');
    }
  });
}

// ---------- 5. INICIAR ----------
document.addEventListener('DOMContentLoaded', () => {
  cargarEmprendimientos();
  // Forzar a Leaflet a recalcular dimensiones
  setTimeout(() => map.invalidateSize(), 300);
});