import { modelEmprendimientoDeUsuario } from '../models/publicacionesModel.js';
import {
    modelProductoPropio,
    modelCrearProducto,
    modelEditarProducto,
    modelCambiarEstadoProducto
} from '../models/productosModel.js';
import { ErrorImagen, validarImagenes, guardarImagenes, borrarSubida } from '../helpers/imagenes.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

const datosAuditoriaDe = (req) => ({
    idUsuario: req.usuarioLogueado.idUsuario,
    ipCliente: obtenerIpCliente(req)
});

// El emprendedor logueado y su emprendimiento (o responde el error)
const emprendimientoDelEmprendedor = async (req, res) => {
    if (req.usuarioLogueado.tipoUsuario !== 'Emprendedor') {
        res.status(403).json({ error: 'Solo un emprendedor puede administrar productos.' });
        return null;
    }
    const emprendimiento = await modelEmprendimientoDeUsuario(req.usuarioLogueado.idUsuario);
    if (!emprendimiento) {
        res.status(404).json({ error: 'Su usuario no tiene un emprendimiento asociado.' });
        return null;
    }
    return emprendimiento;
};

const idValido = (valor) => {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// Valida nombre, precio (opcional: vacío = "Consultar precio") y descripción
const leerProducto = (body) => {
    const nombre = String(body.nombre ?? '').trim();
    const descripcion = String(body.descripcion ?? '').trim() || null;
    const precioTexto = String(body.precio ?? '').trim().replace(',', '.');
    const precio = precioTexto === '' ? null : Number(precioTexto);

    if (!nombre) return { error: 'Escriba el nombre del producto.' };
    if (nombre.length > 100) return { error: 'El nombre admite hasta 100 caracteres.' };
    if (descripcion && descripcion.length > 500) return { error: 'La descripción admite hasta 500 caracteres.' };
    if (precio !== null && (!Number.isFinite(precio) || precio < 0 || precio > 9999999999.99)) {
        return { error: 'Ingrese un precio válido (o déjelo vacío para "Consultar precio").' };
    }
    return { nombre, descripcion, precio: precio === null ? null : Math.round(precio * 100) / 100 };
};

const rutaFotoNueva = (idEmprendimiento, idProducto) => `/uploads/productos/${idEmprendimiento}/producto-${idProducto}-${Date.now()}`;

const responderError = (res, error, mensaje) => {
    if (error instanceof ErrorImagen) return res.status(400).json({ error: error.message });
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_TABLEACCESS_DENIED_ERROR') {
        return res.status(503).json({ error: 'La tabla de productos no está creada en la base de datos (ejecutar database/Productos.sql).' });
    }
    console.error(mensaje, error);
    return res.status(500).json({ error: mensaje });
};

// POST /api/productos  body: { nombre, precio?, descripcion?, foto?: dataURL }
export const crearProducto = async (req, res) => {
    let carpetaGuardada = null;
    try {
        const emprendimiento = await emprendimientoDelEmprendedor(req, res);
        if (!emprendimiento) return;

        const datos = leerProducto(req.body);
        if (datos.error) return res.status(400).json({ error: datos.error });
        const [imagen] = validarImagenes(req.body.foto ? [req.body.foto] : [], 1);

        // La foto se guarda antes del alta para que el INSERT ya lleve su ruta (una sola entrada de auditoría)
        let pathFoto = null;
        if (imagen) {
            carpetaGuardada = rutaFotoNueva(emprendimiento.idEmprendimiento, 'nuevo');
            [pathFoto] = await guardarImagenes(carpetaGuardada, [imagen]);
        }

        const idProducto = await modelCrearProducto(emprendimiento.idEmprendimiento, datos, pathFoto, datosAuditoriaDe(req));

        res.status(201).json({ mensaje: 'Producto publicado.', idProducto });
    } catch (error) {
        await borrarSubida(carpetaGuardada);
        responderError(res, error, 'No se pudo guardar el producto.');
    }
};

// PUT /api/productos/:idProducto  body: { nombre, precio?, descripcion?, foto?: dataURL, quitarFoto?: boolean }
export const editarProducto = async (req, res) => {
    let carpetaGuardada = null;
    try {
        const emprendimiento = await emprendimientoDelEmprendedor(req, res);
        if (!emprendimiento) return;

        const idProducto = idValido(req.params.idProducto);
        if (!idProducto) return res.status(400).json({ error: 'Producto inválido.' });
        const producto = await modelProductoPropio(idProducto, emprendimiento.idEmprendimiento);
        if (!producto) return res.status(404).json({ error: 'El producto no existe o no le pertenece.' });

        const datos = leerProducto(req.body);
        if (datos.error) return res.status(400).json({ error: datos.error });
        const [imagen] = validarImagenes(req.body.foto ? [req.body.foto] : [], 1);

        let pathFoto = req.body.quitarFoto === true ? null : producto.PathFoto;
        if (imagen) {
            carpetaGuardada = rutaFotoNueva(emprendimiento.idEmprendimiento, idProducto);
            [pathFoto] = await guardarImagenes(carpetaGuardada, [imagen]);
        }

        await modelEditarProducto(idProducto, emprendimiento.idEmprendimiento, datos, pathFoto, datosAuditoriaDe(req));
        res.json({ mensaje: 'Producto actualizado.' });
    } catch (error) {
        await borrarSubida(carpetaGuardada);
        responderError(res, error, 'No se pudo actualizar el producto.');
    }
};

// PATCH /api/productos/:idProducto/estado  body: { activo: true | false }
export const cambiarEstadoProducto = async (req, res) => {
    try {
        const emprendimiento = await emprendimientoDelEmprendedor(req, res);
        if (!emprendimiento) return;

        const idProducto = idValido(req.params.idProducto);
        if (!idProducto) return res.status(400).json({ error: 'Producto inválido.' });
        if (typeof req.body.activo !== 'boolean') return res.status(400).json({ error: 'Indique si el producto queda visible u oculto.' });

        const cambiados = await modelCambiarEstadoProducto(idProducto, emprendimiento.idEmprendimiento, req.body.activo, datosAuditoriaDe(req));
        if (!cambiados) return res.status(404).json({ error: 'El producto no existe o no le pertenece.' });
        res.json({ mensaje: req.body.activo ? 'Producto visible en su perfil.' : 'Producto oculto.' });
    } catch (error) {
        responderError(res, error, 'No se pudo cambiar el estado del producto.');
    }
};
