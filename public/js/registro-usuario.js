// public/js/registro-usuario.js

// 1. Capturamos el formulario de registro usando su ID del HTML
const formularioRegistro = document.getElementById('formulario-registro-usuario');

if (formularioRegistro) {
    formularioRegistro.addEventListener('submit', function(evento) {
        evento.preventDefault(); // Evitamos que la página se recargue

        /*// 2. Armamos el objeto con las propiedades EXACTAS que espera el backend (req.body)
        const nuevoUsuarioWeb = {
            correo: document.getElementById('reg-correo').value,
            password: document.getElementById('reg-password').value,
            tipoUsuario: document.getElementById('reg-tipo-usuario').value
        };*/

        const correo = document.getElementById('reg-correo').value;
        const password = document.getElementById('reg-password').value;
        const tipoUsuario = document.getElementById('reg-tipo-usuario').value;

        // 🔍 EXPRESIÓN REGULAR PARA VALIDAR TU REGLA DE SEGURIDAD
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-])[A-Za-z\d@$!%*?&-]{12,}$/;

        // Probamos si la contraseña coincide con el patrón requerido
        /*if (!regexPassword.test(password)) {
            alert("La contraseña no cumple con los requisitos de seguridad:\n" +
                  "- Debe tener al menos 12 caracteres.\n" +
                  "- Debe incluir al menos una letra mayúscula.\n" +
                  "- Debe incluir al menos una letra minúscula.\n" +
                  "- Debe incluir al menos un número.\n" +
                  "- Debe incluir al menos un carácter especial (ej: @, $, !, %, *, ?, &, -).");
            return; // 🛑 Frenamos la ejecución aquí, el fetch nunca se dispara
        }*/

        // Reemplazamos el alert feo por un Swal.fire elegante:
        if (!regexPassword.test(password)) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseña débil',
                html: `
                    <div style="text-align: left; font-size: 0.95rem;">
                        <p>La contraseña debe cumplir con los siguientes requisitos:</p>
                        <ul>
                            <li> Mínimo <b>12 caracteres</b>.</li>
                            <li> Al menos una letra <b>mayúscula</b>.</li>
                            <li> Al menos una letra <b>minúscula</b>.</li>
                            <li> Al menos un <b>número</b>.</li>
                            <li> Al menos un <b>carácter especial</b> (ej: @, $, !, %, *, ?, &, -).</li>
                        </ul>
                    </div>
                `,
                confirmButtonColor: '#1a3a5f', // Podés usar el color azul de tu barra de navegación
                confirmButtonText: 'Entendido'
            });
            return; // Frenamos el fetch
        }

        const nuevoUsuarioWeb = { correo, password, tipoUsuario };
        // 3. Mostramos un mensaje visual en consola para chequear qué estamos enviando
        console.log("Enviando datos de registro:", nuevoUsuarioWeb);

        // 4. Despachamos la petición POST hacia el nuevo endpoint de registro
        fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Le avisamos a Node que viaja un JSON
            },
            body: JSON.stringify(nuevoUsuarioWeb) // Transformamos el objeto a texto string
        })
        .then(respuesta => respuesta.json())
        .then(data => {
            // 5. Evaluamos la respuesta del backend
            if (data.error) {
                // Si el backend encontró un error (ej: el correo no existe en Empleados ni Emprendedores)
                alert(`Atención: ${data.error}`);
            } else {
                // Si todo salió bien y se creó el usuario encriptado
                /*alert('¡Usuario web creado con éxito! Ya puede iniciar sesión.');
                formularioRegistro.reset(); // Limpiamos el formulario automáticamente
                
                // Opcional: Podés redirigirlos automáticamente al login después de aceptar el alert
                window.location.href = 'Camino LOG IN.html';*/

                // Cuando el registro es exitoso:
                Swal.fire({
                    icon: 'success',
                    title: '¡Usuario Creado!',
                    text: 'Usuario web creado con éxito. Ya puede iniciar sesión.',
                    confirmButtonColor: '#1a3a5f'
                }).then(() => {
                    formularioRegistro.reset();
                    window.location.href = 'Camino LOG IN.html';
                });
            }
        })
        .catch(error => {
            console.error("Error crítico en la comunicación con el Backend:", error);
            alert("Error de red: No se pudo conectar con el servidor del Ministerio.");
        });
    });
}