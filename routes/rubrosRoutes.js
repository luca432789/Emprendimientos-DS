import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { listarNombresRubros, listarRubros, crearRubro, editarRubro } from '../controllers/rubrosController.js';

const router = express.Router();

// GET /api/rubros -> nombres de los rubros (público: sugerencias del Formulario de Inicio)
router.get('/rubros', listarNombresRubros);
// Administración de Rubros (Empleado de Área / Administrador): nombre e icono del mapa (opcional)
router.get('/rubros/admin', verificarToken, listarRubros);
router.post('/rubros', verificarToken, crearRubro);
router.put('/rubros/:id', verificarToken, editarRubro);

export default router;
