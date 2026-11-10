// =========================================================
// facturas.js - "Enviar Facturas de Ley" (botón "+" del emprendedor)
// Necesita perfil-emprendedor.js (Perfil.api, Perfil.escapar...) y achicar-fotos.js (fotoAchicada).
//  - El emprendedor sube las facturas de la compra hecha con su Subsidio o Crédito de a poco: cada una queda
//    guardada en el servidor y la puede borrar mientras no las envíe.
//  - Con "Enviar a revisar las Facturas" las manda al Área y ya no se pueden cambiar.
// =========================================================

const Facturas = { datos: null, subiendo: false, progreso: '' };
const MEGA_FACTURAS = 1024 * 1024;
const TIPOS_FACTURA = ['image/jpeg', 'image/png', 'application/pdf'];

const pesoFactura = (bytes) => (bytes < MEGA_FACTURAS
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / MEGA_FACTURAS).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`);

async function cargarFacturas() {
    const contenedor = document.getElementById('facturas-ley');
    if (!contenedor) return;
    if (!Perfil.token) {
        contenedor.innerHTML = '<p class="sin-datos">Para enviar sus facturas de ley, <a href="/login">inicie sesión</a> con su cuenta de emprendedor.</p>';
        return;
    }
    try {
        const { ok, datos } = await Perfil.api('GET', '/api/facturas/mias');
        if (!ok) {
            contenedor.innerHTML = `<p class="sin-datos">${Perfil.escapar(datos.error || 'No se pudieron cargar sus facturas.')}</p>`;
            return;
        }
        Facturas.datos = datos;
        pintarFacturas();
    } catch {
        contenedor.innerHTML = '<p class="sin-datos">No se pudo conectar con el servidor. Revise su conexión e inténtelo nuevamente.</p>';
    }
}

// Aviso del plazo: 30 días desde la aprobación
function htmlPlazo(d) {
    const limite = Perfil.fecha(d.fechaLimite);
    const dias = d.diasRestantes;
    if (dias < 0) {
        return `<div class="facturas-plazo vencido"><i class="fa-solid fa-triangle-exclamation"></i>
            El plazo para entregar las facturas venció el ${limite} (hace ${-dias} ${dias === -1 ? 'día' : 'días'}). Envíelas lo antes posible.</div>`;
    }
    const texto = dias === 0 ? '<strong>Hoy vence el plazo</strong> para entregarlas'
        : `Le ${dias === 1 ? 'queda <strong>1 día</strong>' : `quedan <strong>${dias} días</strong>`} para entregarlas a tiempo`;
    return `<div class="facturas-plazo${dias <= 5 ? ' urgente' : ''}"><i class="fa-solid fa-clock"></i> ${texto} (hasta el ${limite}).</div>`;
}

function htmlArchivoFactura(archivo, editable) {
    const esc = Perfil.escapar;
    const url = esc(archivo.url);
    const subida = new Date(archivo.fecha).toLocaleDateString('es-AR');
    return `
        <li class="factura-item">
            ${archivo.tipo === 'imagen'
                ? `<img class="factura-miniatura" src="${url}" alt="${esc(archivo.nombre)}" loading="lazy" data-ampliar>`
                : `<a class="factura-miniatura factura-pdf" href="${url}" target="_blank" rel="noopener" title="Abrir PDF"><i class="fa-solid fa-file-pdf"></i></a>`}
            <div class="factura-info">
                <a href="${url}" target="_blank" rel="noopener">${esc(archivo.nombre)}</a>
                <span>${pesoFactura(archivo.bytes)} · subida el ${subida}</span>
            </div>
            ${editable ? `<button type="button" class="btn-producto factura-borrar" data-archivo="${esc(archivo.archivo)}" data-nombre="${esc(archivo.nombre)}"
                ${Facturas.subiendo ? 'disabled' : ''}><i class="fa-solid fa-trash"></i> Borrar</button>` : ''}
        </li>`;
}

function pintarFacturas() {
    const contenedor = document.getElementById('facturas-ley');
    const d = Facturas.datos;
    const esc = Perfil.escapar;
    if (!contenedor || !d) return;

    if (!d.disponible) {
        contenedor.innerHTML = `
            <h3><i class="fa-solid fa-file-invoice-dollar"></i> Facturas de Ley</h3><hr>
            <p class="sin-datos">Su emprendimiento no tiene facturas de ley para entregar.</p>`;
        return;
    }

    const editable = d.estado === 'pendiente';
    const total = d.archivos.reduce((suma, a) => suma + a.bytes, 0);
    const cantidad = d.archivos.length;
    const { limites } = d;

    let estado = '';
    if (d.estado === 'pendiente') {
        estado = `
            ${d.observacion ? `<div class="motivo-rechazo"><strong>El Área observó sus facturas:</strong> ${Perfil.parrafos(d.observacion)}<br>
                Corríjalas (puede borrar y agregar archivos) y vuelva a enviarlas.</div>` : htmlPlazo(d)}
            <p class="facturas-explicacion">Dentro de los ${d.plazoDias} días de aprobado su ${esc(d.ayuda)}, debe presentar la
                <strong>FACTURA de LEY</strong> que acredite la compra de los materiales y/o equipamiento e insumos de su emprendimiento.
                Puede subirlas de a poco: quedan guardadas acá y recién se envían al Área cuando toque
                <strong>"Enviar a revisar las Facturas"</strong>.</p>`;
    } else if (d.estado === 'en-revision') {
        estado = `<div class="facturas-estado revision"><i class="fa-solid fa-hourglass-half"></i>
            Sus facturas fueron enviadas a revisar el ${Perfil.fecha(d.fechaEntrega)}. Le avisaremos por correo cuando el Área las revise.</div>`;
    } else {
        estado = `<div class="facturas-estado validadas"><i class="fa-solid fa-circle-check"></i>
            Sus facturas fueron validadas el ${Perfil.fecha(d.fechaValidacion)}.</div>
            ${d.pdfValidado ? `<p class="facturas-explicacion">El Área juntó todas sus facturas en un solo PDF (también se lo enviamos por correo).</p>
            <p><a class="btn-publicar" href="${esc(d.pdfValidado)}" target="_blank" rel="noopener" download>
                <i class="fa-solid fa-file-pdf"></i> Descargar el PDF de sus facturas</a></p>` : ''}`;
    }

    contenedor.innerHTML = `
        <h3><i class="fa-solid fa-file-invoice-dollar"></i> Facturas de Ley · ${esc(d.ayuda)}</h3><hr>
        ${estado}
        ${editable ? `
            <div class="facturas-agregar">
                <label for="facturas-input" class="btn-adjuntar${Facturas.subiendo ? ' deshabilitado' : ''}"><i class="fa-solid fa-plus"></i> Agregar facturas</label>
                <input type="file" id="facturas-input" accept="image/jpeg,image/png,application/pdf" multiple hidden ${Facturas.subiendo ? 'disabled' : ''}>
                <span class="facturas-ayuda">Fotos JPG/PNG (se achican automáticamente) o PDF de hasta ${limites.megasPdf} MB.
                    Hasta ${limites.maximoArchivos} archivos y ${limites.megasTotal} MB en total.</span>
            </div>
            <p class="facturas-progreso" id="facturas-progreso"${Facturas.progreso ? '' : ' hidden'}>
                <i class="fa-solid fa-spinner fa-spin"></i> <span>${esc(Facturas.progreso)}</span></p>` : ''}
        ${cantidad
            ? `<ul class="facturas-lista">${d.archivos.map((a) => htmlArchivoFactura(a, editable)).join('')}</ul>`
            : (d.pdfValidado ? '' : `<p class="sin-datos">${editable ? 'Todavía no subió ninguna factura.' : 'No hay facturas.'}</p>`)}
        ${editable ? `
            <div class="facturas-pie">
                <span>${cantidad} ${cantidad === 1 ? 'archivo' : 'archivos'} · ${pesoFactura(total)} de ${limites.megasTotal} MB</span>
                <button type="button" class="btn-publicar" id="btn-enviar-facturas" ${cantidad && !Facturas.subiendo ? '' : 'disabled'}>
                    <i class="fa-solid fa-paper-plane"></i> Enviar a revisar las Facturas</button>
            </div>` : ''}`;

    if (!editable) return;
    const input = contenedor.querySelector('#facturas-input');
    input.addEventListener('change', () => {
        const elegidos = [...input.files];
        input.value = '';
        // Las fotos se empiezan a achicar enseguida, de a una (en un celular viejo cada una tarda unos segundos)
        elegidos.filter((a) => a.type !== 'application/pdf').forEach((a) => { if (TIPOS_FACTURA.includes(a.type)) fotoAchicada(a); });
        subirFacturas(elegidos);
    });
    contenedor.querySelectorAll('.factura-borrar').forEach((boton) => {
        boton.addEventListener('click', () => borrarFactura(boton.dataset.archivo, boton.dataset.nombre));
    });
    contenedor.querySelector('#btn-enviar-facturas').addEventListener('click', enviarFacturas);
}

function mostrarProgresoFacturas(texto) {
    Facturas.progreso = texto;
    const elemento = document.getElementById('facturas-progreso');
    if (!elemento) return;
    elemento.hidden = !texto;
    elemento.querySelector('span').textContent = texto;
}

// Sube un archivo mostrando el porcentaje (fetch no informa cuánto se subió)
const subirFacturaConAvance = (archivo, alAvanzar) => new Promise((resolve) => {
    const pedido = new XMLHttpRequest();
    pedido.open('POST', '/api/facturas/mias/archivos');
    pedido.setRequestHeader('Content-Type', 'application/json');
    pedido.setRequestHeader('Authorization', `Bearer ${Perfil.token}`);
    pedido.upload.onprogress = (evento) => {
        if (evento.lengthComputable && evento.total) alAvanzar(Math.floor((evento.loaded / evento.total) * 100));
    };
    pedido.onload = () => {
        let datos = {};
        try { datos = JSON.parse(pedido.responseText); } catch { /* respuesta sin JSON */ }
        resolve({ ok: pedido.status >= 200 && pedido.status < 300, status: pedido.status, datos });
    };
    pedido.onerror = () => resolve({ ok: false, status: 0, datos: { error: 'No se pudo conectar con el servidor. Revise su conexión.' } });
    pedido.send(JSON.stringify({ archivo }));
});

// Las sube de a una: cada una que llega queda guardada aunque otra falle
async function subirFacturas(elegidos) {
    if (Facturas.subiendo || !elegidos.length) return;
    const { limites } = Facturas.datos;
    const errores = [];
    Facturas.subiendo = true;
    pintarFacturas();
    try {
        for (const [indice, original] of elegidos.entries()) {
            const prefijo = elegidos.length > 1 ? `Factura ${indice + 1} de ${elegidos.length}` : 'Factura';
            if (!TIPOS_FACTURA.includes(original.type)) {
                errores.push(`${original.name}: solo se aceptan fotos JPG/PNG o archivos PDF.`);
                continue;
            }
            const esFoto = original.type !== 'application/pdf';
            if (esFoto && original.size > 25 * MEGA_FACTURAS) {
                errores.push(`${original.name}: la foto pesa demasiado (más de 25 MB).`);
                continue;
            }
            if (esFoto) mostrarProgresoFacturas(`${prefijo}: preparando la foto...`);
            const archivo = esFoto ? await fotoAchicada(original) : original;
            const maximo = (esFoto ? limites.megasFoto : limites.megasPdf) * MEGA_FACTURAS;
            if (archivo.size > maximo) {
                errores.push(esFoto
                    ? `${original.name}: la foto no se pudo achicar a menos de ${limites.megasFoto} MB. Sáquela de nuevo con menor resolución.`
                    : `${original.name}: el PDF supera los ${limites.megasPdf} MB.`);
                continue;
            }
            mostrarProgresoFacturas(`${prefijo}: subiendo...`);
            const [data] = await Perfil.leerArchivos([archivo]);
            const respuesta = await subirFacturaConAvance({ nombre: original.name, data },
                (porcentaje) => mostrarProgresoFacturas(`${prefijo}: subiendo... ${porcentaje} %`));
            if (!respuesta.ok) {
                errores.push(`${original.name}: ${respuesta.datos.error || 'no se pudo guardar.'}`);
                // Sin sesión o ya enviadas: no tiene sentido seguir con las demás
                if ([401, 403, 409].includes(respuesta.status)) break;
                continue;
            }
            Facturas.datos.archivos = respuesta.datos.archivos;
            pintarFacturas();
        }
    } catch (error) {
        errores.push(error.message || 'No se pudo leer uno de los archivos.');
    } finally {
        Facturas.subiendo = false;
        Facturas.progreso = '';
        pintarFacturas();
    }
    if (errores.length) {
        Swal.fire({
            icon: 'warning',
            title: errores.length === elegidos.length ? 'No se guardaron las facturas' : 'Algunas facturas no se guardaron',
            html: errores.map((e) => `<p style="margin:4px 0;">${Perfil.escapar(e)}</p>`).join(''),
            confirmButtonColor: '#2f4e78'
        });
    }
}

async function borrarFactura(archivo, nombre) {
    const confirmacion = await Swal.fire({
        icon: 'question',
        title: '¿Borrar esta factura?',
        text: nombre,
        showCancelButton: true,
        confirmButtonText: 'Borrar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c53030'
    });
    if (!confirmacion.isConfirmed) return;
    try {
        const { ok, datos } = await Perfil.api('DELETE', `/api/facturas/mias/archivos/${encodeURIComponent(archivo)}`);
        if (!ok) return Perfil.aviso('error', 'No se pudo borrar', datos.error);
        Facturas.datos.archivos = datos.archivos;
        pintarFacturas();
    } catch {
        Perfil.aviso('error', 'Error de red', 'No se pudo conectar con el servidor.');
    }
}

async function enviarFacturas() {
    const cantidad = Facturas.datos.archivos.length;
    const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Enviar a revisar las Facturas?',
        html: `Va a enviar <strong>${cantidad} ${cantidad === 1 ? 'archivo' : 'archivos'}</strong> al Área.<br>
            Después de enviarlas no podrá agregar ni borrar facturas.`,
        showCancelButton: true,
        confirmButtonText: 'Enviar',
        cancelButtonText: 'Revisar de nuevo',
        confirmButtonColor: '#2f4e78'
    });
    if (!confirmacion.isConfirmed) return;

    const boton = document.getElementById('btn-enviar-facturas');
    if (boton) boton.disabled = true;
    try {
        const { ok, datos } = await Perfil.api('POST', '/api/facturas/mias/enviar');
        if (!ok) {
            if (boton) boton.disabled = false;
            return Perfil.aviso('error', 'No se pudieron enviar', datos.error);
        }
        Facturas.datos = datos;
        pintarFacturas();
        window.actualizarNotificaciones?.(); // se va el aviso de la campanita y la opción del "+"
        Perfil.aviso('success', 'Facturas enviadas', 'El Área las va a revisar. Le avisaremos por correo.');
    } catch {
        if (boton) boton.disabled = false;
        Perfil.aviso('error', 'Error de red', 'No se pudo conectar con el servidor.');
    }
}

cargarFacturas();
