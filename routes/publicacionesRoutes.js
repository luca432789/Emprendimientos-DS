import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import {
    crearPublicacion,
    editarPublicacion,
    eliminarPublicacion,
    obtenerTodasLasAprobadas,
    obtenerEmprendimientosPublicos,
    obtenerPublicacionesAprobadas,
    obtenerPublicacionesPendientes,
    moderarPublicacion
} from '../controllers/publicacionesController.js';

const router = express.Router();

// WEB PÚBLICA: todas las publicaciones aprobadas (página "Publicaciones" del menú)
router.get('/publicaciones', obtenerTodasLasAprobadas);

// WEB PÚBLICA: emprendimientos con el mismo filtro (columna de la página "Publicaciones"), tengan o no publicaciones
router.get('/emprendimientos', obtenerEmprendimientosPublicos);

// EMPRENDEDOR: nueva publicación (máx. 2 por emprendimiento) -> Revisión Pendiente
router.post('/publicaciones', verificarToken, crearPublicacion);

// EMPLEADO MODERADOR: pendientes de moderación (va antes de '/:idEmprendimiento')
router.get('/publicaciones/pendientes/todas', verificarToken, obtenerPublicacionesPendientes);

// WEB PÚBLICA / PERFIL: contenido APROBADO de un emprendimiento
router.get('/publicaciones/:idEmprendimiento', obtenerPublicacionesAprobadas);

// EMPLEADO MODERADOR: aprobar o rechazar una publicación
router.put('/publicaciones/moderacion/:idPublicacion', verificarToken, moderarPublicacion);

// EMPRENDEDOR: editar una de sus publicaciones -> vuelve a Revisión Pendiente
router.put('/publicaciones/:idPublicacion', verificarToken, editarPublicacion);

// EMPRENDEDOR: eliminar una de sus publicaciones (libera el lugar para crear otra)
router.delete('/publicaciones/:idPublicacion', verificarToken, eliminarPublicacion);

export default router;
