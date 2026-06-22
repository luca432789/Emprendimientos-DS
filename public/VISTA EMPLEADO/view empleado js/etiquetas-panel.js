// ======================================================================
// MÓDULO EXCLUSIVO: GESTIÓN DE ETIQUETAS (FETCH Y ACCIONES)
// ======================================================================

function fetchEtiquetasParaPanel(filtro) {
    const tokenSeguro = sessionStorage.getItem('token_ministerio');
    const cuerpoEtiquetas = document.getElementById('tabla-cuerpo-etiquetas');

    if (!cuerpoEtiquetas) return;

    cuerpoEtiquetas.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#2f4e78; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando datos desde el Ministerio...</td></tr>';

    fetch(`/api/etiquetas?estado=${filtro}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenSeguro}`
        }
    })
    .then(respuesta => {
        if (respuesta.status === 401 || respuesta.status === 403) {
            sessionStorage.clear(); 
            alert("Su sesión ha expirado o no tiene autorización para este recurso.");
            window.location.href = '../Camino LOG IN.html'; 
            throw new Error("Sesión inválida.");
        }
        return respuesta.json();
    })
    .then(etiquetas => {
        cuerpoEtiquetas.innerHTML = ''; 

        if (etiquetas.length === 0) {
            cuerpoEtiquetas.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray; padding:20px;">No se encontraron etiquetas para este filtro.</td></tr>';
            return;
        }

        etiquetas.forEach(etiqueta => {
            const tr = document.createElement('tr');
            const claseCirculo = etiqueta.Activa === 1 ? 'estado-verde' : 'estado-rojo';
            const textoEstado = etiqueta.Activa === 1 ? 'Activa' : 'Inactiva';

            tr.innerHTML = `
                <td><strong>#${etiqueta.idEtiqueta}</strong></td>
                <td>${etiqueta.Nombre}</td>
                <td style="text-align: center;">
                    <span class="estado-indicador ${claseCirculo}" title="${textoEstado}"></span>
                </td>
                <td style="text-align: center;">
                    <button class="btn-acciones-tabla" onclick="prepararEdicionEtiqueta(${etiqueta.idEtiqueta}, '${etiqueta.Nombre}')">
                        <i class="fa-solid fa-pen-to-square" style="color: #2f4e78;"></i>
                    </button>
                </td>
            `;
            cuerpoEtiquetas.appendChild(tr);
        });
    })
    .catch(error => {
        console.error("Error en módulo etiquetas:", error);
        if (error.message !== "Sesión inválida.") {
            cuerpoEtiquetas.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error crítico al conectar con el servidor del Ministerio.</td></tr>';
        }
    });
}

function prepararEdicionEtiqueta(id, nombreActual) {
    let nuevoNombre = prompt(`Editar Etiqueta #${id}\n\nIngrese el nuevo nombre:`, nombreActual);
    if (nuevoNombre === null) return; 
    
    nuevoNombre = nuevoNombre.trim();
    if (nuevoNombre === "") {
        alert("El nombre no puede estar vacío.");
        return;
    }

    const deseaActiva = confirm(`¿Desea que la etiqueta "${nuevoNombre}" esté ACTIVA?\n\n[Aceptar] = Activa\n[Cancelar] = Inactiva`);
    const nuevoEstado = deseaActiva ? 1 : 0;

    actualizarEtiquetaEnServidor(id, nuevoNombre, nuevoEstado);
}

function actualizarEtiquetaEnServidor(id, nombre, activa) {
    const tokenSeguro = sessionStorage.getItem('token_ministerio');

    fetch(`/api/etiquetas/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenSeguro}`
        },
        body: JSON.stringify({ nombre, activa })
    })
    .then(respuesta => {
        if (respuesta.status === 401 || respuesta.status === 403) {
            sessionStorage.clear();
            alert("Sesión expirada o sin permisos.");
            window.location.href = '../Camino LOG IN.html';
            throw new Error("Sesión inválida.");
        }
        if (!respuesta.ok) {
            return respuesta.json().then(err => { throw new Error(err.error || "Error al actualizar"); });
        }
        return respuesta.json();
    })
    .then(() => {
        alert("Etiqueta actualizada correctamente.");
        fetchEtiquetasParaPanel('todas'); 
    })
    .catch(error => {
        console.error("Error en edición de etiqueta:", error);
        if (error.message !== "Sesión inválida.") alert(`Error operativo: ${error.message}`);
    });
}