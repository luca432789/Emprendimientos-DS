// =========================================================
// publicaciones.js - Pestañas "Acerca de" y "Publicaciones" del perfil
// Necesita perfil-emprendedor.js (evento 'perfil-listo').
//  - Dueño: crea publicaciones (máx. 2, con hasta 4 fotos), ve su estado y las edita.
//  - Visitante: ve solo lo aprobado por el Ministerio.
// =========================================================

const MAXIMO_FOTOS_PUBLICACION = 4;
let formularioPublicacionListo = false;

document.addEventListener('perfil-listo', ({ detail: Perfil }) => {
    const formulario = document.getElementById('form-publicacion');
    const seccionFormulario = formulario?.closest('.card, section');

    if (formulario) {
        if (!Perfil.esDueno) {
            seccionFormulario.style.display = 'none';
        } else {
            seccionFormulario.style.display = '';
            prepararFormulario(Perfil, formulario);
            actualizarCupo(Perfil, formulario);
        }
    }

    if (document.body.dataset.pagina === 'publicaciones') pintarPestanaPublicaciones(Perfil);
});

// Cuántas publicaciones le quedan; si no le quedan, el formulario se reemplaza por un aviso
function actualizarCupo(Perfil, formulario) {
    const usadas = Perfil.datos.misPublicaciones.length;
    const maximo = Perfil.datos.maximoPublicaciones;
    const aviso = document.getElementById('aviso-cupo-publicaciones') || (() => {
        const p = document.createElement('p');
        p.id = 'aviso-cupo-publicaciones';
        p.className = 'aviso-cupo';
        formulario.before(p);
        return p;
    })();

    const lleno = usadas >= maximo;
    formulario.style.display = lleno ? 'none' : '';
    aviso.innerHTML = lleno
        ? `Ya usaste tus ${maximo} publicaciones. Para publicar algo nuevo, <a href="Publicaciones.html">editá una de ellas</a>.`
        : `Podés tener hasta ${maximo} publicaciones (te ${maximo - usadas === 1 ? 'queda 1' : `quedan ${maximo - usadas}`}). Cada una la revisa el Ministerio antes de mostrarse.`;
}

// Vista previa de las fotos elegidas
function prepararVistaPrevia(inputFotos, contenedor) {
    inputFotos.addEventListener('change', () => {
        contenedor.innerHTML = [...inputFotos.files].map((archivo) =>
            `<img src="${URL.createObjectURL(archivo)}" alt="Vista previa">`).join('');
    });
}

function prepararFormulario(Perfil, formulario) {
    if (formularioPublicacionListo) return; // el perfil se recarga, el formulario se prepara una sola vez
    formularioPublicacionListo = true;

    const inputFotos = formulario.querySelector('#input-foto');
    const etiquetaFotos = formulario.querySelector('label[for="input-foto"]');
    const vistaPrevia = document.createElement('div');
    vistaPrevia.className = 'vista-previa-fotos';
    formulario.querySelector('.acciones-publicacion').before(vistaPrevia);

    if (inputFotos) {
        inputFotos.multiple = true;
        inputFotos.accept = 'image/jpeg,image/png,image/webp';
        if (etiquetaFotos) etiquetaFotos.title = `Agregar fotos (hasta ${MAXIMO_FOTOS_PUBLICACION}, 2 MB cada una)`;
        prepararVistaPrevia(inputFotos, vistaPrevia);
    }

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const boton = formulario.querySelector('button[type="submit"]');
        const titulo = formulario.querySelector('#publicacion-titulo')?.value || '';
        const descripcion = formulario.querySelector('#publicacion-texto')?.value || '';
        const archivos = inputFotos?.files || [];

        const errorFotos = Perfil.validarImagenes(archivos, MAXIMO_FOTOS_PUBLICACION);
        if (errorFotos) return Perfil.aviso('warning', 'Revisá las fotos', errorFotos);

        boton.disabled = true;
        try {
            const fotos = await Perfil.leerArchivos(archivos);
            const { ok, datos } = await Perfil.api('POST', '/api/publicaciones', { titulo, descripcion, fotos });
            if (!ok) return Perfil.aviso('error', 'No se pudo publicar', datos.error);

            formulario.reset();
            vistaPrevia.innerHTML = '';
            await Perfil.aviso('info', 'Enviado a revisión', 'Tu publicación fue enviada al Ministerio. Será visible una vez aprobada.');
            await Perfil.recargar();
        } catch (error) {
            Perfil.aviso('error', 'Error de red', error.message || 'No se pudo conectar con el servidor.');
        } finally {
            boton.disabled = false;
        }
    });
}

// ---------- Pestaña Publicaciones ----------
function pintarPestanaPublicaciones(Perfil) {
    const feed = document.getElementById('feed-publicaciones');
    if (!feed) return;

    if (!Perfil.esDueno) {
        feed.innerHTML = Perfil.htmlPublicacionesAprobadas(Perfil.datos.publicaciones, Perfil.datos.emprendimiento.nombre);
        resaltarPublicacionDelEnlace();
        return;
    }

    const { misPublicaciones, maximoPublicaciones } = Perfil.datos;
    if (!misPublicaciones.length) {
        feed.innerHTML = '<p class="sin-datos">Todavía no creaste publicaciones.</p>';
        return;
    }

    const esc = Perfil.escapar;
    const estados = {
        0: '<span class="estado-pub aprobada"><i class="fa-solid fa-circle-check"></i> Aprobada y visible</span>',
        1: '<span class="estado-pub revision"><i class="fa-solid fa-clock"></i> En revisión por el Ministerio</span>',
        2: '<span class="estado-pub rechazada"><i class="fa-solid fa-circle-xmark"></i> Rechazada</span>'
    };

    feed.innerHTML = `<h3 class="titulo-mis-publicaciones">Mis publicaciones (${misPublicaciones.length}/${maximoPublicaciones})</h3>` +
        misPublicaciones.map((p, i) => {
            // Se muestra la versión que el emprendedor está trabajando (pendiente/rechazada) o la aprobada
            const version = p.estado !== 0 && p.pendiente ? p.pendiente : p.aprobada;
            return `
                <article class="card publicacion-card post-card" id="publicacion-${p.idPublicacion}">
                    <div class="publicacion-header">
                        <h4>${esc(version?.titulo)}</h4>
                        ${estados[p.estado] || ''}
                    </div>
                    ${p.estado === 2 ? `<p class="motivo-rechazo"><strong>Motivo:</strong> ${esc(p.motivoRechazo || 'Sin especificar')}</p>` : ''}
                    <div class="publicacion-body">
                        <p>${Perfil.parrafos(version?.descripcion)}</p>
                        ${Perfil.htmlFotos(version?.fotos)}
                    </div>
                    ${p.estado !== 0 && p.aprobada ? '<p class="nota-version">Mientras tanto, se sigue mostrando la versión aprobada anterior.</p>' : ''}
                    <div class="acciones-publicacion">
                        <span class="post-fecha">Enviada el ${Perfil.fecha(p.fechaSolicitud)}</span>
                        <button type="button" class="btn-publicar btn-editar-publicacion" data-indice="${i}">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                    </div>
                </article>`;
        }).join('');

    feed.querySelectorAll('.btn-editar-publicacion').forEach((boton) => {
        boton.addEventListener('click', () => editarPublicacion(Perfil, misPublicaciones[Number(boton.dataset.indice)]));
    });
    resaltarPublicacionDelEnlace();
}

// Si se llegó desde una notificación (#publicacion-N), baja hasta esa publicación y la resalta
function resaltarPublicacionDelEnlace() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!/^publicacion-\d+$/.test(id)) return;
    const tarjeta = document.getElementById(id);
    if (!tarjeta) return;
    tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tarjeta.classList.remove('publicacion-resaltada');
    void tarjeta.offsetWidth; // reinicia la animación si ya estaba resaltada
    tarjeta.classList.add('publicacion-resaltada');
}

// Clic en una notificación estando ya en esta pestaña: solo cambia el #.
// Se recargan los datos (puede haber una resolución nueva) y al redibujar se resalta.
window.addEventListener('hashchange', () => {
    if (window.Perfil?.datos) window.Perfil.recargar();
    else resaltarPublicacionDelEnlace();
});

async function editarPublicacion(Perfil, publicacion) {
    const version = publicacion.estado !== 0 && publicacion.pendiente ? publicacion.pendiente : publicacion.aprobada;
    const fotosActuales = version?.fotos || [];
    const esc = Perfil.escapar;

    const { isConfirmed, value } = await Swal.fire({
        title: 'Editar publicación',
        width: 620,
        html: `
            <div class="form-editar-publicacion">
                <label>Título <input id="edit-titulo" class="swal2-input" maxlength="150" value="${esc(version?.titulo)}"></label>
                <label>Texto <textarea id="edit-texto" class="swal2-textarea" maxlength="5000">${esc(version?.descripcion)}</textarea></label>
                ${fotosActuales.length ? `
                    <div class="vista-previa-fotos">${fotosActuales.map((u) => `<img src="${esc(u)}" alt="Foto actual">`).join('')}</div>
                    <label class="check-fotos"><input type="checkbox" id="edit-conservar" checked> Conservar estas fotos</label>` : ''}
                <label>Fotos nuevas (reemplazan a las anteriores, hasta ${MAXIMO_FOTOS_PUBLICACION})
                    <input type="file" id="edit-fotos" accept="image/jpeg,image/png,image/webp" multiple>
                </label>
                <div class="vista-previa-fotos" id="edit-vista-previa"></div>
                <p class="nota-version">Al guardar, los cambios vuelven a revisión del Ministerio.</p>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Enviar a revisión',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2f4e78',
        didOpen: () => prepararVistaPrevia(document.getElementById('edit-fotos'), document.getElementById('edit-vista-previa')),
        preConfirm: async () => {
            const descripcion = document.getElementById('edit-texto').value.trim();
            const archivos = document.getElementById('edit-fotos').files;
            if (!descripcion) return Swal.showValidationMessage('Escribí el texto de la publicación.');
            const errorFotos = Perfil.validarImagenes(archivos, MAXIMO_FOTOS_PUBLICACION);
            if (errorFotos) return Swal.showValidationMessage(errorFotos);
            return {
                titulo: document.getElementById('edit-titulo').value,
                descripcion,
                fotos: await Perfil.leerArchivos(archivos),
                conservarFotos: Boolean(document.getElementById('edit-conservar')?.checked)
            };
        }
    });
    if (!isConfirmed) return;

    const { ok, datos } = await Perfil.api('PUT', `/api/publicaciones/${publicacion.idPublicacion}`, value);
    if (!ok) return Perfil.aviso('error', 'No se pudo guardar', datos.error);
    await Perfil.aviso('info', 'Enviado a revisión', datos.mensaje);
    await Perfil.recargar();
}
