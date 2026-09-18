import express from 'express';
import { pool } from '../config/db.js';
import { getEmprendimientosMapa, putUbicacionEmprendimiento } from '../controllers/mapaController.js';
import { verificarToken, permitirRoles } from '../middlewares/loginMiddleware.js';

const router = express.Router();

router.get('/emprendimientos', getEmprendimientosMapa);

router.put('/emprendimientos/:id',
    verificarToken,
    permitirRoles('Administrador', 'Empleado de Area', 'Empleado de Mesa'),
    putUbicacionEmprendimiento
);

// Compatibilidad con rutas antiguas
router.put('/mapa/ubicacion',
    verificarToken,
    permitirRoles('Administrador', 'Empleado de Area', 'Empleado de Mesa'),
    async (req, res) => {
        const { idEmprendimiento, latitud, longitud } = req.body;

        if (!idEmprendimiento || !latitud || !longitud) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        try {
            await pool.query(
                `UPDATE Emprendimiento 
                 SET Latitud = ?, Longitud = ?
                 WHERE idEmprendimiento = ?`,
                [latitud, longitud, idEmprendimiento]
            );

            res.json({ ok: true, message: 'Ubicación actualizada correctamente' });
        } catch (error) {
            console.error('Error actualizando ubicación:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

export default router;