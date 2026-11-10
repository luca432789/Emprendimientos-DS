import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import {
    obtenerAyudasSinRevisar,
    obtenerAyudasEnRevision,
    iniciarRevisionAyuda,
    solicitarReenvioAyuda,
    resolverAyuda,
    reenviarCorreoAyuda
} from '../controllers/ayudasController.js';

const router = express.Router();

// :tipo es subsidio o credito (Empleado de Área / Administrador)
router.get('/ayudas/:tipo/sin-revisar', verificarToken, obtenerAyudasSinRevisar);

// Revisión de subsidios y créditos (compartida por todo el Área)
router.get('/ayudas/:tipo/en-revision', verificarToken, obtenerAyudasEnRevision);
router.put('/ayudas/:tipo/:id/iniciar-revision', verificarToken, iniciarRevisionAyuda);
router.post('/ayudas/:tipo/:id/solicitar-reenvio', verificarToken, solicitarReenvioAyuda);
router.put('/ayudas/:tipo/:id/resolver', verificarToken, resolverAyuda);
router.post('/ayudas/:tipo/:id/reenviar-correo', verificarToken, reenviarCorreoAyuda);

export default router;
