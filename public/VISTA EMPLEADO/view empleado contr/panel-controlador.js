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
        const payload = jwtDecode(token);
        const rolReal = payload.tipoUsuario; // "Empleado de Mesa", "Empleado de Area", "Administrador"
        
        document.getElementById('badge-empleado-rol').innerText = rolReal;
        
        // Renderizar el menú correspondiente e identificar la sección por defecto
        inicializarPanelPorRol(rolReal);

    } catch (err) {
        console.error("Error crítico de permisos en panel:", err);
        window.location.href = "../Camino LOG IN.html";
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
        filtrosTabla.style.display = 'flex';
        
        zonaRender.innerHTML = `
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Apellido</th>
                        <th>Email</th>
                        <th style="text-align:center;">Estado</th>
                        <th style="text-align:center;">Acción</th>
                    </tr>
                </thead>
                <tbody id="tabla-cuerpo-dinamico">
                    <tr><td>Juan Carlos</td><td>Gomez</td><td>USUARIO1@gmail.com</td><td style="text-align:center;"><span class="estado-indicador estado-verde"></span></td><td style="text-align:center;"><button class="btn-acciones-tabla"><i class="fa-solid fa-ellipsis-vertical"></i></button></td></tr>
                    <tr><td>María Elena</td><td>Rodríguez</td><td>Usuario2@gmail.com</td><td style="text-align:center;"><span class="estado-indicador estado-rojo"></span></td><td style="text-align:center;"><button class="btn-acciones-tabla"><i class="fa-solid fa-ellipsis-vertical"></i></button></td></tr>
                </tbody>
            </table>
        `;
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
                    <tr><td>#0024</td><td>Carlos Alberto Perez</td><td>22/06/2026</td><td style="text-align:center;"><button class="btn-filtro" style="padding: 4px 10px; background-color:#2f4e78;"><i class="fa-solid fa-plus-square"></i> Cargar Exp.</button></td></tr>
                </tbody>
            </table>
        `;
    }
    // ======================================================================
    // CASO 4: REGISTRAR usuario (FORMULARIO DINÁMICO)
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
