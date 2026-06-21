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
                // Guardamos el tokken creado
                sessionStorage.setItem('token_ministerio', data.token);

                window.location.href = 'index.html';

                // Evaluamos el tipo de usuario para saber a dónde mandarlo
                /*if (data.tipoUsuario === 'Emprendedor') {
                    // Como el HTML del login está en la raíz, entramos a la carpeta e ingresamos al view
                    window.location.href = 'index.html';
                } else if (['Empleado de Mesa', 'Empleado de Area', 'Administrador', 'Empleado'].includes(data.tipoUsuario)) {
                    // Preparado para cuando hagas la vista del empleado
                    window.location.href = 'index.html';
                } else {
                    alert('Tipo de usuario desconocido.');
                }*/
            }
        })
        .catch(error => {
            console.error("Error en la conexión del Login:", error);
            alert("No se pudo conectar con el servidor de autenticación.");
        });
    });
}