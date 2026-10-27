import {
    obtenerEmprendimientosMapa,
    actualizarUbicacionEmprendimiento
} from '../models/mapaModel.js';
import { coordenadasEnSantiago, mensajeFueraDeSantiago } from '../helpers/departamentos.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

export const getEmprendimientosMapa = async (req, res) => {
    try {
        const datos = await obtenerEmprendimientosMapa();
        res.json(datos);
    } catch (error) {
        console.error('DETALLE DEL ERROR EN MAPA:', error);
        res.status(500).json({ mensaje: 'Error al obtener los emprendimientos.' });
    }
};

export const putUbicacionEmprendimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const latitud = parseFloat(req.body.latitud);
        const longitud = parseFloat(req.body.longitud);

        if (
            Number.isNaN(latitud) || Number.isNaN(longitud) ||
            latitud < -90 || latitud > 90 ||
            longitud < -180 || longitud > 180
        ) {
            return res.status(400).json({ mensaje: 'Coordenadas inválidas.' });
        }
        if (!coordenadasEnSantiago(latitud, longitud)) {
            return res.status(400).json({ mensaje: mensajeFueraDeSantiago });
        }

        const datosAuditoria = {
            idUsuario: req.usuarioLogueado.idUsuario,
            ipCliente: obtenerIpCliente(req)
        };

        const resultado = await actualizarUbicacionEmprendimiento(id, latitud, longitud, datosAuditoria);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Emprendimiento no encontrado.' });
        }

        res.json({ mensaje: 'Ubicación actualizada correctamente.' });
    } catch (error) {
        console.error('DETALLE DEL ERROR EN PUT UBICACION:', error);
        res.status(500).json({ mensaje: 'Error al actualizar la ubicación.' });
    }
};
