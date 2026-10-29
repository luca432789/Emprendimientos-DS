// registro-emprendimiento.js
// Carga histórica: registra emprendimientos antiguos ya aprobados por el Ministro (Empleado de Área / Administrador)

const DEPARTAMENTOS_SANTIAGO = [
    'Aguirre', 'Alberdi', 'Atamisqui', 'Avellaneda', 'Banda', 'Belgrano', 'Capital', 'Choya', 'Copo',
    'Figueroa', 'General Taboada', 'Guasayán', 'Jiménez', 'Juan Felipe Ibarra', 'Loreto', 'Mitre', 'Moreno',
    'Ojo de Agua', 'Pellegrini', 'Quebrachos', 'Río Hondo', 'Rivadavia', 'Robles', 'Salavina', 'San Martín',
    'Sarmiento', 'Silípica'
];

const ESTILO_CAMPO_EMPRENDIMIENTO = 'display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px; background:#fff;';
const ESTILO_SECCION_EMPRENDIMIENTO = 'border:1px solid #d9e2e7; border-radius:6px; padding:16px; margin:0 0 18px;';
const ESTILO_GRILLA_EMPRENDIMIENTO = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px;';

function renderizarRegistroEmprendimiento(zonaRender) {
    const hoy = new Date();
    const fechaMaxima = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const opcionesDepartamento = `<option value="">-- Seleccione --</option>${DEPARTAMENTOS_SANTIAGO.map(departamento => `<option>${departamento}</option>`).join('')}`;
    const campo = (etiqueta, html, completo = false) => `<label${completo ? ' style="grid-column:1 / -1;"' : ''}>${etiqueta}${html}</label>`;
    const texto = (id, maximo, extra = '') => `<input type="text" id="${id}" maxlength="${maximo}" required ${extra} style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`;
    const fecha = id => `<input type="date" id="${id}" max="${fechaMaxima}" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`;

    zonaRender.innerHTML = `
        <div class="formulario-contenedor-panel" style="max-width: 900px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h3 style="color: #1a3a5f; margin: 0 0 6px; border-bottom: 2px solid #f1f1f1; padding-bottom: 10px;">
                <i class="fa-solid fa-folder-plus"></i> Registrar emprendimiento ya aprobado
            </h3>
            <p style="margin:0 0 18px; color:#555;">Carga directa de emprendimientos antiguos que ya tienen resolución favorable del Ministro. Se crean la solicitud de inicio, el expediente, el emprendimiento, el emprendedor con su cuenta de usuario y el subsidio o crédito.</p>
            <form id="formulario-registro-emprendimiento" novalidate>
                <fieldset style="${ESTILO_SECCION_EMPRENDIMIENTO}">
                    <legend style="font-weight:bold; color:#1a3a5f; padding:0 6px;">1. Solicitud de inicio</legend>
                    <div style="${ESTILO_GRILLA_EMPRENDIMIENTO}">
                        ${campo('N° de expediente', texto('historico-expediente', 50, 'placeholder="EX-2024-XXXXXXXX- -GDE-MDS"'))}
                        ${campo('Fecha de presentación de la solicitud', fecha('historico-fecha-mesa'))}
                        ${campo('Fecha de resolución del Ministro', fecha('historico-fecha-ministro'))}
                        ${campo('PDF de la solicitud de inicio', `<input type="file" id="historico-pdf-solicitud" accept="application/pdf" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`)}
                    </div>
                </fieldset>

                <fieldset style="${ESTILO_SECCION_EMPRENDIMIENTO}">
                    <legend style="font-weight:bold; color:#1a3a5f; padding:0 6px;">2. Emprendedor</legend>
                    <div style="${ESTILO_GRILLA_EMPRENDIMIENTO}">
                        ${campo('Nombre', texto('historico-persona-nombre', 40, 'autocomplete="off"'))}
                        ${campo('Apellido', texto('historico-persona-apellido', 40, 'autocomplete="off"'))}
                        ${campo('DNI / documento', texto('historico-persona-dni', 15, 'autocomplete="off"'))}
                        ${campo('Teléfono', `<input type="tel" id="historico-persona-telefono" inputmode="numeric" maxlength="25" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`)}
                        ${campo('Correo electrónico', `<input type="email" id="historico-persona-correo" maxlength="150" required autocomplete="off" style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`)}
                        ${campo('Departamento de residencia', `<select id="historico-persona-departamento" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">${opcionesDepartamento}</select>`)}
                        ${campo('Localidad de residencia', texto('historico-persona-localidad', 40, 'list="historico-lista-localidad-persona" placeholder="Primero elija el departamento" autocomplete="off"'))}
                        ${campo('Domicilio', texto('historico-persona-domicilio', 512), true)}
                    </div>
                    <datalist id="historico-lista-localidad-persona"></datalist>
                </fieldset>

                <fieldset style="${ESTILO_SECCION_EMPRENDIMIENTO}">
                    <legend style="font-weight:bold; color:#1a3a5f; padding:0 6px;">3. Emprendimiento</legend>
                    <div style="${ESTILO_GRILLA_EMPRENDIMIENTO}">
                        ${campo('Nombre del emprendimiento', texto('historico-emp-nombre', 50))}
                        ${campo('Nro de Proyecto', texto('historico-emp-proyecto', 50, 'placeholder="Ej: T78-PO-09"'))}
                        ${campo('Rubro', `<select id="historico-emp-rubro" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}"><option value="">Cargando rubros...</option></select>`)}
                        ${campo('Calle', texto('historico-emp-calle', 30))}
                        ${campo('Número (o S/N)', texto('historico-emp-numero', 6))}
                        ${campo('Barrio', texto('historico-emp-barrio', 50))}
                        ${campo('Departamento', `<select id="historico-emp-departamento" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">${opcionesDepartamento}</select>`)}
                        ${campo('Localidad', texto('historico-emp-localidad', 40, 'list="historico-lista-localidad-emp" placeholder="Primero elija el departamento" autocomplete="off"'))}
                        ${campo('Latitud (opcional)', `<input type="number" id="historico-emp-latitud" step="any" min="-90" max="90" placeholder="-27.78" style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`)}
                        ${campo('Longitud (opcional)', `<input type="number" id="historico-emp-longitud" step="any" min="-180" max="180" placeholder="-64.26" style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`)}
                        ${campo('Actividad principal', `<textarea id="historico-emp-actividad" rows="3" maxlength="400" required style="${ESTILO_CAMPO_EMPRENDIMIENTO} resize:vertical;"></textarea>`, true)}
                    </div>
                    <datalist id="historico-lista-localidad-emp"></datalist>
                    <label style="display:flex; align-items:center; gap:8px; margin-top:14px;">
                        <input type="checkbox" id="historico-emp-marcha" checked> El emprendimiento está en marcha
                    </label>
                </fieldset>

                <fieldset style="${ESTILO_SECCION_EMPRENDIMIENTO}">
                    <legend style="font-weight:bold; color:#1a3a5f; padding:0 6px;">4. Ayuda otorgada</legend>
                    <div style="display:flex; gap:24px; margin-bottom:14px;">
                        <label><input type="radio" name="historico-ayuda-tipo" value="Subsidio" checked> Subsidio</label>
                        <label><input type="radio" name="historico-ayuda-tipo" value="Credito"> Crédito</label>
                    </div>
                    <div style="${ESTILO_GRILLA_EMPRENDIMIENTO}">
                        ${campo('<span id="historico-etiqueta-pdf-ayuda">PDF del formulario de Subsidio</span>', `<input type="file" id="historico-pdf-ayuda" accept="application/pdf" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`)}
                        ${campo('Monto ($)', `<input type="number" id="historico-ayuda-monto" min="0.01" max="9999999999.99" step="0.01" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">`)}
                        ${campo('Fecha de presentación de la ayuda', fecha('historico-ayuda-fecha'))}
                        ${campo('Estado de la ayuda', `<select id="historico-ayuda-estado" required style="${ESTILO_CAMPO_EMPRENDIMIENTO}">
                            <option value="Aprobado">Aprobada</option>
                            <option value="Rechazado">Rechazada</option>
                            <option value="Pendiente">Pendiente de resolución</option>
                        </select>`)}
                        <label id="historico-contenedor-fecha-resolucion">Fecha de resolución de la ayuda${fecha('historico-ayuda-fecha-resolucion')}</label>
                        ${campo('Mensaje de resolución (opcional)', `<textarea id="historico-ayuda-mensaje" rows="2" maxlength="512" style="${ESTILO_CAMPO_EMPRENDIMIENTO} resize:vertical;"></textarea>`, true)}
                    </div>
                </fieldset>

                <p style="margin:0 0 14px; font-size:13px; color:#555;">PDF de hasta 10 MB cada uno. El emprendedor recibe un correo para crear la contraseña de su cuenta.</p>
                <button type="submit" class="btn-filtro" style="width:100%; padding:12px; background-color:#1a3a5f; color:#fff; border:0; border-radius:4px; font-size:1rem; cursor:pointer;">
                    <i class="fa-solid fa-floppy-disk"></i> Registrar emprendimiento
                </button>
            </form>
        </div>
    `;

    inicializarFormularioRegistroEmprendimiento();
}

// Sugerencias de localidades (georef) según el departamento; el campo sigue admitiendo texto libre
function conectarSugerenciasLocalidad(selectDepartamento, inputLocalidad, datalist) {
    let numeroCarga = 0;
    selectDepartamento.addEventListener('change', async () => {
        const cargaActual = ++numeroCarga;
        const departamento = selectDepartamento.value;
        inputLocalidad.value = '';
        datalist.replaceChildren();
        inputLocalidad.placeholder = departamento ? 'Escriba o elija una localidad' : 'Primero elija el departamento';
        if (!departamento) return;

        try {
            const parametros = new URLSearchParams({ provincia: 'Santiago del Estero', departamento, max: '5000', campos: 'nombre,departamento' });
            const respuesta = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${parametros}`);
            if (!respuesta.ok) return;
            const datos = await respuesta.json();
            if (cargaActual !== numeroCarga) return;
            const normalizar = textoBase => String(textoBase || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
            const nombres = [...new Set((datos.localidades || [])
                .filter(item => normalizar(item.departamento?.nombre) === normalizar(departamento))
                .map(item => item.nombre)
                .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
            nombres.forEach(nombre => datalist.append(new Option(nombre)));
        } catch {
            // Sin sugerencias: la localidad se escribe a mano
        }
    });
}

function leerPdfComoDataUrl(input, etiqueta) {
    const archivo = input.files?.[0];
    if (!archivo) return Promise.reject(new Error(`Adjunte el PDF de ${etiqueta}.`));
    if (archivo.type !== 'application/pdf') return Promise.reject(new Error(`El archivo de ${etiqueta} debe ser un PDF.`));
    if (archivo.size > 10 * 1024 * 1024) return Promise.reject(new Error(`El PDF de ${etiqueta} no puede superar los 10 MB.`));
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error(`No se pudo leer el PDF de ${etiqueta}.`));
        lector.readAsDataURL(archivo);
    });
}

async function cargarRubrosRegistroEmprendimiento(token) {
    const select = document.getElementById('historico-emp-rubro');
    try {
        const respuesta = await fetch('/api/solicitudes/rubros', { headers: { 'Authorization': `Bearer ${token}` } });
        const rubros = await respuesta.json();
        if (!respuesta.ok) throw new Error(rubros.error || 'No se pudieron cargar los rubros.');
        if (!select.isConnected) return;
        select.replaceChildren(new Option('-- Seleccione un rubro --', ''));
        rubros.forEach(rubro => select.add(new Option(rubro.Nombre, rubro.idRubro)));
    } catch (error) {
        if (select.isConnected) select.replaceChildren(new Option(`Error: ${error.message}`, ''));
    }
}

function inicializarFormularioRegistroEmprendimiento() {
    const formulario = document.getElementById('formulario-registro-emprendimiento');
    if (!formulario) return;
    const token = sessionStorage.getItem('token_ministerio');
    const valor = id => document.getElementById(id).value.trim();

    cargarRubrosRegistroEmprendimiento(token);
    conectarSugerenciasLocalidad(
        document.getElementById('historico-persona-departamento'),
        document.getElementById('historico-persona-localidad'),
        document.getElementById('historico-lista-localidad-persona')
    );
    conectarSugerenciasLocalidad(
        document.getElementById('historico-emp-departamento'),
        document.getElementById('historico-emp-localidad'),
        document.getElementById('historico-lista-localidad-emp')
    );

    const tipoAyuda = () => formulario.querySelector('input[name="historico-ayuda-tipo"]:checked').value;
    formulario.querySelectorAll('input[name="historico-ayuda-tipo"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.getElementById('historico-etiqueta-pdf-ayuda').textContent =
                `PDF del formulario de ${tipoAyuda() === 'Subsidio' ? 'Subsidio' : 'Crédito'}`;
        });
    });

    const estadoAyuda = document.getElementById('historico-ayuda-estado');
    const actualizarFechaResolucion = () => {
        const pendiente = estadoAyuda.value === 'Pendiente';
        const contenedor = document.getElementById('historico-contenedor-fecha-resolucion');
        const campoFecha = document.getElementById('historico-ayuda-fecha-resolucion');
        contenedor.hidden = pendiente;
        campoFecha.required = !pendiente;
        if (pendiente) campoFecha.value = '';
    };
    estadoAyuda.addEventListener('change', actualizarFechaResolucion);
    actualizarFechaResolucion();

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) return;

        const tokenActual = sessionStorage.getItem('token_ministerio');
        if (!tokenActual) {
            Swal.fire('Sesión vencida', 'Vuelve a iniciar sesión para registrar el emprendimiento.', 'warning');
            return;
        }

        const ayudaTipo = tipoAyuda();
        const carga = {
            nroExpediente: valor('historico-expediente'),
            fechaRecibidoMesa: valor('historico-fecha-mesa'),
            fechaResolucionMin: valor('historico-fecha-ministro'),
            emprendedor: {
                nombre: valor('historico-persona-nombre'),
                apellido: valor('historico-persona-apellido'),
                dni: valor('historico-persona-dni'),
                telefono: valor('historico-persona-telefono'),
                correo: valor('historico-persona-correo'),
                departamento: valor('historico-persona-departamento'),
                localidad: valor('historico-persona-localidad'),
                domicilio: valor('historico-persona-domicilio')
            },
            emprendimiento: {
                nombre: valor('historico-emp-nombre'),
                nroProyecto: valor('historico-emp-proyecto'),
                idRubro: Number(valor('historico-emp-rubro')),
                calle: valor('historico-emp-calle'),
                numeroCalle: valor('historico-emp-numero'),
                barrio: valor('historico-emp-barrio'),
                departamento: valor('historico-emp-departamento'),
                localidad: valor('historico-emp-localidad'),
                actividadPrincipal: valor('historico-emp-actividad'),
                enMarcha: document.getElementById('historico-emp-marcha').checked,
                latitud: valor('historico-emp-latitud'),
                longitud: valor('historico-emp-longitud')
            },
            ayuda: {
                tipo: ayudaTipo,
                estado: estadoAyuda.value,
                monto: valor('historico-ayuda-monto'),
                fechaRecibido: valor('historico-ayuda-fecha'),
                fechaResolucion: valor('historico-ayuda-fecha-resolucion'),
                mensajeResolucion: valor('historico-ayuda-mensaje')
            }
        };

        if (carga.fechaResolucionMin < carga.fechaRecibidoMesa) {
            Swal.fire('Fechas inconsistentes', 'La resolución del Ministro no puede ser anterior a la presentación de la solicitud.', 'warning');
            return;
        }
        if (!/^\d{6,25}$/.test(carga.emprendedor.telefono)) {
            Swal.fire('Teléfono no válido', 'El teléfono solo puede contener números (mínimo 6).', 'warning');
            return;
        }
        if ((carga.emprendimiento.latitud === '') !== (carga.emprendimiento.longitud === '')) {
            Swal.fire('Coordenadas incompletas', 'Complete latitud y longitud juntas, o deje ambas vacías.', 'warning');
            return;
        }

        const nombreAyuda = ayudaTipo === 'Subsidio' ? 'Subsidio' : 'Crédito';
        const confirmacion = await Swal.fire({
            title: '¿Registrar emprendimiento?',
            html: `
                <div style="text-align:left; padding:12px; background:#f1f5f9; border-radius:4px;">
                    <div><b>Expediente:</b> ${escaparDatoRevision(carga.nroExpediente)}</div>
                    <div><b>Emprendimiento:</b> ${escaparDatoRevision(carga.emprendimiento.nombre)} (Nro ${escaparDatoRevision(carga.emprendimiento.nroProyecto)})</div>
                    <div><b>Emprendedor:</b> ${escaparDatoRevision(`${carga.emprendedor.nombre} ${carga.emprendedor.apellido}`)} · ${escaparDatoRevision(carga.emprendedor.correo)}</div>
                    <div><b>Resolución del Ministro:</b> ${escaparDatoRevision(carga.fechaResolucionMin.split('-').reverse().join('/'))}</div>
                    <div><b>${nombreAyuda}:</b> $ ${escaparDatoRevision(Number(carga.ayuda.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 }))} · ${escaparDatoRevision(estadoAyuda.options[estadoAyuda.selectedIndex].text)}</div>
                </div>
                <p style="margin-top:12px;">Se creará la cuenta del emprendedor y se le enviará un correo para que cree su contraseña.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Revisar datos',
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#64748b'
        });
        if (!confirmacion.isConfirmed) return;

        const boton = formulario.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            carga.pdfSolicitud = await leerPdfComoDataUrl(document.getElementById('historico-pdf-solicitud'), 'la solicitud de inicio');
            carga.ayuda.pdf = await leerPdfComoDataUrl(document.getElementById('historico-pdf-ayuda'), `el formulario de ${nombreAyuda}`);

            const respuesta = await fetch('/api/solicitudes/carga-historica', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenActual}`
                },
                body: JSON.stringify(carga)
            });
            const resultado = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar el emprendimiento.');

            await mostrarResultadoConCorreo('Emprendimiento registrado', resultado);
            cargarSección('registrar-emprendimiento', 'Registrar Emprendimiento');
        } catch (error) {
            console.error('Error registrando emprendimiento histórico:', error);
            Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: error.message, confirmButtonColor: '#1a3a5f' });
        } finally {
            if (boton.isConnected) boton.disabled = false;
        }
    });
}
