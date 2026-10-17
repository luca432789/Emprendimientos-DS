// ======================================================================
// SUBSIDIOS Y CRÉDITOS SIN REVISAR (Empleado de Área / Administrador)
// API: GET /api/ayudas/subsidio/sin-revisar  y  /api/ayudas/credito/sin-revisar
// Por ahora lista los pedidos y permite abrir el formulario PDF.
// ======================================================================

function escaparAyuda(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function fetchAyudasSinRevisar(tipo) {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-ayudas');
    const token = sessionStorage.getItem('token_ministerio');
    if (!tablaCuerpo) return;
    const nombre = tipo === 'subsidio' ? 'subsidio' : 'crédito';

    try {
        const respuesta = await fetch(`/api/ayudas/${tipo}/sin-revisar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">${escaparAyuda(datos.error || 'No se pudieron cargar las solicitudes.')}</td></tr>`;
            return;
        }
        if (!datos.length) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:gray; padding:20px;">🎉 No hay solicitudes de ${nombre} sin revisar.</td></tr>`;
            return;
        }

        tablaCuerpo.innerHTML = datos.map((a) => {
            const fecha = a.FechaRecibido ? new Date(a.FechaRecibido).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Sin fecha';
            const monto = `$ ${Number(a.monto).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
            return `
                <tr>
                    <td><strong>#${String(a.id).padStart(4, '0')}</strong></td>
                    <td>
                        ${escaparAyuda(a.Emprendimiento || 'Sin emprendimiento')}
                        ${a.Solicitante ? `<br><small style="color:#64748b;">${escaparAyuda(a.Solicitante)}</small>` : ''}
                    </td>
                    <td>${monto}</td>
                    <td>${fecha}</td>
                    <td style="text-align:center;">
                        ${a.DireccionPDF
                            ? `<a class="btn-filtro" style="padding:4px 10px; background-color:#2c3e50; color:#fff; text-decoration:none;" href="${escaparAyuda(encodeURI(a.DireccionPDF))}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> Ver PDF</a>`
                            : '<span style="color:#94a3b8;">Sin archivo</span>'}
                    </td>
                </tr>`;
        }).join('');
    } catch (error) {
        console.error(`Error cargando ${nombre}s sin revisar:`, error);
        tablaCuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Error al conectar con el servidor.</td></tr>';
    }
}
