// =========================================================
// noticias.js - Página "Noticias" del menú
// A la izquierda se ve una noticia completa (al entrar, la más reciente) y a la derecha una columna
// con el título y la fecha de todas, de a 5 por página. El contenido se pide de a una noticia.
// Los usuarios con permiso de Noticiero (Empleado de Área o Administrador) además pueden publicar,
// editar las suyas durante la primera hora y ocultar/mostrar o eliminar cualquiera (las ocultas solo las ven ellos).
// El contenido admite **negrita**, *cursiva* y __subrayado__ (se guarda así, como texto).
// Usa crearPaginador() de paginador.js
// =========================================================

const TAMANIO_MAXIMO_IMAGEN = 2 * 1024 * 1024; // igual que helpers/imagenes.js
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];

const escaparNot = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const formatearFecha = (fecha) => new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});
const formatearFechaCorta = (fecha) => new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
});

let paginador = null;
let paginaColumna = 1;
let noticiasColumna = [];       // título y fecha de la página actual de la columna
let noticiaActual = null;       // la que se ve completa
let puedePublicar = false;
let editandoId = null;          // null = noticia nueva
let imagenNueva = null;         // dataURL elegido en el formulario
let quitarImagenActual = false; // al editar: quitar la imagen que ya tenía

// Si hay sesión se manda el token: así el servidor sabe si es noticiero
const encabezados = (json = false) => {
    const token = sessionStorage.getItem('token_ministerio');
    return {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const pedirJson = async (url, opciones = {}) => {
    const respuesta = await fetch(url, { headers: encabezados(Boolean(opciones.body)), ...opciones });
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const error = new Error(data.error || `Error ${respuesta.status}`);
        error.status = respuesta.status;
        throw error;
    }
    return data;
};

const minutosRestantes = (noticia) => Math.ceil((noticia.venceEdicion - Date.now()) / 60000);
const sigueEditable = (noticia) => noticia.venceEdicion > Date.now();

// ---------- Formato: **negrita**, *cursiva*, __subrayado__ ----------

const MARCAS_FORMATO = { negrita: '**', cursiva: '*', subrayado: '__' };
const ETIQUETAS_FORMATO = { '**': 'strong', '*': 'em', '__': 'u' };

// Convierte las marcas de una línea en etiquetas. Las marcas sin pareja quedan como texto,
// y las etiquetas siempre cierran en orden (nunca queda HTML mal anidado). Todo el texto se escapa.
function formatearLinea(linea) {
    const partes = linea.split(/(\*\*|__|\*)/); // posiciones pares = texto, impares = marca
    const salida = [];
    const abiertas = []; // posiciones en "salida" de las marcas abiertas

    for (let i = 0; i < partes.length; i++) {
        if (i % 2 === 0) {
            salida.push({ texto: partes[i] });
            continue;
        }
        // Marcas pegadas (ej: el cierre de ***texto***) se procesan juntas para cerrarlas en orden
        const tramo = [partes[i]];
        while (i + 2 < partes.length && partes[i + 1] === '') {
            i += 2;
            tramo.push(partes[i]);
        }
        let cerro = true;
        while (cerro && tramo.length) {
            cerro = false;
            const tope = abiertas.length ? salida[abiertas[abiertas.length - 1]].marca : null;
            const posicion = tramo.indexOf(tope);
            if (posicion >= 0) {
                tramo.splice(posicion, 1);
                salida[abiertas.pop()].abre = true;
                salida.push({ marca: tope, cierra: true });
                cerro = true;
            }
        }
        tramo.forEach((marca) => {
            abiertas.push(salida.length);
            salida.push({ marca });
        });
    }

    return salida.map((p) => {
        if (p.texto !== undefined) return escaparNot(p.texto);
        if (p.abre) return `<${ETIQUETAS_FORMATO[p.marca]}>`;
        if (p.cierra) return `</${ETIQUETAS_FORMATO[p.marca]}>`;
        return escaparNot(p.marca);
    }).join('');
}

const formatearContenido = (texto) => String(texto ?? '').split('\n').map(formatearLinea).join('<br>');

// Cantidad de asteriscos seguidos al final / al principio de un texto
const asteriscosAlFinal = (t) => t.length - t.replace(/\*+$/, '').length;
const asteriscosAlInicio = (t) => t.length - t.replace(/^\*+/, '').length;

// Pone o saca la marca alrededor del texto seleccionado en el contenido
function aplicarFormato(tipo) {
    const area = document.getElementById('noticia-contenido');
    const marca = MARCAS_FORMATO[tipo];
    const { value } = area;
    let inicio = area.selectionStart;
    let fin = area.selectionEnd;

    // Los espacios de los bordes quedan afuera de la marca ("** hola**" no se vería en negrita)
    while (inicio < fin && /\s/.test(value[inicio])) inicio++;
    while (fin > inicio && /\s/.test(value[fin - 1])) fin--;

    const antes = value.slice(0, inicio);
    const despues = value.slice(fin);
    const yaTiene = {
        negrita: asteriscosAlFinal(antes) >= 2 && asteriscosAlInicio(despues) >= 2,
        cursiva: [1, 3].includes(asteriscosAlFinal(antes)) && [1, 3].includes(asteriscosAlInicio(despues)),
        subrayado: antes.endsWith('__') && despues.startsWith('__')
    }[tipo];

    if (yaTiene && inicio !== fin) {
        area.setRangeText(value.slice(inicio, fin), inicio - marca.length, fin + marca.length, 'select');
    } else {
        area.setRangeText(`${marca}${value.slice(inicio, fin)}${marca}`, inicio, fin, 'select');
        // Queda seleccionado solo el texto (sin las marcas); si no había selección, el cursor queda en el medio
        area.setSelectionRange(inicio + marca.length, fin + marca.length);
    }
    area.focus();
    area.dispatchEvent(new Event('input'));
}

// ---------- Columna de la derecha ----------

function pintarColumna() {
    const lista = document.getElementById('lista-noticias');
    if (!noticiasColumna.length) {
        lista.innerHTML = '<li class="sin-datos">Todavía no hay noticias.</li>';
        return;
    }
    lista.innerHTML = noticiasColumna.map((n) => {
        const seleccionada = noticiaActual?.idNoticia === n.idNoticia;
        return `
            <li>
                <button type="button" class="item-noticia ${seleccionada ? 'seleccionada' : ''} ${n.visible ? '' : 'oculta'}"
                    data-id="${n.idNoticia}" ${seleccionada ? 'aria-current="true"' : ''}>
                    <span class="item-noticia-titulo">${escaparNot(n.titulo)}</span>
                    <span class="item-noticia-fecha">
                        <i class="fa-regular fa-calendar"></i> ${formatearFechaCorta(n.fechaCreacion)}${n.visible ? '' : ' · Oculta'}
                    </span>
                </button>
            </li>`;
    }).join('');
}

async function cargarColumna(pagina = 1) {
    paginador.cargando();
    try {
        const data = await pedirJson(`/api/noticias?page=${pagina}`);
        noticiasColumna = data.noticias;
        paginaColumna = data.pagina;
        puedePublicar = data.puedePublicar;
        document.getElementById('btn-nueva-noticia').hidden = !puedePublicar;
        if (!puedePublicar) cerrarFormulario();
        pintarColumna();
        paginador.actualizar(data);
        return data;
    } catch (error) {
        console.error('No se pudieron cargar las noticias:', error);
        document.getElementById('lista-noticias').innerHTML = `<li class="sin-datos">${escaparNot(error.message)}</li>`;
        paginador.actualizar({ pagina: paginaColumna, totalPaginas: 0, totalRegistros: 0 });
        throw error;
    }
}

// ---------- Noticia completa ----------

function pintarNoticiaPrincipal() {
    const contenedor = document.getElementById('noticia-principal');
    const n = noticiaActual;
    if (!n) {
        contenedor.innerHTML = '<p class="sin-datos">Todavía no hay noticias publicadas.</p>';
        return;
    }

    const acciones = puedePublicar ? `
        <div class="noticia-acciones">
            ${sigueEditable(n) ? `
                <button type="button" class="btn-noticia editar" data-accion="editar">
                    <i class="fa-solid fa-pen"></i> Editar <span class="tiempo-edicion">(quedan ${minutosRestantes(n)} min)</span>
                </button>` : ''}
            <button type="button" class="btn-noticia" data-accion="visible">
                ${n.visible ? '<i class="fa-solid fa-eye-slash"></i> Ocultar' : '<i class="fa-solid fa-eye"></i> Mostrar'}
            </button>
            <button type="button" class="btn-noticia eliminar" data-accion="eliminar">
                <i class="fa-solid fa-trash"></i> Eliminar
            </button>
        </div>` : '';

    contenedor.innerHTML = `
        <article class="noticia-card ${n.visible ? '' : 'oculta'}">
            ${n.imagen ? `<a href="${escaparNot(n.imagen)}" target="_blank" rel="noopener" data-ampliar><img class="noticia-imagen" src="${escaparNot(n.imagen)}" alt="Imagen de la noticia"></a>` : ''}
            <div class="noticia-cuerpo">
                <div class="noticia-meta">
                    <span><i class="fa-regular fa-calendar"></i>${formatearFecha(n.fechaCreacion)}</span>
                    <span><i class="fa-regular fa-user"></i>${escaparNot(n.autor)}</span>
                    ${n.fechaEdicion ? `<span title="Editada el ${formatearFecha(n.fechaEdicion)}"><i class="fa-solid fa-pen"></i>Editada</span>` : ''}
                    ${n.visible ? '' : '<span class="etiqueta-oculta">Oculta al público</span>'}
                </div>
                <h3>${escaparNot(n.titulo)}</h3>
                <div class="noticia-texto">${formatearContenido(n.contenido)}</div>
                ${acciones}
            </div>
        </article>`;
}

async function mostrarNoticia(idNoticia, { desplazar = false } = {}) {
    try {
        const n = await pedirJson(`/api/noticias/${encodeURIComponent(idNoticia)}`);
        // Hora límite de edición según el reloj de esta PC (el servidor manda los segundos que quedan)
        noticiaActual = { ...n, venceEdicion: Date.now() + n.segundosEdicion * 1000 };
        history.replaceState(null, '', `#noticia-${n.idNoticia}`);
        pintarNoticiaPrincipal();
        pintarColumna();
        if (desplazar) {
            const principal = document.getElementById('noticia-principal');
            if (principal.getBoundingClientRect().top < 0 || principal.getBoundingClientRect().top > window.innerHeight / 2) {
                principal.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        return true;
    } catch (error) {
        if (error.status === 404) return false;
        Swal.fire({ icon: 'error', title: 'No se pudo abrir la noticia', text: error.message, confirmButtonColor: '#1a3a5f' });
        return false;
    }
}

// La de la URL (#noticia-12) si existe; si no, la más reciente
async function mostrarNoticiaInicial() {
    const idEnUrl = Number((location.hash.match(/^#noticia-(\d+)$/) || [])[1]);
    if (idEnUrl && await mostrarNoticia(idEnUrl)) return;
    noticiaActual = null;
    if (noticiasColumna.length) await mostrarNoticia(noticiasColumna[0].idNoticia);
    else pintarNoticiaPrincipal();
}

// Cada 30 segundos se actualizan los minutos que quedan para editar (y desaparece el botón al cumplirse la hora)
function refrescarTiemposDeEdicion() {
    if (!puedePublicar || !noticiaActual) return;
    const etiqueta = document.querySelector('#noticia-principal .tiempo-edicion');
    if (etiqueta && sigueEditable(noticiaActual)) etiqueta.textContent = `(quedan ${minutosRestantes(noticiaActual)} min)`;
    else if (etiqueta) pintarNoticiaPrincipal();

    if (editandoId === noticiaActual.idNoticia) {
        if (sigueEditable(noticiaActual)) mostrarAvisoEdicion(noticiaActual);
        else mostrarAvisoEdicion(null, 'Se cumplió la hora para editar esta noticia: ya no se pueden guardar cambios.');
    }
}

// ---------- Formulario ----------

function actualizarContadores() {
    document.querySelectorAll('.contador-caracteres').forEach((contador) => {
        const campo = document.getElementById(contador.dataset.para);
        contador.textContent = `${campo.value.length} / ${campo.maxLength}`;
    });
}

function actualizarVistaPrevia() {
    const contenido = document.getElementById('noticia-contenido').value;
    document.getElementById('campo-vista-previa').hidden = !contenido.trim();
    document.getElementById('vista-previa-contenido').innerHTML = formatearContenido(contenido);
}

function mostrarVistaPreviaImagen(url) {
    document.getElementById('vista-previa-imagen').hidden = !url;
    document.getElementById('img-vista-previa').src = url || '';
    document.getElementById('texto-selector-imagen').textContent = url ? 'Cambiar imagen' : 'Elegir imagen';
}

function mostrarAvisoEdicion(noticia, texto) {
    const aviso = document.getElementById('aviso-edicion');
    aviso.hidden = false;
    aviso.innerHTML = texto
        ? `<i class="fa-solid fa-triangle-exclamation"></i> ${escaparNot(texto)}`
        : `<i class="fa-regular fa-clock"></i> Editando "${escaparNot(noticia.titulo)}". Quedan ${minutosRestantes(noticia)} min para guardar cambios.`;
}

function limpiarFormulario() {
    editandoId = null;
    imagenNueva = null;
    quitarImagenActual = false;
    document.getElementById('form-noticia').reset();
    mostrarVistaPreviaImagen(null);
    actualizarContadores();
    actualizarVistaPrevia();
    document.getElementById('titulo-formulario-noticia').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Nueva noticia';
    document.getElementById('btn-publicar-noticia').innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar noticia';
    document.getElementById('aviso-edicion').hidden = true;
}

function abrirFormulario() {
    document.getElementById('panel-noticiero').hidden = false;
    document.getElementById('btn-nueva-noticia').setAttribute('aria-expanded', 'true');
    document.getElementById('panel-noticiero').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('noticia-titulo').focus({ preventScroll: true });
}

function cerrarFormulario() {
    limpiarFormulario();
    document.getElementById('panel-noticiero').hidden = true;
    document.getElementById('btn-nueva-noticia').setAttribute('aria-expanded', 'false');
}

function empezarEdicion(noticia) {
    if (!sigueEditable(noticia)) {
        Swal.fire({ icon: 'info', title: 'Ya no se puede editar', text: 'Pasó la hora desde que se publicó. Solo se puede ocultar o mostrar.', confirmButtonColor: '#1a3a5f' });
        pintarNoticiaPrincipal();
        return;
    }
    limpiarFormulario();
    editandoId = noticia.idNoticia;
    document.getElementById('noticia-titulo').value = noticia.titulo;
    document.getElementById('noticia-contenido').value = noticia.contenido;
    mostrarVistaPreviaImagen(noticia.imagen);
    actualizarContadores();
    actualizarVistaPrevia();
    document.getElementById('titulo-formulario-noticia').innerHTML = '<i class="fa-solid fa-pen"></i> Editar noticia';
    document.getElementById('btn-publicar-noticia').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
    mostrarAvisoEdicion(noticia);
    abrirFormulario();
}

function leerImagenElegida(evento) {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
        evento.target.value = '';
        Swal.fire({ icon: 'warning', title: 'Formato no permitido', text: 'Solo se permiten imágenes JPG, PNG o WEBP.', confirmButtonColor: '#1a3a5f' });
        return;
    }
    if (archivo.size > TAMANIO_MAXIMO_IMAGEN) {
        evento.target.value = '';
        Swal.fire({ icon: 'warning', title: 'Imagen muy pesada', text: 'La imagen debe pesar como máximo 2 MB.', confirmButtonColor: '#1a3a5f' });
        return;
    }
    const lector = new FileReader();
    lector.onload = () => {
        imagenNueva = lector.result;
        mostrarVistaPreviaImagen(imagenNueva);
    };
    lector.readAsDataURL(archivo);
}

function quitarImagen() {
    // Si estaba editando, se avisa al servidor que quite la imagen que ya tenía (si tenía)
    if (editandoId) quitarImagenActual = true;
    imagenNueva = null;
    document.getElementById('noticia-imagen').value = '';
    mostrarVistaPreviaImagen(null);
}

async function enviarNoticia(evento) {
    evento.preventDefault();
    const titulo = document.getElementById('noticia-titulo').value.trim();
    const contenido = document.getElementById('noticia-contenido').value.trim();
    if (!titulo || !contenido) {
        Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Escriba el título y el contenido de la noticia.', confirmButtonColor: '#1a3a5f' });
        return;
    }

    const editando = editandoId !== null;
    const cuerpo = { titulo, contenido };
    if (imagenNueva) cuerpo.imagen = imagenNueva;
    if (editando && quitarImagenActual && !imagenNueva) cuerpo.quitarImagen = true;

    const boton = document.getElementById('btn-publicar-noticia');
    boton.disabled = true;
    try {
        const data = await pedirJson(editando ? `/api/noticias/${editandoId}` : '/api/noticias', {
            method: editando ? 'PUT' : 'POST',
            body: JSON.stringify(cuerpo)
        });
        const idMostrar = editando ? editandoId : data.idNoticia;

        await Swal.fire({ icon: 'success', title: editando ? 'Noticia actualizada' : 'Noticia publicada', text: data.mensaje, confirmButtonColor: '#1a3a5f' });
        cerrarFormulario();
        // Una nueva aparece primera en la columna; una editada puede haber cambiado de título
        await cargarColumna(editando ? paginaColumna : 1);
        await mostrarNoticia(idMostrar, { desplazar: true });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: error.message, confirmButtonColor: '#1a3a5f' });
    } finally {
        boton.disabled = false;
    }
}

async function cambiarVisibilidad(noticia) {
    const ocultar = noticia.visible;
    const confirmacion = await Swal.fire({
        icon: 'question',
        title: ocultar ? '¿Ocultar la noticia?' : '¿Mostrar la noticia?',
        text: ocultar
            ? `"${noticia.titulo}" dejará de verse en la página pública. Se puede volver a mostrar cuando quiera.`
            : `"${noticia.titulo}" volverá a verse en la página pública.`,
        showCancelButton: true,
        confirmButtonText: ocultar ? 'Sí, ocultar' : 'Sí, mostrar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1a3a5f'
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const data = await pedirJson(`/api/noticias/${noticia.idNoticia}/visible`, {
            method: 'PATCH',
            body: JSON.stringify({ visible: !ocultar })
        });
        noticia.visible = !ocultar;
        const enColumna = noticiasColumna.find((n) => n.idNoticia === noticia.idNoticia);
        if (enColumna) enColumna.visible = noticia.visible;
        pintarNoticiaPrincipal();
        pintarColumna();
        Swal.fire({ icon: 'success', title: data.mensaje, timer: 1800, showConfirmButton: false });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'No se pudo cambiar', text: error.message, confirmButtonColor: '#1a3a5f' });
    }
}

// Borra la noticia para siempre (a diferencia de ocultar) y muestra la siguiente
async function eliminarNoticia(noticia) {
    const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar la noticia?',
        text: `"${noticia.titulo}" se va a borrar junto con su imagen y no se puede recuperar. Si solo querés que no se vea, usá "Ocultar".`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#a65454',
        focusCancel: true
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const data = await pedirJson(`/api/noticias/${noticia.idNoticia}`, { method: 'DELETE' });
        if (editandoId === noticia.idNoticia) cerrarFormulario();
        history.replaceState(null, '', location.pathname); // que no quede el #noticia-N de la borrada
        await cargarColumna(paginaColumna);
        await mostrarNoticiaInicial();
        Swal.fire({ icon: 'success', title: data.mensaje, timer: 1800, showConfirmButton: false });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: error.message, confirmButtonColor: '#1a3a5f' });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    paginador = crearPaginador(document.getElementById('paginador-noticias'), {
        alCambiar: (pagina) => cargarColumna(pagina).catch(() => {}),
        singular: 'noticia',
        plural: 'noticias'
    });

    // Formulario
    document.getElementById('btn-nueva-noticia').addEventListener('click', () => {
        const panel = document.getElementById('panel-noticiero');
        if (!panel.hidden && editandoId === null) return cerrarFormulario();
        limpiarFormulario();
        abrirFormulario();
    });
    document.getElementById('btn-cancelar-formulario').addEventListener('click', cerrarFormulario);
    document.getElementById('form-noticia').addEventListener('submit', enviarNoticia);
    document.getElementById('noticia-imagen').addEventListener('change', leerImagenElegida);
    document.getElementById('btn-quitar-imagen').addEventListener('click', quitarImagen);
    document.getElementById('noticia-titulo').addEventListener('input', actualizarContadores);
    document.getElementById('noticia-contenido').addEventListener('input', () => {
        actualizarContadores();
        actualizarVistaPrevia();
    });

    // Negrita / cursiva / subrayado: botones y atajos de teclado
    document.querySelectorAll('[data-formato]').forEach((boton) => {
        boton.addEventListener('mousedown', (e) => e.preventDefault()); // no perder la selección del texto
        boton.addEventListener('click', () => aplicarFormato(boton.dataset.formato));
    });
    document.getElementById('noticia-contenido').addEventListener('keydown', (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        const tipo = { b: 'negrita', i: 'cursiva', u: 'subrayado' }[e.key.toLowerCase()];
        if (!tipo) return;
        e.preventDefault();
        aplicarFormato(tipo);
    });

    // Columna y noticia completa
    document.getElementById('lista-noticias').addEventListener('click', (e) => {
        const item = e.target.closest('.item-noticia');
        if (item) mostrarNoticia(Number(item.dataset.id), { desplazar: true });
    });
    document.getElementById('noticia-principal').addEventListener('click', (e) => {
        const boton = e.target.closest('[data-accion]');
        if (!boton || !noticiaActual) return;
        if (boton.dataset.accion === 'editar') empezarEdicion(noticiaActual);
        if (boton.dataset.accion === 'visible') cambiarVisibilidad(noticiaActual);
        if (boton.dataset.accion === 'eliminar') eliminarNoticia(noticiaActual);
    });
    window.addEventListener('hashchange', () => {
        const id = Number((location.hash.match(/^#noticia-(\d+)$/) || [])[1]);
        if (id && id !== noticiaActual?.idNoticia) mostrarNoticia(id);
    });

    actualizarContadores();
    setInterval(refrescarTiemposDeEdicion, 30000);

    try {
        await cargarColumna(1);
        await mostrarNoticiaInicial();
    } catch (error) {
        document.getElementById('noticia-principal').innerHTML =
            `<p class="sin-datos">${escaparNot(error.message || 'No se pudieron cargar las noticias. Intentá de nuevo más tarde.')}</p>`;
    }
});
