document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token_ministerio');
    //const contenedorLogin = document.querySelector('nav ul li:last-child');
    const contenedorLogin = document.getElementById('contenedor-login-dinamico');

    let tipoUsuario = null; // variable para guardar el tipo de usuario
    // decodificacion de token
    if (token) {
        try {
            // jwtDecode viene de la librería que añadimos por script en el HTML
            const payload = jwtDecode(token);
            tipoUsuario = payload.tipoUsuario; // Extraemos el rol real guardado en el backend
        } catch (error) {
            console.error("Error al decodificar un token alterado:", error);
            sessionStorage.clear();
            tipoUsuario = null;
        }
    }
    
    // 3. SI NO HAY SESIÓN: Frenamos el script acá. 
    if (!tipoUsuario || !contenedorLogin) return;

    const rolesEmpleados = ['Empleado de Mesa', 'Empleado de Area', 'Administrador'];

    // 4. SI HAY SESIÓN: Recién acá adentro alteramos el contenedor para los iconos.
    if (tipoUsuario === 'Emprendedor' || rolesEmpleados.includes(tipoUsuario)) {
        // Quitamos el fondo marrón de la clase .login para que no tape los dropdowns negros
        contenedorLogin.style.backgroundColor = 'transparent';
    }

    // ==========================================
    // CASO 1: SE LOGUEÓ UN EMPRENDEDOR
    // ==========================================
    if (tipoUsuario === 'Emprendedor') {
        contenedorLogin.innerHTML = `
            <div class="nav-usuario-container">
                <div class="dropdown-container">
                    <button class="nav-btn" id="btn-crear"><i class="fa-solid fa-plus"></i></button>
                    <div class="dropdown-menu menu-derecha" id="menu-crear">
                        <ul>
                            <li><a href="#">• Crear Publicación</a></li>
                        </ul>
                    </div>
                </div>
                <div class="dropdown-container">
                    <button class="nav-btn" id="btn-notificaciones">
                        <i class="fa-solid fa-bell"></i>
                        <span class="badge-alerta">1</span>
                    </button>
                    <div class="dropdown-menu menu-derecha" id="menu-notificaciones">
                        <div class="dropdown-header">Notificaciones</div>
                        <ul><li><a href="#">• Nueva solicitud</a></li></ul>
                    </div>
                </div>
                <div class="dropdown-container">
                    <div class="avatar-nav" id="btn-perfil"><i class="fa-solid fa-user"></i></div>
                    <div class="dropdown-menu menu-derecha" id="menu-perfil">
                        <ul>
                            <li><a href="/VISTA%20USUARIO/CdE-Perfil%20Emprendedor.html">• Mi Perfil</a></li>
                            <li><a href="#" id="enlace-logout" style="color: #ff6b6b !important;">• Cerrar Sesión</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    } 
    
    // ==========================================
    // CASO 2: SE LOGUEÓ UN EMPLEADO (Técnico / Administrativo)
    // ==========================================
    else if (rolesEmpleados.includes(tipoUsuario)) {
        // Al empleado quizás no le mostrás el botón "+" de crear publicación, 
        // sino accesos directos a la gestión interna del Ministerio.
        contenedorLogin.innerHTML = `
            <div class="nav-usuario-container">
                <div class="dropdown-container">
                    <button class="nav-btn" id="btn-notificaciones" aria-label="Notificaciones">
                        <i class="fa-solid fa-bell"></i>
                        <span class="badge-alerta" id="badge-notificaciones" style="display: none;"></span>
                    </button>
                    <div class="dropdown-menu menu-derecha" id="menu-notificaciones">
                        <div class="dropdown-header">Trámites Pendientes</div>
                        <ul id="lista-notificaciones"><li class="notif-vacia">Cargando...</li></ul>
                    </div>
                </div>
                <div class="dropdown-container">
                    <div class="avatar-nav" id="btn-perfil" style="background-color: #2ecc71;">
                        <i class="fa-solid fa-briefcase"></i> </div>
                    <div class="dropdown-menu menu-derecha" id="menu-perfil">
                        <ul>
                            <li><a href="/VISTA%20EMPLEADO/Empleado%20view.html">• Panel de Control</a></li>
                            <li><a href="#" id="enlace-logout" style="color: #ff6b6b !important;">• Cerrar Sesión</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Volvemos a activar los clicks de los botones que se hayan dibujado
    inicializarDropdowns();

    // Campanita con datos reales para los empleados
    if (rolesEmpleados.includes(tipoUsuario)) {
        iniciarNotificaciones(token);
    }
});

// ==========================================
// NOTIFICACIONES (campanita)
// ==========================================
const INTERVALO_NOTIFICACIONES = 30000; // cada 30 segundos
// Último id ya visto en esta sesión: evita repetir el aviso al cambiar de página
const CLAVE_ULTIMA_NOTIF = 'notif_ultimo_id';

function iniciarNotificaciones(token) {
    let temporizador = null;

    const consultar = async () => {
        try {
            const respuesta = await fetch('/api/notificaciones', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Sesión vencida o sin permiso: se deja de consultar
            if (respuesta.status === 401 || respuesta.status === 403) {
                clearInterval(temporizador);
                return;
            }
            if (!respuesta.ok) return;

            const { total, ultimoId, notificaciones } = await respuesta.json();
            pintarNotificaciones(total, notificaciones);
            avisarSiHayNuevas(total, ultimoId, notificaciones);
        } catch (error) {
            console.error('No se pudieron cargar las notificaciones:', error);
        }
    };

    consultar();
    temporizador = setInterval(consultar, INTERVALO_NOTIFICACIONES);
    // Al volver a la pestaña se actualiza enseguida
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) consultar();
    });
    // Otras partes de la página (ej. al cargar un expediente) pueden pedir que se actualice
    window.actualizarNotificaciones = consultar;
}

function escaparNotif(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function pintarNotificaciones(total, notificaciones) {
    const badge = document.getElementById('badge-notificaciones');
    const lista = document.getElementById('lista-notificaciones');

    if (badge) {
        badge.textContent = total > 99 ? '99+' : String(total);
        badge.style.display = total > 0 ? '' : 'none';
    }
    if (!lista) return;

    if (!notificaciones.length) {
        lista.innerHTML = '<li class="notif-vacia">No hay notificaciones nuevas</li>';
        return;
    }

    lista.innerHTML = notificaciones.map((n) => `
        <li>
            <a href="${escaparNotif(n.url)}" class="notif-item" data-seccion="${escaparNotif(n.seccion || '')}">
                <span class="notif-titulo">• ${escaparNotif(n.titulo)}</span>
                <span class="notif-detalle">${escaparNotif(n.detalle)}</span>
            </a>
        </li>`).join('');

    lista.querySelectorAll('.notif-item').forEach((enlace) => {
        enlace.addEventListener('click', (e) => irASeccionNotificacion(e, enlace.dataset.seccion));
    });
}

// Si ya estamos en el Panel de Control, se abre la sección sin recargar la página;
// si no, el enlace lleva al panel (Mesa de Entrada arranca en Carga de Expedientes GED).
function irASeccionNotificacion(evento, seccion) {
    if (seccion === 'solicitudes-sin-expediente' && typeof window.cargarSección === 'function') {
        evento.preventDefault();
        document.querySelectorAll('.dropdown-menu').forEach((m) => m.classList.remove('mostrar'));
        window.cargarSección('solicitudes-sin-expediente', 'Carga de Expedientes GED');
    }
}

// Muestra un aviso cuando llega un formulario nuevo (id mayor al último visto en la sesión)
function avisarSiHayNuevas(total, ultimoId, notificaciones) {
    const guardado = sessionStorage.getItem(CLAVE_ULTIMA_NOTIF);

    // Primera consulta de la sesión: se toma como punto de partida, sin aviso
    if (guardado === null) {
        sessionStorage.setItem(CLAVE_ULTIMA_NOTIF, String(ultimoId));
        return;
    }

    const ultimoVisto = Number(guardado);
    if (ultimoId <= ultimoVisto) return;
    sessionStorage.setItem(CLAVE_ULTIMA_NOTIF, String(ultimoId));

    const notif = notificaciones[0];
    if (!notif) return;
    mostrarAvisoNotificacion('Llegó un formulario de inicio nuevo', `${notif.titulo}. ${notif.detalle}`, notif.url, notif.seccion);
}

function mostrarAvisoNotificacion(titulo, detalle, url, seccion) {
    const aviso = document.createElement('a');
    aviso.className = 'toast-notificacion';
    aviso.href = url || '#';
    aviso.innerHTML = `
        <i class="fa-solid fa-bell"></i>
        <span><strong>${escaparNotif(titulo)}</strong><br>${escaparNotif(detalle)}</span>`;
    aviso.addEventListener('click', (e) => irASeccionNotificacion(e, seccion));
    document.body.appendChild(aviso);

    requestAnimationFrame(() => aviso.classList.add('visible'));
    setTimeout(() => {
        aviso.classList.remove('visible');
        setTimeout(() => aviso.remove(), 400);
    }, 7000);
}

function inicializarDropdowns() {
    // Dropdown Crear
    const btnCrear = document.getElementById('btn-crear');
    const menuCrear = document.getElementById('menu-crear');
    if (btnCrear && menuCrear) {
        btnCrear.addEventListener('click', (e) => {
            e.stopPropagation();
            menuCrear.classList.toggle('mostrar');
            cerrarOtrosMenus(menuCrear);
        });
    }

    // Dropdown Notificaciones
    const btnNotif = document.getElementById('btn-notificaciones');
    const menuNotif = document.getElementById('menu-notificaciones');
    if (btnNotif && menuNotif) {
        btnNotif.addEventListener('click', (e) => {
            e.stopPropagation();
            menuNotif.classList.toggle('mostrar');
            cerrarOtrosMenus(menuNotif);
        });
    }

    // Dropdown Perfil (Avatar)
    const btnPerfil = document.getElementById('btn-perfil');
    const menuPerfil = document.getElementById('menu-perfil');
    if (btnPerfil && menuPerfil) {
        btnPerfil.addEventListener('click', (e) => {
            e.stopPropagation();
            menuPerfil.classList.toggle('mostrar');
            cerrarOtrosMenus(menuPerfil);
        });
    }

    // LÓGICA DE CIERRE DE SESIÓN
    const enlaceLogout = document.getElementById('enlace-logout');
    if (enlaceLogout) {
        enlaceLogout.addEventListener('click', (e) => {
            e.preventDefault(); // Evita que la página navegue al "#"
            
            sessionStorage.removeItem('token_ministerio');
            sessionStorage.removeItem(CLAVE_ULTIMA_NOTIF);

            // 2. Se queda en la página actual (ej. el mapa) y la recarga ya sin sesión.
            //    Las vistas privadas (panel de empleado / vista de emprendedor) no sirven
            //    sin sesión, así que desde ahí se vuelve al inicio.
            const ruta = decodeURIComponent(window.location.pathname).toUpperCase();
            const esVistaPrivada = ruta.startsWith('/VISTA EMPLEADO/') || ruta.startsWith('/VISTA USUARIO/');
            const redirigir = () => {
                if (esVistaPrivada) window.location.href = "/index.html";
                else window.location.reload();
            };

            // SweetAlert si la página lo tiene cargado (ej. el mapa); si no, alert() de siempre
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Sesión cerrada correctamente',
                    timer: 1500,
                    showConfirmButton: false
                }).then(redirigir);
            } else {
                alert("Sesión cerrada correctamente");
                redirigir();
            }
        });
    }

    // Cierra los menús si hacés click en cualquier otra parte de la pantalla
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('mostrar'));
    });
}

function cerrarOtrosMenus(menuActivo) {
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menuActivo) m.classList.remove('mostrar');
    });
}