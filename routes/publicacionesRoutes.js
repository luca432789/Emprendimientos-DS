import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import {
    crearPublicacion,
    editarPublicacion,
    obtenerTodasLasAprobadas,
    obtenerPublicacionesAprobadas,
    obtenerPublicacionesPendientes,
    moderarPublicacion
} from '../controllers/publicacionesController.js';

const router = express.Router();

// WEB PÚBLICA: todas las publicaciones aprobadas (página "Publicaciones" del menú)
router.get('/publicaciones', obtenerTodasLasAprobadas);

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

export default router;
