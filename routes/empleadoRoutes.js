import { Router } from 'express';
import {
	CtrlActualizarEmpleadoAdministracion,
	CtrlListarEmpleadosAdministracion,
	CtrlObtenerEmpleadosPorCargo,
	CtrlRegistrarEmpleado
} from '../controllers/empleadoController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js'; // El que uses en tu proyecto

const router = Router();

// Endpoint que va a consultar el SweetAlert2
router.get('/empleados', verificarToken, CtrlObtenerEmpleadosPorCargo);
router.post('/empleados', verificarToken, CtrlRegistrarEmpleado);
router.get('/empleados/administracion', verificarToken, CtrlListarEmpleadosAdministracion);
router.patch('/empleados/administracion/:id', verificarToken, CtrlActualizarEmpleadoAdministracion);

export default router;