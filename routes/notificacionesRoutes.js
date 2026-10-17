import express from 'express';
import { obtenerNotificaciones, marcarNotificacionesVistas } from '../controllers/notificacionesController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// GET /api/notificaciones -> notificaciones del usuario logueado (campanita del navbar)
router.get('/notificaciones', verificarToken, obtenerNotificaciones);

// POST /api/notificaciones/vistas -> marca notificaciones como vistas (se recuerda en cualquier computadora)
router.post('/notificaciones/vistas', verificarToken, marcarNotificacionesVistas);

export default router;
