import express from 'express';
import {
	actualizarUsuarioAdministracion,
	loginUsuario,
	listarUsuariosAdministracion,
	registrarUsuario
} from '../controllers/loginController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// endpoints del módulo de login usuarios
router.post('/login', loginUsuario);
router.post('/register', registrarUsuario);
router.get('/usuarios/administracion', verificarToken, listarUsuariosAdministracion);
router.patch('/usuarios/administracion/:id', verificarToken, actualizarUsuarioAdministracion);

export default router;

