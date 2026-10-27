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

if (loginForm) {
    loginForm.addEventListener('submit', function(evento) {
        evento.preventDefault(); // Evitamos que refresque la pantalla

        const correoInput = document.getElementById('usuario').value;
        const passwordInput = document.getElementById('password').value;

        // Armamos el paquete de datos
        const credenciales = {
            correo: correoInput,
            password: passwordInput
        };

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credenciales)
        })
        .then(respuesta => respuesta.json())
        .then(data => {
            if (data.error) {
                alert(data.error); // Muestra "Contraseña incorrecta" o "No registrado"
            } else {
                // Guardamos el tokken creado
                sessionStorage.setItem('token_ministerio', data.token);

                window.location.href = '/index';

            }
        })
        .catch(error => {
            console.error("Error en la conexión del Login:", error);
            alert("No se pudo conectar con el servidor de autenticación.");
        });
    });
}