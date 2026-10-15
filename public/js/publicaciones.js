document.addEventListener('DOMContentLoaded', () => {
    const formPublicacion = document.getElementById('form-publicacion');
    const feedPublicaciones = document.getElementById('feed-publicaciones');
    const token = sessionStorage.getItem('token_ministerio');

    // El texto lo escribe el emprendedor: se escapa antes de meterlo en el HTML
    const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    // La subida de fotos todavía no está implementada en el servidor: se oculta el botón
    const botonFoto = document.querySelector('label[for="input-foto"]');
    if (botonFoto) botonFoto.style.display = 'none';

    const aviso = (icon, title, text) => (typeof Swal !== 'undefined'
        ? Swal.fire({ icon, title, text, confirmButtonColor: '#2f4e78' })
        : alert(`${title}\n${text}`));

    // Sin sesión de emprendedor no se puede publicar
    if (!token) {
        if (formPublicacion) {
            formPublicacion.closest('section').innerHTML = '<h3>Crear publicación</h3><p>Iniciá sesión como emprendedor para publicar. <a href="/login">Iniciar sesión</a></p>';
        }
        if (feedPublicaciones) feedPublicaciones.innerHTML = '';
        return;
    }

    // A. ENVIAR FORMULARIO DE PUBLICACIÓN
    if (formPublicacion) {
        formPublicacion.addEventListener('submit', async (e) => {
            e.preventDefault();

            const tituloInput = document.getElementById('publicacion-titulo');
            const textoInput = document.getElementById('publicacion-texto');

            const titulo = tituloInput ? tituloInput.value : 'Novedades del Emprendimiento';
            const texto = textoInput ? textoInput.value : '';

            try {
                const respuesta = await fetch('/api/publicaciones', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ titulo, descripcion: texto })
                });

                const resultado = await respuesta.json().catch(() => ({}));

                if (respuesta.ok) {
                    aviso('info', 'Enviado a revisión', 'Tu publicación ha sido enviada al Ministerio. Será visible una vez aprobada.');
                    formPublicacion.reset();
                    cargarMisPublicaciones();
                } else if (respuesta.status === 401) {
                    aviso('warning', 'Sesión vencida', 'Volvé a iniciar sesión para publicar.');
                } else {
                    aviso('error', 'Error', resultado.error || 'No se pudo enviar la publicación.');
                }
            } catch (error) {
                console.error('Error al enviar publicación:', error);
                aviso('error', 'Error de Red', 'No se pudo conectar con el servidor.');
            }
        });
    }

    // B. CARGAR EL PERFIL: nombre/rubro, estado de la revisión y publicaciones aprobadas
    async function cargarMisPublicaciones() {
        if (!feedPublicaciones) return;

        try {
            const respuesta = await fetch('/api/publicaciones/mias', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                feedPublicaciones.innerHTML = `<p class="sin-datos" style="padding:15px; text-align:center;">${escapar(datos.error || 'No se pudieron cargar las publicaciones.')}</p>`;
                if (formPublicacion && respuesta.status === 403) formPublicacion.closest('section').style.display = 'none';
                return;
            }

            const { emprendimiento, publicaciones } = datos;
            const nombre = document.getElementById('emprendimiento-nombre');
            const rubro = document.getElementById('emprendimiento-rubro');
            if (nombre && emprendimiento?.Nombre) nombre.textContent = emprendimiento.Nombre;
            if (rubro && emprendimiento?.Rubro) rubro.textContent = emprendimiento.Rubro;

            let html = '';

            // Estado de lo que se mandó a revisión (1: pendiente, 2: rechazado)
            publicaciones.forEach((pub) => {
                if (pub.EstadoModeracion === 1) {
                    html += `
                        <article class="post-card" style="border-left: 4px solid #d69e2e;">
                            <p class="post-fecha"><i class="fa-solid fa-clock"></i> En revisión por el Ministerio</p>
                            <p class="post-contenido">${escapar(pub.DescripcionPendiente)}</p>
                        </article>`;
                } else if (pub.EstadoModeracion === 2) {
                    html += `
                        <article class="post-card" style="border-left: 4px solid #e53e3e;">
                            <p class="post-fecha"><i class="fa-solid fa-circle-xmark"></i> Tu última publicación fue rechazada</p>
                            <p class="post-contenido">Motivo: ${escapar(pub.MotivoRechazo || 'sin especificar')}</p>
                        </article>`;
                }
            });

            // Contenido aprobado (lo que ve el público)
            publicaciones.filter((pub) => pub.TituloActual).forEach((pub) => {
                html += `
                    <article class="post-card">
                        <div class="post-header">
                            <i class="fa-solid fa-user-circle avatar-post"></i>
                            <div>
                                <h4 class="post-autor">${escapar(pub.TituloActual)}</h4>
                                <span class="post-fecha">Aprobado por el Ministerio</span>
                            </div>
                        </div>
                        <p class="post-contenido">${escapar(pub.DescripcionActual)}</p>
                    </article>`;
            });

            feedPublicaciones.innerHTML = html || '<p class="sin-datos" style="padding:15px; text-align:center;">No hay publicaciones aprobadas para mostrar todavía.</p>';
        } catch (error) {
            console.error('Error cargando el feed:', error);
        }
    }

    cargarMisPublicaciones();
});
