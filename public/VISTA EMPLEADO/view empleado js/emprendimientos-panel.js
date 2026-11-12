// ======================================================================
// ADMINISTRACIÓN DE EMPRENDIMIENTOS (Empleado de Área / Administrador)
// Lista de a 10 con filtros (expediente, nombre, rubro, ayuda y situación). Desde cada fila se entra al perfil público
// o a "Gestionar": validar u observar las Facturas de Ley, acreditar la puesta en marcha y marcar antecedentes.
// ======================================================================
const EmpAdmin = {
    pagina: 1,
    totalPaginas: 0,
    filtros: {},
    rubrosCargados: false,
    idAbierto: null
};

const empEsc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const empFecha = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');
const empMonto = (monto) => `$ ${Number(monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const empSeccionActiva = () => document.getElementById('item-administrar-emprendimientos')?.classList.contains('activo');

async function empApi(metodo, url, cuerpo) {
    const token = sessionStorage.getItem('token_ministerio');
    if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');
    const respuesta = await fetch(url, {
        method: metodo,
        headers: { 'Authorization': `Bearer ${token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok && respuesta.status !== 502) throw new Error(datos.error || 'No se pudo completar la acción.');
    return datos;
}

const SITUACIONES_EMP = [
    ['', 'Todas'],
    ['facturas-para-validar', 'Facturas para validar'],
    ['facturas-sin-entregar', 'Facturas sin entregar'],
    ['facturas-vencidas', 'Facturas fuera de plazo'],
    ['facturas-validadas', 'Facturas validadas'],
    ['sin-puesta-marcha', 'Sin puesta en marcha acreditada'],
    ['con-antecedentes', 'Emprendedor con antecedentes'],
    ['carga-historica', 'Carga histórica']
];

const estiloCampo = 'display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;';
const htmlPaginadorEmp = () => `
    <div class="emp-admin-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
        <button type="button" class="btn-filtro emp-admin-anterior" aria-label="Ver página anterior" title="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
        <span class="emp-admin-indicador" role="status" aria-live="polite">Cargando...</span>
        <button type="button" class="btn-filtro emp-admin-siguiente" aria-label="Ver página siguiente" title="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;

function inicializarAdministracionEmprendimientos(zona) {
    EmpAdmin.rubrosCargados = false;
    EmpAdmin.idAbierto = null;
    zona.innerHTML = `
        <div id="emp-admin-lista">
            <button type="button" class="btn-filtro" id="emp-toggle-filtros" aria-expanded="false" aria-controls="emp-contenedor-filtros" style="margin-bottom:12px;">
                <span id="emp-texto-toggle-filtros">Filtrar registros</span>
                <i class="fa-solid fa-chevron-down" id="emp-icono-toggle-filtros" style="margin-left:8px;"></i>
            </button>
            <div id="emp-contenedor-filtros" hidden>
                <form id="emp-form-filtros" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:12px; align-items:end; margin-bottom:18px; padding:14px; border:1px solid #d9e2e7; border-radius:6px; background:#f8fafb;">
                    <label>Nº de expediente
                        <input type="search" id="emp-filtro-expediente" maxlength="50" placeholder="Ej: EX-2026-..." style="${estiloCampo}">
                    </label>
                    <label>Nº de proyecto
                        <input type="search" id="emp-filtro-proyecto" maxlength="50" placeholder="Ej: 2026-Choya-01" style="${estiloCampo}">
                    </label>
                    <label>Emprendimiento o emprendedor
                        <input type="search" id="emp-filtro-buscar" maxlength="100" placeholder="Nombre o DNI" style="${estiloCampo}">
                    </label>
                    <label>Rubro
                        <select id="emp-filtro-rubro" style="${estiloCampo}"><option value="">Todos los rubros</option></select>
                    </label>
                    <label>Ayuda solicitada
                        <select id="emp-filtro-ayuda" style="${estiloCampo}">
                            <option value="">Subsidio y crédito</option>
                            <option value="subsidio">Subsidio</option>
                            <option value="credito">Crédito</option>
                            <option value="sin-ayuda">Sin ayuda registrada</option>
                        </select>
                    </label>
                    <label>Situación
                        <select id="emp-filtro-situacion" style="${estiloCampo}">
                            ${SITUACIONES_EMP.map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('')}
                        </select>
                    </label>
                    <div style="display:flex; gap:8px;">
                        <button type="submit" class="btn-filtro" style="flex:1;"><i class="fa-solid fa-filter"></i> Aplicar filtros</button>
                        <button type="button" class="btn-filtro" id="emp-limpiar-filtros" title="Limpiar filtros" aria-label="Limpiar filtros"><i class="fa-solid fa-rotate-left"></i></button>
                    </div>
                </form>
            </div>
            ${htmlPaginadorEmp()}
            <div style="overflow-x:auto;">
                <table class="tabla-datos emp-admin-tabla">
                    <thead>
                        <tr>
                            <th>Expediente</th>
                            <th>Nº de proyecto</th>
                            <th>Emprendimiento</th>
                            <th>Rubro</th>
                            <th>Ayuda</th>
                            <th>Facturas de Ley</th>
                            <th>Puesta en marcha</th>
                            <th style="text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="emp-admin-cuerpo">
                        <tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando emprendimientos...</td></tr>
                    </tbody>
                </table>
            </div>
            ${htmlPaginadorEmp()}
        </div>
        <div id="emp-admin-detalle" hidden></div>`;

    document.getElementById('emp-toggle-filtros').addEventListener('click', () => {
        empFiltrosAbiertos(document.getElementById('emp-contenedor-filtros').hidden);
    });
    document.getElementById('emp-form-filtros').addEventListener('submit', (evento) => {
        evento.preventDefault();
        EmpAdmin.filtros = {
            expediente: document.getElementById('emp-filtro-expediente').value.trim(),
            proyecto: document.getElementById('emp-filtro-proyecto').value.trim(),
            buscar: document.getElementById('emp-filtro-buscar').value.trim(),
            rubro: document.getElementById('emp-filtro-rubro').value,
            ayuda: document.getElementById('emp-filtro-ayuda').value,
            situacion: document.getElementById('emp-filtro-situacion').value
        };
        empFiltrosAbiertos(false);
        cargarPaginaEmprendimientos(1);
    });
    document.getElementById('emp-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('emp-form-filtros').reset();
        EmpAdmin.filtros = {};
        empFiltrosAbiertos(false);
        cargarPaginaEmprendimientos(1);
    });
    document.querySelectorAll('.emp-admin-anterior').forEach((boton) => boton.addEventListener('click', () => {
        if (EmpAdmin.pagina > 1) cargarPaginaEmprendimientos(EmpAdmin.pagina - 1);
    }));
    document.querySelectorAll('.emp-admin-siguiente').forEach((boton) => boton.addEventListener('click', () => {
        if (EmpAdmin.pagina < EmpAdmin.totalPaginas) cargarPaginaEmprendimientos(EmpAdmin.pagina + 1);
    }));
    document.getElementById('emp-admin-cuerpo').addEventListener('click', (evento) => {
        const boton = evento.target.closest('[data-gestionar]');
        if (boton) abrirGestionEmprendimiento(Number(boton.dataset.gestionar));
    });

    // El servidor ordena primero los que tienen facturas para validar (a lo que lleva la campanita)
    EmpAdmin.filtros = {};
    cargarPaginaEmprendimientos(1);
}

function empFiltrosAbiertos(abiertos) {
    const panel = document.getElementById('emp-contenedor-filtros');
    if (!panel) return;
    panel.hidden = !abiertos;
    document.getElementById('emp-toggle-filtros').setAttribute('aria-expanded', String(abiertos));
    document.getElementById('emp-texto-toggle-filtros').textContent = abiertos ? 'Ocultar filtros' : 'Filtrar registros';
    const icono = document.getElementById('emp-icono-toggle-filtros');
    icono.classList.toggle('fa-chevron-up', abiertos);
    icono.classList.toggle('fa-chevron-down', !abiertos);
}

// ---------- Textos y etiquetas de estado ----------
const ETIQUETAS_FACTURAS = {
    'no-corresponde': ['gris', 'No corresponde'],
    pendiente: ['amarillo', 'Sin entregar'],
    observadas: ['naranja', 'Observadas'],
    'en-revision': ['azul', 'Para validar'],
    validadas: ['verde', 'Validadas']
};
const ETIQUETAS_MARCHA = {
    'no-corresponde': ['gris', 'No corresponde'],
    pendiente: ['amarillo', 'Sin acreditar'],
    acreditada: ['verde', 'Acreditada']
};
const empEtiqueta = ([color, texto]) => `<span class="emp-etiqueta emp-${color}">${texto}</span>`;

// "Faltan 5 días" / "Vence hoy" / "Vencido hace 3 días"
const empPlazo = (dias) => {
    if (dias === null || dias === undefined) return '';
    if (dias > 1) return `Faltan ${dias} días`;
    if (dias === 1) return 'Falta 1 día';
    if (dias === 0) return 'Vence hoy';
    return `<span class="emp-vencido">Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}</span>`;
};

const htmlFacturasFila = (f) => {
    const extra = ['pendiente', 'observadas'].includes(f.estado) ? empPlazo(f.diasRestantes)
        : f.estado === 'en-revision' ? `Enviadas el ${empFecha(f.fechaEntrega)}` : '';
    return `${empEtiqueta(ETIQUETAS_FACTURAS[f.estado] || ETIQUETAS_FACTURAS['no-corresponde'])}${extra ? `<small class="emp-sub">${extra}</small>` : ''}`;
};
const htmlMarchaFila = (p) => `${empEtiqueta(ETIQUETAS_MARCHA[p.estado] || ETIQUETAS_MARCHA['no-corresponde'])}${p.estado === 'pendiente' ? `<small class="emp-sub">${empPlazo(p.diasRestantes)}</small>` : ''}`;
const htmlAyudaFila = (a) => {
    if (!a) return '<span class="emp-sub">Sin ayuda registrada</span>';
    const estado = a.aprobado === true ? '' : a.aprobado === false ? ' · Rechazado' : ' · Pendiente';
    return `${a.nombre}<small class="emp-sub">${empMonto(a.monto)}${estado}</small>`;
};
const urlPerfilEmp = (id) => `/Emprendedor-Perfil?id=${encodeURIComponent(id)}`;

async function cargarPaginaEmprendimientos(pagina) {
    const cuerpo = document.getElementById('emp-admin-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando emprendimientos...</td></tr>';
    actualizarPaginadorEmp(true);
    try {
        const parametros = new URLSearchParams({ page: String(pagina) });
        Object.entries(EmpAdmin.filtros).forEach(([clave, valor]) => { if (valor) parametros.set(clave, valor); });
        const resultado = await empApi('GET', `/api/emprendimientos-admin?${parametros}`);
        if (!empSeccionActiva()) return;

        if (!EmpAdmin.rubrosCargados) {
            const select = document.getElementById('emp-filtro-rubro');
            select.insertAdjacentHTML('beforeend', resultado.rubros.map((r) => `<option value="${empEsc(r.idRubro)}">${empEsc(r.Nombre)}</option>`).join(''));
            EmpAdmin.rubrosCargados = true;
        }
        EmpAdmin.pagina = resultado.pagina;
        EmpAdmin.totalPaginas = resultado.totalPaginas;
        cuerpo.innerHTML = resultado.emprendimientos.length ? resultado.emprendimientos.map((e) => `
            <tr>
                <td>${empEsc(e.expediente || '-')}</td>
                <td style="white-space:nowrap;">${empEsc(e.nroProyecto)}</td>
                <td>
                    <strong>${empEsc(e.emprendimiento)}</strong>
                    ${e.antecedentes ? '<i class="fa-solid fa-triangle-exclamation" style="color:#c0392b; margin-left:4px;" title="El emprendedor tiene antecedentes" aria-label="Con antecedentes"></i>' : ''}
                    <small class="emp-sub">${e.emprendedor ? empEsc(e.emprendedor) : 'Sin emprendedor'}${e.cargaHistorica ? ' · Carga histórica' : ''}</small>
                </td>
                <td>${empEsc(e.rubro)}</td>
                <td>${htmlAyudaFila(e.ayuda)}</td>
                <td>${htmlFacturasFila(e.facturas)}</td>
                <td>${htmlMarchaFila(e.puestaMarcha)}</td>
                <td style="text-align:center; white-space:nowrap;">
                    <a class="btn-acciones-tabla" href="${urlPerfilEmp(e.idEmprendimiento)}" target="_blank" rel="noopener" title="Ver perfil público" aria-label="Ver perfil de ${empEsc(e.emprendimiento)}"><i class="fa-solid fa-up-right-from-square"></i></a>
                    <button type="button" class="btn-filtro" data-gestionar="${empEsc(e.idEmprendimiento)}" style="margin-left:6px;"><i class="fa-solid fa-sliders"></i> Gestionar</button>
                </td>
            </tr>`).join('')
            : '<tr><td colspan="8" style="text-align:center; padding:20px;">No hay emprendimientos con esos filtros.</td></tr>';
        actualizarPaginadorEmp(false, resultado);
    } catch (error) {
        if (!empSeccionActiva()) return;
        cuerpo.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#b42318; padding:20px;">${empEsc(error.message)}</td></tr>`;
        actualizarPaginadorEmp(true);
    }
}

// Igual que en Administrar Usuarios: "Página [n] de N páginas · X registros" (clic en el número para escribir otra)
function actualizarPaginadorEmp(cargando, resultado = null) {
    document.querySelectorAll('.emp-admin-indicador').forEach((indicador) => {
        if (!resultado) { indicador.textContent = cargando ? 'Cargando...' : ''; return; }
        if (resultado.totalRegistros === 0) { indicador.textContent = '0 registros'; return; }
        indicador.innerHTML = `Página <button type="button" class="emp-admin-numero-pagina" aria-label="Cambiar número de página" title="Haz clic para escribir una página">${resultado.pagina}</button> de ${resultado.totalPaginas} páginas · ${resultado.totalRegistros} registros`;
        indicador.querySelector('.emp-admin-numero-pagina').addEventListener('click', (evento) => {
            const entrada = document.createElement('input');
            entrada.type = 'number';
            entrada.min = '1';
            entrada.max = String(Math.max(1, EmpAdmin.totalPaginas));
            entrada.value = String(EmpAdmin.pagina);
            entrada.setAttribute('aria-label', 'Número de página; presiona Enter para ir');
            entrada.style.width = '58px';
            entrada.addEventListener('keydown', (tecla) => {
                if (tecla.key === 'Enter') {
                    tecla.preventDefault();
                    const pagina = Number(entrada.value);
                    if (Number.isInteger(pagina) && pagina >= 1 && pagina <= EmpAdmin.totalPaginas) cargarPaginaEmprendimientos(pagina);
                } else if (tecla.key === 'Escape') {
                    actualizarPaginadorEmp(false, resultado);
                }
            });
            evento.currentTarget.replaceWith(entrada);
            entrada.focus();
            entrada.select();
        });
    });
    document.querySelectorAll('.emp-admin-anterior').forEach((b) => { b.disabled = cargando || EmpAdmin.pagina <= 1; });
    document.querySelectorAll('.emp-admin-siguiente').forEach((b) => { b.disabled = cargando || EmpAdmin.totalPaginas === 0 || EmpAdmin.pagina >= EmpAdmin.totalPaginas; });
}

// ======================================================================
// GESTIÓN DE UN EMPRENDIMIENTO
// ======================================================================
function mostrarListaEmprendimientos(recargar) {
    EmpAdmin.idAbierto = null;
    document.getElementById('emp-admin-detalle').hidden = true;
    document.getElementById('emp-admin-lista').hidden = false;
    if (recargar) cargarPaginaEmprendimientos(EmpAdmin.pagina);
}

async function abrirGestionEmprendimiento(id) {
    const lista = document.getElementById('emp-admin-lista');
    const detalle = document.getElementById('emp-admin-detalle');
    if (!lista || !detalle) return;
    EmpAdmin.idAbierto = id;
    lista.hidden = true;
    detalle.hidden = false;
    detalle.innerHTML = '<p style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando emprendimiento...</p>';
    try {
        pintarGestionEmprendimiento(await empApi('GET', `/api/emprendimientos-admin/${id}`));
    } catch (error) {
        detalle.innerHTML = `<button type="button" class="btn-filtro" data-volver><i class="fa-solid fa-arrow-left"></i> Volver al listado</button>
            <p style="color:#b42318; padding:20px;">${empEsc(error.message)}</p>`;
        detalle.querySelector('[data-volver]').addEventListener('click', () => mostrarListaEmprendimientos(false));
    }
    window.scrollTo({ top: document.querySelector('.main-content')?.offsetTop || 0, behavior: 'smooth' });
}

const empDato = (etiqueta, valor) => `<div class="emp-dato"><span>${etiqueta}</span><strong>${valor || '-'}</strong></div>`;
const empEnlacePdf = (url, texto) => (url ? `<a class="btn-filtro" href="${empEsc(url)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> ${texto}</a>` : '');

function htmlArchivosFacturasEmp(archivos) {
    if (!archivos.length) return '<p class="emp-sub">El emprendedor todavía no subió facturas.</p>';
    return `<ul class="emp-facturas-lista">${archivos.map((a) => `
        <li>
            ${a.tipo === 'imagen'
                ? `<img src="${empEsc(a.url)}" alt="${empEsc(a.nombre)}" data-ampliar loading="lazy">`
                : '<i class="fa-solid fa-file-pdf emp-icono-pdf" aria-hidden="true"></i>'}
            <a href="${empEsc(a.url)}" target="_blank" rel="noopener" title="Abrir ${empEsc(a.nombre)}">${empEsc(a.nombre)}</a>
            <small>${(a.bytes / 1024 / 1024).toFixed(2)} MB</small>
        </li>`).join('')}</ul>`;
}

function htmlTarjetaFacturas(d) {
    const f = d.facturasDetalle;
    if (f.estado === 'no-corresponde') {
        return `<p class="emp-sub">${d.cargaHistorica
            ? 'Emprendimiento de la carga histórica: no rinde las Facturas de Ley desde el sistema.'
            : 'No tiene un Subsidio o Crédito aprobado que deba rendir facturas.'}</p>`;
    }
    const plazo = `${empDato('Plazo', `${f.plazoDias} días desde la aprobación del Ministro`)}
        ${empDato('Fecha límite', `${empFecha(f.fechaLimite)}${['pendiente', 'observadas'].includes(f.estado) ? ` · ${empPlazo(f.diasRestantes)}` : ''}`)}`;
    let cuerpo = '';
    if (f.estado === 'pendiente' || f.estado === 'observadas') {
        cuerpo = `
            ${f.estado === 'observadas' ? `<div class="emp-aviso naranja"><strong>Observadas${f.empleado ? ` por ${empEsc(f.empleado)}` : ''}:</strong> ${empEsc(f.observacion)}</div>` : ''}
            <p class="emp-sub">El emprendedor las está cargando: podrá validarlas cuando las envíe a revisar.</p>
            ${htmlArchivosFacturasEmp(f.archivos)}
            ${f.estado === 'observadas' ? '<div class="emp-acciones"><button type="button" class="btn-filtro" data-accion="correo-facturas"><i class="fa-solid fa-envelope"></i> Reenviar correo de la observación</button></div>' : ''}`;
    } else if (f.estado === 'en-revision') {
        const fueraDePlazo = f.fechaEntrega && f.fechaLimite && new Date(f.fechaEntrega) > new Date(f.fechaLimite);
        cuerpo = `
            <div class="emp-aviso azul">Enviadas a revisar el <strong>${empFecha(f.fechaEntrega)}</strong>${fueraDePlazo ? ' <span class="emp-vencido">(fuera del plazo)</span>' : ''}.</div>
            ${htmlArchivosFacturasEmp(f.archivos)}
            <div class="emp-acciones">
                <button type="button" class="btn-filtro emp-boton-verde" data-accion="validar"><i class="fa-solid fa-circle-check"></i> Validar facturas</button>
                <button type="button" class="btn-filtro emp-boton-naranja" data-accion="observar"><i class="fa-solid fa-pen-to-square"></i> Observar</button>
            </div>`;
    } else {
        cuerpo = `
            <div class="emp-aviso verde">Validadas el <strong>${empFecha(f.fechaValidacion)}</strong>${f.empleado ? ` por ${empEsc(f.empleado)}` : ''}
                (entregadas el ${empFecha(f.fechaEntrega)}).</div>
            <div class="emp-acciones">
                ${f.pdfValidado ? empEnlacePdf(f.pdfValidado, 'Ver / descargar PDF de las facturas') : '<span class="emp-sub">No se encontró el PDF de las facturas.</span>'}
                <button type="button" class="btn-filtro" data-accion="correo-facturas"><i class="fa-solid fa-envelope"></i> Reenviar correo con el PDF</button>
            </div>`;
    }
    return `<div class="emp-datos">${plazo}</div>${cuerpo}`;
}

function htmlTarjetaPuestaMarcha(d) {
    const p = d.puestaMarchaDetalle;
    if (p.estado === 'no-corresponde') {
        return `<p class="emp-sub">${d.cargaHistorica ? 'Emprendimiento de la carga histórica: no se acredita desde el sistema.' : 'No tiene un Subsidio o Crédito aprobado.'}</p>`;
    }
    if (p.estado === 'acreditada') {
        return `<div class="emp-aviso verde">Acreditada el <strong>${empFecha(p.fecha)}</strong>${p.empleado ? ` por ${empEsc(p.empleado)}` : ''}.</div>`;
    }
    return `<div class="emp-datos">
            ${empDato('Plazo', `${p.plazoDias} días desde la aprobación del Ministro`)}
            ${empDato('Fecha límite', `${empFecha(p.fechaLimite)} · ${empPlazo(p.diasRestantes)}`)}
        </div>
        <div class="emp-acciones"><button type="button" class="btn-filtro emp-boton-verde" data-accion="puesta-marcha"><i class="fa-solid fa-flag-checkered"></i> Acreditar puesta en marcha</button></div>`;
}

function htmlTarjetaAntecedentes(d) {
    const e = d.emprendedorDatos;
    if (!e) return '<p class="emp-sub">El emprendimiento no tiene un emprendedor registrado.</p>';
    return e.antecedentes
        ? `<div class="emp-aviso rojo"><strong>Tiene antecedentes:</strong> ${empEsc(e.descripcionAntecedente || 'sin descripción')}</div>
           <div class="emp-acciones">
               <button type="button" class="btn-filtro" data-accion="antecedente-editar"><i class="fa-solid fa-pen"></i> Editar descripción</button>
               <button type="button" class="btn-filtro" data-accion="antecedente-quitar"><i class="fa-solid fa-eraser"></i> Quitar antecedente</button>
           </div>`
        : `<p class="emp-sub">Sin antecedentes.</p>
           <div class="emp-acciones"><button type="button" class="btn-filtro emp-boton-rojo" data-accion="antecedente-marcar"><i class="fa-solid fa-triangle-exclamation"></i> Marcar antecedente</button></div>`;
}

function pintarGestionEmprendimiento(d) {
    const detalle = document.getElementById('emp-admin-detalle');
    if (!detalle || EmpAdmin.idAbierto !== d.idEmprendimiento) return;
    const e = d.emprendedorDatos;
    const a = d.ayuda;
    detalle.innerHTML = `
        <div class="emp-detalle-cabecera">
            <button type="button" class="btn-filtro" data-volver><i class="fa-solid fa-arrow-left"></i> Volver al listado</button>
            <a class="btn-filtro" href="${urlPerfilEmp(d.idEmprendimiento)}" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> Ver perfil público</a>
        </div>
        <h3 class="emp-detalle-titulo">${empEsc(d.emprendimiento)} <small>Proyecto ${empEsc(d.nroProyecto)}</small></h3>
        <div class="emp-tarjetas">
            <section class="emp-tarjeta">
                <h4><i class="fa-solid fa-store"></i> Emprendimiento</h4>
                <div class="emp-datos">
                    ${empDato('Nº de expediente', empEsc(d.expediente))}
                    ${empDato('Nº de proyecto', empEsc(d.nroProyecto))}
                    ${empDato('Rubro', empEsc(d.rubro))}
                    ${empDato('Ubicación', empEsc([d.localidad, d.departamento].filter(Boolean).join(', ')))}
                    ${empDato('Aprobación del Ministro', d.cargaHistorica ? 'Carga histórica' : empFecha(d.fechaAprobacionMinistro))}
                    ${empDato('Actividad principal', empEsc(d.actividad))}
                </div>
                <div class="emp-acciones">${empEnlacePdf(d.pdfSolicitudInicio, 'Solicitud de inicio')}</div>
            </section>
            <section class="emp-tarjeta">
                <h4><i class="fa-solid fa-user"></i> Emprendedor</h4>
                ${e ? `<div class="emp-datos">
                    ${empDato('Nombre', empEsc(d.emprendedor))}
                    ${empDato('DNI', empEsc(e.dni))}
                    ${empDato('Correo', empEsc(e.correo))}
                    ${empDato('Teléfono', empEsc(e.telefono))}
                </div>` : '<p class="emp-sub">Sin emprendedor registrado.</p>'}
            </section>
            <section class="emp-tarjeta">
                <h4><i class="fa-solid fa-hand-holding-dollar"></i> Ayuda</h4>
                ${a ? `<div class="emp-datos">
                    ${empDato('Tipo', a.nombre)}
                    ${empDato('Monto', empMonto(a.monto))}
                    ${empDato('Resolución del Área', `${a.aprobado === true ? 'Aprobado' : a.aprobado === false ? 'Rechazado' : 'Pendiente'}${d.ayudaDetalle.fechaResolucion ? ` el ${empFecha(d.ayudaDetalle.fechaResolucion)}` : ''}`)}
                    ${empDato('Resuelto por', empEsc(d.ayudaDetalle.empleadoRevisor || (d.cargaHistorica ? 'Carga histórica' : '-')))}
                </div>
                <div class="emp-acciones">${empEnlacePdf(d.ayudaDetalle.pdfFormulario, `Formulario de ${a.nombre.toLowerCase()}`)}</div>`
                : '<p class="emp-sub">Sin ayuda registrada.</p>'}
            </section>
            <section class="emp-tarjeta emp-tarjeta-ancha">
                <h4><i class="fa-solid fa-file-invoice-dollar"></i> Facturas de Ley ${empEtiqueta(ETIQUETAS_FACTURAS[d.facturasDetalle.estado])}</h4>
                ${htmlTarjetaFacturas(d)}
            </section>
            <section class="emp-tarjeta">
                <h4><i class="fa-solid fa-flag-checkered"></i> Puesta en marcha ${empEtiqueta(ETIQUETAS_MARCHA[d.puestaMarchaDetalle.estado])}</h4>
                ${htmlTarjetaPuestaMarcha(d)}
            </section>
            <section class="emp-tarjeta">
                <h4><i class="fa-solid fa-triangle-exclamation"></i> Antecedentes</h4>
                ${htmlTarjetaAntecedentes(d)}
            </section>
        </div>`;
    detalle.querySelector('[data-volver]').addEventListener('click', () => mostrarListaEmprendimientos(true));
    detalle.querySelectorAll('[data-accion]').forEach((boton) => boton.addEventListener('click', () => accionEmprendimiento(boton.dataset.accion, d)));
}

// Ejecuta una acción y vuelve a pintar el detalle con lo que devuelve el servidor
async function ejecutarAccionEmp(metodo, ruta, cuerpo, tituloExito) {
    Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const datos = await empApi(metodo, `/api/emprendimientos-admin/${EmpAdmin.idAbierto}${ruta}`, cuerpo);
        if (datos.detalle) pintarGestionEmprendimiento(datos.detalle);
        const sinCorreo = datos.correoEnviado === false;
        await Swal.fire({ icon: sinCorreo ? 'warning' : 'success', title: tituloExito, text: datos.mensaje, confirmButtonColor: '#1a3a5f' });
    } catch (error) {
        await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        abrirGestionEmprendimiento(EmpAdmin.idAbierto);
    }
    window.actualizarNotificaciones?.();
}

async function pedirTextoEmp({ titulo, texto, etiqueta, valor = '', confirmar, color = '#1a3a5f' }) {
    const { isConfirmed, value } = await Swal.fire({
        title: titulo,
        html: texto,
        input: 'textarea',
        inputLabel: etiqueta,
        inputValue: valor,
        inputAttributes: { maxlength: '512' },
        showCancelButton: true,
        confirmButtonText: confirmar,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: color,
        inputValidator: (v) => ((v || '').trim().length < 10 ? 'Escriba al menos 10 caracteres.' : undefined)
    });
    return isConfirmed ? value.trim() : null;
}

async function accionEmprendimiento(accion, d) {
    const f = d.facturasDetalle;
    if (accion === 'validar') {
        const { isConfirmed } = await Swal.fire({
            title: '¿Validar las Facturas de Ley?',
            html: `Se van a juntar los <strong>${f.archivos.length}</strong> archivos en un solo PDF (con una carátula), que reemplaza a los archivos sueltos.<br><br>
                   El emprendedor recibirá un correo con ese PDF adjunto${d.emprendedorDatos?.correo ? ` (${empEsc(d.emprendedorDatos.correo)})` : ''}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, validar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#27ae60'
        });
        if (isConfirmed) await ejecutarAccionEmp('POST', '/facturas/validar', null, 'Facturas validadas');
    } else if (accion === 'observar') {
        const motivo = await pedirTextoEmp({
            titulo: 'Observar las facturas',
            texto: 'Las facturas vuelven al emprendedor para que las corrija y las envíe otra vez. Le llegará un correo con lo que escriba.',
            etiqueta: 'Qué debe corregir el emprendedor',
            confirmar: 'Observar y enviar correo',
            color: '#d35400'
        });
        if (motivo) await ejecutarAccionEmp('POST', '/facturas/observar', { motivo }, 'Facturas observadas');
    } else if (accion === 'correo-facturas') {
        await ejecutarAccionEmp('POST', '/facturas/correo', null, 'Correo enviado');
    } else if (accion === 'puesta-marcha') {
        const { isConfirmed } = await Swal.fire({
            title: '¿Acreditar la puesta en marcha?',
            text: `Quedará registrado que verificó que "${d.emprendimiento}" está en funcionamiento. No se puede deshacer desde el panel.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, acreditar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#27ae60'
        });
        if (isConfirmed) await ejecutarAccionEmp('POST', '/puesta-marcha', null, 'Puesta en marcha acreditada');
    } else if (accion === 'antecedente-marcar' || accion === 'antecedente-editar') {
        // Si no entregó las facturas a tiempo, se propone el texto
        const sugerencia = accion === 'antecedente-editar' ? d.emprendedorDatos.descripcionAntecedente || ''
            : (['pendiente', 'observadas'].includes(f.estado) && f.diasRestantes < 0)
                || (f.fechaEntrega && f.fechaLimite && new Date(f.fechaEntrega) > new Date(f.fechaLimite))
                ? `No entregó las Facturas de Ley dentro de los ${f.plazoDias} días desde la aprobación del Ministro (límite: ${empFecha(f.fechaLimite)}).` : '';
        const descripcion = await pedirTextoEmp({
            titulo: accion === 'antecedente-marcar' ? 'Marcar antecedente' : 'Editar antecedente',
            texto: `Queda registrado en la ficha de ${empEsc(d.emprendedor || 'el emprendedor')}.`,
            etiqueta: 'Descripción del antecedente',
            valor: sugerencia,
            confirmar: 'Guardar',
            color: '#c0392b'
        });
        if (descripcion) await ejecutarAccionEmp('PUT', '/antecedentes', { antecedentes: true, descripcion }, 'Antecedente guardado');
    } else if (accion === 'antecedente-quitar') {
        const { isConfirmed } = await Swal.fire({
            title: '¿Quitar el antecedente?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#1a3a5f'
        });
        if (isConfirmed) await ejecutarAccionEmp('PUT', '/antecedentes', { antecedentes: false }, 'Antecedente quitado');
    }
}
