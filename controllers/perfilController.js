import { modelDatosEmprendimiento, modelIdEmprendimientoDeUsuario } from '../models/perfilModel.js';
import {
    MAXIMO_PUBLICACIONES,
    modelPublicacionesAprobadas,
    modelPublicacionesDeEmprendimiento
} from '../models/publicacionesModel.js';
import { MAXIMO_PRODUCTOS, modelProductosDeEmprendimiento } from '../models/productosModel.js';
import { conFotos } from './publicacionesController.js';
import { listarFotos } from '../helpers/imagenes.js';

// Si todavía no se ejecutó database/Productos.sql, el perfil funciona igual sin productos
const productosSeguros = async (idEmprendimiento, soloActivos) => {
    try {
        return { productos: await modelProductosDeEmprendimiento(idEmprendimiento, soloActivos), productosDisponibles: true };
    } catch (error) {
        if (error?.code === 'ER_NO_SUCH_TABLE') return { productos: [], productosDisponibles: false };
        throw error;
    }
};

// Galería de la pestaña "Fotos": fotos de publicaciones aprobadas + fotos de productos visibles
const armarGaleria = (publicaciones, productos) => [
    ...publicaciones.flatMap((p) => p.fotos.map((url) => ({ url, origen: 'publicacion', titulo: p.titulo }))),
    ...productos.filter((p) => p.PathFoto && p.Activo).map((p) => ({ url: p.PathFoto, origen: 'producto', titulo: p.Nombre }))
];

const datosPublicos = (e) => ({
    idEmprendimiento: e.idEmprendimiento,
    nombre: e.Nombre,
    rubro: e.Rubro,
    iconoMapa: e.IconoMapa,
    actividad: e.ActividadPrincipal,
    enMarcha: Boolean(e.EnMarcha),
    direccion: { calle: e.Calle, numero: e.NumeroCalle, barrio: e.Barrio, localidad: e.Localidad, departamento: e.Departamento },
    ubicacion: e.Latitud !== null && e.Longitud !== null ? { lat: Number(e.Latitud), lng: Number(e.Longitud) } : null,
    contacto: {
        nombre: [e.EmprendedorNombre, e.EmprendedorApellido].filter(Boolean).join(' '),
        telefono: e.Telefono,
        correo: e.Correo
    }
});

// GET /api/perfil/:idEmprendimiento  (público, solo lectura)
export const obtenerPerfilPublico = async (req, res) => {
    const idEmprendimiento = Number(req.params.idEmprendimiento);
    if (!Number.isInteger(idEmprendimiento) || idEmprendimiento <= 0) {
        return res.status(400).json({ error: 'Emprendimiento inválido.' });
    }

    try {
        const datos = await modelDatosEmprendimiento(idEmprendimiento);
        if (!datos) return res.status(404).json({ error: 'El emprendimiento no existe.' });

        const publicaciones = await conFotos(await modelPublicacionesAprobadas(idEmprendimiento));
        const { productos, productosDisponibles } = await productosSeguros(idEmprendimiento, true);

        res.json({
            esDueno: false,
            emprendimiento: datosPublicos(datos),
            publicaciones,
            productos,
            productosDisponibles,
            fotos: armarGaleria(publicaciones, productos)
        });
    } catch (error) {
        console.error('Error al obtener el perfil público:', error);
        res.status(500).json({ error: 'No se pudo cargar el perfil.' });
    }
};

// GET /api/perfil/mio  (emprendedor logueado): lo público + lo que está en revisión y los productos ocultos
export const obtenerMiPerfil = async (req, res) => {
    if (req.usuarioLogueado.tipoUsuario !== 'Emprendedor') {
        return res.status(403).json({ error: 'Solo disponible para emprendedores.' });
    }

    try {
        const idEmprendimiento = await modelIdEmprendimientoDeUsuario(req.usuarioLogueado.idUsuario);
        if (!idEmprendimiento) return res.status(404).json({ error: 'Su usuario no tiene un emprendimiento asociado.' });

        const datos = await modelDatosEmprendimiento(idEmprendimiento);
        const aprobadas = await conFotos(await modelPublicacionesAprobadas(idEmprendimiento));
        const { productos, productosDisponibles } = await productosSeguros(idEmprendimiento, false);

        // Publicaciones propias con el estado de moderación y las fotos de cada versión
        const propias = await Promise.all((await modelPublicacionesDeEmprendimiento(idEmprendimiento)).map(async (p) => ({
            idPublicacion: p.idPublicacion,
            estado: p.EstadoModeracion, // 0 aprobada, 1 en revisión, 2 rechazada
            fechaSolicitud: p.FechaSolicitud,
            motivoRechazo: p.MotivoRechazo,
            aprobada: p.TituloActual ? { titulo: p.TituloActual, descripcion: p.DescripcionActual, fotos: await listarFotos(p.DirectorioFotosActual) } : null,
            pendiente: p.TituloPendiente ? { titulo: p.TituloPendiente, descripcion: p.DescripcionPendiente, fotos: await listarFotos(p.DirectorioFotosPendiente) } : null
        })));

        res.json({
            esDueno: true,
            emprendimiento: datosPublicos(datos),
            publicaciones: aprobadas,
            misPublicaciones: propias,
            maximoPublicaciones: MAXIMO_PUBLICACIONES,
            maximoProductos: MAXIMO_PRODUCTOS,
            productos,
            productosDisponibles,
            fotos: armarGaleria(aprobadas, productos)
        });
    } catch (error) {
        console.error('Error al obtener el perfil del emprendedor:', error);
        res.status(500).json({ error: 'No se pudo cargar su perfil.' });
    }
};
