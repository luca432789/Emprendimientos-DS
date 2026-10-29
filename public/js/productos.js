// =========================================================
// productos.js - Pestaña "Productos" del perfil
// Necesita perfil-emprendedor.js (evento 'perfil-listo').
//  - Dueño: carga (máx. 4, contando los ocultos), edita, oculta y vuelve a mostrar productos
//    (sin aprobación del Ministerio).
//  - Visitante: ve los productos visibles.
// =========================================================

let formularioProductoListo = false;

document.addEventListener('perfil-listo', ({ detail: Perfil }) => {
    const formulario = document.getElementById('form-producto');
    const tarjetaFormulario = formulario?.closest('section');

    if (!Perfil.datos.productosDisponibles) {
        if (tarjetaFormulario) tarjetaFormulario.style.display = 'none';
        document.getElementById('productos-grid').innerHTML = Perfil.esDueno
            ? '<p class="sin-datos">La sección de productos todavía no está habilitada en la base de datos (falta ejecutar <code>database/Productos.sql</code>).</p>'
            : '<p class="sin-datos">Este emprendimiento todavía no cargó productos.</p>';
        return;
    }

    if (tarjetaFormulario) tarjetaFormulario.style.display = Perfil.esDueno ? '' : 'none';
    if (Perfil.esDueno && formulario) {
        prepararFormularioProducto(Perfil, formulario);
        actualizarCupoProductos(Perfil, formulario);
    }
    pintarProductos(Perfil);
});

// Cuántos productos le quedan; si no le quedan, el formulario se reemplaza por un aviso
function actualizarCupoProductos(Perfil, formulario) {
    const usados = Perfil.datos.productos.length; // el dueño recibe también los ocultos
    const maximo = Perfil.datos.maximoProductos ?? 4;
    const aviso = document.getElementById('aviso-cupo-productos') || (() => {
        const p = document.createElement('p');
        p.id = 'aviso-cupo-productos';
        p.className = 'aviso-cupo';
        formulario.before(p);
        return p;
    })();

    const lleno = usados >= maximo;
    formulario.style.display = lleno ? 'none' : '';
    aviso.textContent = lleno
        ? `Ya cargaste tus ${maximo} productos. Para mostrar uno distinto, editá uno de los que tenés (también los ocultos).`
        : `Podés tener hasta ${maximo} productos, contando los ocultos (te ${maximo - usados === 1 ? 'queda 1' : `quedan ${maximo - usados}`}).`;
}

function prepararFormularioProducto(Perfil, formulario) {
    if (formularioProductoListo) return;
    formularioProductoListo = true;

    // El precio es opcional: vacío = "Consultar precio"
    const precio = formulario.querySelector('#prod-precio');
    precio.required = false;
    precio.min = '0';
    precio.placeholder = 'Precio ($) — vacío = consultar';

    const inputFoto = formulario.querySelector('#prod-imagen');
    inputFoto.accept = 'image/jpeg,image/png,image/webp';
    const vistaPrevia = document.createElement('div');
    vistaPrevia.className = 'vista-previa-fotos';
    formulario.querySelector('.acciones-publicacion').before(vistaPrevia);
    inputFoto.addEventListener('change', () => {
        vistaPrevia.innerHTML = inputFoto.files[0] ? `<img src="${URL.createObjectURL(inputFoto.files[0])}" alt="Vista previa">` : '';
    });

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorFoto = Perfil.validarImagenes(inputFoto.files, 1);
        if (errorFoto) return Perfil.aviso('warning', 'Revisá la imagen', errorFoto);

        const boton = formulario.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            const [foto] = await Perfil.leerArchivos(inputFoto.files);
            const { ok, datos } = await Perfil.api('POST', '/api/productos', {
                nombre: formulario.querySelector('#prod-nombre').value,
                precio: precio.value,
                descripcion: formulario.querySelector('#prod-descripcion').value,
                foto
            });
            if (!ok) return Perfil.aviso('error', 'No se pudo guardar', datos.error);

            formulario.reset();
            vistaPrevia.innerHTML = '';
            Perfil.aviso('success', 'Producto publicado', 'Ya se ve en tu perfil.');
            await Perfil.recargar();
        } catch (error) {
            Perfil.aviso('error', 'Error de red', error.message || 'No se pudo conectar con el servidor.');
        } finally {
            boton.disabled = false;
        }
    });
}

function pintarProductos(Perfil) {
    const grilla = document.getElementById('productos-grid');
    const { productos } = Perfil.datos;
    const esc = Perfil.escapar;

    if (!productos.length) {
        grilla.innerHTML = `<p class="sin-datos">${Perfil.esDueno ? 'Todavía no cargaste productos. Usá el formulario de arriba.' : 'Este emprendimiento todavía no cargó productos.'}</p>`;
        return;
    }

    grilla.innerHTML = productos.map((p, i) => `
        <div class="producto-card${p.Activo ? '' : ' producto-oculto'}">
            <div class="producto-img-container">
                <img src="${esc(p.PathFoto || '/Imagenes/PLACEHOLDER.jpg')}" alt="${esc(p.Nombre)}" loading="lazy"${p.PathFoto ? ' data-ampliar' : ''}>
                ${p.Activo ? '' : '<span class="etiqueta-oculto"><i class="fa-solid fa-eye-slash"></i> Oculto</span>'}
            </div>
            <div class="producto-info">
                <h4 class="producto-titulo">${esc(p.Nombre)}</h4>
                <p class="producto-precio">${Perfil.precio(p.Precio)}</p>
                ${p.Descripcion ? `<p class="producto-desc">${Perfil.parrafos(p.Descripcion)}</p>` : ''}
                ${Perfil.esDueno ? `
                    <div class="producto-acciones">
                        <button type="button" class="btn-producto" data-accion="editar" data-indice="${i}"><i class="fa-solid fa-pen"></i> Editar</button>
                        <button type="button" class="btn-producto" data-accion="estado" data-indice="${i}">
                            <i class="fa-solid fa-eye${p.Activo ? '-slash' : ''}"></i> ${p.Activo ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>` : ''}
            </div>
        </div>`).join('');

    grilla.querySelectorAll('.btn-producto').forEach((boton) => {
        const producto = productos[Number(boton.dataset.indice)];
        boton.addEventListener('click', () => (boton.dataset.accion === 'editar'
            ? editarProducto(Perfil, producto)
            : cambiarEstado(Perfil, producto)));
    });
}

async function cambiarEstado(Perfil, producto) {
    const { ok, datos } = await Perfil.api('PATCH', `/api/productos/${producto.idProducto}/estado`, { activo: !producto.Activo });
    if (!ok) return Perfil.aviso('error', 'No se pudo cambiar', datos.error);
    await Perfil.recargar();
}

async function editarProducto(Perfil, producto) {
    const esc = Perfil.escapar;
    const { isConfirmed, value } = await Swal.fire({
        title: 'Editar producto',
        width: 560,
        html: `
            <div class="form-editar-publicacion">
                <label>Nombre <input id="edit-prod-nombre" class="swal2-input" maxlength="100" value="${esc(producto.Nombre)}"></label>
                <label>Precio ($) — vacío = consultar <input id="edit-prod-precio" class="swal2-input" type="number" min="0" step="0.01" value="${producto.Precio ?? ''}"></label>
                <label>Descripción <textarea id="edit-prod-desc" class="swal2-textarea" maxlength="500">${esc(producto.Descripcion || '')}</textarea></label>
                ${producto.PathFoto ? `
                    <div class="vista-previa-fotos"><img src="${esc(producto.PathFoto)}" alt="Foto actual"></div>
                    <label class="check-fotos"><input type="checkbox" id="edit-prod-quitar"> Quitar la foto</label>` : ''}
                <label>Foto nueva (reemplaza la actual) <input type="file" id="edit-prod-foto" accept="image/jpeg,image/png,image/webp"></label>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2f4e78',
        preConfirm: async () => {
            const nombre = document.getElementById('edit-prod-nombre').value.trim();
            const archivos = document.getElementById('edit-prod-foto').files;
            if (!nombre) return Swal.showValidationMessage('Escribí el nombre del producto.');
            const errorFoto = Perfil.validarImagenes(archivos, 1);
            if (errorFoto) return Swal.showValidationMessage(errorFoto);
            const [foto] = await Perfil.leerArchivos(archivos);
            return {
                nombre,
                precio: document.getElementById('edit-prod-precio').value,
                descripcion: document.getElementById('edit-prod-desc').value,
                foto,
                quitarFoto: Boolean(document.getElementById('edit-prod-quitar')?.checked)
            };
        }
    });
    if (!isConfirmed) return;

    const { ok, datos } = await Perfil.api('PUT', `/api/productos/${producto.idProducto}`, value);
    if (!ok) return Perfil.aviso('error', 'No se pudo guardar', datos.error);
    Perfil.aviso('success', 'Producto actualizado');
    await Perfil.recargar();
}
