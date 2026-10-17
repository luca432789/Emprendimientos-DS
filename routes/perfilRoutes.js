import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { obtenerMiPerfil, obtenerPerfilPublico } from '../controllers/perfilController.js';

const router = express.Router();

// Perfil del emprendedor logueado (con lo que está en revisión y sus productos ocultos)
// (va antes de '/perfil/:idEmprendimiento' para que "mio" no se tome como un id)
router.get('/perfil/mio', verificarToken, obtenerMiPerfil);

// Perfil público de un emprendimiento (Acerca de, Publicaciones, Productos, Fotos, Contacto)
router.get('/perfil/:idEmprendimiento', obtenerPerfilPublico);

export default router;
