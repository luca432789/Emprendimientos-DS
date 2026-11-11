import express from 'express';
import {
    crearFormularioInicio,
    disponibilidadFormularioInicio,
    verificarSolicitudSubsidio,
    crearFormularioSubsidio,
    verificarSolicitudCredito,
    crearFormularioCredito
} from '../controllers/formulariosDigitalesController.js';

const router = express.Router();

// POST /api/formularios-digitales/inicio -> SolicitudInicio + DatosSolicitudInicio (sin login)
router.post('/formularios-digitales/inicio', crearFormularioInicio);
// GET /api/formularios-digitales/inicio/disponible -> si hoy se reciben (lunes, miércoles y viernes) y el aviso si no
router.get('/formularios-digitales/inicio/disponible', disponibilidadFormularioInicio);

// Subsidio y Crédito (sin login): el emprendedor se identifica con Nº de expediente, correo y DNI de su solicitud de inicio
// POST /api/formularios-digitales/subsidio/verificar -> datos de la solicitud para completar el formulario
router.post('/formularios-digitales/subsidio/verificar', verificarSolicitudSubsidio);
// POST /api/formularios-digitales/subsidio -> registra (o reemplaza, si sigue sin resolver) el Subsidio
router.post('/formularios-digitales/subsidio', crearFormularioSubsidio);
// POST /api/formularios-digitales/credito/verificar -> igual que el subsidio, para quien eligió Crédito
router.post('/formularios-digitales/credito/verificar', verificarSolicitudCredito);
// POST /api/formularios-digitales/credito -> registra el Credito y su Garante (PDF completo + PDF del garante)
router.post('/formularios-digitales/credito', crearFormularioCredito);

export default router;
