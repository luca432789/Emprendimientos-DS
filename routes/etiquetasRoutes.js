import express from 'express';
import { obtenerEtiquetas } from '../controllers/etiquetasController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

router.get('/etiquetas', verificarToken, obtenerEtiquetas);

export default router;