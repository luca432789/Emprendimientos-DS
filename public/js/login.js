//Log In
// Lógica para el formulario de Inicio de Sesión
const loginForm = document.getElementById('loginForm');

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
                sessionStorage.setItem('tipoUsuario', data.tipoUsuario || '');
                sessionStorage.removeItem('token_ministerio');

                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            console.error("Error en la conexión del Login:", error);
            alert("No se pudo conectar con el servidor de autenticación.");
        });
    });
}