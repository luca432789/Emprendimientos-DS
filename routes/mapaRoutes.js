import express from 'express';
import {
    getEmprendimientosMapa,
    putUbicacionEmprendimiento
} from '../controllers/mapaController.js';
import { verificarToken } from '../middlewares/loginMiddleware.js';
import { soloEditoresMapa } from '../middlewares/mapaAuth.js';

const router = express.Router();

// GET /api/mapa  (público: cualquiera puede ver el mapa)
router.get('/mapa', getEmprendimientosMapa);

// PUT /api/mapa/:id  (token válido + rol de empleado/administrador)
router.put('/mapa/:id', verificarToken, soloEditoresMapa, putUbicacionEmprendimiento);

export default router;