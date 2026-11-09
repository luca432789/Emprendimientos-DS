import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import {
    obtenerAyudasSinRevisar,
    obtenerSubsidiosEnRevision,
    iniciarRevisionSubsidio,
    solicitarReenvioSubsidio,
    resolverSubsidio,
    reenviarCorreoSubsidio
} from '../controllers/ayudasController.js';

const router = express.Router();

// GET /api/ayudas/subsidio/sin-revisar  y  /api/ayudas/credito/sin-revisar (Empleado de Área / Administrador)
router.get('/ayudas/:tipo/sin-revisar', verificarToken, obtenerAyudasSinRevisar);

// Revisión de subsidios (compartida por todo el Área)
router.get('/ayudas/subsidio/en-revision', verificarToken, obtenerSubsidiosEnRevision);
router.put('/ayudas/subsidio/:id/iniciar-revision', verificarToken, iniciarRevisionSubsidio);
router.post('/ayudas/subsidio/:id/solicitar-reenvio', verificarToken, solicitarReenvioSubsidio);
router.put('/ayudas/subsidio/:id/resolver', verificarToken, resolverSubsidio);
router.post('/ayudas/subsidio/:id/reenviar-correo', verificarToken, reenviarCorreoSubsidio);

export default router;
