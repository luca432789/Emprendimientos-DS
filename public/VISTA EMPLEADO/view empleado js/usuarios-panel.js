// ======================================================================
// MÓDULO EXCLUSIVO: ALTA DE USUARIOS DESDE EL PANEL
// ======================================================================

function inicializarEscuchaRegistro() {
    const formularioRegistro = document.getElementById('formulario-registro-usuario');
    
    if (!formularioRegistro) return;

    formularioRegistro.addEventListener('submit', function(evento) {
        evento.preventDefault(); // Evitamos recarga de página

        const correo = document.getElementById('reg-correo').value.trim();
        const password = document.getElementById('reg-password').value;
        const tipoUsuario = document.getElementById('reg-tipo-usuario').value;

        // 🔍 EXPRESIÓN REGULAR DE SEGURIDAD (Mínimo 12 caracteres, Mayúscula, Minúscula, Número, Especial)
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-])[A-Za-z\d@$!%*?&-]{12,}$/;

        if (!regexPassword.test(password)) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseña débil',
                html: `
                    <div style="text-align: left; font-size: 0.95rem;">
                        <p>La contraseña debe cumplir con las normativas del Ministerio:</p>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            <li>Mínimo <b>12 caracteres</b>.</li>
                            <li>Al menos una letra <b>mayúscula</b>.</li>
                            <li>Al menos una letra <b>minúscula</b>.</li>
                            <li>Al menos un <b>número</b>.</li>
                            <li>Al menos un <b>carácter especial</b> (ej: @, $, !, %, *, ?, &, -).</li>
                        </ul>
                    </div>
                `,
                confirmButtonColor: '#1a3a5f',
                confirmButtonText: 'Entendido'
            });
            return; // Frenamos la ejecución, no se envía el fetch
        }

        const nuevoUsuarioWeb = { correo, password, tipoUsuario };
        
        // Despachamos la petición POST hacia el backend
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoUsuarioWeb)
        })
        .then(respuesta => respuesta.json())
        .then(data => {
            if (data.error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Atención',
                    text: data.error,
                    confirmButtonColor: '#1a3a5f'
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: '¡Usuario Creado!',
                    text: data.mensaje || 'Usuario web registrado con éxito.',
                    confirmButtonColor: '#1a3a5f'
                }).then(() => {
                    formularioRegistro.reset();
                    // Redirigimos al Administrador a la tabla para ver el cambio
                    cargarSección('administrar-usuarios', 'Administración de Usuarios del Sistema');
                });
            }
        })
        .catch(error => {
            console.error("Error crítico en el alta de usuario:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Red',
                text: 'No se pudo conectar con el servidor del Ministerio.',
                confirmButtonColor: '#1a3a5f'
            });
        });
    });
}