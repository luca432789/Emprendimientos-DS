// =========================================================
// documentos.js - "Mis Documentos" (botón "+" del emprendedor)
// Necesita perfil-emprendedor.js (Perfil.api, Perfil.escapar). Solo la ve el dueño: muestra su Nº de expediente
// y de proyecto, y los PDF de su trámite (solicitud de inicio, formulario del subsidio o crédito, documentación
// del garante y las Facturas de Ley validadas).
// =========================================================

const ICONOS_DOCUMENTO = {
    solicitud: 'fa-file-signature',
    ayuda: 'fa-hand-holding-dollar',
    garante: 'fa-user-shield',
    facturas: 'fa-file-invoice-dollar'
};

async function cargarDocumentos() {
    const contenedor = document.getElementById('mis-documentos');
    if (!contenedor) return;
    const esc = Perfil.escapar;
    if (!Perfil.token) {
        contenedor.innerHTML = '<p class="sin-datos">Para ver sus documentos, <a href="/login">inicie sesión</a> con su cuenta de emprendedor.</p>';
        return;
    }
    try {
        const { ok, datos: d } = await Perfil.api('GET', '/api/documentos/mios');
        if (!ok) {
            contenedor.innerHTML = `<p class="sin-datos">${esc(d.error || 'No se pudieron cargar sus documentos.')}</p>`;
            return;
        }
        contenedor.innerHTML = `
            <h3><i class="fa-solid fa-folder-open"></i> Mis Documentos</h3><hr>
            <div class="documentos-numeros">
                <div><span>Nº de expediente</span><strong>${esc(d.expediente || 'Sin expediente')}</strong></div>
                <div><span>Nº de proyecto</span><strong>${esc(d.nroProyecto)}</strong></div>
                ${d.ayuda ? `<div><span>Ayuda</span><strong>${esc(d.ayuda)}</strong></div>` : ''}
            </div>
            <p class="facturas-explicacion">Estos son los documentos de su trámite. Solo usted puede verlos desde su cuenta.</p>
            <ul class="documentos-lista">
                ${d.documentos.map((doc) => `
                    <li class="documento-item${doc.url ? '' : ' sin-archivo'}">
                        <i class="fa-solid ${ICONOS_DOCUMENTO[doc.clave] || 'fa-file-pdf'} documento-icono" aria-hidden="true"></i>
                        <div class="documento-info">
                            <strong>${esc(doc.titulo)}</strong>
                            ${doc.detalle ? `<span>${esc(doc.detalle)}</span>` : ''}
                        </div>
                        ${doc.url
                            ? `<a class="btn-publicar" href="${esc(doc.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> Ver PDF</a>`
                            : doc.clave === 'facturas' && d.facturasPendientes
                                ? '<a class="btn-producto" href="/Emprendedor-Facturas"><i class="fa-solid fa-upload"></i> Enviar facturas</a>'
                                : `<span class="documento-estado">${doc.pendiente ? 'Pendiente' : 'No disponible'}</span>`}
                    </li>`).join('')}
            </ul>`;
    } catch {
        contenedor.innerHTML = '<p class="sin-datos">No se pudo conectar con el servidor. Revise su conexión e inténtelo nuevamente.</p>';
    }
}

cargarDocumentos();
