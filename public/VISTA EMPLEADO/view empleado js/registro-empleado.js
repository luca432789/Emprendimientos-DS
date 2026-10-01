function inicializarFormularioRegistroEmpleado() {
    const formulario = document.getElementById('formulario-registro-empleado');
    if (!formulario) return;

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const token = sessionStorage.getItem('token_ministerio');
        if (!token) {
            await Swal.fire({
                icon: 'warning',
                title: 'Sesión vencida',
                text: 'Vuelve a iniciar sesión para registrar un empleado.'
            });
            window.location.href = '../Camino LOG IN.html';
            return;
        }

        const empleado = {
            nombre: document.getElementById('empleado-nombre').value.trim(),
            apellido: document.getElementById('empleado-apellido').value.trim(),
            dni: document.getElementById('empleado-dni').value.trim(),
            domicilio: document.getElementById('empleado-domicilio').value.trim(),
            telefono: document.getElementById('empleado-telefono').value.trim(),
            correo: document.getElementById('empleado-correo').value.trim(),
            cargo: document.getElementById('empleado-cargo').value,
            activo: document.getElementById('empleado-activo').checked
        };

        try {
            const respuesta = await fetch('/api/empleados', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(empleado)
            });
            const data = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(data.error || 'No se pudo registrar el empleado.');
            }

            await Swal.fire({
                icon: 'success',
                title: 'Empleado registrado',
                text: `${data.mensaje} ID: ${data.idEmpleado}`,
                confirmButtonColor: '#1a3a5f'
            });
            formulario.reset();
            document.getElementById('empleado-activo').checked = true;
        } catch (error) {
            console.error('Error registrando empleado:', error);
            Swal.fire({
                icon: 'error',
                title: 'No se pudo registrar',
                text: error.message,
                confirmButtonColor: '#1a3a5f'
            });
        }
    });
}