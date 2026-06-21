import express from 'express';
import { loginUsuario, registrarUsuario } from '../controllers/loginController.js';

const router = express.Router();

// endpoints del módulo de login usuarios
router.post('/login', loginUsuario);
router.post('/register', registrarUsuario);

export default router;

