// =========================================================
// perfil-emprendedor.js - Base común de las pestañas del perfil
// (Acerca de, Publicaciones, Productos, Fotos, Contacto)
//
//  - ?id=N en la URL  -> perfil público del emprendimiento N (solo lectura)
//  - sin ?id y con sesión de Emprendedor -> su propio perfil, con edición
//  - si el emprendedor abre ?id= de su propio emprendimiento, también ve la edición
//
// Cuando los datos están listos se dispara el evento 'perfil-listo' en document
// con { detail: Perfil }. Las pestañas con formularios (publicaciones.js,
// productos.js) escuchan ese evento.
// =========================================================

const Perfil = {
    datos: null,
    esDueno: false,
    // Siempre el token vigente (navbar.js lo renueva mientras hay actividad)
    get token() { return sessionStorage.getItem('token_ministerio'); },

    escapar(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    },

    // Texto con saltos de línea (escapado)
    parrafos(texto) {
        return Perfil.escapar(texto).replace(/\n/g, '<br>');
    },

    aviso(icono, titulo, texto) {
        if (typeof Swal !== 'undefined') return Swal.fire({ icon: icono, title: titulo, text: texto, confirmButtonColor: '#2f4e78' });
        alert(texto ? `${titulo}\n${texto}` : titulo);
        return Promise.resolve();
    },

    fecha(valor) {
        return valor ? new Date(valor).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '';
    },

    precio(valor) {
        return valor === null || valor === undefined
            ? 'Consultar precio'
            : `$ ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    },

    // Lee archivos <input type="file"> como dataURL para enviarlos en el JSON
    leerArchivos(archivos) {
        return Promise.all([...archivos].map((archivo) => new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = () => resolve(lector.result);
            lector.onerror = () => reject(new Error(`No se pudo leer ${archivo.name}.`));
            lector.readAsDataURL(archivo);
        })));
    },

    // Valida imágenes antes de enviarlas (el servidor vuelve a validar)
    validarImagenes(archivos, maximo) {
        const lista = [...archivos];
        if (lista.length > maximo) return `Puede elegir hasta ${maximo} ${maximo === 1 ? 'imagen' : 'imágenes'}.`;
        if (lista.some((a) => !['image/jpeg', 'image/png', 'image/webp'].includes(a.type))) return 'Solo se permiten imágenes JPG, PNG o WEBP.';
        if (lista.some((a) => a.size > 2 * 1024 * 1024)) return 'Cada imagen debe pesar como máximo 2 MB.';
        return null;
    },

    // fetch a la API con el token; devuelve { ok, status, datos }
    async api(metodo, url, cuerpo) {
        const headers = { 'Content-Type': 'application/json' };
        if (Perfil.token) headers.Authorization = `Bearer ${Perfil.token}`;
        const respuesta = await fetch(url, { method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
        const datos = await respuesta.json().catch(() => ({}));
        if (respuesta.status === 401 && Perfil.esDueno) {
            await Perfil.aviso('warning', 'Sesión vencida', 'Volvé a iniciar sesión para continuar.');
        }
        return { ok: respuesta.ok, status: respuesta.status, datos };
    },

    // Vuelve a pedir los datos y redibuja la pestaña (después de publicar, editar, etc.)
    async recargar() {
        await cargarPerfil();
    }
};
window.Perfil = Perfil;

function tipoUsuarioDelToken() {
    try {
        const payload = JSON.parse(atob(Perfil.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.exp && payload.exp * 1000 < Date.now() ? null : payload.tipoUsuario;
    } catch {
        return null;
    }
}

function mostrarMensajePerfil(html) {
    const contenido = document.querySelector('.perfil-content') || document.querySelector('main');
    if (contenido) contenido.innerHTML = `<div class="card perfil-mensaje">${html}</div>`;
}

async function cargarPerfil() {
    const idPedido = Number(new URLSearchParams(window.location.search).get('id')) || null;
    const esEmprendedor = Perfil.token && tipoUsuarioDelToken() === 'Emprendedor';

    let respuesta = null;
    if (esEmprendedor) {
        const mio = await Perfil.api('GET', '/api/perfil/mio');
        if (mio.ok && (!idPedido || idPedido === mio.datos.emprendimiento.idEmprendimiento)) respuesta = mio;
    }
    if (!respuesta && idPedido) respuesta = await Perfil.api('GET', `/api/perfil/${idPedido}`);

    if (!respuesta) {
        mostrarMensajePerfil(`
            <h3>Perfil de emprendimiento</h3>
            <p>Elegí un emprendimiento desde <a href="/publicaciones">Publicaciones</a> o desde el <a href="/mapa">Mapa</a> para ver su perfil.</p>
            <p>Si sos emprendedor, <a href="/login">iniciá sesión</a> para ver y editar el tuyo.</p>`);
        return;
    }
    if (!respuesta.ok) {
        mostrarMensajePerfil(`<p>${Perfil.escapar(respuesta.datos.error || 'No se pudo cargar el perfil.')}</p>`);
        return;
    }

    Perfil.datos = respuesta.datos;
    Perfil.esDueno = Boolean(respuesta.datos.esDueno);
    document.body.classList.toggle('perfil-dueno', Perfil.esDueno);
    document.body.classList.toggle('perfil-publico', !Perfil.esDueno);

    pintarCabecera();
    pintarPagina();
    document.dispatchEvent(new CustomEvent('perfil-listo', { detail: Perfil }));
}

// Banner + pestañas (las pestañas conservan ?id= en el perfil público)
function pintarCabecera() {
    const { emprendimiento } = Perfil.datos;
    document.title = `${emprendimiento.nombre} - Camino de los emprendedores`;

    const nombre = document.getElementById('emprendimiento-nombre');
    const rubro = document.getElementById('emprendimiento-rubro');
    if (nombre) nombre.textContent = emprendimiento.nombre;
    if (rubro) rubro.textContent = emprendimiento.rubro || 'Sin rubro';

    document.querySelectorAll('.perfil-subnav a').forEach((enlace) => {
        const url = new URL(enlace.getAttribute('href'), window.location.href);
        if (Perfil.esDueno) url.searchParams.delete('id');
        else url.searchParams.set('id', emprendimiento.idEmprendimiento);
        enlace.setAttribute('href', url.pathname + url.search);
    });
}

function pintarPagina() {
    const pagina = document.body.dataset.pagina;
    if (pagina === 'acerca') pintarAcerca();
    if (pagina === 'fotos') pintarFotos();
    if (pagina === 'contacto') pintarContacto();
}

function textoDireccion(d) {
    const calle = [d.calle, d.numero].filter(Boolean).join(' ');
    return [calle, d.barrio && `B° ${d.barrio}`, d.localidad, d.departamento && `Dpto. ${d.departamento}`].filter(Boolean).join(', ');
}

// ---------- ACERCA DE ----------
function pintarAcerca() {
    const { emprendimiento: e, publicaciones } = Perfil.datos;
    const esc = Perfil.escapar;

    const intro = document.getElementById('emprendimiento-descripcion');
    if (intro) {
        intro.closest('.info-basica').innerHTML = `
            <p><strong>Actividad principal</strong></p>
            <p id="emprendimiento-descripcion">${Perfil.parrafos(e.actividad || 'Sin descripción cargada.')}</p>
            <ul class="perfil-datos">
                <li><i class="fa-solid fa-tag"></i> ${esc(e.rubro || 'Sin rubro')}</li>
                <li><i class="fa-solid fa-circle${e.enMarcha ? '-check' : '-pause'}"></i> ${e.enMarcha ? 'En marcha' : 'Todavía no está en marcha'}</li>
                <li><i class="fa-solid fa-location-dot"></i> ${esc(textoDireccion(e.direccion))}</li>
                ${e.contacto.nombre ? `<li><i class="fa-solid fa-user"></i> ${esc(e.contacto.nombre)}</li>` : ''}
            </ul>
            <p class="perfil-ver-mas"><a href="/Emprendedor-Contacto${Perfil.esDueno ? '' : `?id=${e.idEmprendimiento}`}">Ver datos de contacto <i class="fa-solid fa-arrow-right"></i></a></p>`;
    }

    // Últimas publicaciones aprobadas (el formulario de esta pestaña lo maneja publicaciones.js)
    const feed = document.getElementById('feed-publicaciones');
    if (feed) feed.innerHTML = htmlPublicacionesAprobadas(publicaciones, e.nombre);
}

// Tarjetas de publicaciones aprobadas (se usa en Acerca de y en Publicaciones)
function htmlPublicacionesAprobadas(publicaciones, nombre) {
    if (!publicaciones.length) {
        return '<article class="card publicacion-card"><p class="sin-datos">Todavía no hay publicaciones aprobadas.</p></article>';
    }
    return publicaciones.map((p) => `
        <article class="card publicacion-card" id="publicacion-${p.idPublicacion}">
            <div class="publicacion-header">
                <h4>${Perfil.escapar(p.titulo)}</h4>
                <span class="post-fecha">${Perfil.escapar(nombre)} · ${Perfil.fecha(p.fecha)}</span>
            </div>
            <div class="publicacion-body">
                <p>${Perfil.parrafos(p.descripcion)}</p>
                ${htmlFotos(p.fotos)}
            </div>
        </article>`).join('');
}
Perfil.htmlPublicacionesAprobadas = htmlPublicacionesAprobadas;

// Grilla de fotos de una publicación (clic = ver grande)
function htmlFotos(fotos) {
    if (!fotos || !fotos.length) return '';
    return `<div class="publicacion-fotos fotos-${Math.min(fotos.length, 4)}">${fotos.map((url) =>
        `<a href="${Perfil.escapar(url)}" target="_blank" rel="noopener" data-ampliar><img src="${Perfil.escapar(url)}" alt="Foto de la publicación" loading="lazy"></a>`).join('')}</div>`;
}
Perfil.htmlFotos = htmlFotos;

// ---------- FOTOS (galería automática) ----------
function pintarFotos() {
    const grilla = document.getElementById('galeria-grid');
    if (!grilla) return;
    const { fotos } = Perfil.datos;

    grilla.innerHTML = fotos.length
        ? fotos.map((f) => `
            <a class="galeria-item" href="${Perfil.escapar(f.url)}" target="_blank" rel="noopener" data-ampliar title="${Perfil.escapar(f.titulo)}">
                <img src="${Perfil.escapar(f.url)}" alt="${Perfil.escapar(f.titulo)}" loading="lazy">
                <span class="galeria-etiqueta"><i class="fa-solid fa-${f.origen === 'producto' ? 'box' : 'newspaper'}"></i> ${Perfil.escapar(f.titulo)}</span>
            </a>`).join('')
        : `<p class="sin-datos">Todavía no hay fotos.${Perfil.esDueno ? ' Las fotos de tus publicaciones aprobadas y de tus productos aparecen acá automáticamente.' : ''}</p>`;
}

// ---------- CONTACTO ----------
function pintarContacto() {
    const contenedor = document.querySelector('.perfil-content');
    if (!contenedor) return;
    const { emprendimiento: e } = Perfil.datos;
    const esc = Perfil.escapar;
    const telefono = String(e.contacto.telefono || '').replace(/\D/g, '');

    contenedor.innerHTML = `
        <section class="card contacto-card">
            <h3>Contacto</h3>
            <hr>
            <ul class="perfil-datos contacto-datos">
                ${e.contacto.nombre ? `<li><i class="fa-solid fa-user"></i> <span>${esc(e.contacto.nombre)}</span></li>` : ''}
                ${telefono ? `<li><i class="fa-solid fa-phone"></i> <a href="tel:${telefono}">${esc(e.contacto.telefono)}</a></li>` : ''}
                ${telefono ? `<li><i class="fa-brands fa-whatsapp"></i> <a href="https://wa.me/549${telefono}" target="_blank" rel="noopener">Escribir por WhatsApp</a></li>` : ''}
                ${e.contacto.correo ? `<li><i class="fa-solid fa-envelope"></i> <a href="mailto:${esc(e.contacto.correo)}">${esc(e.contacto.correo)}</a></li>` : ''}
                <li><i class="fa-solid fa-location-dot"></i> <span>${esc(textoDireccion(e.direccion))}</span></li>
            </ul>
        </section>
        <section class="card contacto-card">
            <h3>Ubicación</h3>
            <hr>
            ${e.ubicacion
                ? `<div id="mapa-contacto" class="mapa-contacto"></div>
                   <p class="perfil-ver-mas"><a href="/mapa">Ver en el mapa de emprendimientos <i class="fa-solid fa-arrow-right"></i></a></p>`
                : '<p class="sin-datos">El emprendimiento todavía no tiene la ubicación cargada en el mapa.</p>'}
        </section>`;

    if (e.ubicacion && typeof L !== 'undefined') {
        const mapa = L.map('mapa-contacto', { scrollWheelZoom: false }).setView([e.ubicacion.lat, e.ubicacion.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(mapa);
        const icono = e.iconoMapa
            ? L.icon({ iconUrl: e.iconoMapa, iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -36] })
            : new L.Icon.Default();
        L.marker([e.ubicacion.lat, e.ubicacion.lng], { icon: icono }).addTo(mapa).bindPopup(esc(e.nombre)).openPopup();
    }
}

document.addEventListener('DOMContentLoaded', cargarPerfil);

// La campanita avisa que el Ministerio aprobó o rechazó algo: si es su perfil, se actualiza
document.addEventListener('notificaciones-nuevas', () => {
    if (Perfil.esDueno) Perfil.recargar();
});
