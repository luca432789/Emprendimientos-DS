import express from 'express';
import { crearFormularioInicio, crearFormularioAyuda, listarEmprendimientosParaAyuda } from '../controllers/formulariosDigitalesController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// POST /api/formularios-digitales/inicio -> SolicitudInicio + DatosSolicitudInicio (sin login)
router.post('/formularios-digitales/inicio', crearFormularioInicio);

// GET /api/formularios-digitales/emprendimientos -> emprendimientos para elegir (Área / Administrador)
router.get('/formularios-digitales/emprendimientos', verificarToken, listarEmprendimientosParaAyuda);

// POST /api/formularios-digitales/ayuda -> Subsidio o Credito cargado por Área / Administrador
// a nombre del emprendimiento elegido (idEmprendimiento)
router.post('/formularios-digitales/ayuda', verificarToken, crearFormularioAyuda);

export default router;
