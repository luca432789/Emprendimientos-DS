// ======================================================================
// SUBSIDIOS Y CRÉDITOS (Empleado de Área / Administrador)
// API: /api/ayudas/subsidio/...  y  /api/ayudas/credito/...
// "Comenzar revisión" los pasa a "En Revisión" (compartida por todo el Área), donde se puede
// solicitar el reenvío del formulario o tomar la decisión (aprobar / rechazar).
// En el crédito el reenvío puede pedir el formulario completo, solo la parte del titular o solo la del garante.
// ======================================================================

function escaparAyuda(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const fechaAyuda = (valor) => valor ? new Date(valor).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Sin fecha';
const montoAyuda = (valor) => `$ ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const idAyuda = (id) => `#${String(id).padStart(4, '0')}`;

// Textos de cada tipo
const AYUDAS_PANEL = {
    subsidio: { nombre: 'subsidio', Nombre: 'Subsidio', plural: 'subsidios', seccion: 'En Revisión: Solicitudes de Subsidio', rechazo: 'Rechazado por Subsidio' },
    credito: { nombre: 'crédito', Nombre: 'Crédito', plural: 'créditos', seccion: 'En Revisión: Solicitudes de Créditos', rechazo: 'Rechazado por Crédito' }
};

// Crédito: qué parte del formulario se pide reenviar
const PARTES_REENVIO_CREDITO = {
    Completo: 'Formulario completo (titular y garante)',
    Titular: 'Solo la parte del titular: hojas 1 a 6 y presupuestos (se conserva lo del garante)',
    Garante: 'Solo la parte del garante: hoja 7 y su documentación (se conserva lo del titular)'
};

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

const urlAyuda = (tipo, id, accion) => `/api/ayudas/${tipo}/${encodeURIComponent(id)}/${accion}`;

async function fetchAyudasSinRevisar(tipo) {
    const tablaCuerpo = document.getElementById('tabla-cuerpo-ayudas');
    if (!tablaCuerpo) return;
    const { nombre } = AYUDAS_PANEL[tipo];

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
                        ${a.DireccionPDFGarante ? botonPdfAyuda(a.DireccionPDFGarante, 'PDF del garante') : ''}
                        <button type="button" class="btn-filtro btn-comenzar-ayuda" style="padding:4px 10px; background-color:#d35400; color:#fff;" data-id="${escaparAyuda(a.id)}">
                            <i class="fa-solid fa-play"></i> Comenzar revisión
                        </button>
                    </div>
                </td>
            </tr>`).join('');

        tablaCuerpo.querySelectorAll('.btn-comenzar-ayuda').forEach((boton) => {
            boton.addEventListener('click', () => comenzarRevisionAyuda(tipo, boton.dataset.id));
        });
    } catch (error) {
        console.error(`Error cargando ${nombre}s sin revisar:`, error);
        if (tablaCuerpo.isConnected) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">${escaparAyuda(error.message)}</td></tr>`;
        }
    }
}

async function comenzarRevisionAyuda(tipo, id) {
    const { nombre, seccion } = AYUDAS_PANEL[tipo];
    const confirmacion = await Swal.fire({
        title: `¿Comenzar la revisión del ${nombre} ${idAyuda(id)}?`,
        text: `Pasará a "${seccion}", donde cualquier empleado del Área puede continuarla.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, comenzar revisión',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#1a3a5f'
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const resultado = await pedidoAyuda(urlAyuda(tipo, id, 'iniciar-revision'), { method: 'PUT' });
        await Swal.fire({ icon: 'success', title: 'Revisión comenzada', text: resultado.mensaje, confirmButtonColor: '#1a3a5f' });
    } catch (error) {
        await Swal.fire('Error', error.message, 'error');
    }
    window.actualizarNotificaciones?.();
    fetchAyudasSinRevisar(tipo);
}

// ----------------------------------------------------------------------
// EN REVISIÓN
// ----------------------------------------------------------------------
let ayudasEnRevision = [];

async function cargarAyudasEnRevision(tipo) {
    const cuerpo = document.getElementById('tabla-cuerpo-ayudas-revision');
    if (!cuerpo) return;
    const { plural } = AYUDAS_PANEL[tipo];

    try {
        ayudasEnRevision = await pedidoAyuda(`/api/ayudas/${tipo}/en-revision`);
        if (!cuerpo.isConnected) return;
        window.actualizarNotificaciones?.();
        if (!ayudasEnRevision.length) {
            cuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color:gray; padding:20px;">No hay ${plural} en revisión.</td></tr>`;
            return;
        }

        cuerpo.innerHTML = ayudasEnRevision.map((s) => {
            const montoAnterior = s.MontoAnterior !== null && Number(s.MontoAnterior) !== Number(s.monto)
                ? montoAyuda(s.MontoAnterior)
                : '<span style="color:#94a3b8;">—</span>';
            const parte = tipo === 'credito' && s.ParteReenvio && s.ParteReenvio !== 'Completo'
                ? ` (${s.ParteReenvio === 'Titular' ? 'parte del titular' : 'parte del garante'})` : '';
            const estado = Number(s.ReenvioSolicitado)
                ? `<span style="color:#b45309;"><i class="fa-solid fa-hourglass-half"></i> Esperando reenvío del emprendedor${parte}</span>`
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
                        <button type="button" class="btn-filtro btn-continuar-ayuda" style="padding:4px 10px;" data-id="${escaparAyuda(s.id)}">
                            <i class="fa-solid fa-file-signature"></i> Continuar revisión
                        </button>
                    </td>
                </tr>`;
        }).join('');

        cuerpo.querySelectorAll('.btn-continuar-ayuda').forEach((boton) => {
            boton.addEventListener('click', () => {
                const ayuda = ayudasEnRevision.find((s) => String(s.id) === boton.dataset.id);
                if (ayuda) abrirRevisionAyuda(tipo, ayuda);
            });
        });
    } catch (error) {
        console.error(`Error cargando ${plural} en revisión:`, error);
        if (cuerpo.isConnected) {
            cuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">${escaparAyuda(error.message)}</td></tr>`;
        }
    }
}

function htmlDatosAyuda(tipo, s) {
    const { Nombre } = AYUDAS_PANEL[tipo];
    const montoAnterior = s.MontoAnterior !== null && Number(s.MontoAnterior) !== Number(s.monto)
        ? ` <small style="color:#64748b;">(antes ${montoAyuda(s.MontoAnterior)})</small>` : '';
    const garante = tipo === 'credito'
        ? `<div><b>Garante:</b> ${escaparAyuda(s.Garante || 'Sin garante')}</div>
           <div><b>Documento del garante:</b> ${enlacePdfAyuda(s.DireccionPDFGarante)}</div>`
        : '';
    return `
        <div style="text-align:left; margin:0 0 12px; padding:12px; background:#f1f5f9; border-radius:4px; line-height:1.6;">
            <div><b>${Nombre} de la Solicitud de Inicio:</b> #${escaparAyuda(s.idSolicitudInicio)}</div>
            <div><b>N° de expediente:</b> ${escaparAyuda(s.NroExpediente || 'Sin expediente')}</div>
            <div><b>Emprendimiento:</b> ${escaparAyuda(s.Emprendimiento || '')}</div>
            <div><b>Solicitante:</b> ${escaparAyuda(s.Solicitante || '')} · ${escaparAyuda(s.Correo || '')}</div>
            <div><b>Departamento:</b> ${escaparAyuda(s.Departamento || '')}</div>
            <div><b>Monto solicitado:</b> ${montoAyuda(s.monto)}${montoAnterior}</div>
            <div><b>Formulario de Inicio:</b> ${enlacePdfAyuda(s.DireccionPDFInicio)}</div>
            <div><b>Formulario de ${Nombre}:</b> ${enlacePdfAyuda(s.DireccionPDF)}</div>
            ${garante}
        </div>`;
}

// Ventana "Continuar revisión": datos, PDFs y las tres acciones
async function abrirRevisionAyuda(tipo, s) {
    const { Nombre } = AYUDAS_PANEL[tipo];
    let accion = null;
    const parte = tipo === 'credito' && s.ParteReenvio ? `<br><i>${escaparAyuda(PARTES_REENVIO_CREDITO[s.ParteReenvio] || '')}</i>` : '';
    const avisoReenvio = Number(s.ReenvioSolicitado)
        ? `<div style="text-align:left; margin:0 0 12px; padding:10px 12px; background:#fef3c7; border-radius:4px;">
               <b>Reenvío solicitado, esperando al emprendedor:</b>${parte}<br>
               <span style="white-space:pre-line;">${escaparAyuda(s.MensajeSolicitudReenvio || '')}</span><br>
               <button type="button" data-accion="correo" style="margin-top:6px; padding:0; border:0; background:none; color:#1a3a5f; text-decoration:underline; cursor:pointer;">
                   Volver a enviar el correo del pedido
               </button>
           </div>`
        : '';

    await Swal.fire({
        title: `Revisión del ${Nombre} ${idAyuda(s.id)}`,
        width: '660px',
        html: `
            ${htmlDatosAyuda(tipo, s)}
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
            const datos = await pedidoAyuda(urlAyuda(tipo, s.id, 'reenviar-correo'), { method: 'POST' });
            await Swal.fire({ icon: 'success', title: 'Correo enviado', text: datos.mensaje, confirmButtonColor: '#1a3a5f' });
        } catch (error) {
            await Swal.fire('Error', error.message, 'error');
        }
        return abrirRevisionAyuda(tipo, s);
    }
    if (accion === 'reenvio') await abrirSolicitarReenvio(tipo, s);
    if (accion === 'decision') await abrirDecisionAyuda(tipo, s);
}

// Pide el texto que va en el correo (de 10 a 512 caracteres)
async function pedirTextoCorreo({ titulo, explicacion, etiqueta, botonConfirmar, color }) {
    const ventana = await Swal.fire({
        title: titulo,
        width: '620px',
        html: `
            <p style="text-align:left; margin:0 0 10px;">${explicacion}</p>
            <label for="texto-correo-ayuda" style="display:block; text-align:left; font-weight:600;">${etiqueta}</label>
            <textarea id="texto-correo-ayuda" class="swal2-textarea" maxlength="512" rows="5"
                style="width:100%; box-sizing:border-box; margin:6px 0 0;"></textarea>
            <small id="contador-correo-ayuda" style="display:block; text-align:right; color:#64748b;">0 / 512</small>`,
        focusConfirm: false,
        didOpen: () => {
            const texto = document.getElementById('texto-correo-ayuda');
            const contador = document.getElementById('contador-correo-ayuda');
            texto.addEventListener('input', () => { contador.textContent = `${texto.value.length} / 512`; });
            texto.focus();
        },
        preConfirm: () => {
            const valor = document.getElementById('texto-correo-ayuda').value.trim();
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

// Crédito: elegir qué parte del formulario debe reenviar el emprendedor
async function elegirParteReenvioCredito(s) {
    // Sin garante registrado (ej: carga histórica) no hay otra parte que conservar
    if (!s.DireccionPDFGarante) return 'Completo';
    const ventana = await Swal.fire({
        title: `Solicitar reenvío · Crédito ${idAyuda(s.id)}`,
        width: '620px',
        html: `<p style="text-align:left; margin:0;">¿Qué parte del formulario de crédito debe volver a enviar el emprendedor?
            Si pide solo una parte, la otra se conserva tal como está y el documento completo se vuelve a armar con las dos.</p>`,
        input: 'radio',
        inputOptions: PARTES_REENVIO_CREDITO,
        inputValue: 'Completo',
        inputValidator: (valor) => (valor ? undefined : 'Elija una opción.'),
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#d35400',
        didOpen: (popup) => {
            // Una opción por renglón, alineadas a la izquierda
            const opciones = popup.querySelector('.swal2-radio');
            if (opciones) Object.assign(opciones.style, { flexDirection: 'column', alignItems: 'flex-start', gap: '8px' });
        }
    });
    return ventana.isConfirmed ? ventana.value : null;
}

const textoParteCorreo = {
    Completo: 'que vuelva a enviar el formulario de crédito completo (junto a su garante)',
    Titular: 'que vuelva a enviar solo la parte del titular (hojas 1 a 6 y presupuestos); lo del garante se conserva',
    Garante: 'que vuelva a enviar solo la parte del garante (hoja 7 y su documentación); lo del titular se conserva'
};

async function abrirSolicitarReenvio(tipo, s) {
    const { nombre, Nombre } = AYUDAS_PANEL[tipo];
    const parte = tipo === 'credito' ? await elegirParteReenvioCredito(s) : null;
    if (tipo === 'credito' && !parte) return abrirRevisionAyuda(tipo, s);

    const mensaje = await pedirTextoCorreo({
        titulo: `Solicitar reenvío · ${Nombre} ${idAyuda(s.id)}`,
        explicacion: `Se enviará un correo a <b>${escaparAyuda(s.Correo || 'el emprendedor')}</b> con el asunto
            "<i>Solicitud de ${Nombre} de Emprendimiento - Reenvío</i>", solicitándole
            ${parte ? `<b>${textoParteCorreo[parte]}</b>` : `que vuelva a enviar el formulario de ${nombre}`}.
            El correo incluye lo que escriba abajo, el N° de expediente (${escaparAyuda(s.NroExpediente || '')}) y el link al formulario.
            El emprendedor solo podrá reenviar el formulario una vez por cada pedido.`,
        etiqueta: '¿Qué le solicita al emprendedor?',
        botonConfirmar: '<i class="fa-solid fa-paper-plane"></i> Enviar pedido',
        color: '#d35400'
    });
    // "Volver": en el crédito con garante, a la elección de la parte; si no, a la revisión
    if (!mensaje) return tipo === 'credito' && s.DireccionPDFGarante ? abrirSolicitarReenvio(tipo, s) : abrirRevisionAyuda(tipo, s);

    try {
        const resultado = await pedidoAyuda(urlAyuda(tipo, s.id, 'solicitar-reenvio'), {
            method: 'POST',
            body: JSON.stringify(parte ? { mensaje, parte } : { mensaje })
        });
        await mostrarResultadoCorreoAyuda(tipo, 'Reenvío solicitado', resultado, s.id);
    } catch (error) {
        await Swal.fire('Error', error.message, 'error');
    }
    cargarAyudasEnRevision(tipo);
}

async function abrirDecisionAyuda(tipo, s) {
    const { nombre, Nombre, rechazo } = AYUDAS_PANEL[tipo];
    const esperaReenvio = Number(s.ReenvioSolicitado)
        ? '<p style="color:#b45309;"><b>Atención:</b> hay un reenvío solicitado que el emprendedor todavía no envió.</p>'
        : '';
    const ventana = await Swal.fire({
        title: `Tomar decisión · ${Nombre} ${idAyuda(s.id)}`,
        width: '660px',
        html: `${htmlDatosAyuda(tipo, s)}${esperaReenvio}
            <p>Quien registre la decisión quedará guardado como el empleado revisor del ${nombre}.</p>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: `<i class="fa-solid fa-check"></i> Aprobar ${nombre}`,
        denyButtonText: `<i class="fa-solid fa-xmark"></i> Rechazar ${nombre}`,
        cancelButtonText: 'Volver',
        confirmButtonColor: '#2ecc71',
        denyButtonColor: '#c0392b'
    });
    if (ventana.isDismissed) return abrirRevisionAyuda(tipo, s);

    let cuerpo;
    if (ventana.isConfirmed) {
        const confirmacion = await Swal.fire({
            title: `¿Aprobar el ${nombre}?`,
            text: `Se aprobará el ${nombre} ${idAyuda(s.id)} por ${montoAyuda(s.monto)} (expediente ${s.NroExpediente || ''}). `
                + 'Después se podrá confirmar el envío de la solicitud al Ministro. Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Volver',
            confirmButtonColor: '#2ecc71'
        });
        if (!confirmacion.isConfirmed) return abrirDecisionAyuda(tipo, s);
        cuerpo = { aprobado: 1 };
    } else {
        const motivo = await pedirTextoCorreo({
            titulo: `Rechazar · ${Nombre} ${idAyuda(s.id)}`,
            explicacion: `Se enviará un correo a <b>${escaparAyuda(s.Correo || 'el emprendedor')}</b> con el asunto
                "<i>Solicitud de ${Nombre} de Emprendimiento - Rechazo</i>", con los motivos que escriba abajo y el N° de expediente
                (${escaparAyuda(s.NroExpediente || '')}). La solicitud de inicio quedará finalizada como "${rechazo}".
                Esta acción no se puede deshacer.`,
            etiqueta: 'Motivo del rechazo',
            botonConfirmar: '<i class="fa-solid fa-xmark"></i> Rechazar y enviar correo',
            color: '#c0392b'
        });
        if (!motivo) return abrirDecisionAyuda(tipo, s);
        cuerpo = { aprobado: 0, motivo };
    }

    try {
        const resultado = await pedidoAyuda(urlAyuda(tipo, s.id, 'resolver'), {
            method: 'PUT',
            body: JSON.stringify(cuerpo)
        });
        await mostrarResultadoCorreoAyuda(tipo, `${Nombre} ${cuerpo.aprobado ? 'aprobado' : 'rechazado'}`, resultado, s.id);
    } catch (error) {
        await Swal.fire('Error', error.message, 'error');
    }
    cargarAyudasEnRevision(tipo);
}

// Si el correo no salió, el cambio igual quedó guardado: se ofrece reintentar el envío
async function mostrarResultadoCorreoAyuda(tipo, titulo, resultado, id) {
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
            const datos = await pedidoAyuda(urlAyuda(tipo, id, 'reenviar-correo'), { method: 'POST' });
            await Swal.fire({ icon: 'success', title: 'Correo enviado', text: datos.mensaje, confirmButtonColor: '#1a3a5f' });
            return;
        } catch (error) {
            mensaje = `${error.message} Puede volver a intentarlo.`;
        }
    }
}
