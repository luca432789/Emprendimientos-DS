function escaparTextoTabla(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

let paginaAuditoriaActual = 1;
let totalPaginasAuditoria = 0;
let filtrosAuditoriaActuales = {};
let paginaUsuariosActual = 1;
let totalPaginasUsuarios = 0;
let filtrosUsuariosActuales = {};
let ordenUsuariosActual = 'asc';
let paginaEmpleadosActual = 1;
let totalPaginasEmpleados = 0;
let filtrosEmpleadosActuales = {};
let ordenEmpleadosActual = 'asc';

function inicializarControlesAuditoria() {
    document.getElementById('auditoria-toggle-filtros')?.addEventListener('click', () => {
        const panel = document.getElementById('auditoria-contenedor-filtros');
        establecerFiltrosAuditoriaAbiertos(panel.hidden);
    });

    document.querySelectorAll('.auditoria-pagina-anterior').forEach(boton => {
        boton.addEventListener('click', () => {
            if (paginaAuditoriaActual > 1) cargarHistorialAuditoria(paginaAuditoriaActual - 1);
        });
    });
    document.querySelectorAll('.auditoria-pagina-siguiente').forEach(boton => {
        boton.addEventListener('click', () => {
            if (paginaAuditoriaActual < totalPaginasAuditoria) cargarHistorialAuditoria(paginaAuditoriaActual + 1);
        });
    });

    const tipoUsuario = document.getElementById('auditoria-tipo-usuario');
    const buscarUsuario = document.getElementById('auditoria-buscar-usuario');
    const botonBuscarUsuario = document.getElementById('auditoria-boton-buscar-usuario');
    const usuario = document.getElementById('auditoria-usuario');

    tipoUsuario.addEventListener('change', () => {
        buscarUsuario.disabled = !tipoUsuario.value;
        botonBuscarUsuario.disabled = !tipoUsuario.value;
        buscarUsuario.value = '';
        usuario.disabled = true;
        usuario.innerHTML = '<option value="">Todos los usuarios del tipo</option>';
        document.getElementById('auditoria-estado-busqueda').textContent = '';
    });

    botonBuscarUsuario.addEventListener('click', buscarUsuariosParaAuditoria);
    buscarUsuario.addEventListener('keydown', evento => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            buscarUsuariosParaAuditoria();
        }
    });

    document.getElementById('auditoria-form-filtros').addEventListener('submit', evento => {
        evento.preventDefault();
        aplicarFiltrosAuditoria();
    });
    document.getElementById('auditoria-limpiar-filtros').addEventListener('click', limpiarFiltrosAuditoria);

    cargarAccionesAuditoria();
    cargarHistorialAuditoria(1);
}

function establecerFiltrosAuditoriaAbiertos(abiertos) {
    const panel = document.getElementById('auditoria-contenedor-filtros');
    const boton = document.getElementById('auditoria-toggle-filtros');
    const texto = document.getElementById('auditoria-texto-toggle-filtros');
    const icono = document.getElementById('auditoria-icono-toggle-filtros');
    if (!panel || !boton) return;

    panel.hidden = !abiertos;
    boton.setAttribute('aria-expanded', String(abiertos));
    texto.textContent = abiertos ? 'Ocultar filtros' : 'Filtrar registros';
    icono.classList.toggle('fa-chevron-up', abiertos);
    icono.classList.toggle('fa-chevron-down', !abiertos);
}

async function cargarAccionesAuditoria() {
    try {
        const resultado = await obtenerDatosAdministracion('/api/auditoria/opciones');
        const selector = document.getElementById('auditoria-accion');
        if (!selector) return;

        selector.replaceChildren(new Option('Todas las acciones', ''));
        resultado.acciones.forEach(accion => selector.add(new Option(accion, accion)));
    } catch (error) {
        console.error('Error al cargar las acciones de auditoría:', error);
    }
}

async function buscarUsuariosParaAuditoria() {
    const tipoUsuario = document.getElementById('auditoria-tipo-usuario').value;
    const termino = document.getElementById('auditoria-buscar-usuario').value.trim();
    const selector = document.getElementById('auditoria-usuario');
    const estado = document.getElementById('auditoria-estado-busqueda');

    if (!tipoUsuario || termino.length < 2) {
        estado.textContent = 'Selecciona un tipo de usuario e ingresa al menos dos caracteres.';
        return;
    }

    estado.textContent = 'Buscando...';
    selector.disabled = true;

    try {
        const parametros = new URLSearchParams({ tipoUsuario, buscar: termino });
        const resultado = await obtenerDatosAdministracion(`/api/auditoria/usuarios?${parametros}`);
        selector.replaceChildren(new Option('Todos los usuarios del tipo', ''));
        resultado.usuarios.forEach(usuario => {
            selector.add(new Option(`${usuario.Nombre} · ${usuario.Correo}`, usuario.idUsuario));
        });
        selector.disabled = false;
        estado.textContent = resultado.usuarios.length
            ? `${resultado.usuarios.length} usuario(s) encontrados. Selecciona uno o deja “todos”.`
            : 'No se encontraron usuarios con ese nombre o correo.';
    } catch (error) {
        selector.replaceChildren(new Option('Todos los usuarios del tipo', ''));
        estado.textContent = error.message;
    }
}

function aplicarFiltrosAuditoria() {
    const desde = document.getElementById('auditoria-desde').value;
    const hasta = document.getElementById('auditoria-hasta').value;
    const estado = document.getElementById('auditoria-estado-busqueda');

    if (desde && hasta && desde > hasta) {
        estado.textContent = 'La fecha “Desde” no puede ser posterior a “Hasta”.';
        return;
    }

    filtrosAuditoriaActuales = {
        desde,
        hasta,
        tipoUsuario: document.getElementById('auditoria-tipo-usuario').value,
        idUsuario: document.getElementById('auditoria-usuario').value,
        accion: document.getElementById('auditoria-accion').value
    };
    estado.textContent = '';
    establecerFiltrosAuditoriaAbiertos(false);
    cargarHistorialAuditoria(1);
}

function limpiarFiltrosAuditoria() {
    document.getElementById('auditoria-form-filtros').reset();
    const usuario = document.getElementById('auditoria-usuario');
    usuario.replaceChildren(new Option('Todos los usuarios del tipo', ''));
    usuario.disabled = true;
    document.getElementById('auditoria-buscar-usuario').disabled = true;
    document.getElementById('auditoria-boton-buscar-usuario').disabled = true;
    document.getElementById('auditoria-estado-busqueda').textContent = '';
    filtrosAuditoriaActuales = {};
    establecerFiltrosAuditoriaAbiertos(false);
    cargarHistorialAuditoria(1);
}

async function cargarHistorialAuditoria(pagina) {
    const cuerpo = document.getElementById('tabla-cuerpo-auditoria');
    if (!cuerpo) return;

    cuerpo.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...</td></tr>';
    actualizarControlesPaginacionAuditoria(true);

    try {
        const parametros = new URLSearchParams({ page: String(pagina) });
        Object.entries(filtrosAuditoriaActuales).forEach(([clave, valor]) => {
            if (valor) parametros.set(clave, valor);
        });
        const resultado = await obtenerDatosAdministracion(`/api/auditoria?${parametros}`);
        if (!document.getElementById('item-revisar-historial')?.classList.contains('activo')) return;

        paginaAuditoriaActual = resultado.pagina;
        totalPaginasAuditoria = resultado.totalPaginas;
        if (resultado.registros.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No hay registros de auditoría.</td></tr>';
        } else {
            cuerpo.innerHTML = resultado.registros.map(registro => {
                const fecha = new Date(registro.Fecha_Hora);
                const fechaTexto = Number.isNaN(fecha.getTime())
                    ? registro.Fecha_Hora
                    : new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(fecha);

                return `
                    <tr>
                        <td>${escaparTextoTabla(registro.idLog)}</td>
                        <td>${registro.idUsuario == null ? 'Sistema' : escaparTextoTabla(registro.idUsuario)}</td>
                        <td>${escaparTextoTabla(registro.Accion)}</td>
                        <td>${escaparTextoTabla(registro.Tabla_Afectada)}</td>
                        <td>${registro.idRegistroAfectado == null ? '—' : escaparTextoTabla(registro.idRegistroAfectado)}</td>
                        <td style="min-width:240px; white-space:normal;">${escaparTextoTabla(registro.Detalle)}</td>
                        <td style="white-space:nowrap;">${escaparTextoTabla(fechaTexto)}</td>
                    </tr>
                `;
            }).join('');
        }

        actualizarControlesPaginacionAuditoria(false, resultado);
    } catch (error) {
        if (document.getElementById('item-revisar-historial')?.classList.contains('activo')) {
            cuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#b42318; padding:20px;">${escaparTextoTabla(error.message)}</td></tr>`;
            actualizarControlesPaginacionAuditoria(true);
        }
        console.error('Error al cargar la auditoría:', error);
    }
}

function actualizarControlesPaginacionAuditoria(cargando, resultado = null) {
    const resumen = resultado
        ? (resultado.totalRegistros === 0
            ? '0 registros'
            : `de ${resultado.totalPaginas} páginas · ${resultado.totalRegistros} registros`)
        : (cargando ? 'Cargando...' : '');

    document.querySelectorAll('.auditoria-indicador-pagina').forEach(indicador => {
        if (!resultado || resultado.totalRegistros === 0) {
            indicador.textContent = resumen;
            return;
        }

        indicador.innerHTML = `Página <button type="button" class="auditoria-numero-pagina" aria-label="Cambiar número de página" title="Haz clic para escribir una página">${resultado.pagina}</button> ${resumen}`;
        indicador.querySelector('.auditoria-numero-pagina').addEventListener('click', evento => {
            const boton = evento.currentTarget;
            const entrada = document.createElement('input');
            entrada.type = 'number';
            entrada.min = '1';
            entrada.max = String(Math.max(1, totalPaginasAuditoria));
            entrada.value = String(paginaAuditoriaActual);
            entrada.setAttribute('aria-label', 'Número de página; presiona Enter para ir');
            entrada.style.width = '58px';
            entrada.addEventListener('keydown', keyEvent => {
                if (keyEvent.key === 'Enter') {
                    keyEvent.preventDefault();
                    const pagina = Number(entrada.value);
                    if (Number.isInteger(pagina) && pagina >= 1 && pagina <= totalPaginasAuditoria) {
                        cargarHistorialAuditoria(pagina);
                    }
                } else if (keyEvent.key === 'Escape') {
                    actualizarControlesPaginacionAuditoria(false, {
                        pagina: paginaAuditoriaActual,
                        totalPaginas: totalPaginasAuditoria,
                        totalRegistros: resultado.totalRegistros
                    });
                }
            });
            boton.replaceWith(entrada);
            entrada.focus();
            entrada.select();
        });
    });

    document.querySelectorAll('.auditoria-pagina-anterior').forEach(boton => {
        boton.disabled = cargando || paginaAuditoriaActual <= 1;
    });
    document.querySelectorAll('.auditoria-pagina-siguiente').forEach(boton => {
        boton.disabled = cargando || totalPaginasAuditoria === 0 || paginaAuditoriaActual >= totalPaginasAuditoria;
    });
}

async function obtenerDatosAdministracion(url) {
    const token = sessionStorage.getItem('token_ministerio');
    if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

    const respuesta = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || 'No se pudieron cargar los datos.');
    }

    return datos;
}

function mostrarErrorAdministracion(error, columnas) {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    if (cuerpo) {
        cuerpo.innerHTML = `<tr><td colspan="${columnas}" style="text-align:center; color:#b42318; padding:20px;">${escaparTextoTabla(error.message)}</td></tr>`;
    }
    console.error('Error al cargar el módulo de administración:', error);
}

async function cargarAdministracionEmpleados() {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    if (!cuerpo) return;

    inicializarAccionesEmpleados(cuerpo);

    document.getElementById('empleados-toggle-filtros')?.addEventListener('click', () => {
        establecerFiltrosEmpleadosAbiertos(document.getElementById('empleados-contenedor-filtros').hidden);
    });
    document.querySelectorAll('.empleados-admin-anterior').forEach(boton => {
        boton.addEventListener('click', () => {
            if (paginaEmpleadosActual > 1) cargarPaginaAdministracionEmpleados(paginaEmpleadosActual - 1);
        });
    });
    document.querySelectorAll('.empleados-admin-siguiente').forEach(boton => {
        boton.addEventListener('click', () => {
            if (paginaEmpleadosActual < totalPaginasEmpleados) cargarPaginaAdministracionEmpleados(paginaEmpleadosActual + 1);
        });
    });
    document.getElementById('empleados-form-filtros').addEventListener('submit', evento => {
        evento.preventDefault();
        filtrosEmpleadosActuales = {
            cargo: document.getElementById('empleados-filtro-cargo').value,
            estado: document.getElementById('empleados-filtro-estado').value,
            tipoCuenta: document.getElementById('empleados-filtro-tipo-cuenta').value,
            buscar: document.getElementById('empleados-filtro-busqueda').value.trim(),
            dni: document.getElementById('empleados-filtro-dni').value.trim()
        };
        establecerFiltrosEmpleadosAbiertos(false);
        cargarPaginaAdministracionEmpleados(1);
    });
    document.getElementById('empleados-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('empleados-form-filtros').reset();
        filtrosEmpleadosActuales = {};
        establecerFiltrosEmpleadosAbiertos(false);
        cargarPaginaAdministracionEmpleados(1);
    });
    document.getElementById('empleados-orden-nombre').addEventListener('click', () => {
        ordenEmpleadosActual = ordenEmpleadosActual === 'asc' ? 'desc' : 'asc';
        actualizarIconoOrdenEmpleados();
        cargarPaginaAdministracionEmpleados(1);
    });

    cargarPaginaAdministracionEmpleados(1);
}

function establecerFiltrosEmpleadosAbiertos(abiertos) {
    const panel = document.getElementById('empleados-contenedor-filtros');
    const boton = document.getElementById('empleados-toggle-filtros');
    const texto = document.getElementById('empleados-texto-toggle-filtros');
    const icono = document.getElementById('empleados-icono-toggle-filtros');
    if (!panel || !boton) return;

    panel.hidden = !abiertos;
    boton.setAttribute('aria-expanded', String(abiertos));
    texto.textContent = abiertos ? 'Ocultar filtros' : 'Filtrar registros';
    icono.classList.toggle('fa-chevron-up', abiertos);
    icono.classList.toggle('fa-chevron-down', !abiertos);
}

function actualizarIconoOrdenEmpleados() {
    const encabezado = document.getElementById('empleados-th-orden-nombre');
    const icono = document.getElementById('empleados-icono-orden-nombre');
    const boton = document.getElementById('empleados-orden-nombre');
    if (!encabezado || !icono || !boton) return;

    const ascendente = ordenEmpleadosActual === 'asc';
    encabezado.setAttribute('aria-sort', ascendente ? 'ascending' : 'descending');
    boton.title = ascendente ? 'Ordenado de A a Z; hacer clic para Z a A' : 'Ordenado de Z a A; hacer clic para A a Z';
    icono.classList.toggle('fa-arrow-down-a-z', ascendente);
    icono.classList.toggle('fa-arrow-up-a-z', !ascendente);
}

async function cargarPaginaAdministracionEmpleados(pagina) {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    if (!cuerpo) return;

    cuerpo.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando empleados...</td></tr>';
    actualizarControlesEmpleados(true);

    try {
        const parametros = new URLSearchParams({ page: String(pagina), orden: ordenEmpleadosActual });
        Object.entries(filtrosEmpleadosActuales).forEach(([clave, valor]) => {
            if (valor) parametros.set(clave, valor);
        });
        const resultado = await obtenerDatosAdministracion(`/api/empleados/administracion?${parametros}`);
        if (!cuerpo || !document.getElementById('item-administrar-empleados')?.classList.contains('activo')) return;

        paginaEmpleadosActual = resultado.pagina;
        totalPaginasEmpleados = resultado.totalPaginas;
        if (resultado.empleados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No hay empleados registrados.</td></tr>';
        } else {
            cuerpo.innerHTML = resultado.empleados.map(empleado => `
                <tr
                    data-employee-id="${escaparTextoTabla(empleado.idEmpleado)}"
                    data-employee-name="${escaparTextoTabla(empleado.Nombre)}"
                    data-employee-surname="${escaparTextoTabla(empleado.Apellido)}"
                    data-employee-dni="${escaparTextoTabla(empleado.DNI)}"
                    data-employee-address="${escaparTextoTabla(empleado.Domicilio)}"
                    data-employee-phone="${escaparTextoTabla(empleado.Telefono)}"
                    data-employee-email="${escaparTextoTabla(empleado.Correo)}"
                    data-employee-cargo="${escaparTextoTabla(empleado.Cargo)}"
                    data-employee-active="${Number(empleado.Activo) === 1 ? '1' : '0'}"
                    data-employee-account="${escaparTextoTabla(empleado.TipoUsuarioWeb || '')}"
                >
                    <td>${escaparTextoTabla(empleado.idEmpleado)}</td>
                    <td>${escaparTextoTabla(`${empleado.Nombre} ${empleado.Apellido}`)}</td>
                    <td>${escaparTextoTabla(empleado.DNI)}</td>
                    <td>${escaparTextoTabla(empleado.Correo)}</td>
                    <td>${escaparTextoTabla(empleado.Telefono)}</td>
                    <td>${escaparTextoTabla(empleado.Cargo)}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <span class="estado-indicador ${Number(empleado.Activo) === 1 ? 'estado-verde' : 'estado-rojo'}" role="img" aria-label="Empleado ${Number(empleado.Activo) === 1 ? 'activo' : 'inactivo'}"></span>
                        <span style="vertical-align:middle; margin-left:5px;">${Number(empleado.Activo) === 1 ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td>${empleado.TipoUsuarioWeb ? escaparTextoTabla(empleado.TipoUsuarioWeb) : 'Sin usuario web'}</td>
                    <td style="text-align:center;">
                        <button type="button" class="btn-acciones-tabla empleado-acciones" aria-label="Acciones para ${escaparTextoTabla(`${empleado.Nombre} ${empleado.Apellido}`)}" title="Acciones del empleado">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        actualizarControlesEmpleados(false, resultado);
    } catch (error) {
        if (document.getElementById('item-administrar-empleados')?.classList.contains('activo')) {
            cuerpo.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#b42318; padding:20px;">${escaparTextoTabla(error.message)}</td></tr>`;
            actualizarControlesEmpleados(true);
        }
        console.error('Error al cargar empleados para administración:', error);
    }
}

function actualizarControlesEmpleados(cargando, resultado = null) {
    const resumen = resultado
        ? (resultado.totalRegistros === 0
            ? '0 registros'
            : `de ${resultado.totalPaginas} páginas · ${resultado.totalRegistros} registros`)
        : (cargando ? 'Cargando...' : '');

    document.querySelectorAll('.empleados-admin-indicador').forEach(indicador => {
        if (!resultado || resultado.totalRegistros === 0) {
            indicador.textContent = resumen;
            return;
        }

        indicador.innerHTML = `Página <button type="button" class="empleados-admin-numero-pagina" aria-label="Cambiar número de página" title="Haz clic para escribir una página">${resultado.pagina}</button> ${resumen}`;
        indicador.querySelector('.empleados-admin-numero-pagina').addEventListener('click', evento => {
            const boton = evento.currentTarget;
            const entrada = document.createElement('input');
            entrada.type = 'number';
            entrada.min = '1';
            entrada.max = String(Math.max(1, totalPaginasEmpleados));
            entrada.value = String(paginaEmpleadosActual);
            entrada.setAttribute('aria-label', 'Número de página; presiona Enter para ir');
            entrada.style.width = '58px';
            entrada.addEventListener('keydown', keyEvent => {
                if (keyEvent.key === 'Enter') {
                    keyEvent.preventDefault();
                    const pagina = Number(entrada.value);
                    if (Number.isInteger(pagina) && pagina >= 1 && pagina <= totalPaginasEmpleados) {
                        cargarPaginaAdministracionEmpleados(pagina);
                    }
                } else if (keyEvent.key === 'Escape') {
                    actualizarControlesEmpleados(false, resultado);
                }
            });
            boton.replaceWith(entrada);
            entrada.focus();
            entrada.select();
        });
    });

    document.querySelectorAll('.empleados-admin-anterior').forEach(boton => {
        boton.disabled = cargando || paginaEmpleadosActual <= 1;
    });
    document.querySelectorAll('.empleados-admin-siguiente').forEach(boton => {
        boton.disabled = cargando || totalPaginasEmpleados === 0 || paginaEmpleadosActual >= totalPaginasEmpleados;
    });
}

async function cargarAdministracionUsuarios() {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    if (!cuerpo) return;

    inicializarAccionesUsuarios(cuerpo);

    document.getElementById('usuarios-toggle-filtros')?.addEventListener('click', () => {
        establecerFiltrosUsuariosAbiertos(document.getElementById('usuarios-contenedor-filtros').hidden);
    });
    document.getElementById('usuarios-orden-persona')?.addEventListener('click', () => {
        ordenUsuariosActual = ordenUsuariosActual === 'asc' ? 'desc' : 'asc';
        actualizarIconoOrdenUsuarios();
        cargarPaginaAdministracionUsuarios(1);
    });
    actualizarIconoOrdenUsuarios();
    document.querySelectorAll('.usuarios-admin-anterior').forEach(boton => {
        boton.addEventListener('click', () => {
            if (paginaUsuariosActual > 1) cargarPaginaAdministracionUsuarios(paginaUsuariosActual - 1);
        });
    });
    document.querySelectorAll('.usuarios-admin-siguiente').forEach(boton => {
        boton.addEventListener('click', () => {
            if (paginaUsuariosActual < totalPaginasUsuarios) cargarPaginaAdministracionUsuarios(paginaUsuariosActual + 1);
        });
    });
    document.getElementById('usuarios-form-filtros').addEventListener('submit', evento => {
        evento.preventDefault();
        filtrosUsuariosActuales = {
            tipoUsuario: document.getElementById('usuarios-filtro-tipo').value,
            estado: document.getElementById('usuarios-filtro-estado').value,
            buscar: document.getElementById('usuarios-filtro-busqueda').value.trim()
        };
        establecerFiltrosUsuariosAbiertos(false);
        cargarPaginaAdministracionUsuarios(1);
    });
    document.getElementById('usuarios-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('usuarios-form-filtros').reset();
        filtrosUsuariosActuales = {};
        establecerFiltrosUsuariosAbiertos(false);
        cargarPaginaAdministracionUsuarios(1);
    });

    cargarPaginaAdministracionUsuarios(1);
}

function actualizarIconoOrdenUsuarios() {
    const encabezado = document.getElementById('usuarios-th-orden-persona');
    const icono = document.getElementById('usuarios-icono-orden-persona');
    const boton = document.getElementById('usuarios-orden-persona');
    if (!encabezado || !icono || !boton) return;

    const ascendente = ordenUsuariosActual === 'asc';
    encabezado.setAttribute('aria-sort', ascendente ? 'ascending' : 'descending');
    boton.title = ascendente ? 'Ordenado de A a Z; hacer clic para Z a A' : 'Ordenado de Z a A; hacer clic para A a Z';
    icono.classList.toggle('fa-arrow-down-a-z', ascendente);
    icono.classList.toggle('fa-arrow-up-a-z', !ascendente);
}

function inicializarAccionesUsuarios(cuerpo) {
    cuerpo.addEventListener('click', evento => {
        const boton = evento.target.closest('.usuario-acciones');
        if (!boton) return;

        evento.stopPropagation();
        const menuExistente = document.querySelector('.usuarios-menu-acciones');
        if (menuExistente) {
            const eraEsteMenu = menuExistente.dataset.userId === boton.closest('tr').dataset.userId;
            cerrarMenuAccionesUsuario();
            if (eraEsteMenu) return;
        }

        const fila = boton.closest('tr');
        const usuario = {
            id: fila.dataset.userId,
            correo: fila.dataset.userEmail,
            persona: fila.dataset.userName,
            tipoUsuario: fila.dataset.userType,
            activa: fila.dataset.userActive === '1',
            noticiero: fila.dataset.userNoticiero === '1',
            cargo: fila.dataset.userCargo
        };

        mostrarMenuAccionesUsuario(boton, usuario);
    });

    if (!document.documentElement.dataset.usuarioMenuListener) {
        document.addEventListener('click', cerrarMenuAccionesUsuario);
        document.documentElement.dataset.usuarioMenuListener = 'true';
    }
}

function mostrarMenuAccionesUsuario(boton, usuario) {
    const menu = document.createElement('div');
    menu.className = 'usuarios-menu-acciones';
    menu.dataset.userId = usuario.id;
    menu.setAttribute('role', 'menu');
    Object.assign(menu.style, {
        position: 'fixed',
        zIndex: '2000',
        minWidth: '210px',
        padding: '5px',
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: '4px',
        boxShadow: '0 6px 18px rgba(0,0,0,.16)'
    });

    const acciones = [
        ['correo', 'Cambiar correo'],
        ...(usuario.tipoUsuario !== 'Emprendedor' ? [['tipoUsuario', 'Cambiar tipo de usuario']] : []),
        ['activa', usuario.activa ? 'Desactivar cuenta' : 'Activar cuenta'],
        // El permiso para publicar noticias solo aplica a Empleado de Área y Administrador
        ...(['Empleado de Area', 'Administrador'].includes(usuario.tipoUsuario)
            ? [['noticiero', usuario.noticiero ? 'Quitar permiso de noticiero' : 'Dar permiso de noticiero']]
            : [])
    ];

    acciones.forEach(([accion, texto]) => {
        const opcion = document.createElement('button');
        opcion.type = 'button';
        opcion.textContent = texto;
        opcion.setAttribute('role', 'menuitem');
        Object.assign(opcion.style, {
            display: 'block',
            width: '100%',
            padding: '9px 10px',
            border: '0',
            borderRadius: '3px',
            background: 'transparent',
            color: '#243746',
            textAlign: 'left',
            cursor: 'pointer'
        });
        opcion.addEventListener('mouseenter', () => { opcion.style.background = '#eef4f5'; });
        opcion.addEventListener('mouseleave', () => { opcion.style.background = 'transparent'; });
        opcion.addEventListener('click', evento => {
            evento.stopPropagation();
            cerrarMenuAccionesUsuario();
            if (accion === 'correo') solicitarCambioCorreo(usuario);
            if (accion === 'tipoUsuario') solicitarCambioTipoUsuario(usuario);
            if (accion === 'activa') solicitarCambioEstadoCuenta(usuario);
            if (accion === 'noticiero') solicitarCambioNoticiero(usuario);
        });
        menu.appendChild(opcion);
    });

    const bounds = boton.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(bounds.right - 210, window.innerWidth - 218))}px`;
    menu.style.top = `${Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - (acciones.length * 40 + 12)))}px`;
    document.body.appendChild(menu);
}

function cerrarMenuAccionesUsuario() {
    document.querySelectorAll('.usuarios-menu-acciones').forEach(menu => menu.remove());
}

async function solicitarCambioCorreo(usuario) {
    const resultado = await Swal.fire({
        title: 'Cambiar correo',
        text: `Usuario: ${usuario.persona}`,
        input: 'email',
        inputValue: usuario.correo,
        inputLabel: 'Nuevo correo electrónico',
        inputAttributes: { maxlength: 150, autocomplete: 'email' },
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        inputValidator: valor => {
            if (!valor || !/^\S+@\S+\.\S+$/.test(valor.trim())) return 'Ingresa un correo válido.';
            if (valor.trim().length > 150) return 'El correo no puede superar los 150 caracteres.';
            if (valor.trim().toLowerCase() === usuario.correo.toLowerCase()) return 'El correo ingresado es igual al actual.';
        }
    });
    if (!resultado.isConfirmed) return;

    const nuevoCorreo = resultado.value.trim();
    const personaVinculada = usuario.tipoUsuario === 'Emprendedor' ? 'la tabla Emprendedor' : 'la tabla Empleado';
    await confirmarDobleCambioUsuario(
        usuario,
        `El correo de acceso cambiará de ${usuario.correo} a ${nuevoCorreo}. También se actualizará en ${personaVinculada}. El administrador que realiza el cambio quedará registrado en Auditoría.`,
        { correo: nuevoCorreo }
    );
}

async function solicitarCambioTipoUsuario(usuario) {
    const opciones = {
        'Empleado de Mesa|Mesa de Entrada': 'Empleado de Mesa',
        'Empleado de Area|Técnico': 'Empleado de Área · Técnico',
        'Empleado de Area|Social': 'Empleado de Área · Social',
        'Administrador|Administrador': 'Administrador'
    };
    Object.keys(opciones).forEach(valor => {
        const [tipoUsuario, cargo] = valor.split('|');
        if (tipoUsuario === usuario.tipoUsuario && cargo === usuario.cargo) delete opciones[valor];
    });

    const resultado = await Swal.fire({
        title: 'Cambiar tipo de usuario',
        text: `Usuario: ${usuario.persona}. El cargo del empleado se sincronizará con el nuevo tipo.`,
        input: 'select',
        inputOptions: opciones,
        inputPlaceholder: 'Selecciona el nuevo tipo',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        inputValidator: valor => !valor ? 'Selecciona un tipo de usuario.' : undefined
    });
    if (!resultado.isConfirmed) return;

    const [tipoUsuario, cargo] = resultado.value.split('|');
    const detalle = tipoUsuario === usuario.tipoUsuario
        ? `El rol seguirá siendo ${usuario.tipoUsuario}, pero el cargo cambiará de ${usuario.cargo} a ${cargo}. El administrador responsable quedará registrado en Auditoría.`
        : `El tipo cambiará de ${usuario.tipoUsuario} a ${tipoUsuario}, modificando los permisos de acceso. El cargo cambiará de ${usuario.cargo} a ${cargo}. El administrador responsable quedará registrado en Auditoría.`;
    await confirmarDobleCambioUsuario(
        usuario,
        detalle,
        { tipoUsuario, cargo }
    );
}

async function solicitarCambioEstadoCuenta(usuario) {
    const activar = !usuario.activa;
    const accion = activar ? 'activar' : 'desactivar';
    const detalle = activar
        ? 'Una cuenta activa permite que el usuario ingrese al sistema.'
        : 'Una cuenta inactiva no permite que el usuario ingrese al sistema.';

    await confirmarDobleCambioUsuario(
        usuario,
        `Se va a ${accion} la cuenta. ${detalle} El administrador responsable quedará registrado en Auditoría.`,
        { activa: activar ? 1 : 0 }
    );
}

async function solicitarCambioNoticiero(usuario) {
    const otorgar = !usuario.noticiero;
    const detalle = otorgar
        ? 'Podrá publicar noticias con texto e imagen en la pestaña Noticias, editarlas durante la primera hora y ocultarlas.'
        : 'Ya no podrá publicar, editar ni ocultar noticias. Las noticias que ya publicó seguirán visibles.';

    await confirmarDobleCambioUsuario(
        usuario,
        `Se va a ${otorgar ? 'otorgar' : 'quitar'} el permiso de noticiero. ${detalle} El administrador responsable quedará registrado en Auditoría.`,
        { noticiero: otorgar ? 1 : 0 }
    );
}

async function confirmarDobleCambioUsuario(usuario, detalle, cambios) {
    const primeraConfirmacion = await Swal.fire({
        title: 'Revisar cambio',
        text: detalle,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Revisar confirmación final',
        cancelButtonText: 'Cancelar'
    });
    if (!primeraConfirmacion.isConfirmed) return;

    const confirmacionFinal = await Swal.fire({
        title: 'Confirmación final',
        text: `${detalle} ¿Confirmas el cambio para ${usuario.persona}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, aplicar cambio',
        cancelButtonText: 'No, cancelar'
    });
    if (!confirmacionFinal.isConfirmed) return;

    try {
        const token = sessionStorage.getItem('token_ministerio');
        if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

        const respuesta = await fetch(`/api/usuarios/administracion/${encodeURIComponent(usuario.id)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cambios)
        });
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.error || 'No se pudo actualizar la cuenta.');

        await Swal.fire({
            icon: 'success',
            title: 'Cambio registrado',
            text: data.mensaje,
            confirmButtonColor: '#1a3a5f'
        });
        cargarPaginaAdministracionUsuarios(paginaUsuariosActual);
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo aplicar el cambio',
            text: error.message,
            confirmButtonColor: '#1a3a5f'
        });
    }
}

function establecerFiltrosUsuariosAbiertos(abiertos) {
    const panel = document.getElementById('usuarios-contenedor-filtros');
    const boton = document.getElementById('usuarios-toggle-filtros');
    const texto = document.getElementById('usuarios-texto-toggle-filtros');
    const icono = document.getElementById('usuarios-icono-toggle-filtros');
    if (!panel || !boton) return;

    panel.hidden = !abiertos;
    boton.setAttribute('aria-expanded', String(abiertos));
    texto.textContent = abiertos ? 'Ocultar filtros' : 'Filtrar registros';
    icono.classList.toggle('fa-chevron-up', abiertos);
    icono.classList.toggle('fa-chevron-down', !abiertos);
}

async function cargarPaginaAdministracionUsuarios(pagina) {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    if (!cuerpo) return;

    cuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>';
    actualizarControlesUsuarios(true);

    try {
        const parametros = new URLSearchParams({ page: String(pagina), orden: ordenUsuariosActual });
        Object.entries(filtrosUsuariosActuales).forEach(([clave, valor]) => {
            if (valor) parametros.set(clave, valor);
        });
        const resultado = await obtenerDatosAdministracion(`/api/usuarios/administracion?${parametros}`);
        if (!cuerpo || !document.getElementById('item-administrar-usuarios')?.classList.contains('activo')) return;

        paginaUsuariosActual = resultado.pagina;
        totalPaginasUsuarios = resultado.totalPaginas;
        if (resultado.usuarios.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay usuarios registrados.</td></tr>';
        } else {
            cuerpo.innerHTML = resultado.usuarios.map(usuario => `
                <tr
                    data-user-id="${escaparTextoTabla(usuario.idUsuario)}"
                    data-user-email="${escaparTextoTabla(usuario.Correo)}"
                    data-user-name="${escaparTextoTabla(usuario.Persona || usuario.Correo)}"
                    data-user-type="${escaparTextoTabla(usuario.TipoUsuario)}"
                    data-user-active="${Number(usuario.Activa) === 1 ? '1' : '0'}"
                    data-user-noticiero="${Number(usuario.Noticiero) === 1 ? '1' : '0'}"
                    data-user-cargo="${escaparTextoTabla(usuario.CargoEmpleado || '')}"
                >
                    <td>${escaparTextoTabla(usuario.idUsuario)}</td>
                    <td>${escaparTextoTabla(usuario.Persona || usuario.Correo)}</td>
                    <td>${escaparTextoTabla(usuario.Correo)}</td>
                    <td>
                        ${escaparTextoTabla(usuario.TipoUsuario)}
                        ${Number(usuario.Noticiero) === 1 ? '<i class="fa-solid fa-newspaper" title="Tiene permiso de noticiero" aria-label="Noticiero" style="margin-left:6px; color:#a65454;"></i>' : ''}
                    </td>
                    <td style="text-align:center; white-space:nowrap;">
                        <span class="estado-indicador ${Number(usuario.Activa) === 1 ? 'estado-verde' : 'estado-rojo'}" role="img" aria-label="Cuenta ${Number(usuario.Activa) === 1 ? 'activa' : 'inactiva'}"></span>
                        <span style="vertical-align:middle; margin-left:5px;">${Number(usuario.Activa) === 1 ? 'Activa' : 'Inactiva'}</span>
                        <button type="button" class="btn-acciones-tabla usuario-acciones" aria-label="Acciones para ${escaparTextoTabla(usuario.Persona || usuario.Correo)}" title="Acciones de usuario" style="margin-left:10px;">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        actualizarControlesUsuarios(false, resultado);
    } catch (error) {
        if (document.getElementById('item-administrar-usuarios')?.classList.contains('activo')) {
            cuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#b42318; padding:20px;">${escaparTextoTabla(error.message)}</td></tr>`;
            actualizarControlesUsuarios(true);
        }
        console.error('Error al cargar usuarios para administración:', error);
    }
}

function actualizarControlesUsuarios(cargando, resultado = null) {
    const resumen = resultado
        ? (resultado.totalRegistros === 0
            ? '0 registros'
            : `de ${resultado.totalPaginas} páginas · ${resultado.totalRegistros} registros`)
        : (cargando ? 'Cargando...' : '');

    document.querySelectorAll('.usuarios-admin-indicador').forEach(indicador => {
        if (!resultado || resultado.totalRegistros === 0) {
            indicador.textContent = resumen;
            return;
        }

        indicador.innerHTML = `Página <button type="button" class="usuarios-admin-numero-pagina" aria-label="Cambiar número de página" title="Haz clic para escribir una página">${resultado.pagina}</button> ${resumen}`;
        indicador.querySelector('.usuarios-admin-numero-pagina').addEventListener('click', evento => {
            const boton = evento.currentTarget;
            const entrada = document.createElement('input');
            entrada.type = 'number';
            entrada.min = '1';
            entrada.max = String(Math.max(1, totalPaginasUsuarios));
            entrada.value = String(paginaUsuariosActual);
            entrada.setAttribute('aria-label', 'Número de página; presiona Enter para ir');
            entrada.style.width = '58px';
            entrada.addEventListener('keydown', keyEvent => {
                if (keyEvent.key === 'Enter') {
                    keyEvent.preventDefault();
                    const pagina = Number(entrada.value);
                    if (Number.isInteger(pagina) && pagina >= 1 && pagina <= totalPaginasUsuarios) {
                        cargarPaginaAdministracionUsuarios(pagina);
                    }
                } else if (keyEvent.key === 'Escape') {
                    actualizarControlesUsuarios(false, resultado);
                }
            });
            boton.replaceWith(entrada);
            entrada.focus();
            entrada.select();
        });
    });

    document.querySelectorAll('.usuarios-admin-anterior').forEach(boton => {
        boton.disabled = cargando || paginaUsuariosActual <= 1;
    });
    document.querySelectorAll('.usuarios-admin-siguiente').forEach(boton => {
        boton.disabled = cargando || totalPaginasUsuarios === 0 || paginaUsuariosActual >= totalPaginasUsuarios;
    });
}

function inicializarAccionesEmpleados(cuerpo) {
    cuerpo.addEventListener('click', evento => {
        const boton = evento.target.closest('.empleado-acciones');
        if (!boton) return;

        evento.stopPropagation();
        const fila = boton.closest('tr');
        const menuExistente = document.querySelector('.empleados-menu-acciones');
        if (menuExistente) {
            const eraEsteMenu = menuExistente.dataset.employeeId === fila.dataset.employeeId;
            cerrarMenuAccionesEmpleado();
            if (eraEsteMenu) return;
        }

        mostrarMenuAccionesEmpleado(boton, fila);
    });

    if (!document.documentElement.dataset.empleadoMenuListener) {
        document.addEventListener('click', cerrarMenuAccionesEmpleado);
        document.documentElement.dataset.empleadoMenuListener = 'true';
    }
}

function mostrarMenuAccionesEmpleado(boton, fila) {
    const menu = document.createElement('div');
    menu.className = 'empleados-menu-acciones';
    menu.dataset.employeeId = fila.dataset.employeeId;
    menu.setAttribute('role', 'menu');
    Object.assign(menu.style, {
        position: 'fixed',
        zIndex: '2000',
        minWidth: '180px',
        padding: '5px',
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: '4px',
        boxShadow: '0 6px 18px rgba(0,0,0,.16)'
    });

    const opcion = document.createElement('button');
    opcion.type = 'button';
    opcion.textContent = 'Editar datos';
    opcion.setAttribute('role', 'menuitem');
    Object.assign(opcion.style, {
        display: 'block',
        width: '100%',
        padding: '9px 10px',
        border: '0',
        borderRadius: '3px',
        background: 'transparent',
        color: '#243746',
        textAlign: 'left',
        cursor: 'pointer'
    });
    opcion.addEventListener('mouseenter', () => { opcion.style.background = '#eef4f5'; });
    opcion.addEventListener('mouseleave', () => { opcion.style.background = 'transparent'; });
    opcion.addEventListener('click', evento => {
        evento.stopPropagation();
        cerrarMenuAccionesEmpleado();
        abrirFormularioEdicionEmpleado({
            id: fila.dataset.employeeId,
            nombre: fila.dataset.employeeName,
            apellido: fila.dataset.employeeSurname,
            dni: fila.dataset.employeeDni,
            domicilio: fila.dataset.employeeAddress,
            telefono: fila.dataset.employeePhone,
            correo: fila.dataset.employeeEmail,
            cargo: fila.dataset.employeeCargo,
            activo: fila.dataset.employeeActive === '1',
            tipoUsuario: fila.dataset.employeeAccount
        });
    });
    menu.appendChild(opcion);

    const bounds = boton.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(bounds.right - 180, window.innerWidth - 188))}px`;
    menu.style.top = `${Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - 80))}px`;
    document.body.appendChild(menu);
}

function cerrarMenuAccionesEmpleado() {
    document.querySelectorAll('.empleados-menu-acciones').forEach(menu => menu.remove());
}

async function abrirFormularioEdicionEmpleado(empleado) {
    const cargos = ['Mesa de Entrada', 'Técnico', 'Social', 'Administrador'];
    const selectorCargo = cargos.map(cargo =>
        `<option value="${escaparTextoTabla(cargo)}" ${empleado.cargo === cargo ? 'selected' : ''}>${escaparTextoTabla(cargo)}</option>`
    ).join('');
    const cuenta = empleado.tipoUsuario
        ? `La cuenta web actual es ${escaparTextoTabla(empleado.tipoUsuario)}.`
        : 'Este empleado todavía no tiene una cuenta web asociada.';

    const resultado = await Swal.fire({
        title: 'Editar datos del empleado',
        width: '700px',
        html: `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; text-align:left;">
                <label>Nombre
                    <input id="edicion-empleado-nombre" class="swal2-input" maxlength="30" value="${escaparTextoTabla(empleado.nombre)}" style="width:100%; margin:5px 0 0;">
                </label>
                <label>Apellido
                    <input id="edicion-empleado-apellido" class="swal2-input" maxlength="30" value="${escaparTextoTabla(empleado.apellido)}" style="width:100%; margin:5px 0 0;">
                </label>
                <label>DNI
                    <input id="edicion-empleado-dni" class="swal2-input" maxlength="15" value="${escaparTextoTabla(empleado.dni)}" style="width:100%; margin:5px 0 0;">
                </label>
                <label>Teléfono
                    <input id="edicion-empleado-telefono" type="tel" inputmode="numeric" pattern="[0-9]+" class="swal2-input" maxlength="25" value="${escaparTextoTabla(empleado.telefono)}" style="width:100%; margin:5px 0 0;">
                </label>
                <label style="grid-column:1 / -1;">Domicilio
                    <input id="edicion-empleado-domicilio" class="swal2-input" maxlength="512" value="${escaparTextoTabla(empleado.domicilio)}" style="width:100%; margin:5px 0 0;">
                </label>
                <label>Correo electrónico
                    <input id="edicion-empleado-correo" type="email" class="swal2-input" maxlength="150" value="${escaparTextoTabla(empleado.correo)}" style="width:100%; margin:5px 0 0;">
                </label>
                <label>Cargo
                    <select id="edicion-empleado-cargo" class="swal2-select" style="width:100%; margin:5px 0 0;">${selectorCargo}</select>
                </label>
            </div>
            <label style="display:flex; align-items:center; gap:8px; margin-top:16px; text-align:left;">
                <input id="edicion-empleado-activo" type="checkbox" ${empleado.activo ? 'checked' : ''}>
                Empleado activo
            </label>
            <p style="margin:14px 0 0; padding:10px; background:#f1f5f9; border-radius:4px; text-align:left; font-size:13px;">
                ${cuenta} Si cambia el correo o cargo, se sincronizará la cuenta web. Al dar de baja al empleado, la cuenta se desactivará; al reincorporarlo, la cuenta permanecerá inactiva y deberá activarse manualmente.
            </p>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar cambios',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const valores = {
                nombre: document.getElementById('edicion-empleado-nombre').value.trim(),
                apellido: document.getElementById('edicion-empleado-apellido').value.trim(),
                dni: document.getElementById('edicion-empleado-dni').value.trim(),
                domicilio: document.getElementById('edicion-empleado-domicilio').value.trim(),
                telefono: document.getElementById('edicion-empleado-telefono').value.trim(),
                correo: document.getElementById('edicion-empleado-correo').value.trim(),
                cargo: document.getElementById('edicion-empleado-cargo').value,
                activo: document.getElementById('edicion-empleado-activo').checked ? 1 : 0
            };
            const longitudes = { nombre: 30, apellido: 30, dni: 15, domicilio: 512, telefono: 25, correo: 150 };

            for (const [campo, limite] of Object.entries(longitudes)) {
                if (!valores[campo]) {
                    Swal.showValidationMessage('Todos los campos son obligatorios.');
                    return false;
                }
                if (valores[campo].length > limite) {
                    Swal.showValidationMessage(`El campo ${campo} supera ${limite} caracteres.`);
                    return false;
                }
            }
            if (!/^\S+@\S+\.\S+$/.test(valores.correo)) {
                Swal.showValidationMessage('Ingresa un correo electrónico válido.');
                return false;
            }
            if (!/^\d+$/.test(valores.telefono)) {
                Swal.showValidationMessage('El teléfono solo puede contener números.');
                return false;
            }
            return valores;
        }
    });

    if (!resultado.isConfirmed) return;

    try {
        const token = sessionStorage.getItem('token_ministerio');
        if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

        const respuesta = await fetch(`/api/empleados/administracion/${encodeURIComponent(empleado.id)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(resultado.value)
        });
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.error || 'No se pudo guardar el empleado.');

        await Swal.fire({
            icon: 'success',
            title: 'Datos actualizados',
            text: data.mensaje,
            confirmButtonColor: '#1a3a5f'
        });
        cargarPaginaAdministracionEmpleados(paginaEmpleadosActual);
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo actualizar',
            text: error.message,
            confirmButtonColor: '#1a3a5f'
        });
    }
}