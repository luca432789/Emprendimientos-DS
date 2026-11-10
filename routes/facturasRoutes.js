import express from 'express';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { obtenerMisFacturas, subirFactura, borrarFactura, enviarFacturasARevisar } from '../controllers/facturasController.js';

const router = express.Router();

// Facturas de Ley del emprendedor logueado (de su Subsidio o Crédito aprobado)
router.get('/facturas/mias', verificarToken, obtenerMisFacturas);
router.post('/facturas/mias/archivos', verificarToken, subirFactura);
router.delete('/facturas/mias/archivos/:archivo', verificarToken, borrarFactura);
router.post('/facturas/mias/enviar', verificarToken, enviarFacturasARevisar);

export default router;
