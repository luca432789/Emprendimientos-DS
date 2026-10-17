// =========================================================
// publicaciones-publicas.js - Página "Publicaciones" del menú
// Muestra todas las publicaciones aprobadas por el Ministerio, con buscador y filtro por rubro.
// Cada tarjeta lleva al perfil público del emprendimiento.
// =========================================================

const escaparPub = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Minúsculas y sin tildes, para buscar sin errores de escritura
const normalizarPub = (texto) => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const urlPerfil = (id) => `/VISTA%20USUARIO/CdE-Perfil%20Emprendedor.html?id=${encodeURIComponent(id)}`;

let todasLasPublicaciones = [];

function fotosPub(fotos) {
    if (!fotos.length) return '';
    const visibles = fotos.slice(0, 4);
    return `<div class="pub-fotos fotos-${visibles.length}">${visibles.map((url) =>
        `<a href="${escaparPub(url)}" target="_blank" rel="noopener"><img src="${escaparPub(url)}" alt="Foto de la publicación" loading="lazy"></a>`).join('')}</div>`;
}

function pintarPublicaciones() {
    const lista = document.getElementById('lista-publicaciones');
    const contador = document.getElementById('contador-publicaciones');
    const texto = normalizarPub(document.getElementById('buscar-publicacion').value.trim());
    const rubro = document.getElementById('filtro-rubro').value;

    const filtradas = todasLasPublicaciones.filter((p) =>
        (!rubro || String(p.idRubro) === rubro) &&
        (!texto || normalizarPub(`${p.emprendimiento} ${p.titulo} ${p.descripcion} ${p.rubro}`).includes(texto)));

    contador.textContent = todasLasPublicaciones.length
        ? `${filtradas.length} de ${todasLasPublicaciones.length} publicaciones`
        : '';

    if (!filtradas.length) {
        lista.innerHTML = `<p class="sin-datos">${todasLasPublicaciones.length
            ? 'Ninguna publicación coincide con la búsqueda.'
            : 'Todavía no hay publicaciones aprobadas.'}</p>`;
        return;
    }

    lista.innerHTML = filtradas.map((p) => `
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

async function cargarPublicacionesPublicas() {
    try {
        const respuesta = await fetch('/api/publicaciones');
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
        todasLasPublicaciones = await respuesta.json();

        // Rubros que tienen publicaciones
        const rubros = new Map();
        todasLasPublicaciones.forEach((p) => { if (p.idRubro) rubros.set(String(p.idRubro), p.rubro); });
        const select = document.getElementById('filtro-rubro');
        [...rubros.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es')).forEach(([id, nombre]) => {
            select.add(new Option(nombre, id));
        });

        pintarPublicaciones();
    } catch (error) {
        console.error('No se pudieron cargar las publicaciones:', error);
        document.getElementById('lista-publicaciones').innerHTML =
            '<p class="sin-datos">No se pudieron cargar las publicaciones. Intentá de nuevo más tarde.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('buscar-publicacion').addEventListener('input', pintarPublicaciones);
    document.getElementById('filtro-rubro').addEventListener('change', pintarPublicaciones);
    document.getElementById('filtros-publicaciones').addEventListener('submit', (e) => e.preventDefault());
    cargarPublicacionesPublicas();
});
