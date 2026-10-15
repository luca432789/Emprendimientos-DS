import express from 'express';
import { obtenerNotificaciones } from '../controllers/notificacionesController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// GET /api/notificaciones -> notificaciones del usuario logueado (campanita del navbar)
router.get('/notificaciones', verificarToken, obtenerNotificaciones);

export default router;
