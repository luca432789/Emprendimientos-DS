import express from 'express';
import {
    crearFormularioInicio,
    crearFormularioAyuda,
    listarEmprendimientosParaAyuda,
    verificarSolicitudSubsidio,
    crearFormularioSubsidio
} from '../controllers/formulariosDigitalesController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// POST /api/formularios-digitales/inicio -> SolicitudInicio + DatosSolicitudInicio (sin login)
router.post('/formularios-digitales/inicio', crearFormularioInicio);

// GET /api/formularios-digitales/emprendimientos -> emprendimientos para elegir (Área / Administrador)
router.get('/formularios-digitales/emprendimientos', verificarToken, listarEmprendimientosParaAyuda);

// POST /api/formularios-digitales/ayuda -> Credito cargado por Área / Administrador
// a nombre del emprendimiento elegido (idEmprendimiento)
router.post('/formularios-digitales/ayuda', verificarToken, crearFormularioAyuda);

// Subsidio (sin login): el emprendedor se identifica con Nº de expediente, correo y DNI de su solicitud de inicio
// POST /api/formularios-digitales/subsidio/verificar -> datos de la solicitud para completar el formulario
router.post('/formularios-digitales/subsidio/verificar', verificarSolicitudSubsidio);
// POST /api/formularios-digitales/subsidio -> registra (o reemplaza, si sigue sin resolver) el Subsidio
router.post('/formularios-digitales/subsidio', crearFormularioSubsidio);

export default router;
