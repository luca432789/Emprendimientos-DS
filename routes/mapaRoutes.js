import express from 'express';
import { pool } from '../config/db.js';

const router = express.Router();

// ======================================================
// ACTUALIZAR UBICACIÓN DE UN EMPRENDIMIENTO
// SOLO USUARIOS AUTORIZADOS (ADMIN / EMPLEADO)
// ======================================================
router.put('/mapa/ubicacion', async (req, res) => {
    try {
        const { idEmprendimiento, latitud, longitud } = req.body;

        // Validación básica
        if (!idEmprendimiento || !latitud || !longitud) {
            return res.status(400).json({
                error: "Faltan datos obligatorios"
            });
        }

        // UPDATE en base de datos
        await pool.query(
            `UPDATE Emprendimiento 
             SET Latitud = ?, Longitud = ?
             WHERE idEmprendimiento = ?`,
            [latitud, longitud, idEmprendimiento]
        );

        res.json({
            ok: true,
            message: "Ubicación actualizada correctamente"
        });

    } catch (error) {
        console.error("Error actualizando ubicación:", error);
        res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

export default router;