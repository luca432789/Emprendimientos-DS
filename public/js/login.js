//Log In
// Lógica para el formulario de Inicio de Sesión
const loginForm = document.getElementById('loginForm');

// Llegó por sesión vencida (navbar.js redirige a /login?sesion=vencida): se muestra el aviso
const avisoSesionVencida = document.getElementById('aviso-sesion-vencida');
if (avisoSesionVencida && new URLSearchParams(window.location.search).get('sesion') === 'vencida') {
    avisoSesionVencida.hidden = false;
    history.replaceState(null, '', window.location.pathname); // al recargar ya no se muestra
}

// Tilde "Mostrar contraseña": deja ver lo escrito para corregir solo lo que está mal
const mostrarPassword = document.getElementById('mostrar-password');
if (mostrarPassword) {
    mostrarPassword.addEventListener('change', () => {
        document.getElementById('password').type = mostrarPassword.checked ? 'text' : 'password';
    });
}

// Avisos con SweetAlert (si no cargó, por ejemplo sin internet, se usa el aviso del navegador)
const mostrarAvisoLogin = ({ icono, titulo, texto }) => {
    if (typeof Swal === 'undefined') {
        alert(texto);
        return Promise.resolve();
    }
    return Swal.fire({
        icon: icono,
        title: titulo,
        text: texto,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1a3a5f'
    });
};

// Título e ícono según lo que respondió el servidor
const avisoSegunRespuesta = (status, mensaje) => {
    if (status === 401) return { icono: 'error', titulo: 'No se pudo ingresar', texto: `${mensaje}. Revise el correo y la contraseña.` };
    if (status === 403) return { icono: 'warning', titulo: 'Cuenta inhabilitada', texto: mensaje };
    if (status === 400) return { icono: 'info', titulo: 'Faltan datos', texto: mensaje };
    return { icono: 'error', titulo: 'Error del servidor', texto: mensaje };
};

if (loginForm) {
    const campoPassword = document.getElementById('password');
    const botonIngresar = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async function(evento) {
        evento.preventDefault(); // Evitamos que refresque la pantalla

        // Armamos el paquete de datos
        const credenciales = {
            correo: document.getElementById('usuario').value.trim(),
            password: campoPassword.value
        };

        botonIngresar.disabled = true; // evita mandar el formulario dos veces
        try {
            const respuesta = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credenciales)
            });
            const data = await respuesta.json();

            if (!respuesta.ok || data.error) {
                await mostrarAvisoLogin(avisoSegunRespuesta(respuesta.status, data.error || 'No se pudo iniciar sesión'));
                // Se deja la contraseña seleccionada para volver a escribirla directamente
                campoPassword.focus();
                campoPassword.select();
                return;
            }

            // Guardamos el tokken creado
            sessionStorage.setItem('token_ministerio', data.token);
            window.location.href = '/index';
        } catch (error) {
            console.error("Error en la conexión del Login:", error);
            await mostrarAvisoLogin({
                icono: 'error',
                titulo: 'Sin conexión',
                texto: 'No se pudo conectar con el servidor de autenticación. Inténtelo de nuevo en unos minutos.'
            });
        } finally {
            botonIngresar.disabled = false;
        }
    });
}
