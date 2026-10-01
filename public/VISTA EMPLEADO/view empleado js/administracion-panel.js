function escaparTextoTabla(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

async function obtenerDatosAdministracion(url) {
    const token = sessionStorage.getItem('token_ministerio');
    if (!token) throw new Error('La sesión venció. Inicia sesión nuevamente.');

    const respuesta = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || 'No se pudieron cargar los datos.');
    }

    return datos;
}

function mostrarErrorAdministracion(error, columnas) {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    if (cuerpo) {
        cuerpo.innerHTML = `<tr><td colspan="${columnas}" style="text-align:center; color:#b42318; padding:20px;">${escaparTextoTabla(error.message)}</td></tr>`;
    }
    console.error('Error al cargar el módulo de administración:', error);
}

async function cargarAdministracionEmpleados() {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    try {
        const empleados = await obtenerDatosAdministracion('/api/empleados/administracion');
        if (!cuerpo || !document.getElementById('item-administrar-empleados')?.classList.contains('activo')) return;

        if (empleados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No hay empleados registrados.</td></tr>';
            return;
        }

        cuerpo.innerHTML = empleados.map(empleado => `
            <tr>
                <td>${escaparTextoTabla(empleado.idEmpleado)}</td>
                <td>${escaparTextoTabla(`${empleado.Nombre} ${empleado.Apellido}`)}</td>
                <td>${escaparTextoTabla(empleado.DNI)}</td>
                <td>${escaparTextoTabla(empleado.Correo)}</td>
                <td>${escaparTextoTabla(empleado.Telefono)}</td>
                <td>${escaparTextoTabla(empleado.Cargo)}</td>
                <td>${Number(empleado.Activo) === 1 ? 'Activo' : 'Inactivo'}</td>
                <td>${empleado.TipoUsuarioWeb ? `Registrada (${escaparTextoTabla(empleado.TipoUsuarioWeb)})` : 'Sin usuario web'}</td>
            </tr>
        `).join('');
    } catch (error) {
        mostrarErrorAdministracion(error, 8);
    }
}

async function cargarAdministracionUsuarios() {
    const cuerpo = document.getElementById('tabla-cuerpo-dinamico');
    try {
        const usuarios = await obtenerDatosAdministracion('/api/usuarios/administracion');
        if (!cuerpo || !document.getElementById('item-administrar-usuarios')?.classList.contains('activo')) return;

        if (usuarios.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay usuarios registrados.</td></tr>';
            return;
        }

        cuerpo.innerHTML = usuarios.map(usuario => `
            <tr>
                <td>${escaparTextoTabla(usuario.idUsuario)}</td>
                <td>${escaparTextoTabla(usuario.Correo)}</td>
                <td>${escaparTextoTabla(usuario.Persona)}</td>
                <td>${escaparTextoTabla(usuario.TipoUsuario)}</td>
                <td style="text-align:center;">${Number(usuario.Activa) === 1 ? 'Activo' : 'Inactivo'}</td>
            </tr>
        `).join('');
    } catch (error) {
        mostrarErrorAdministracion(error, 5);
    }
}