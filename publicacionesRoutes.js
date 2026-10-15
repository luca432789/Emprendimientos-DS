import express from 'express';
import { pool } from '../config/db.js';

const router = express.Router();

// 1. EMPRENDEDOR: Crear o actualizar publicación (Pasa a Revisión Pendiente = 1)
router.post('/publicaciones', async (req, res) => {
    const { idEmprendimiento, titulo, descripcion, fotoUrl } = req.body;

    try {
        // Verificar si ya tiene un registro de publicación creado
        const [existe] = await pool.query(
            'SELECT idPublicacion FROM Publicacion WHERE idEmprendimiento = ?', 
            [idEmprendimiento]
        );

        if (existe.length > 0) {
            // Actualizar enviando los datos a las columnas "Pendiente" y Estado 1
            await pool.query(
                `UPDATE Publicacion 
                 SET TituloPendiente = ?, DescripcionPendiente = ?, DirectorioFotosPendiente = ?, 
                     EstadoModeracion = 1, FechaSolicitud = CURDATE(), MotivoRechazo = NULL
                 WHERE idEmprendimiento = ?`,
                [titulo, descripcion, fotoUrl, idEmprendimiento]
            );
        } else {
            // Crear nuevo registro en estado pendiente
            await pool.query(
                `INSERT INTO Publicacion 
                 (idEmprendimiento, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion, FechaSolicitud)
                 VALUES (?, ?, ?, ?, 1, CURDATE())`,
                [idEmprendimiento, titulo, descripcion, fotoUrl]
            );
        }

        res.json({ mensaje: 'Publicación enviada a revisión correctamente.' });
    } catch (error) {
        console.error('Error al guardar la publicación:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// 2. WEB PÚBLICA / PERFIL: Obtener contenido APROBADO (Estado 0 o con datos Actuales)
router.get('/publicaciones/:idEmprendimiento', async (req, res) => {
    const { idEmprendimiento } = req.params;

    try {
        const [filas] = await pool.query(
            `SELECT idPublicacion, TituloActual AS titulo, DescripcionActual AS descripcion, 
                    DirectorioFotosActual AS foto, EstadoModeracion 
             FROM Publicacion 
             WHERE idEmprendimiento = ? AND TituloActual IS NOT NULL`,
            [idEmprendimiento]
        );

        res.json(filas);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar la publicación.' });
    }
});

// 3. EMPLEADO MODERADOR: Aprobar o Rechazar Publicación
router.put('/publicaciones/moderacion/:idPublicacion', async (req, res) => {
    const { idPublicacion } = req.params;
    const { aprobar, motivoRechazo, idEmpleadoModerador } = req.body;

    try {
        if (aprobar) {
            // Pasa lo Pendiente a Actual y cambia EstadoModeracion a 0 (Aprobado)
            await pool.query(
                `UPDATE Publicacion 
                 SET TituloActual = TituloPendiente,
                     DescripcionActual = DescripcionPendiente,
                     DirectorioFotosActual = DirectorioFotosPendiente,
                     TituloPendiente = NULL, DescripcionPendiente = NULL, DirectorioFotosPendiente = NULL,
                     EstadoModeracion = 0, FechaRevision = CURDATE(), idEmpleadoModerador = ?
                 WHERE idPublicacion = ?`,
                [idEmpleadoModerador, idPublicacion]
            );
        } else {
            // Rechazado (EstadoModeracion = 2)
            await pool.query(
                `UPDATE Publicacion 
                 SET EstadoModeracion = 2, FechaRevision = CURDATE(), 
                     MotivoRechazo = ?, idEmpleadoModerador = ?
                 WHERE idPublicacion = ?`,
                [motivoRechazo, idEmpleadoModerador, idPublicacion]
            );
        }

        res.json({ mensaje: 'Resolución de moderación procesada exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al moderar publicación.' });
    }
});

export default router;

// OBTENER TODAS LAS PUBLICACIONES PENDIENTES DE MODERACIÓN (Estado 1)
router.get('/publicaciones/pendientes/todas', async (req, res) => {
    try {
        const [pendientes] = await pool.query(
            `SELECT p.idPublicacion, p.TituloPendiente, p.DescripcionPendiente, 
                    p.FechaSolicitud, e.Nombre AS NombreEmprendimiento
             FROM Publicacion p
             JOIN Emprendimiento e ON p.idEmprendimiento = e.idEmprendimiento
             WHERE p.EstadoModeracion = 1`
        );
        res.json(pendientes);
    } catch (error) {
        console.error('Error al obtener pendientes:', error);
        res.status(500).json({ error: 'Error al consultar publicaciones pendientes.' });
    }
});