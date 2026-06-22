import express from 'express';
import { obtenerEtiquetas, modificarEtiqueta } from '../controllers/etiquetasController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js'; // Usamos tu middleware original

const router = express.Router();

// 🔍 Ruta para LEER etiquetas (La que está fallando ahora)
// Si en app.js usás app.use('/api', router), esto se transforma automáticamente en /api/etiquetas
router.get('/etiquetas', verificarToken, obtenerEtiquetas);

// ✏️ Nueva Ruta para EDITAR etiquetas (Parámetro ID por URL)
// Esto se transformará en /api/etiquetas/:id
router.put('/etiquetas/:id', verificarToken, modificarEtiqueta);

export default router;