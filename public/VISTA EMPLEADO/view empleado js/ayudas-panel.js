// ======================================================================
// SUBSIDIOS Y CRÉDITOS (Empleado de Área / Administrador)
// API: GET /api/ayudas/subsidio/sin-revisar  y  /api/ayudas/credito/sin-revisar
// Subsidios: "Comenzar revisión" los pasa a "En Revisión" (compartida por todo el Área), donde se puede
// solicitar el reenvío del formulario o tomar la decisión (aprobar / rechazar).
// ======================================================================

function escaparAyuda(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const fechaAyuda = (valor) => valor ? new Date(valor).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Sin fecha';
const montoAyuda = (valor) => `$ ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const idAyuda = (id) => `#${String(id).padStart(4, '0')}`;

const botonPdfAyuda = (direccion, texto = 'Ver PDF') => direccion
    ? `<a class="btn-filtro" style="padding:4px 10px; background-color:#2c3e50; color:#fff; text-decoration:none;" href="${escaparAyuda(encodeURI(direccion))}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> ${texto}</a>`
    : '<span style="color:#94a3b8;">Sin archivo</span>';

const enlacePdfAyuda = (direccion) => direccion
    ? `<a href="${escaparAyuda(encodeURI(direccion))}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i> VER PDF</a>`
    : '<span style="color:#94a3b8;">Sin archivo</span>';

async function pedidoAyuda(url, opciones = {}) {
    const token = sessionStorage.getItem('token_ministerio');
    if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');
    const respuesta = await fetch(url, {
        ...opciones,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo completar la operación.');
    return datos;
}

async function fetchAyudasSinRevisar(tipo) {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-ayudas');
    if (!tablaCuerpo) return;
    const nombre = tipo === 'subsidio' ? 'subsidio' : 'crédito';

    try {
        const datos = await pedidoAyuda(`/api/ayudas/${tipo}/sin-revisar`);
        if (!tablaCuerpo.isConnected) return;
        if (!datos.length) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:gray; padding:20px;">🎉 No hay solicitudes de ${nombre} sin revisar.</td></tr>`;
            return;
        }

        tablaCuerpo.innerHTML = datos.map((a) => `
            <tr>
                <td><strong>${idAyuda(a.id)}</strong></td>
                <td>
                    ${escaparAyuda(a.Emprendimiento || 'Sin emprendimiento')}
                    ${a.Solicitante ? `<br><small style="color:#64748b;">${escaparAyuda(a.Solicitante)}</small>` : ''}
                </td>
                <td>${montoAyuda(a.monto)}</td>
                <td>${fechaAyuda(a.FechaRecibido)}</td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                        ${botonPdfAyuda(a.DireccionPDF)}
                        ${tipo === 'subsidio'
                            ? `<button type="button" class="btn-filtro btn-comenzar-subsidio" style="padding:4px 10px; background-color:#d35400; color:#fff;" data-id="${escaparAyuda(a.id)}">
                                <i class="fa-solid fa-play"></i> Comenzar revisión
                            </button>`
                            : ''}
                    </div>
                </td>
            </tr>`).join('');

        tablaCuerpo.querySelectorAll('.btn-comenzar-subsidio').forEach((boton) => {
            boton.addEventListener('click', () => comenzarRevisionSubsidio(boton.dataset.id));
        });
    } catch (error) {
        console.error(`Error cargando ${nombre}s sin revisar:`, error);
        if (tablaCuerpo.isConnected) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">${escaparAyuda(error.message)}</td></tr>`;
        }
    }
}

async function comenzarRevisionSubsidio(id) {
    const confirmacion = await Swal.fire({
        title: `¿Comenzar la revisión del subsidio ${idAyuda(id)}?`,
        text: 'Pasará a "En Revisión: Solicitudes de Subsidio", donde cualquier empleado del Área puede continuarla.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, comenzar revisión',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1a3a5f'
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await pedidoAyuda(`/api/ayudas/subsidio/${encodeURIComponent(id)}/iniciar-revision`, { method: 'PUT' });
        await Swal.fire({ icon: 'success', title: 'Revisión comenzada', text: resultado.mensaje, confirmButtonColor: '#1a3a5f' });
    } catch (error) {
        await Swal.fire('Error', error.message, 'error');
    }
    window.actualizarNotificaciones?.();
    fetchAyudasSinRevisar('subsidio');
}

// ----------------------------------------------------------------------
// EN REVISIÓN
// ----------------------------------------------------------------------
let subsidiosEnRevision = [];

async function cargarSubsidiosEnRevision() {
    const cuerpo = document.getElementById('tabla-cuerpo-subsidios-revision');
    if (!cuerpo) return;

    try {
        subsidiosEnRevision = await pedidoAyuda('/api/ayudas/subsidio/en-revision');
        if (!cuerpo.isConnected) return;
        window.actualizarNotificaciones?.();
        if (!subsidiosEnRevision.length) {
            cuerpo.innerHTML = '<tr><td colspan="7" style="text-align:center; color:gray; padding:20px;">No hay subsidios en revisión.</td></tr>';
            return;
        }

        cuerpo.innerHTML = subsidiosEnRevision.map((s) => {
            const montoAnterior = s.MontoAnterior !== null && Number(s.MontoAnterior) !== Number(s.monto)
                ? montoAyuda(s.MontoAnterior)
                : '<span style="color:#94a3b8;">—</span>';
            const estado = Number(s.ReenvioSolicitado)
                ? '<span style="color:#b45309;"><i class="fa-solid fa-hourglass-half"></i> Esperando reenvío del emprendedor</span>'
                : '<span style="color:#15803d;"><i class="fa-solid fa-magnifying-glass"></i> Para revisar</span>';
            return `
                <tr>
                    <td><strong>${idAyuda(s.id)}</strong></td>
                    <td>
                        ${escaparAyuda(s.Emprendimiento || 'Sin emprendimiento')}
                        ${s.Solicitante ? `<br><small style="color:#64748b;">${escaparAyuda(s.Solicitante)}</small>` : ''}
                    </td>
                    <td>${montoAyuda(s.monto)}</td>
                    <td>${montoAnterior}</td>
                    <td>${fechaAyuda(s.FechaRecibido)}</td>
                    <td>${estado}</td>
                    <td style="text-align:center;">
                        <button type="button" class="btn-filtro btn-continuar-subsidio" style="padding:4px 10px;" data-id="${escaparAyuda(s.id)}">
                            <i class="fa-solid fa-file-signature"></i> Continuar revisión
                        </button>
                    </td>
                </tr>`;
        }).join('');

        cuerpo.querySelectorAll('.btn-continuar-subsidio').forEach((boton) => {
            boton.addEventListener('click', () => {
                const subsidio = subsidiosEnRevision.find((s) => String(s.id) === boton.dataset.id);
                if (subsidio) abrirRevisionSubsidio(subsidio);
            });
        });
    } catch (error) {
        console.error('Error cargando subsidios en revisión:', error);
        if (cuerpo.isConnected) {
            cuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">${escaparAyuda(error.message)}</td></tr>`;
        }
    }
}

function htmlDatosSubsidio(s) {
    const montoAnterior = s.MontoAnterior !== null && Number(s.MontoAnterior) !== Number(s.monto)
        ? ` <small style="color:#64748b;">(antes ${montoAyuda(s.MontoAnterior)})</small>` : '';
    return `
        <div style="text-align:left; margin:0 0 12px; padding:12px; background:#f1f5f9; border-radius:4px; line-height:1.6;">
            <div><b>Subsidio de la Solicitud de Inicio:</b> #${escaparAyuda(s.idSolicitudInicio)}</div>
            <div><b>N° de expediente:</b> ${escaparAyuda(s.NroExpediente || 'Sin expediente')}</div>
            <div><b>Emprendimiento:</b> ${escaparAyuda(s.Emprendimiento || '')}</div>
            <div><b>Solicitante:</b> ${escaparAyuda(s.Solicitante || '')} · ${escaparAyuda(s.Correo || '')}</div>
            <div><b>Departamento:</b> ${escaparAyuda(s.Departamento || '')}</div>
            <div><b>Monto solicitado:</b> ${montoAyuda(s.monto)}${montoAnterior}</div>
            <div><b>Formulario de Inicio:</b> ${enlacePdfAyuda(s.DireccionPDFInicio)}</div>
            <div><b>Formulario de Subsidio:</b> ${enlacePdfAyuda(s.DireccionPDF)}</div>
        </div>`;
}

// Ventana "Continuar revisión": datos, PDFs y las tres acciones
async function abrirRevisionSubsidio(s) {
    let accion = null;
    const avisoReenvio = Number(s.ReenvioSolicitado)
        ? `<div style="text-align:left; margin:0 0 12px; padding:10px 12px; background:#fef3c7; border-radius:4px;">
               <b>Reenvío solicitado, esperando al emprendedor:</b><br>
               <span style="white-space:pre-line;">${escaparAyuda(s.MensajeSolicitudReenvio || '')}</span><br>
               <button type="button" data-accion="correo" style="margin-top:6px; padding:0; border:0; background:none; color:#1a3a5f; text-decoration:underline; cursor:pointer;">
                   Volver a enviar el correo del pedido
               </button>
           </div>`
        : '';

    await Swal.fire({
        title: `Revisión del Subsidio ${idAyuda(s.id)}`,
        width: '660px',
        html: `
            ${htmlDatosSubsidio(s)}
            ${avisoReenvio}
            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:6px;">
                <button type="button" class="swal2-styled" data-accion="pdf" style="background:#2f4e78; color:#fff; margin:0;">
                    <i class="fa-solid fa-file-pdf"></i> Ver PDF
                </button>
                <button type="button" class="swal2-styled" data-accion="reenvio" style="background:#d35400; color:#fff; margin:0;">
                    <i class="fa-solid fa-envelope"></i> Solicitar reenvío/datos
                </button>
                <button type="button" class="swal2-styled" data-accion="decision" style="background:#2980b9; color:#fff; margin:0;">
                    <i class="fa-solid fa-gavel"></i> Tomar decisión
                </button>
            </div>`,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        didOpen: (ventana) => {
            ventana.querySelectorAll('[data-accion]').forEach((boton) => {
                boton.addEventListener('click', () => {
                    if (boton.dataset.accion === 'pdf') {
                        if (s.DireccionPDF) window.open(encodeURI(s.DireccionPDF), '_blank', 'noopener');
                        return;
                    }
                    accion = boton.dataset.accion;
                    Swal.close();
                });
            });
        }
    });

    if (accion === 'correo') {
        try {
            const datos = await pedidoAyuda(`/api/ayudas/subsidio/${encodeURIComponent(s.id)}/reenviar-correo`, { method: 'POST' });
            await Swal.fire({ icon: 'success', title: 'Correo enviado', text: datos.mensaje, confirmButtonColor: '#1a3a5f' });
        } catch (error) {
            await Swal.fire('Error', error.message, 'error');
        }
        return abrirRevisionSubsidio(s);
    }
    if (accion === 'reenvio') await abrirSolicitarReenvio(s);
    if (accion === 'decision') await abrirDecisionSubsidio(s);
}

// Pide el texto que va en el correo (de 10 a 512 caracteres)
async function pedirTextoCorreo({ titulo, explicacion, etiqueta, botonConfirmar, color }) {
    const ventana = await Swal.fire({
        title: titulo,
        width: '620px',
        html: `
            <p style="text-align:left; margin:0 0 10px;">${explicacion}</p>
            <label for="texto-correo-subsidio" style="display:block; text-align:left; font-weight:600;">${etiqueta}</label>
            <textarea id="texto-correo-subsidio" class="swal2-textarea" maxlength="512" rows="5"
                style="width:100%; box-sizing:border-box; margin:6px 0 0;"></textarea>
            <small id="contador-correo-subsidio" style="display:block; text-align:right; color:#64748b;">0 / 512</small>`,
        focusConfirm: false,
        didOpen: () => {
            const texto = document.getElementById('texto-correo-subsidio');
            const contador = document.getElementById('contador-correo-subsidio');
            texto.addEventListener('input', () => { contador.textContent = `${texto.value.length} / 512`; });
            texto.focus();
        },
        preConfirm: () => {
            const valor = document.getElementById('texto-correo-subsidio').value.trim();
            if (valor.length < 10) {
                Swal.showValidationMessage('Escriba al menos 10 caracteres.');
                return false;
            }
            return valor;
        },
        showCancelButton: true,
        confirmButtonText: botonConfirmar,
        cancelButtonText: 'Volver',
        confirmButtonColor: color
    });
    return ventana.isConfirmed ? ventana.value : null;
}

async function abrirSolicitarReenvio(s) {
    const mensaje = await pedirTextoCorreo({
        titulo: `Solicitar reenvío · Subsidio ${idAyuda(s.id)}`,
        explicacion: `Se enviará un correo a <b>${escaparAyuda(s.Correo || 'el emprendedor')}</b> con el asunto
            "<i>Solicitud de Subsidio de Emprendimiento - Reenvío</i>", solicitándole que vuelva a enviar el formulario de subsidio.
            El correo incluye lo que escriba abajo, el N° de expediente (${escaparAyuda(s.NroExpediente || '')}) y el link al formulario.
            El emprendedor solo podrá reenviar el formulario una vez por cada pedido.`,
        etiqueta: '¿Qué le solicita al emprendedor?',
        botonConfirmar: '<i class="fa-solid fa-paper-plane"></i> Enviar pedido',
        color: '#d35400'
    });
    if (!mensaje) return abrirRevisionSubsidio(s);

    try {
        const resultado = await pedidoAyuda(`/api/ayudas/subsidio/${encodeURIComponent(s.id)}/solicitar-reenvio`, {
            method: 'POST',
            body: JSON.stringify({ mensaje })
        });
        await mostrarResultadoCorreoSubsidio('Reenvío solicitado', resultado, s.id);
    } catch (error) {
        await Swal.fire('Error', error.message, 'error');
    }
    cargarSubsidiosEnRevision();
}

async function abrirDecisionSubsidio(s) {
    const esperaReenvio = Number(s.ReenvioSolicitado)
        ? '<p style="color:#b45309;"><b>Atención:</b> hay un reenvío solicitado que el emprendedor todavía no envió.</p>'
        : '';
    const ventana = await Swal.fire({
        title: `Tomar decisión · Subsidio ${idAyuda(s.id)}`,
        width: '660px',
        html: `${htmlDatosSubsidio(s)}${esperaReenvio}
            <p>Quien registre la decisión quedará guardado como el empleado revisor del subsidio.</p>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-check"></i> Aprobar subsidio',
        denyButtonText: '<i class="fa-solid fa-xmark"></i> Rechazar subsidio',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#2ecc71',
        denyButtonColor: '#c0392b'
    });
    if (ventana.isDismissed) return abrirRevisionSubsidio(s);

    let cuerpo;
    if (ventana.isConfirmed) {
        const confirmacion = await Swal.fire({
            title: '¿Aprobar el subsidio?',
            text: `Se aprobará el subsidio ${idAyuda(s.id)} por ${montoAyuda(s.monto)} (expediente ${s.NroExpediente || ''}). `
                + 'Después se podrá confirmar el envío de la solicitud al Ministro. Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Volver',
            confirmButtonColor: '#2ecc71'
        });
        if (!confirmacion.isConfirmed) return abrirDecisionSubsidio(s);
        cuerpo = { aprobado: 1 };
    } else {
        const motivo = await pedirTextoCorreo({
            titulo: `Rechazar · Subsidio ${idAyuda(s.id)}`,
            explicacion: `Se enviará un correo a <b>${escaparAyuda(s.Correo || 'el emprendedor')}</b> con el asunto
                "<i>Solicitud de Subsidio de Emprendimiento - Rechazo</i>", con los motivos que escriba abajo y el N° de expediente
                (${escaparAyuda(s.NroExpediente || '')}). La solicitud de inicio quedará finalizada como "Rechazado por Subsidio".
                Esta acción no se puede deshacer.`,
            etiqueta: 'Motivo del rechazo',
            botonConfirmar: '<i class="fa-solid fa-xmark"></i> Rechazar y enviar correo',
            color: '#c0392b'
        });
        if (!motivo) return abrirDecisionSubsidio(s);
        cuerpo = { aprobado: 0, motivo };
    }

    try {
        const resultado = await pedidoAyuda(`/api/ayudas/subsidio/${encodeURIComponent(s.id)}/resolver`, {
            method: 'PUT',
            body: JSON.stringify(cuerpo)
        });
        await mostrarResultadoCorreoSubsidio(cuerpo.aprobado ? 'Subsidio aprobado' : 'Subsidio rechazado', resultado, s.id);
    } catch (error) {
        await Swal.fire('Error', error.message, 'error');
    }
    cargarSubsidiosEnRevision();
}

// Si el correo no salió, el cambio igual quedó guardado: se ofrece reintentar el envío
async function mostrarResultadoCorreoSubsidio(titulo, resultado, idSubsidio) {
    if (resultado.correoEnviado !== false) {
        await Swal.fire({ icon: 'success', title: titulo, text: resultado.mensaje, confirmButtonColor: '#1a3a5f' });
        return;
    }

    let mensaje = resultado.mensaje;
    for (;;) {
        const decision = await Swal.fire({
            icon: 'warning',
            title: titulo,
            text: mensaje,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> Reintentar envío del correo',
            cancelButtonText: 'Más tarde',
            confirmButtonColor: '#1a3a5f'
        });
        if (!decision.isConfirmed) return;

        try {
            const datos = await pedidoAyuda(`/api/ayudas/subsidio/${encodeURIComponent(idSubsidio)}/reenviar-correo`, { method: 'POST' });
            await Swal.fire({ icon: 'success', title: 'Correo enviado', text: datos.mensaje, confirmButtonColor: '#1a3a5f' });
            return;
        } catch (error) {
            mensaje = `${error.message} Puede volver a intentarlo.`;
        }
    }
}
