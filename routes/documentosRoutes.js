import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { obtenerMisDocumentos } from '../controllers/documentosController.js';

const router = express.Router();

// "Mis Documentos" del emprendedor (botón "+"): Nº de expediente y los PDF de su trámite
router.get('/documentos/mios', verificarToken, obtenerMisDocumentos);

export default router;
