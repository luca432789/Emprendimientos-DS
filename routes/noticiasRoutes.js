import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { listarNoticias, obtenerNoticia, crearNoticia, editarNoticia, cambiarVisibilidadNoticia } from '../controllers/noticiasController.js';

const router = express.Router();

// Pestaña "Noticias": la lista es pública; publicar, editar (1 hora) y ocultar requieren el permiso Noticiero
router.get('/noticias', listarNoticias);
router.get('/noticias/:idNoticia', obtenerNoticia);
router.post('/noticias', verificarToken, crearNoticia);
router.put('/noticias/:idNoticia', verificarToken, editarNoticia);
router.patch('/noticias/:idNoticia/visible', verificarToken, cambiarVisibilidadNoticia);

export default router;
