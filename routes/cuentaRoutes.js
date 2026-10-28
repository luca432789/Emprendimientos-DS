import express from 'express';
import {
    verificarEnlaceContrasena,
    crearContrasena,
    reenviarEnlaceContrasena
} from '../controllers/cuentaController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// Activación de la cuenta del emprendedor aprobado (enlace enviado por correo, sin sesión)
router.get('/cuenta/enlace/:codigo', verificarEnlaceContrasena);
router.post('/cuenta/crear-contrasena', crearContrasena);

// Área / Administrador: volver a enviar el correo con el enlace
router.post('/cuenta/reenviar-enlace/:idUsuario', verificarToken, reenviarEnlaceContrasena);

export default router;
