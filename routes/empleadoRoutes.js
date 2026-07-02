import { Router } from 'express';
import { CtrlObtenerEmpleadosPorCargo } from '../controllers/empleadoController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js'; // El que uses en tu proyecto

const router = Router();

// Endpoint que va a consultar el SweetAlert2
router.get('/empleados', verificarToken, CtrlObtenerEmpleadosPorCargo);

export default router;