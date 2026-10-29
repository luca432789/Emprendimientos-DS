import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { obtenerAyudasSinRevisar } from '../controllers/ayudasController.js';

const router = express.Router();

// GET /api/ayudas/subsidio/sin-revisar  y  /api/ayudas/credito/sin-revisar (Empleado de Área / Administrador)
router.get('/ayudas/:tipo/sin-revisar', verificarToken, obtenerAyudasSinRevisar);

export default router;
