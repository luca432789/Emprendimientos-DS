import {
    obtenerEmprendimientosMapa,
    actualizarUbicacionEmprendimiento
} from '../models/mapaModel.js';

export const getEmprendimientosMapa =
async (req, res) => {
    try {

        const datos =
            await obtenerEmprendimientosMapa();

        res.json(datos);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje:
                'Error al obtener los emprendimientos.'
        });
    }
};

export const putUbicacionEmprendimiento =
async (req, res) => {
    try {

        const { id } = req.params;

        const {
            latitud,
            longitud
        } = req.body;

        await actualizarUbicacionEmprendimiento(
            id,
            latitud,
            longitud
        );

        res.json({
            mensaje:
                'Ubicación actualizada correctamente.'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje:
                'Error al actualizar la ubicación.'
        });
    }
};