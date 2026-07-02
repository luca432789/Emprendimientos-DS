import express from 'express';
import { obtenerSinExpediente, asignarExpedienteGED, obtenerSolicitudesArea} from '../controllers/solicitudesInicioController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// GET /api/solicitudes/sin-expediente
router.get('/solicitudes/sin-expediente', verificarToken, obtenerSinExpediente);

// PUT /api/solicitudes/:id/asignar-expediente
router.put('/solicitudes/:id/asignar-expediente', verificarToken, asignarExpedienteGED);

router.get('/solicitudes/area/sin-revisar', verificarToken, obtenerSolicitudesArea);

export default router;