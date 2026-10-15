import express from 'express';
import {
	buscarUsuariosAuditoria,
	obtenerAuditoria,
	obtenerOpcionesAuditoria
} from '../controllers/auditoriaController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

router.get('/auditoria/opciones', verificarToken, obtenerOpcionesAuditoria);
router.get('/auditoria/usuarios', verificarToken, buscarUsuariosAuditoria);
router.get('/auditoria', verificarToken, obtenerAuditoria);

export default router;