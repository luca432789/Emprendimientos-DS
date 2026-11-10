// ======================================================================
// ESTADÍSTICAS (solo Administrador)
// API: GET /api/estadisticas?tipo=...&anio=...&ayuda=todos|subsidio|credito
// Botones para elegir la estadística, selector de año, total del año,
// gráfico de barras por mes (Chart.js) y tabla por departamento.
// ======================================================================

const ESTADISTICAS = [
    { tipo: 'ayudas-solicitadas', boton: 'Solicitados', icono: 'fa-file-signature', grupo: 'Subsidios y créditos' },
    { tipo: 'ayudas-otorgadas', boton: 'Otorgados', icono: 'fa-circle-check', grupo: 'Subsidios y créditos' },
    { tipo: 'ayudas-rechazadas', boton: 'Rechazados', icono: 'fa-circle-xmark', grupo: 'Subsidios y créditos' },
    { tipo: 'nuevas-solicitudes', boton: 'Nuevas solicitudes', icono: 'fa-inbox', grupo: 'Solicitudes de inicio' },
    { tipo: 'nuevos-emprendimientos', boton: 'Nuevos emprendimientos', icono: 'fa-store', grupo: 'Solicitudes de inicio' }
];
const AYUDAS_ESTADISTICA = [
    { valor: 'todos', texto: 'Todos' },
    { valor: 'subsidio', texto: 'Subsidios' },
    { valor: 'credito', texto: 'Créditos' }
];
// Colores por serie (validados para daltonismo y contraste); la serie conserva su color aunque cambie el filtro
const COLORES_SERIE = { 'Subsidios': '#3d6aa8', 'Créditos': '#c0705f', 'Solicitudes': '#3d6aa8', 'Emprendimientos': '#3d6aa8' };
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const estadoEstadisticas = { tipo: 'nuevos-emprendimientos', anio: new Date().getFullYear(), ayuda: 'todos', grafico: null };

function escaparEstadistica(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const esEstadisticaDeAyudas = (tipo) => tipo.startsWith('ayudas-');

// Pinta la estructura de la sección y carga la estadística elegida
function inicializarEstadisticas(zonaRender) {
    const grupos = [...new Set(ESTADISTICAS.map((e) => e.grupo))];
    zonaRender.innerHTML = `
        <div class="estadisticas">
            <div class="est-selector" role="group" aria-label="Elegir estadística">
                ${grupos.map((grupo) => `
                    <div class="est-grupo">
                        <span class="est-grupo-titulo">${grupo}</span>
                        <div class="est-botones">
                            ${ESTADISTICAS.filter((e) => e.grupo === grupo).map((e) => `
                                <button type="button" class="est-boton" data-tipo="${e.tipo}" aria-pressed="false">
                                    <i class="fa-solid ${e.icono}"></i> ${e.boton}
                                </button>`).join('')}
                        </div>
                    </div>`).join('')}
            </div>

            <div class="est-filtros">
                <label>Año
                    <select id="est-anio"><option>${estadoEstadisticas.anio}</option></select>
                </label>
                <div class="est-ayuda" id="est-ayuda" role="group" aria-label="Tipo de ayuda">
                    ${AYUDAS_ESTADISTICA.map((a) => `
                        <button type="button" class="est-segmento" data-ayuda="${a.valor}" aria-pressed="false">${a.texto}</button>`).join('')}
                </div>
            </div>

            <div id="est-resultado" aria-live="polite">
                <p class="est-cargando"><i class="fa-solid fa-spinner fa-spin"></i> Calculando...</p>
            </div>
        </div>`;

    zonaRender.querySelectorAll('.est-boton').forEach((boton) => {
        boton.addEventListener('click', () => {
            estadoEstadisticas.tipo = boton.dataset.tipo;
            cargarEstadistica();
        });
    });
    zonaRender.querySelectorAll('.est-segmento').forEach((boton) => {
        boton.addEventListener('click', () => {
            estadoEstadisticas.ayuda = boton.dataset.ayuda;
            cargarEstadistica();
        });
    });
    document.getElementById('est-anio').addEventListener('change', (e) => {
        estadoEstadisticas.anio = Number(e.target.value);
        cargarEstadistica();
    });

    cargarEstadistica();
}

// Marca el botón activo y muestra el filtro de ayuda solo en las estadísticas de subsidios y créditos
function marcarControlesEstadistica() {
    document.querySelectorAll('.est-boton').forEach((b) => {
        const activo = b.dataset.tipo === estadoEstadisticas.tipo;
        b.classList.toggle('activo', activo);
        b.setAttribute('aria-pressed', String(activo));
    });
    document.querySelectorAll('.est-segmento').forEach((b) => {
        const activo = b.dataset.ayuda === estadoEstadisticas.ayuda;
        b.classList.toggle('activo', activo);
        b.setAttribute('aria-pressed', String(activo));
    });
    document.getElementById('est-ayuda').hidden = !esEstadisticaDeAyudas(estadoEstadisticas.tipo);
}

async function cargarEstadistica() {
    const resultado = document.getElementById('est-resultado');
    if (!resultado) return;
    marcarControlesEstadistica();

    const { tipo, anio, ayuda } = estadoEstadisticas;
    const parametros = new URLSearchParams({ tipo, anio });
    if (esEstadisticaDeAyudas(tipo)) parametros.set('ayuda', ayuda);

    try {
        const respuesta = await fetch(`/api/estadisticas?${parametros}`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token_ministerio')}` }
        });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
            resultado.innerHTML = `<p class="est-error">${escaparEstadistica(datos.error || 'No se pudo cargar la estadística.')}</p>`;
            return;
        }
        // Si cambiaron los botones mientras se esperaba la respuesta, se descarta la vieja
        if (datos.tipo !== estadoEstadisticas.tipo || datos.anio !== estadoEstadisticas.anio
            || (esEstadisticaDeAyudas(tipo) && datos.ayuda !== estadoEstadisticas.ayuda)) return;
        actualizarSelectorAnio(datos.anios);
        pintarEstadistica(resultado, datos);
    } catch (error) {
        console.error('Error cargando estadística:', error);
        resultado.innerHTML = '<p class="est-error">Error al conectar con el servidor.</p>';
    }
}

function actualizarSelectorAnio(anios) {
    const selector = document.getElementById('est-anio');
    // El año elegido se mantiene en la lista aunque esta estadística no tenga datos en él
    if (!anios.includes(estadoEstadisticas.anio)) anios = [...anios, estadoEstadisticas.anio].sort((a, b) => b - a);
    selector.innerHTML = anios.map((a) => `<option value="${a}">${a}</option>`).join('');
    selector.value = String(estadoEstadisticas.anio);
}

function pintarEstadistica(resultado, datos) {
    const variasSeries = datos.series.length > 1;
    const formato = (n) => Number(n).toLocaleString('es-AR');

    resultado.innerHTML = `
        <div class="est-tarjetas">
            <div class="est-tarjeta est-tarjeta-total">
                <span class="est-tarjeta-etiqueta">${escaparEstadistica(datos.titulo)} en ${datos.anio}</span>
                <strong class="est-tarjeta-valor">${formato(datos.total)}</strong>
            </div>
            ${variasSeries ? datos.series.map((s) => `
                <div class="est-tarjeta">
                    <span class="est-tarjeta-etiqueta"><span class="est-muestra" style="background:${COLORES_SERIE[s]}"></span>${escaparEstadistica(s)}</span>
                    <strong class="est-tarjeta-valor">${formato(datos.totales[s])}</strong>
                </div>`).join('') : ''}
        </div>

        <div class="est-panel">
            <h3 class="est-panel-titulo">Por mes</h3>
            <div class="est-grafico"><canvas id="est-canvas" role="img" aria-label="${escaparEstadistica(`${datos.titulo} por mes en ${datos.anio}`)}"></canvas></div>
        </div>

        <div class="est-panel">
            <h3 class="est-panel-titulo">Por departamento</h3>
            ${datos.porDepartamento.length ? `
                <div class="est-tabla-contenedor">
                    <table class="tabla-datos est-tabla">
                        <thead>
                            <tr>
                                <th>Departamento</th>
                                ${variasSeries ? datos.series.map((s) => `<th class="num">${escaparEstadistica(s)}</th>`).join('') : ''}
                                <th class="num">${variasSeries ? 'Total' : 'Cantidad'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datos.porDepartamento.map((f) => `
                                <tr>
                                    <td>${escaparEstadistica(f.departamento)}</td>
                                    ${variasSeries ? datos.series.map((s) => `<td class="num">${formato(f.cantidades[s])}</td>`).join('') : ''}
                                    <td class="num"><strong>${formato(f.total)}</strong></td>
                                </tr>`).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>Total</td>
                                ${variasSeries ? datos.series.map((s) => `<td class="num">${formato(datos.totales[s])}</td>`).join('') : ''}
                                <td class="num">${formato(datos.total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>`
            : `<p class="est-vacio">No hay datos en ${datos.anio}.</p>`}
        </div>`;

    dibujarGraficoEstadistica(datos);
}

// Barras por mes. Con dos series (subsidios y créditos) se apilan: la altura total es la suma del mes
function dibujarGraficoEstadistica(datos) {
    if (estadoEstadisticas.grafico) estadoEstadisticas.grafico.destroy();
    const canvas = document.getElementById('est-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const variasSeries = datos.series.length > 1;
    estadoEstadisticas.grafico = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: MESES,
            datasets: datos.series.map((s) => ({
                label: s,
                data: datos.porMes[s],
                backgroundColor: COLORES_SERIE[s],
                borderColor: '#ffffff',      // separa los tramos apilados
                borderWidth: variasSeries ? { top: 2 } : 0,
                borderRadius: 4,
                borderSkipped: 'start',      // redondeado solo arriba, apoyado en la base
                maxBarThickness: 40
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: variasSeries, position: 'top', align: 'end', labels: { boxWidth: 12, boxHeight: 12, color: '#334155' } },
                tooltip: {
                    callbacks: {
                        title: (items) => `${MESES_LARGOS[items[0].dataIndex]} ${datos.anio}`,
                        footer: (items) => (variasSeries ? `Total: ${items.reduce((t, i) => t + i.parsed.y, 0)}` : '')
                    }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: '#475569' } },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    suggestedMax: 4,
                    ticks: { precision: 0, color: '#475569' },
                    grid: { color: '#e5e7eb' },
                    border: { display: false }
                }
            }
        }
    });
}
