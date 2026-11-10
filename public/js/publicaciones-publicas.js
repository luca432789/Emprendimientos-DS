// =========================================================
// publicaciones-publicas.js - Página "Publicaciones" del menú
// Muestra las publicaciones aprobadas por el Ministerio de a 10 por página (flechas al final),
// con buscador y filtro por rubro. La búsqueda y el filtro los resuelve el servidor.
// Cada tarjeta lleva al perfil público del emprendimiento. Usa crearPaginador() de paginador.js
// A la derecha, la columna "Emprendimientos" usa el mismo filtro y lista también a los que
// todavía no tienen publicaciones, para poder llegar a su perfil.
// =========================================================

const escaparPub = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const urlPerfil = (id) => `/Emprendedor-Perfil?id=${encodeURIComponent(id)}`;

let paginadorPub = null;
let paginaPub = 1;
let rubrosCargados = false;
let pedidoActual = 0;       // si se escribe rápido, solo vale la respuesta del último pedido
let esperaBusqueda = null;
let paginadorEmp = null;
let paginaEmp = 1;
let pedidoEmpActual = 0;

function fotosPub(fotos) {
    if (!fotos.length) return '';
    const visibles = fotos.slice(0, 4);
    return `<div class="pub-fotos fotos-${visibles.length}">${visibles.map((url) =>
        `<a href="${escaparPub(url)}" target="_blank" rel="noopener" data-ampliar><img src="${escaparPub(url)}" alt="Foto de la publicación" loading="lazy"></a>`).join('')}</div>`;
}

function pintarPublicaciones(publicaciones, hayFiltros) {
    const lista = document.getElementById('lista-publicaciones');
    if (!publicaciones.length) {
        lista.innerHTML = `<p class="sin-datos">${hayFiltros
            ? 'Ninguna publicación coincide con la búsqueda.'
            : 'Todavía no hay publicaciones aprobadas.'}</p>`;
        return;
    }

    lista.innerHTML = publicaciones.map((p) => `
        <article class="pub-card">
            <header class="pub-cabecera">
                <a class="pub-emprendimiento" href="${urlPerfil(p.idEmprendimiento)}">
                    ${p.IconoMapa ? `<img src="${escaparPub(p.IconoMapa)}" alt="" class="pub-icono">` : '<i class="fa-solid fa-store pub-icono"></i>'}
                    <span>
                        <strong>${escaparPub(p.emprendimiento)}</strong>
                        <small>${escaparPub([p.rubro, p.Localidad].filter(Boolean).join(' · '))}</small>
                    </span>
                </a>
                <span class="pub-fecha">${p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : ''}</span>
            </header>
            <h3>${escaparPub(p.titulo)}</h3>
            <p class="pub-texto">${escaparPub(p.descripcion).replace(/\n/g, '<br>')}</p>
            ${fotosPub(p.fotos)}
            <a class="pub-ver-perfil" href="${urlPerfil(p.idEmprendimiento)}">Ver perfil del emprendimiento <i class="fa-solid fa-arrow-right"></i></a>
        </article>`).join('');
}

function cargarRubros(rubros) {
    if (rubrosCargados) return;
    const select = document.getElementById('filtro-rubro');
    rubros.forEach((r) => select.add(new Option(r.rubro, r.idRubro)));
    rubrosCargados = true;
}

// Parámetros del filtro (búsqueda y rubro) que comparten las publicaciones y la columna de emprendimientos
function parametrosFiltro(pagina) {
    const buscar = document.getElementById('buscar-publicacion').value.trim();
    const rubro = document.getElementById('filtro-rubro').value;
    const parametros = new URLSearchParams({ page: String(pagina) });
    if (buscar) parametros.set('buscar', buscar);
    if (rubro) parametros.set('rubro', rubro);
    return { parametros, hayFiltros: Boolean(buscar || rubro) };
}

// Al cambiar la búsqueda o el rubro se recargan las dos listas desde la primera página
function aplicarFiltro() {
    cargarPublicacionesPublicas(1);
    cargarEmprendimientosColumna(1);
}

function pintarEmprendimientos(emprendimientos, hayFiltros) {
    const lista = document.getElementById('lista-emprendimientos');
    if (!emprendimientos.length) {
        lista.innerHTML = `<li class="sin-datos">${hayFiltros
            ? 'Ningún emprendimiento coincide con la búsqueda.'
            : 'Todavía no hay emprendimientos.'}</li>`;
        return;
    }

    lista.innerHTML = emprendimientos.map((e) => `
        <li>
            <a class="item-emprendimiento" href="${urlPerfil(e.idEmprendimiento)}">
                ${e.IconoMapa ? `<img src="${escaparPub(e.IconoMapa)}" alt="" class="item-emp-icono">` : '<i class="fa-solid fa-store item-emp-icono"></i>'}
                <span class="item-emp-texto">
                    <strong>${escaparPub(e.emprendimiento)}</strong>
                    <small>${escaparPub([e.rubro, e.Localidad].filter(Boolean).join(' · '))}</small>
                    <small class="item-emp-publicaciones">${e.publicaciones
                        ? `${e.publicaciones} ${e.publicaciones === 1 ? 'publicación' : 'publicaciones'}`
                        : 'Sin publicaciones todavía'}</small>
                </span>
            </a>
        </li>`).join('');
}

async function cargarEmprendimientosColumna(pagina = 1) {
    const numeroPedido = ++pedidoEmpActual;
    const { parametros, hayFiltros } = parametrosFiltro(pagina);

    paginadorEmp.cargando();
    try {
        const respuesta = await fetch(`/api/emprendimientos?${parametros}`);
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.error || `Error ${respuesta.status}`);
        if (numeroPedido !== pedidoEmpActual) return;

        paginaEmp = data.pagina;
        document.getElementById('contador-emprendimientos').textContent = data.totalRegistros
            ? `${data.totalRegistros} ${data.totalRegistros === 1 ? 'emprendimiento' : 'emprendimientos'}${hayFiltros ? ' encontrados' : ''}`
            : '';
        pintarEmprendimientos(data.emprendimientos, hayFiltros);
        paginadorEmp.actualizar(data);
    } catch (error) {
        if (numeroPedido !== pedidoEmpActual) return;
        console.error('No se pudieron cargar los emprendimientos:', error);
        document.getElementById('lista-emprendimientos').innerHTML =
            '<li class="sin-datos">No se pudieron cargar los emprendimientos.</li>';
        paginadorEmp.actualizar({ pagina: paginaEmp, totalPaginas: 0, totalRegistros: 0 });
    }
}

async function cargarPublicacionesPublicas(pagina = 1, { subir = false } = {}) {
    const numeroPedido = ++pedidoActual;
    const { parametros, hayFiltros } = parametrosFiltro(pagina);

    paginadorPub.cargando();
    try {
        const respuesta = await fetch(`/api/publicaciones?${parametros}`);
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.error || `Error ${respuesta.status}`);
        if (numeroPedido !== pedidoActual) return;

        cargarRubros(data.rubros);
        paginaPub = data.pagina;
        document.getElementById('contador-publicaciones').textContent = data.totalRegistros
            ? `${data.totalRegistros} ${data.totalRegistros === 1 ? 'publicación' : 'publicaciones'}${hayFiltros ? ' encontradas' : ''}`
            : '';
        pintarPublicaciones(data.publicaciones, hayFiltros);
        paginadorPub.actualizar(data);

        // Al cambiar de página se vuelve al principio de la lista
        if (subir) document.getElementById('filtros-publicaciones').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        if (numeroPedido !== pedidoActual) return;
        console.error('No se pudieron cargar las publicaciones:', error);
        document.getElementById('lista-publicaciones').innerHTML =
            '<p class="sin-datos">No se pudieron cargar las publicaciones. Intentá de nuevo más tarde.</p>';
        paginadorPub.actualizar({ pagina: paginaPub, totalPaginas: 0, totalRegistros: 0 });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    paginadorPub = crearPaginador(document.getElementById('paginador-publicaciones'), {
        alCambiar: (pagina) => cargarPublicacionesPublicas(pagina, { subir: true }),
        singular: 'publicación',
        plural: 'publicaciones'
    });

    paginadorEmp = crearPaginador(document.getElementById('paginador-emprendimientos'), {
        alCambiar: (pagina) => cargarEmprendimientosColumna(pagina),
        singular: 'emprendimiento',
        plural: 'emprendimientos'
    });

    // Al escribir se espera un momento antes de buscar, para no consultar con cada letra
    document.getElementById('buscar-publicacion').addEventListener('input', () => {
        clearTimeout(esperaBusqueda);
        esperaBusqueda = setTimeout(aplicarFiltro, 350);
    });
    document.getElementById('filtro-rubro').addEventListener('change', aplicarFiltro);
    document.getElementById('filtros-publicaciones').addEventListener('submit', (e) => {
        e.preventDefault();
        clearTimeout(esperaBusqueda);
        aplicarFiltro();
    });
    aplicarFiltro();
});
