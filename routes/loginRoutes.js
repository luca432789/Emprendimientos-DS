import express from 'express';
import {
	actualizarUsuarioAdministracion,
	loginUsuario,
	listarUsuariosAdministracion,
	registrarUsuario,
	renovarSesion
} from '../controllers/loginController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// endpoints del módulo de login usuarios
router.post('/login', loginUsuario);
router.post('/login/renovar', verificarToken, renovarSesion); // mantiene la sesión mientras hay actividad
router.post('/register', registrarUsuario);
router.get('/usuarios/administracion', verificarToken, listarUsuariosAdministracion);
router.patch('/usuarios/administracion/:id', verificarToken, actualizarUsuarioAdministracion);

export default router;

