import express from 'express';
import { obtenerSinExpediente, asignarExpedienteGED, obtenerSolicitudesArea} from '../controllers/solicitudesInicioController.js';
import { verificarToken, permitirRoles } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// GET /api/solicitudes/sin-expediente
router.get('/solicitudes/sin-expediente', verificarToken, obtenerSinExpediente);

// PUT /api/solicitudes/:id/asignar-expediente
router.put('/solicitudes/:id/asignar-expediente', verificarToken, permitirRoles('Empleado de Mesa'), asignarExpedienteGED);

router.get('/solicitudes/area/sin-revisar', verificarToken, obtenerSolicitudesArea);

export default router;