import express from 'express';
import {
	obtenerSinExpediente,
	asignarExpedienteGED,
	obtenerSolicitudesArea,
	iniciarRevisionArea,
	obtenerRevisionesAsignadas,
	resolverRevisionArea,
	registrarEnvioMinistro,
	registrarResolucionMinistro,
	obtenerRubros,
	registrarEmprendimientoHistorico
} from '../controllers/solicitudesInicioController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// GET /api/solicitudes/sin-expediente
router.get('/solicitudes/sin-expediente', verificarToken, obtenerSinExpediente);

// PUT /api/solicitudes/:id/asignar-expediente
router.put('/solicitudes/:id/asignar-expediente', verificarToken, asignarExpedienteGED);

router.get('/solicitudes/area/sin-revisar', verificarToken, obtenerSolicitudesArea);
router.put('/solicitudes/:id/iniciar-revision', verificarToken, iniciarRevisionArea);
router.get('/solicitudes/area/asignadas', verificarToken, obtenerRevisionesAsignadas);
router.put('/solicitudes/:id/resolver-area', verificarToken, resolverRevisionArea);
router.put('/solicitudes/:id/enviar-ministro', verificarToken, registrarEnvioMinistro);
router.put('/solicitudes/:id/resolucion-ministro', verificarToken, registrarResolucionMinistro);
router.get('/solicitudes/rubros', verificarToken, obtenerRubros);
// POST /api/solicitudes/carga-historica -> emprendimiento antiguo ya aprobado (Empleado de Área / Administrador)
router.post('/solicitudes/carga-historica', verificarToken, registrarEmprendimientoHistorico);

export default router;