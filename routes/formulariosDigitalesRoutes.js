import express from 'express';
import { crearFormularioInicio, crearFormularioAyuda } from '../controllers/formulariosDigitalesController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// POST /api/formularios-digitales/inicio -> SolicitudInicio + DatosSolicitudInicio (sin login)
router.post('/formularios-digitales/inicio', crearFormularioInicio);

// POST /api/formularios-digitales/ayuda -> Subsidio o Credito del emprendedor logueado
router.post('/formularios-digitales/ayuda', verificarToken, crearFormularioAyuda);

export default router;
