import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { crearProducto, editarProducto, cambiarEstadoProducto } from '../controllers/productosController.js';

const router = express.Router();

// Productos del emprendedor logueado (sin aprobación del Ministerio).
// La lista se obtiene con el perfil: GET /api/perfil/mio (dueño) o /api/perfil/:id (público).
router.post('/productos', verificarToken, crearProducto);
router.put('/productos/:idProducto', verificarToken, editarProducto);
router.patch('/productos/:idProducto/estado', verificarToken, cambiarEstadoProducto);

export default router;
