document.addEventListener('DOMContentLoaded', () => {
    const formPublicacion = document.getElementById('form-publicacion');
    const feedPublicaciones = document.getElementById('feed-publicaciones');

    // ID de emprendimiento de prueba (Asegúrate de que exista en tu BD)
    const idEmprendimientoPrueba = 1; 

    // A. ENVIAR FORMULARIO DE PUBLICACIÓN
    if (formPublicacion) {
        formPublicacion.addEventListener('submit', async (e) => {
            e.preventDefault();

            const tituloInput = document.getElementById('publicacion-titulo');
            const textoInput = document.getElementById('publicacion-texto');

            const titulo = tituloInput ? tituloInput.value : 'Novedades del Emprendimiento';
            const texto = textoInput ? textoInput.value : '';
            const fotoUrl = '/Imagenes/muestra.jpg'; 

            try {
                const respuesta = await fetch('/api/publicaciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        idEmprendimiento: idEmprendimientoPrueba,
                        titulo: titulo,
                        descripcion: texto,
                        fotoUrl: fotoUrl
                    })
                });

                const resultado = await respuesta.json();

                if (respuesta.ok) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Enviado a revisión',
                        text: 'Tu publicación ha sido enviada al Ministerio. Será visible una vez aprobada.',
                        confirmButtonColor: '#2f4e78'
                    });
                    formPublicacion.reset();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: resultado.error || 'No se pudo enviar la publicación.',
                        confirmButtonColor: '#2f4e78'
                    });
                }
            } catch (error) {
                console.error('Error al enviar publicación:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Red',
                    text: 'No se pudo conectar con el servidor.',
                    confirmButtonColor: '#2f4e78'
                });
            }
        });
    }

    // B. CARGAR PUBLICACIONES APROBADAS EN EL FEED
    async function cargarPublicacionesAprobadas() {
        if (!feedPublicaciones) return;

        try {
            const respuesta = await fetch(`/api/publicaciones/${idEmprendimientoPrueba}`);
            const publicaciones = await respuesta.json();

            if (publicaciones.length === 0) {
                feedPublicaciones.innerHTML = '<p class="sin-datos" style="padding:15px; text-align:center;">No hay publicaciones aprobadas para mostrar todavía.</p>';
                return;
            }

            feedPublicaciones.innerHTML = '';
            publicaciones.forEach(pub => {
                const article = document.createElement('article');
                article.className = 'post-card';
                article.innerHTML = `
                    <div class="post-header">
                        <i class="fa-solid fa-user-circle avatar-post"></i>
                        <div>
                            <h4 class="post-autor">${pub.titulo}</h4>
                            <span class="post-fecha">Aprobado por el Ministerio</span>
                        </div>
                    </div>
                    <p class="post-contenido">${pub.descripcion}</p>
                `;
                feedPublicaciones.appendChild(article);
            });
        } catch (error) {
            console.error('Error cargando el feed:', error);
        }
    }

    cargarPublicacionesAprobadas();
});