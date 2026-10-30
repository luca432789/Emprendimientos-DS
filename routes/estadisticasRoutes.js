import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { obtenerEstadistica } from '../controllers/estadisticasController.js';

const router = express.Router();

// ADMINISTRADOR: estadísticas anuales (por mes y por departamento) para la sección "Estadísticas" del panel
router.get('/estadisticas', verificarToken, obtenerEstadistica);

export default router;
