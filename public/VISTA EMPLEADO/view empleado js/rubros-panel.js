// ======================================================================
// ADMINISTRACIÓN DE RUBROS (Empleado de Área / Administrador)
// Agregar rubros y editar su nombre o su icono del mapa (opcional). Sin icono, el mapa usa el pin básico de ubicación.
// Los rubros aparecen como sugerencia en el Formulario de Inicio y se eligen al registrar la aprobación del Ministro.
// ======================================================================
const rubEsc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LADO_ICONO = 256; // el mapa lo muestra a 28 px: con 256 sobra para que se vea nítido
const TIPOS_ICONO = ['image/png', 'image/jpeg', 'image/webp'];
const RubAdmin = { pagina: 1, totalPaginas: 0 };
const htmlPaginadorRub = () => `
    <div class="rub-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
        <button type="button" class="btn-filtro rub-anterior" aria-label="Ver página anterior" title="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
        <span class="rub-indicador" role="status" aria-live="polite">Cargando...</span>
        <button type="button" class="btn-filtro rub-siguiente" aria-label="Ver página siguiente" title="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;

async function rubApi(metodo, url, cuerpo) {
    const token = sessionStorage.getItem('token_ministerio');
    if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');
    const respuesta = await fetch(url, {
        method: metodo,
        headers: { 'Authorization': `Bearer ${token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo completar la acción.');
    return datos;
}

// Vista previa como en el mapa: el icono dentro del círculo del marcador, o el pin básico si no tiene
function rubVistaIcono(icono) {
    const circulo = 'display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border:2px solid #2b6cb0; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.25);';
    return icono
        ? `<span style="${circulo}"><img src="${rubEsc(encodeURI(icono))}" alt="" style="width:28px; height:28px; object-fit:contain;"></span>`
        : '<span title="Sin icono: en el mapa se ve el pin básico" style="display:inline-flex; width:44px; justify-content:center;"><i class="fa-solid fa-location-dot" style="font-size:30px; color:#2a81cb;"></i></span>';
}

// Achica la imagen elegida a 256 px como máximo y la pasa a PNG (conserva el fondo transparente)
function rubPrepararIcono(archivo) {
    return new Promise((resolve, reject) => {
        if (!TIPOS_ICONO.includes(archivo.type)) {
            reject(new Error('El icono debe ser una imagen PNG, JPG o WEBP.'));
            return;
        }
        const url = URL.createObjectURL(archivo);
        const imagen = new Image();
        imagen.onload = () => {
            const escala = Math.min(1, LADO_ICONO / Math.max(imagen.width, imagen.height));
            const lienzo = document.createElement('canvas');
            lienzo.width = Math.max(1, Math.round(imagen.width * escala));
            lienzo.height = Math.max(1, Math.round(imagen.height * escala));
            lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
            URL.revokeObjectURL(url);
            resolve(lienzo.toDataURL('image/png'));
        };
        imagen.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo leer la imagen del icono.'));
        };
        imagen.src = url;
    });
}

function inicializarAdministracionRubros(zona) {
    RubAdmin.pagina = 1;
    RubAdmin.totalPaginas = 0;
    zona.innerHTML = `
        <form id="rub-form-nuevo" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:16px; margin-bottom:16px;">
            <h3 style="margin:0 0 6px; font-size:1.05rem;">Agregar rubro</h3>
            <p style="margin:0 0 12px; color:#475569; font-size:.9rem;">
                El icono es opcional: es la imagen que se ve en el mapa en la ubicación de los emprendimientos de este rubro.
                Si no tiene icono, el mapa muestra el pin básico de ubicación. Conviene una imagen cuadrada, de fondo transparente (PNG).
            </p>
            <div style="display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;">
                <label style="flex:1 1 240px;">Nombre del rubro
                    <input type="text" id="rub-nombre" maxlength="50" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                </label>
                <label style="flex:1 1 240px;">Icono del mapa (opcional)
                    <input type="file" id="rub-icono" accept="image/png,image/jpeg,image/webp" style="display:block; margin-top:5px;">
                </label>
                <div style="display:flex; align-items:center; gap:8px;"><span style="color:#475569; font-size:.85rem;">Vista en el mapa:</span><span id="rub-vista-nuevo">${rubVistaIcono('')}</span></div>
                <button type="submit" class="btn-filtro" id="rub-agregar"><i class="fa-solid fa-plus" style="margin-right:6px;"></i>Agregar</button>
            </div>
        </form>
        ${htmlPaginadorRub()}
        <div style="overflow-x:auto;">
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th style="width:70px; text-align:center;">Icono</th>
                        <th>Rubro</th>
                        <th style="text-align:center;">Emprendimientos</th>
                        <th style="text-align:center;">Acción</th>
                    </tr>
                </thead>
                <tbody id="rub-cuerpo">
                    <tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando rubros...</td></tr>
                </tbody>
            </table>
        </div>
        ${htmlPaginadorRub()}`;

    let iconoNuevo = null;
    const selectorIcono = document.getElementById('rub-icono');
    selectorIcono.addEventListener('change', async () => {
        iconoNuevo = null;
        document.getElementById('rub-vista-nuevo').innerHTML = rubVistaIcono('');
        const archivo = selectorIcono.files[0];
        if (!archivo) return;
        try {
            iconoNuevo = await rubPrepararIcono(archivo);
            document.getElementById('rub-vista-nuevo').innerHTML = rubVistaIcono(iconoNuevo);
        } catch (error) {
            selectorIcono.value = '';
            Swal.fire('Icono no válido', error.message, 'warning');
        }
    });

    document.getElementById('rub-form-nuevo').addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const boton = document.getElementById('rub-agregar');
        boton.disabled = true;
        try {
            const datos = await rubApi('POST', '/api/rubros', { nombre: document.getElementById('rub-nombre').value, icono: iconoNuevo || undefined });
            evento.target.reset();
            iconoNuevo = null;
            document.getElementById('rub-vista-nuevo').innerHTML = rubVistaIcono('');
            Swal.fire({ icon: 'success', title: 'Rubro agregado', text: datos.mensaje, timer: 2500 });
            cargarRubrosAdmin(RubAdmin.pagina);
        } catch (error) {
            Swal.fire('No se pudo agregar', error.message, 'warning');
        } finally {
            boton.disabled = false;
        }
    });

    document.querySelectorAll('.rub-anterior').forEach((boton) => boton.addEventListener('click', () => {
        if (RubAdmin.pagina > 1) cargarRubrosAdmin(RubAdmin.pagina - 1);
    }));
    document.querySelectorAll('.rub-siguiente').forEach((boton) => boton.addEventListener('click', () => {
        if (RubAdmin.pagina < RubAdmin.totalPaginas) cargarRubrosAdmin(RubAdmin.pagina + 1);
    }));

    cargarRubrosAdmin(1);
}

// Igual que en las demás tablas: "Página [n] de N páginas · X registros" (clic en el número para escribir otra)
function actualizarPaginadorRub(cargando, resultado = null) {
    document.querySelectorAll('.rub-indicador').forEach((indicador) => {
        if (!resultado) { indicador.textContent = cargando ? 'Cargando...' : ''; return; }
        if (resultado.totalRegistros === 0) { indicador.textContent = '0 registros'; return; }
        indicador.innerHTML = `Página <button type="button" class="rub-numero-pagina" aria-label="Cambiar número de página" title="Haz clic para escribir una página">${resultado.pagina}</button> de ${resultado.totalPaginas} páginas · ${resultado.totalRegistros} registros`;
        indicador.querySelector('.rub-numero-pagina').addEventListener('click', (evento) => {
            const entrada = document.createElement('input');
            entrada.type = 'number';
            entrada.min = '1';
            entrada.max = String(Math.max(1, RubAdmin.totalPaginas));
            entrada.value = String(RubAdmin.pagina);
            entrada.setAttribute('aria-label', 'Número de página; presiona Enter para ir');
            entrada.style.width = '58px';
            entrada.addEventListener('keydown', (tecla) => {
                if (tecla.key === 'Enter') {
                    tecla.preventDefault();
                    const pagina = Number(entrada.value);
                    if (Number.isInteger(pagina) && pagina >= 1 && pagina <= RubAdmin.totalPaginas) cargarRubrosAdmin(pagina);
                } else if (tecla.key === 'Escape') {
                    actualizarPaginadorRub(false, resultado);
                }
            });
            evento.currentTarget.replaceWith(entrada);
            entrada.focus();
            entrada.select();
        });
    });
    document.querySelectorAll('.rub-anterior').forEach((b) => { b.disabled = cargando || RubAdmin.pagina <= 1; });
    document.querySelectorAll('.rub-siguiente').forEach((b) => { b.disabled = cargando || RubAdmin.totalPaginas === 0 || RubAdmin.pagina >= RubAdmin.totalPaginas; });
}

async function cargarRubrosAdmin(pagina = RubAdmin.pagina) {
    const cuerpo = document.getElementById('rub-cuerpo');
    if (!cuerpo) return;
    actualizarPaginadorRub(true);
    try {
        const resultado = await rubApi('GET', `/api/rubros/admin?page=${pagina}`);
        RubAdmin.pagina = resultado.pagina;
        RubAdmin.totalPaginas = resultado.totalPaginas;
        actualizarPaginadorRub(false, resultado);
        const { rubros } = resultado;
        if (!rubros.length) {
            cuerpo.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:gray;">Todavía no hay rubros cargados.</td></tr>';
            return;
        }
        cuerpo.innerHTML = rubros.map((rubro) => `
            <tr>
                <td style="text-align:center;">${rubVistaIcono(rubro.IconoMapa)}</td>
                <td>${rubEsc(rubro.Nombre)}${rubro.IconoMapa ? '' : '<div style="color:#64748b; font-size:.8rem;">Sin icono: en el mapa se ve el pin básico</div>'}</td>
                <td style="text-align:center;">${Number(rubro.Emprendimientos)}</td>
                <td style="text-align:center;">
                    <button type="button" class="btn-filtro" data-editar-rubro="${rubro.idRubro}"><i class="fa-solid fa-pen" style="margin-right:6px;"></i>Editar</button>
                </td>
            </tr>`).join('');
        cuerpo.querySelectorAll('[data-editar-rubro]').forEach((boton) => {
            boton.addEventListener('click', () => editarRubroAdmin(rubros.find((r) => r.idRubro === Number(boton.dataset.editarRubro))));
        });
    } catch (error) {
        actualizarPaginadorRub(false);
        cuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#b91c1c;">${rubEsc(error.message)}</td></tr>`;
    }
}

async function editarRubroAdmin(rubro) {
    let iconoNuevo = null;
    const resultado = await Swal.fire({
        title: 'Editar rubro',
        width: '560px',
        html: `
            <label style="display:block; text-align:left;">Nombre del rubro
                <input id="rub-editar-nombre" class="swal2-input" maxlength="50" value="${rubEsc(rubro.Nombre)}" style="width:100%; margin:6px 0 14px; box-sizing:border-box;">
            </label>
            <div style="display:flex; align-items:center; gap:10px; text-align:left;">
                <span>Icono actual:</span><span id="rub-editar-vista">${rubVistaIcono(rubro.IconoMapa)}</span>
            </div>
            <label style="display:block; text-align:left; margin-top:12px;">Cambiar icono (PNG, JPG o WEBP)
                <input type="file" id="rub-editar-icono" accept="image/png,image/jpeg,image/webp" style="display:block; margin-top:6px;">
            </label>
            ${rubro.IconoMapa ? '<label style="display:flex; align-items:center; gap:6px; margin-top:10px; text-align:left;"><input type="checkbox" id="rub-quitar-icono"> Quitar el icono (el mapa mostrará el pin básico)</label>' : ''}
            ${Number(rubro.Emprendimientos) ? `<p style="margin:12px 0 0; color:#475569; font-size:.85rem; text-align:left;">Lo usan ${Number(rubro.Emprendimientos)} emprendimiento(s): el cambio se verá en todos.</p>` : ''}
        `,
        didOpen: () => {
            const selector = document.getElementById('rub-editar-icono');
            const quitar = document.getElementById('rub-quitar-icono');
            const vista = document.getElementById('rub-editar-vista');
            selector.addEventListener('change', async () => {
                iconoNuevo = null;
                vista.innerHTML = rubVistaIcono(rubro.IconoMapa);
                if (!selector.files[0]) return;
                try {
                    iconoNuevo = await rubPrepararIcono(selector.files[0]);
                    vista.innerHTML = rubVistaIcono(iconoNuevo);
                    if (quitar) quitar.checked = false;
                } catch (error) {
                    selector.value = '';
                    Swal.showValidationMessage(error.message);
                }
            });
            quitar?.addEventListener('change', () => {
                if (quitar.checked) {
                    iconoNuevo = null;
                    selector.value = '';
                }
                vista.innerHTML = rubVistaIcono(quitar.checked ? '' : rubro.IconoMapa);
            });
        },
        preConfirm: async () => {
            try {
                return await rubApi('PUT', `/api/rubros/${rubro.idRubro}`, {
                    nombre: document.getElementById('rub-editar-nombre').value,
                    icono: iconoNuevo || undefined,
                    quitarIcono: Boolean(document.getElementById('rub-quitar-icono')?.checked)
                });
            } catch (error) {
                Swal.showValidationMessage(error.message);
                return false;
            }
        },
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true
    });
    if (resultado.isConfirmed) {
        Swal.fire({ icon: 'success', title: 'Rubro actualizado', text: resultado.value.mensaje, timer: 2500 });
        cargarRubrosAdmin(RubAdmin.pagina);
    }
}
