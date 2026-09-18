import express from 'express';
import { loginUsuario, registrarUsuario, obtenerUsuarioActual, logoutUsuario } from '../controllers/loginController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// endpoints del módulo de login usuarios
router.post('/login', loginUsuario);
router.post('/logout', logoutUsuario);
router.get('/me', verificarToken, obtenerUsuarioActual);
router.post('/register', registrarUsuario);

export default router;

