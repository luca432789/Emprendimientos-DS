import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import {
    crearPublicacion,
    obtenerMisPublicaciones,
    obtenerPublicacionesAprobadas,
    obtenerPublicacionesPendientes,
    moderarPublicacion
} from '../controllers/publicacionesController.js';

const router = express.Router();

// 1. EMPRENDEDOR: crear o actualizar su publicación (pasa a Revisión Pendiente = 1)
router.post('/publicaciones', verificarToken, crearPublicacion);

// Perfil del emprendedor logueado: su publicación aprobada y el estado de la pendiente
// (va antes de '/publicaciones/:idEmprendimiento' para que "mias" no se tome como un id)
router.get('/publicaciones/mias', verificarToken, obtenerMisPublicaciones);

// 3. EMPLEADO MODERADOR: pendientes de moderación (estado 1)
router.get('/publicaciones/pendientes/todas', verificarToken, obtenerPublicacionesPendientes);

// 2. WEB PÚBLICA / PERFIL: contenido APROBADO de un emprendimiento
router.get('/publicaciones/:idEmprendimiento', obtenerPublicacionesAprobadas);

// 4. EMPLEADO MODERADOR: aprobar o rechazar una publicación
router.put('/publicaciones/moderacion/:idPublicacion', verificarToken, moderarPublicacion);

export default router;
