// ======================================================================
// 1. INICIALIZACIÓN Y VALIDACIÓN DEL TOKEN
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token_ministerio');
    if (!token) {
        window.location.href = "../Camino LOG IN.html";
        return;
    }

    try {
        // 🚀 ADAPTACIÓN PARA LA VERSIÓN 4 EN NAVEGADOR:
        // Intentamos grabarlo desde el objeto global que genera la v4 en cjs/umd
        const deodificar = window.jwtDecode || jwt_decode; 
        const payload = deodificar(token);
        
        const rolReal = payload.tipoUsuario; // "Empleado de Area", etc.
        
        // Almacenamos con seguridad previniendo que rompa si no vienen en el JWT
        sessionStorage.setItem('empleado_cargo', payload.cargo || '');
        
        document.getElementById('badge-empleado-rol').innerText = rolReal;
        
        // Renderizar el menú correspondiente e identificar la sección por defecto
        inicializarPanelPorRol(rolReal);

    } catch (err) {
        console.error("Error crítico de permisos en panel:", err);
        // Comentamos temporalmente la redirección para que puedas ver el error real en F12 si falla
        // window.location.href = "../Camino LOG IN.html";
    }
});

// ======================================================================
// 2. CONSTRUCCIÓN DEL MENÚ SEGÚN EL ROL
// ======================================================================
function inicializarPanelPorRol(rol) {
    const contenedorMenu = document.getElementById('contenedor-menu-lateral');
    let htmlMenu = '';
    let seccionInicial = '';

    if (rol === 'Empleado de Mesa') {
        seccionInicial = 'solicitudes-sin-expediente';
        htmlMenu = `
            <li class="item-simple activo" id="item-solicitudes-sin-expediente">
                <a href="#" onclick="cargarSección('solicitudes-sin-expediente', 'Carga de Expedientes GED')">
                    <i class="fa-solid fa-folder-open" style="margin-right: 8px;"></i> Solicitudes sin Expediente
                </a>
            </li>
        `;
    } 
    else if (rol === 'Empleado de Area') {
        seccionInicial = 'sin-revisar';
        htmlMenu = `
            <li class="menu-item-contenedor">
                <div class="menu-categoria" onclick="toggleAcordeon(this)">
                    <span id="categoria-sin-revisar"><i class="fa-solid fa-list-check" style="margin-right: 8px;"></i> Sin revisar</span>
                    <i class="fa-solid fa-chevron-down flecha"></i>
                </div>
                <ul class="menu-subitems">
                    <li id="item-inicio-sin-revisar"><a href="#" onclick="cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio')">• Solicitudes de Inicio</a></li>
                    <li id="item-subsidio-sin-revisar"><a href="#" onclick="cargarSección('subsidio-sin-revisar', 'Solicitudes de Subsidio')">• Solicitudes de Subsidio</a></li>
                    <li id="item-creditos-sin-revisar"><a href="#" onclick="cargarSección('creditos-sin-revisar', 'Solicitudes de Créditos')">• Solicitudes de Créditos</a></li>
                </ul>
            </li>
            <li class="menu-item-contenedor">
                <div class="menu-categoria" onclick="toggleAcordeon(this)">
                    <span><i class="fa-solid fa-spinner" style="margin-right: 8px;"></i> En revisión</span>
                    <i class="fa-solid fa-chevron-down flecha"></i>
                </div>
                <ul class="menu-subitems">
                    <li><a href="#" onclick="cargarSección('inicio-en-revision', 'En Revisión - Inicio')">• Solicitudes de Inicio</a></li>
                    <li><a href="#" onclick="cargarSección('subsidio-en-revision', 'En Revisión - Subsidio')">• Solicitudes de Subsidio</a></li>
                    <li><a href="#" onclick="cargarSección('creditos-en-revision', 'En Revisión - Créditos')">• Solicitudes de Créditos</a></li>
                </ul>
            </li>
            <li class="item-simple" id="item-publicaciones-espera">
                <a href="#" onclick="cargarSección('publicaciones-espera', 'Publicaciones en Espera')">
                    <i class="fa-solid fa-hourglass-half" style="margin-right: 8px;"></i> Publicaciones en Espera
                </a>
            </li>
            <li class="item-simple" id="item-registrar-emprendimiento">
                <a href="#" onclick="cargarSección('registrar-emprendimiento', 'Registrar Emprendimiento')">
                    <i class="fa-solid fa-folder-plus" style="margin-right: 8px;"></i> Registrar Emprendimiento
                </a>
            </li>
            <li class="item-simple" id="item-etiquetas-publicaciones">
                <a href="#" onclick="cargarSección('etiquetas-publicaciones', 'Gestión de Etiquetas')">
                    <i class="fa-solid fa-tags" style="margin-right: 8px;"></i> Etiquetas de Publicaciones
                </a>
            </li>
        `;
    } 
    else if (rol === 'Administrador') {
        seccionInicial = 'sin-revisar';
        htmlMenu = `
            <li class="menu-item-contenedor">
                <div class="menu-categoria" onclick="toggleAcordeon(this)">
                    <span id="categoria-sin-revisar"><i class="fa-solid fa-list-check" style="margin-right: 8px;"></i> Sin revisar</span>
                    <i class="fa-solid fa-chevron-down flecha"></i>
                </div>
                <ul class="menu-subitems">
                    <li id="item-inicio-sin-revisar"><a href="#" onclick="cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio')">• Solicitudes de Inicio</a></li>
                    <li id="item-subsidio-sin-revisar"><a href="#" onclick="cargarSección('subsidio-sin-revisar', 'Solicitudes de Subsidio')">• Solicitudes de Subsidio</a></li>
                    <li id="item-creditos-sin-revisar"><a href="#" onclick="cargarSección('creditos-sin-revisar', 'Solicitudes de Créditos')">• Solicitudes de Créditos</a></li>
                </ul>
            </li>
            <li class="menu-item-contenedor">
                <div class="menu-categoria" onclick="toggleAcordeon(this)">
                    <span><i class="fa-solid fa-spinner" style="margin-right: 8px;"></i> En revisión</span>
                    <i class="fa-solid fa-chevron-down flecha"></i>
                </div>
                <ul class="menu-subitems">
                    <li><a href="#" onclick="cargarSección('inicio-en-revision', 'En Revisión - Inicio')">• Solicitudes de Inicio</a></li>
                    <li><a href="#" onclick="cargarSección('subsidio-en-revision', 'En Revisión - Subsidio')">• Solicitudes de Subsidio</a></li>
                    <li><a href="#" onclick="cargarSección('creditos-en-revision', 'En Revisión - Créditos')">• Solicitudes de Créditos</a></li>
                </ul>
            </li>
            <li class="item-simple" id="item-publicaciones-espera">
                <a href="#" onclick="cargarSección('publicaciones-espera', 'Publicaciones en Espera')">
                    <i class="fa-solid fa-hourglass-half" style="margin-right: 8px;"></i> Publicaciones en Espera
                </a>
            </li>
            <li class="item-simple" id="item-registrar-emprendimiento">
                <a href="#" onclick="cargarSección('registrar-emprendimiento', 'Registrar Emprendimiento')">
                    <i class="fa-solid fa-folder-plus" style="margin-right: 8px;"></i> Registrar Emprendimiento
                </a>
            </li>
            <li class="item-simple" id="item-etiquetas-publicaciones">
                <a href="#" onclick="cargarSección('etiquetas-publicaciones', 'Gestión de Etiquetas')">
                    <i class="fa-solid fa-tags" style="margin-right: 8px;"></i> Etiquetas de Publicaciones
                </a>
            </li>
            <li class="item-simple" id="item-registrar-empleado">
                <a href="#" onclick="cargarSección('registrar-empleado', 'Registrar Nuevo Empleado')">
                    <i class="fa-solid fa-user-plus" style="margin-right: 8px;"></i> Registrar Empleado
                </a>
            </li>
            <li class="item-simple" id="item-administrar-empleados">
                <a href="#" onclick="cargarSección('administrar-empleados', 'Administración de Empleados')">
                    <i class="fa-solid fa-user-gear" style="margin-right: 8px;"></i> Administrar Empleados
                </a>
            </li>
            <li class="item-simple" id="item-registrar-usuario">
                <a href="#" onclick="cargarSección('registrar-usuario', 'Registrar Nuevo Usuario')">
                    <i class="fa-solid fa-user-plus" style="margin-right: 8px;"></i> Registrar Usuario
                </a>
            </li>
            <li class="item-simple" id="item-revisar-historial">
                <a href="#" onclick="cargarSección('revisar-historial', 'Historial de Auditoría')">
                    <i class="fa-solid fa-history" style="margin-right: 8px;"></i> Revisar Historial
                </a>
            </li>
            <li class="item-simple" id="item-administrar-usuarios">
                <a href="#" onclick="cargarSección('administrar-usuarios', 'Administración de Usuarios del Sistema')">
                    <i class="fa-solid fa-users-gear" style="margin-right: 8px;"></i> Administrar Usuarios
                </a>
            </li>
        `;
    }

    contenedorMenu.innerHTML = htmlMenu;

    // Entrada directa desde una notificación (ej: Empleado%20view.html#publicaciones-espera):
    // si el rol tiene esa sección en su menú, se abre esa en lugar de la de por defecto
    const seccionesPorEnlace = {
        'publicaciones-espera': 'Publicaciones en Espera',
        'solicitudes-sin-expediente': 'Carga de Expedientes GED',
        'inicio-sin-revisar': 'Solicitudes de Inicio',
        'subsidio-sin-revisar': 'Solicitudes de Subsidio',
        'creditos-sin-revisar': 'Solicitudes de Créditos'
    };
    const seccionPedida = window.location.hash.slice(1);
    if (seccionesPorEnlace[seccionPedida] && document.getElementById(`item-${seccionPedida}`)) {
        cargarSección(seccionPedida, seccionesPorEnlace[seccionPedida]);
        history.replaceState(null, '', window.location.pathname); // el # no queda pegado en la dirección
        return;
    }

    // Ejecuta la carga por defecto según el rol evitando el desfasaje visual (Solución al BUG)
    if(seccionInicial === 'sin-revisar') {
        cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio');
    } else {
        cargarSección(seccionInicial, 'Carga de Expedientes GED');
    }
}

// ======================================================================
// 3. CONTROLADOR DE DESPLIEGUE DEL ACORDEÓN
// ======================================================================
function toggleAcordeon(categoriaElemento) {
    const subitems = categoriaElemento.nextElementSibling;
    const flecha = categoriaElemento.querySelector('.flecha');
    
    if (subitems.style.display === 'block') {
        subitems.style.display = 'none';
        flecha.style.transform = 'rotate(0deg)';
    } else {
        subitems.style.display = 'block';
        flecha.style.transform = 'rotate(180deg)';
    }
}

// ======================================================================
// 4. CAMBIO DINÁMICO DE SECCIONES (MUTACIÓN DEL CONTENIDO CENTRAL)
// ======================================================================
function cargarSección(codigoSeccion, tituloSeccion) {
    document.getElementById('dinamico-titulo-seccion').innerText = tituloSeccion;
    
    // Controlar el estilo de item activo de forma limpia
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('activo'));
    const itemActivo = document.getElementById(`item-${codigoSeccion}`);
    if(itemActivo) itemActivo.classList.add('activo');

    const filtrosTabla = document.getElementById('bloque-filtros-tabla');
    const zonaRender = document.getElementById('zona-render-contenido');
    
    // ======================================================================
    // CASO 1: GESTIÓN DE ETIQUETAS (Cambia la estructura por sus propios botones)
    // ======================================================================
    if (codigoSeccion === 'etiquetas-publicaciones') {
        // Ocultamos los filtros por defecto de usuarios para pintar los filtros de etiquetas
        filtrosTabla.style.display = 'none'; 
        
        // Inyectamos los botones de tu HTML original adaptados estéticamente al diseño del panel
        zonaRender.innerHTML = `
            <div class="tabla-filtros" style="justify-content: flex-start; margin-bottom: 20px;">
                <button class="btn-filtro" style="background-color: #2f4e78;" onclick="fetchEtiquetasParaPanel('todas')"><i class="fa-solid fa-tags"></i> Ver Todas</button>
                <button class="btn-filtro" style="background-color: #2ecc71;" onclick="fetchEtiquetasParaPanel('activas')"><i class="fa-solid fa-eye"></i> Solo Activas</button>
                <button class="btn-filtro" style="background-color: #e74c3c;" onclick="fetchEtiquetasParaPanel('inactivas')"><i class="fa-solid fa-eye-slash"></i> Solo Inactivas</button>
            </div>
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID Etiqueta</th>
                        <th>Nombre de la Etiqueta</th>
                        <th style="text-align: center;">Estado en DB</th>
                        <th style="text-align: center;">Editar</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-etiquetas">
                    <tr><td colspan="4" style="text-align:center; color:gray; padding:20px;">Hacé clic en alguno de los botones superiores para cargar los datos...</td></tr>
                </tbody>
            </table>
        `;
    }
    // ======================================================================
    // CASO 2: ADMINISTRAR USUARIOS
    // ======================================================================
    else if (codigoSeccion === 'administrar-usuarios') {
        filtrosTabla.style.display = 'none';
        
        zonaRender.innerHTML = `
            <button type="button" class="btn-filtro" id="usuarios-toggle-filtros" aria-expanded="false" aria-controls="usuarios-contenedor-filtros" style="margin-bottom:12px;">
                <span id="usuarios-texto-toggle-filtros">Filtrar registros</span>
                <i class="fa-solid fa-chevron-down" id="usuarios-icono-toggle-filtros" style="margin-left:8px;"></i>
            </button>
            <div id="usuarios-contenedor-filtros" hidden>
                <form id="usuarios-form-filtros" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:12px; align-items:end; margin-bottom:18px; padding:14px; border:1px solid #d9e2e7; border-radius:6px; background:#f8fafb;">
                    <label>Tipo de usuario
                        <select id="usuarios-filtro-tipo" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                            <option value="">Todos los tipos</option>
                            <option value="Empleado de Mesa">Empleado de Mesa</option>
                            <option value="Empleado de Area">Empleado de Área</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Emprendedor">Emprendedor</option>
                        </select>
                    </label>
                    <label>Estado de cuenta
                        <select id="usuarios-filtro-estado" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                            <option value="">Activas e inactivas</option>
                            <option value="1">Activa</option>
                            <option value="0">Inactiva</option>
                        </select>
                    </label>
                    <label>Nombre, apellido o correo
                        <input type="search" id="usuarios-filtro-busqueda" maxlength="100" placeholder="Buscar usuario" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                    </label>
                    <div style="display:flex; gap:8px;">
                        <button type="submit" class="btn-filtro" style="flex:1;">
                            <i class="fa-solid fa-filter"></i> Aplicar filtros
                        </button>
                        <button type="button" class="btn-filtro" id="usuarios-limpiar-filtros" title="Limpiar filtros" aria-label="Limpiar filtros">
                            <i class="fa-solid fa-rotate-left"></i>
                        </button>
                    </div>
                </form>
            </div>
            <div class="usuarios-admin-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
                <button type="button" class="btn-filtro usuarios-admin-anterior" aria-label="Ver página anterior" title="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
                <span class="usuarios-admin-indicador" role="status" aria-live="polite">Cargando...</span>
                <button type="button" class="btn-filtro usuarios-admin-siguiente" aria-label="Ver página siguiente" title="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th id="usuarios-th-orden-persona" aria-sort="ascending">
                            <button type="button" id="usuarios-orden-persona" style="display:flex; align-items:center; gap:6px; border:0; padding:0; background:transparent; color:inherit; font:inherit; cursor:pointer;" title="Ordenado de A a Z; hacer clic para Z a A">
                                Persona <i class="fa-solid fa-arrow-down-a-z" id="usuarios-icono-orden-persona" aria-hidden="true"></i>
                            </button>
                        </th>
                        <th>Email</th>
                        <th>Tipo de usuario</th>
                        <th style="text-align:center;">Estado / acciones</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>
                </tbody>
            </table>
            <div class="usuarios-admin-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
                <button type="button" class="btn-filtro usuarios-admin-anterior" aria-label="Ver página anterior" title="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
                <span class="usuarios-admin-indicador" role="status" aria-live="polite">Cargando...</span>
                <button type="button" class="btn-filtro usuarios-admin-siguiente" aria-label="Ver página siguiente" title="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        `;
        cargarAdministracionUsuarios();
    }
    // ======================================================================
    // CASO 3: ADMINISTRAR EMPLEADOS
    // ======================================================================
    else if (codigoSeccion === 'administrar-empleados') {
        filtrosTabla.style.display = 'none';

        zonaRender.innerHTML = `
            <button type="button" class="btn-filtro" id="empleados-toggle-filtros" aria-expanded="false" aria-controls="empleados-contenedor-filtros" style="margin-bottom:12px;">
                <span id="empleados-texto-toggle-filtros">Filtrar registros</span>
                <i class="fa-solid fa-chevron-down" id="empleados-icono-toggle-filtros" style="margin-left:8px;"></i>
            </button>
            <div id="empleados-contenedor-filtros" hidden>
                <form id="empleados-form-filtros" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:12px; align-items:end; margin-bottom:18px; padding:14px; border:1px solid #d9e2e7; border-radius:6px; background:#f8fafb;">
                    <label>Cargo
                        <select id="empleados-filtro-cargo" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                            <option value="">Todos los cargos</option>
                            <option value="Mesa de Entrada">Mesa de Entrada</option>
                            <option value="Técnico">Técnico</option>
                            <option value="Social">Social</option>
                            <option value="Administrador">Administrador</option>
                        </select>
                    </label>
                    <label>Estado laboral
                        <select id="empleados-filtro-estado" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                            <option value="">Activos e inactivos</option>
                            <option value="1">Activo</option>
                            <option value="0">Inactivo / dado de baja</option>
                        </select>
                    </label>
                    <label>Tipo de cuenta de usuario
                        <select id="empleados-filtro-tipo-cuenta" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                            <option value="">Todos los tipos</option>
                            <option value="Empleado de Mesa">Empleado de Mesa</option>
                            <option value="Empleado de Area">Empleado de Área</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Sin cuenta">Sin cuenta de usuario</option>
                        </select>
                    </label>
                    <label>Nombre, apellido o correo
                        <input type="search" id="empleados-filtro-busqueda" maxlength="100" placeholder="Buscar persona" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                    </label>
                    <label>DNI
                        <input type="search" id="empleados-filtro-dni" maxlength="15" placeholder="Buscar DNI" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                    </label>
                    <div style="display:flex; gap:8px;">
                        <button type="submit" class="btn-filtro" style="flex:1;"><i class="fa-solid fa-filter"></i> Aplicar filtros</button>
                        <button type="button" class="btn-filtro" id="empleados-limpiar-filtros" title="Limpiar filtros" aria-label="Limpiar filtros"><i class="fa-solid fa-rotate-left"></i></button>
                    </div>
                </form>
            </div>
            <div class="empleados-admin-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
                <button type="button" class="btn-filtro empleados-admin-anterior" aria-label="Ver página anterior" title="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
                <span class="empleados-admin-indicador" role="status" aria-live="polite">Cargando...</span>
                <button type="button" class="btn-filtro empleados-admin-siguiente" aria-label="Ver página siguiente" title="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th id="empleados-th-orden-nombre" aria-sort="ascending">
                            <button type="button" id="empleados-orden-nombre" style="display:flex; align-items:center; gap:6px; border:0; padding:0; background:transparent; color:inherit; font:inherit; cursor:pointer;" title="Ordenar por nombre de A a Z">
                                Nombre <i class="fa-solid fa-arrow-down-a-z" id="empleados-icono-orden-nombre" aria-hidden="true"></i>
                            </button>
                        </th>
                        <th>DNI</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th>Cargo</th>
                        <th>Estado laboral</th>
                        <th>Cuenta web</th>
                        <th style="text-align:center;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td colspan="9" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando empleados...</td></tr>
                </tbody>
            </table>
            <div class="empleados-admin-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
                <button type="button" class="btn-filtro empleados-admin-anterior" aria-label="Ver página anterior" title="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
                <span class="empleados-admin-indicador" role="status" aria-live="polite">Cargando...</span>
                <button type="button" class="btn-filtro empleados-admin-siguiente" aria-label="Ver página siguiente" title="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        `;
        cargarAdministracionEmpleados();
    }
    // ======================================================================
    // CASO 3: SOLICITUDES SIN EXPEDIENTE (Para empleados de Mesa)
    // ======================================================================
    else if (codigoSeccion === 'solicitudes-sin-expediente') {
        filtrosTabla.style.display = 'none';
        
        zonaRender.innerHTML = `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID Solicitud</th>
                        <th>Emprendedor</th>
                        <th>Fecha Recibido</th>
                        <th style="text-align:center;">Asignar GED</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td colspan="4" style="text-align:center; color:gray; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando solicitudes desde el Ministerio...</td></tr>
                </tbody>
            </table>
        `;
        fetchSolicitudesMesaEntrada();
    }
    // ======================================================================
    // PUBLICACIONES EN ESPERA (aprobar / rechazar lo que mandan los emprendedores)
    // ======================================================================
    else if (codigoSeccion === 'publicaciones-espera') {
        filtrosTabla.style.display = 'none';

        zonaRender.innerHTML = `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Emprendimiento</th>
                        <th>Enviada</th>
                        <th>Publicación</th>
                        <th style="text-align:center;">Resolución</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-publicaciones">
                    <tr><td colspan="5" style="text-align:center; color:gray; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando publicaciones en espera...</td></tr>
                </tbody>
            </table>
        `;
        fetchPublicacionesEnEspera();
    }
    // ======================================================================
    // CASO 4: REGISTRAR EMPLEADO
    // ======================================================================
    else if (codigoSeccion === 'registrar-empleado') {
        filtrosTabla.style.display = 'none';

        zonaRender.innerHTML = `
            <div class="formulario-contenedor-panel" style="max-width: 680px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h3 style="color: #1a3a5f; margin: 0 0 20px; border-bottom: 2px solid #f1f1f1; padding-bottom: 10px;">
                    <i class="fa-solid fa-user-plus"></i> Alta de empleado
                </h3>
                <form id="formulario-registro-empleado">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
                        <label>Nombre
                            <input type="text" id="empleado-nombre" maxlength="30" autocomplete="given-name" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px;">
                        </label>
                        <label>Apellido
                            <input type="text" id="empleado-apellido" maxlength="30" autocomplete="family-name" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px;">
                        </label>
                        <label>DNI
                            <input type="text" id="empleado-dni" maxlength="15" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px;">
                        </label>
                        <label>Teléfono
                            <input type="tel" id="empleado-telefono" inputmode="numeric" pattern="[0-9]+" maxlength="25" autocomplete="tel" title="Ingresa solo números" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px;">
                        </label>
                        <label style="grid-column: 1 / -1;">Domicilio
                            <input type="text" id="empleado-domicilio" maxlength="512" autocomplete="street-address" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px;">
                        </label>
                        <label>Correo electrónico
                            <input type="email" id="empleado-correo" maxlength="150" autocomplete="email" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px;">
                        </label>
                        <label>Cargo
                            <select id="empleado-cargo" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px; background:#fff;">
                                <option value="">-- Seleccione un cargo --</option>
                                <option value="Mesa de Entrada">Mesa de Entrada</option>
                                <option value="Técnico">Técnico</option>
                                <option value="Social">Social</option>
                                <option value="Administrador">Administrador</option>
                            </select>
                        </label>
                    </div>
                    <label style="display:flex; align-items:center; gap:8px; margin:18px 0;">
                        <input type="checkbox" id="empleado-activo" checked>
                        Empleado activo
                    </label>
                    <button type="submit" class="btn-filtro" style="width:100%; padding:12px; background-color:#1a3a5f; color:#fff; border:0; border-radius:4px; font-size:1rem; cursor:pointer;">
                        <i class="fa-solid fa-floppy-disk"></i> Registrar empleado
                    </button>
                </form>
            </div>
        `;

        inicializarFormularioRegistroEmpleado();
    }
    // ======================================================================
    // CASO 5: REGISTRAR usuario (FORMULARIO DINÁMICO)
    // ======================================================================
    else if (codigoSeccion === 'registrar-usuario') {
        filtrosTabla.style.display = 'none'; // Ocultamos filtros generales
        
        zonaRender.innerHTML = `
            <div class="formulario-contenedor-panel" style="max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h3 style="color: #1a3a5f; margin-bottom: 20px; border-bottom: 2px solid #f1f1f1; padding-bottom: 10px;"><i class="fa-solid fa-user-plus"></i> Alta Provisoria de Usuario</h3>
                
                <form id="formulario-registro-usuario">
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; margin-bottom: 5px; font-weight: bold; color: #555;">Correo Electrónico:</label>
                        <input type="email" id="reg-correo" required style="width:100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" placeholder="ejemplo@ministerio.com">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; margin-bottom: 5px; font-weight: bold; color: #555;">Contraseña Provisoria:</label>
                        <input type="password" id="reg-password" required style="width:100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Mínimo 12 caracteres robustos">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display:block; margin-bottom: 5px; font-weight: bold; color: #555;">Tipo de Usuario / Rol:</label>
                        <select id="reg-tipo-usuario" required style="width:100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff;">
                            <option value="">-- Seleccione un Rol --</option>
                            <option value="Empleado de Area">Empleado de Área</option>
                            <option value="Empleado de Mesa">Empleado de Mesa</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Emprendedor">Emprendedor</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn-filtro" style="width: 100%; padding: 12px; background-color: #1a3a5f; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background 0.2s;">
                        <i class="fa-solid fa-save"></i> Registrar en el Sistema
                    </button>
                </form>
            </div>
        `;

        // 🚀 Inicializamos de inmediato la escucha del Submit que estará en el script satélite
        inicializarEscuchaRegistro();
    }
// ======================================================================
    // CASO 6: SOLICITUDES DE INICIO SIN REVISAR (Para Empleados de Área / Admin)
    // ======================================================================
    else if (codigoSeccion === 'inicio-sin-revisar') {
        filtrosTabla.style.display = 'flex'; // Muestra la barra con "Ordenar por..."
        
        zonaRender.innerHTML = `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID Solicitud</th>
                        <th>Nro Expediente</th>
                        <th>Fecha Entrada Área</th>
                        <th style="text-align:center;">Acción</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td colspan="4" style="text-align:center; color:gray; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando expedientes en bandeja de entrada...</td></tr>
                </tbody>
            </table>
        `;
        // 🚀 LLAMADA A LA NUEVA FUNCIÓN DEL SATÉLITE:
        fetchSolicitudesAreaSinRevisar();
    }
    // ======================================================================
    // SUBSIDIOS Y CRÉDITOS SIN REVISAR (lista + ver el formulario PDF)
    // ======================================================================
    else if (codigoSeccion === 'subsidio-sin-revisar' || codigoSeccion === 'creditos-sin-revisar') {
        filtrosTabla.style.display = 'none';

        zonaRender.innerHTML = `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Emprendimiento / Solicitante</th>
                        <th>Monto</th>
                        <th>Recibido</th>
                        <th style="text-align:center;">Formulario</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-ayudas">
                    <tr><td colspan="5" style="text-align:center; color:gray; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando solicitudes...</td></tr>
                </tbody>
            </table>
        `;
        fetchAyudasSinRevisar(codigoSeccion === 'subsidio-sin-revisar' ? 'subsidio' : 'credito');
    }
    // ======================================================================
    // CASO 7: HISTORIAL DE AUDITORÍA (SOLO ADMINISTRADORES)
    // ======================================================================
    else if (codigoSeccion === 'revisar-historial') {
        filtrosTabla.style.display = 'none';

        zonaRender.innerHTML = `
            <button type="button" class="btn-filtro" id="auditoria-toggle-filtros" aria-expanded="false" aria-controls="auditoria-contenedor-filtros" style="margin-bottom:12px;">
                <span id="auditoria-texto-toggle-filtros">Filtrar registros</span>
                <i class="fa-solid fa-chevron-down" id="auditoria-icono-toggle-filtros" style="margin-left:8px;"></i>
            </button>
            <div id="auditoria-contenedor-filtros" hidden>
            <form id="auditoria-form-filtros" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:12px; align-items:end; margin-bottom:18px; padding:14px; border:1px solid #d9e2e7; border-radius:6px; background:#f8fafb;">
                <label>Desde
                    <input type="date" id="auditoria-desde" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                </label>
                <label>Hasta
                    <input type="date" id="auditoria-hasta" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                </label>
                <label>Tipo de usuario
                    <select id="auditoria-tipo-usuario" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                        <option value="">Todos los tipos</option>
                        <option value="Emprendedor">Emprendedor</option>
                        <option value="Empleado de Mesa">Empleado de Mesa</option>
                        <option value="Empleado de Area">Empleado de Área</option>
                        <option value="Administrador">Administrador</option>
                    </select>
                </label>
                <label>Acción
                    <select id="auditoria-accion" style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                        <option value="">Todas las acciones</option>
                    </select>
                </label>
                <div>
                    <label for="auditoria-buscar-usuario">Buscar usuario por nombre o correo</label>
                    <input type="search" id="auditoria-buscar-usuario" minlength="2" maxlength="100" placeholder="Primero seleccione un tipo" disabled style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                </div>
                <div>
                    <button type="button" class="btn-filtro" id="auditoria-boton-buscar-usuario" disabled style="width:100%;">
                        <i class="fa-solid fa-magnifying-glass"></i> Buscar usuario
                    </button>
                </div>
                <label>Usuario específico
                    <select id="auditoria-usuario" disabled style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
                        <option value="">Todos los usuarios del tipo</option>
                    </select>
                </label>
                <div style="display:flex; gap:8px;">
                    <button type="submit" class="btn-filtro" style="flex:1;">
                        <i class="fa-solid fa-filter"></i> Aplicar filtros
                    </button>
                    <button type="button" class="btn-filtro" id="auditoria-limpiar-filtros" title="Limpiar filtros" aria-label="Limpiar filtros">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
                <span id="auditoria-estado-busqueda" role="status" aria-live="polite" style="grid-column:1 / -1;"></span>
            </form>
            </div>
            <div class="auditoria-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
                <button type="button" class="btn-filtro auditoria-pagina-anterior" aria-label="Ver página anterior" title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="auditoria-indicador-pagina" role="status" aria-live="polite">Cargando...</span>
                <button type="button" class="btn-filtro auditoria-pagina-siguiente" aria-label="Ver página siguiente" title="Página siguiente">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <div style="overflow-x:auto;">
                <table class="tabla-datos">
                    <thead>
                        <tr>
                            <th>ID Registro</th>
                            <th>ID Usuario</th>
                            <th>Acción</th>
                            <th>Tabla afectada</th>
                            <th>ID afectado</th>
                            <th>Detalle</th>
                            <th>Fecha y hora</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-cuerpo-auditoria">
                        <tr><td colspan="7" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="auditoria-paginador" style="display:flex; align-items:center; justify-content:center; gap:18px; margin:12px 0;">
                <button type="button" class="btn-filtro auditoria-pagina-anterior" aria-label="Ver página anterior" title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="auditoria-indicador-pagina" role="status" aria-live="polite">Cargando...</span>
                <button type="button" class="btn-filtro auditoria-pagina-siguiente" aria-label="Ver página siguiente" title="Página siguiente">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        `;

        inicializarControlesAuditoria();
    }
    // ======================================================================
    // CASO GENERAL: CUALQUIER OTRA SECCIÓN (Mockup genérico para futuros sprints)
    // ======================================================================
    else {
        filtrosTabla.style.display = 'flex';
        
        zonaRender.innerHTML = `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>Referencia</th>
                        <th>Descripción</th>
                        <th>Fecha</th>
                        <th style="text-align:center;">Acción</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td colspan="4" style="text-align:center; color:gray; padding:20px;">Sección "${tituloSeccion}" lista para conectar con el fetch del Backend.</td></tr>
                </tbody>
            </table>
        `;
    }
}
