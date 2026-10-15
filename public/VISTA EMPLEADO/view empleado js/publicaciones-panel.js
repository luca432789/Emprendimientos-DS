// ======================================================================
// PUBLICACIONES EN ESPERA (Empleado de Área / Administrador)
// Lista lo que los emprendedores mandaron a revisión y permite aprobar o rechazar.
// API: GET /api/publicaciones/pendientes/todas  y  PUT /api/publicaciones/moderacion/:id
// ======================================================================

// El texto lo escribe el emprendedor: se escapa antes de meterlo en la tabla
function escaparPublicacion(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function fetchPublicacionesEnEspera() {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-publicaciones');
    const token = sessionStorage.getItem('token_ministerio');
    if (!tablaCuerpo) return;

    try {
        const respuesta = await fetch('/api/publicaciones/pendientes/todas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">${escaparPublicacion(datos.error || 'No se pudieron cargar las publicaciones.')}</td></tr>`;
            return;
        }

        if (datos.length === 0) {
            tablaCuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; color:gray; padding:20px;">No hay publicaciones esperando revisión.</td></tr>';
            return;
        }

        tablaCuerpo.innerHTML = datos.map((pub) => {
            const fecha = pub.FechaSolicitud ? new Date(pub.FechaSolicitud).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Sin fecha';
            return `
                <tr>
                    <td><strong>#${String(pub.idPublicacion).padStart(4, '0')}</strong></td>
                    <td>${escaparPublicacion(pub.NombreEmprendimiento)}</td>
                    <td>${fecha}</td>
                    <td>
                        <strong>${escaparPublicacion(pub.TituloPendiente)}</strong>
                        <div style="margin-top:4px; max-height:110px; overflow-y:auto; white-space:pre-wrap; color:#4a5568;">${escaparPublicacion(pub.DescripcionPendiente)}</div>
                    </td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn-filtro btn-aprobar-publicacion" data-id="${pub.idPublicacion}" style="padding:4px 10px; background-color:#2f855a;">
                            <i class="fa-solid fa-check"></i> Aprobar
                        </button>
                        <button class="btn-filtro btn-rechazar-publicacion" data-id="${pub.idPublicacion}" style="padding:4px 10px; background-color:#c53030; margin-left:4px;">
                            <i class="fa-solid fa-xmark"></i> Rechazar
                        </button>
                    </td>
                </tr>`;
        }).join('');

        tablaCuerpo.querySelectorAll('.btn-aprobar-publicacion').forEach((boton) => {
            boton.addEventListener('click', () => aprobarPublicacion(boton.dataset.id));
        });
        tablaCuerpo.querySelectorAll('.btn-rechazar-publicacion').forEach((boton) => {
            boton.addEventListener('click', () => rechazarPublicacion(boton.dataset.id));
        });
    } catch (error) {
        console.error('Error cargando publicaciones en espera:', error);
        tablaCuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Error al conectar con el servidor.</td></tr>';
    }
}

async function enviarModeracion(idPublicacion, cuerpo) {
    const token = sessionStorage.getItem('token_ministerio');
    const respuesta = await fetch(`/api/publicaciones/moderacion/${idPublicacion}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cuerpo)
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar la resolución.');
    return datos;
}

async function aprobarPublicacion(idPublicacion) {
    const confirmacion = await Swal.fire({
        icon: 'question',
        title: '¿Aprobar la publicación?',
        text: 'Va a quedar visible en el perfil público del emprendimiento.',
        showCancelButton: true,
        confirmButtonText: 'Sí, aprobar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2f855a'
    });
    if (!confirmacion.isConfirmed) return;

    try {
        await enviarModeracion(idPublicacion, { aprobar: true });
        await Swal.fire({ icon: 'success', title: 'Publicación aprobada', confirmButtonColor: '#1a3a5f' });
        fetchPublicacionesEnEspera();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function rechazarPublicacion(idPublicacion) {
    const { value: motivo, isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Rechazar publicación',
        input: 'textarea',
        inputLabel: 'Motivo del rechazo (lo verá el emprendedor)',
        inputPlaceholder: 'Ej: La publicación incluye datos de contacto no permitidos...',
        inputAttributes: { maxlength: 512 },
        showCancelButton: true,
        confirmButtonText: 'Rechazar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c53030',
        inputValidator: (valor) => (!valor || !valor.trim() ? 'Indique el motivo del rechazo.' : undefined)
    });
    if (!isConfirmed) return;

    try {
        await enviarModeracion(idPublicacion, { aprobar: false, motivoRechazo: motivo.trim() });
        await Swal.fire({ icon: 'success', title: 'Publicación rechazada', text: 'El emprendedor verá el motivo en su perfil.', confirmButtonColor: '#1a3a5f' });
        fetchPublicacionesEnEspera();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}
