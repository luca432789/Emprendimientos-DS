import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { listarNoticias, obtenerNoticia, crearNoticia, editarNoticia, cambiarVisibilidadNoticia, eliminarNoticia } from '../controllers/noticiasController.js';

const router = express.Router();

// Pestaña "Noticias": la lista es pública; publicar, editar (1 hora), ocultar y eliminar requieren el permiso Noticiero
router.get('/noticias', listarNoticias);
router.get('/noticias/:idNoticia', obtenerNoticia);
router.post('/noticias', verificarToken, crearNoticia);
router.put('/noticias/:idNoticia', verificarToken, editarNoticia);
router.patch('/noticias/:idNoticia/visible', verificarToken, cambiarVisibilidadNoticia);
router.delete('/noticias/:idNoticia', verificarToken, eliminarNoticia);

export default router;
