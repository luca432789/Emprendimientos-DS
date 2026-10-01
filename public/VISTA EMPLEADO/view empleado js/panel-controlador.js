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
                    <span><i class="fa-solid fa-list-check" style="margin-right: 8px;"></i> Sin revisar</span>
                    <i class="fa-solid fa-chevron-down flecha"></i>
                </div>
                <ul class="menu-subitems">
                    <li><a href="#" onclick="cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio')">• Solicitudes de Inicio</a></li>
                    <li><a href="#" onclick="cargarSección('subsidio-sin-revisar', 'Solicitudes de Subsidio')">• Solicitudes de Subsidio</a></li>
                    <li><a href="#" onclick="cargarSección('creditos-sin-revisar', 'Solicitudes de Créditos')">• Solicitudes de Créditos</a></li>
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
                    <span><i class="fa-solid fa-list-check" style="margin-right: 8px;"></i> Sin revisar</span>
                    <i class="fa-solid fa-chevron-down flecha"></i>
                </div>
                <ul class="menu-subitems">
                    <li><a href="#" onclick="cargarSección('inicio-sin-revisar', 'Solicitudes de Inicio')">• Solicitudes de Inicio</a></li>
                    <li><a href="#" onclick="cargarSección('subsidio-sin-revisar', 'Solicitudes de Subsidio')">• Solicitudes de Subsidio</a></li>
                    <li><a href="#" onclick="cargarSección('creditos-sin-revisar', 'Solicitudes de Créditos')">• Solicitudes de Créditos</a></li>
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
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Persona</th>
                        <th>Tipo de usuario</th>
                        <th style="text-align:center;">Estado de cuenta</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>
                </tbody>
            </table>
        `;
        cargarAdministracionUsuarios();
    }
    // ======================================================================
    // CASO 3: ADMINISTRAR EMPLEADOS
    // ======================================================================
    else if (codigoSeccion === 'administrar-empleados') {
        filtrosTabla.style.display = 'none';

        zonaRender.innerHTML = `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>DNI</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th>Cargo</th>
                        <th>Estado laboral</th>
                        <th>Cuenta web</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando empleados...</td></tr>
                </tbody>
            </table>
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
                            <input type="tel" id="empleado-telefono" maxlength="25" autocomplete="tel" required style="display:block; width:100%; box-sizing:border-box; margin-top:5px; padding:10px; border:1px solid #ccc; border-radius:4px;">
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
