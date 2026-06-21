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

    // 4. SI HAY SESIÓN: Recién acá adentro alteramos el contenedor para los iconos.
    if (tipoUsuario === 'Emprendedor' || tipoUsuario === 'Empleado') {
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
                            <li><a href="VISTA%20USUARIO/Perfil%20Emprendimiento.html">• Mi Perfil</a></li>
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
    else if (tipoUsuario === 'Empleado') {
        // Al empleado quizás no le mostrás el botón "+" de crear publicación, 
        // sino accesos directos a la gestión interna del Ministerio.
        contenedorLogin.innerHTML = `
            <div class="nav-usuario-container">
                <div class="dropdown-container">
                    <button class="nav-btn" id="btn-notificaciones">
                        <i class="fa-solid fa-bell"></i>
                        <span class="badge-alerta">3</span>
                    </button>
                    <div class="dropdown-menu menu-derecha" id="menu-notificaciones">
                        <div class="dropdown-header">Trámites Pendientes</div>
                        <ul><li><a href="#">• 3 Formularios por revisar</a></li></ul>
                    </div>
                </div>
                <div class="dropdown-container">
                    <div class="avatar-nav" id="btn-perfil" style="background-color: #2ecc71;">
                        <i class="fa-solid fa-briefcase"></i> </div>
                    <div class="dropdown-menu menu-derecha" id="menu-perfil">
                        <ul>
                            <li><a href="VISTA%20EMPLEADO/Empleado%20view.html">• Panel de Control</a></li>
                            <li><a href="#" id="enlace-logout" style="color: #ff6b6b !important;">• Cerrar Sesión</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Volvemos a activar los clicks de los botones que se hayan dibujado
    inicializarDropdowns();
});

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
            // 2. Redirigimos a la página de inicio común / refrescamos la actual
            alert("Sesión cerrada correctamente");
            window.location.href = "index.html"; 
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