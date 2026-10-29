import express from 'express';
import {
    verificarEnlaceContrasena,
    crearContrasena,
    solicitarRecuperacionContrasena,
    reenviarEnlaceContrasena
} from '../controllers/cuentaController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';

const router = express.Router();

// Activación de la cuenta del emprendedor aprobado (enlace enviado por correo, sin sesión)
router.get('/cuenta/enlace/:codigo', verificarEnlaceContrasena);
router.post('/cuenta/crear-contrasena', crearContrasena);

// "Olvidé mi contraseña": envía al correo de la cuenta un enlace a la misma página de crear contraseña
router.post('/cuenta/olvide-contrasena', solicitarRecuperacionContrasena);

// Área / Administrador: volver a enviar el correo con el enlace
router.post('/cuenta/reenviar-enlace/:idUsuario', verificarToken, reenviarEnlaceContrasena);

export default router;
