import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import {
    listarEmprendimientos,
    obtenerEmprendimiento,
    validarFacturas,
    observarFacturas,
    reenviarCorreoFacturas,
    acreditarPuestaMarcha,
    actualizarAntecedentes
} from '../controllers/emprendimientosAdminController.js';

const router = express.Router();

// Administración de Emprendimientos (Empleado de Área / Administrador)
router.get('/emprendimientos-admin', verificarToken, listarEmprendimientos);
router.get('/emprendimientos-admin/:id', verificarToken, obtenerEmprendimiento);
router.post('/emprendimientos-admin/:id/facturas/validar', verificarToken, validarFacturas);
router.post('/emprendimientos-admin/:id/facturas/observar', verificarToken, observarFacturas);
router.post('/emprendimientos-admin/:id/facturas/correo', verificarToken, reenviarCorreoFacturas);
router.post('/emprendimientos-admin/:id/puesta-marcha', verificarToken, acreditarPuestaMarcha);
router.put('/emprendimientos-admin/:id/antecedentes', verificarToken, actualizarAntecedentes);

export default router;
