import { TIPOS_AYUDA, modelAyudasSinRevisar } from '../models/ayudasModel.js';

const ROLES_AREA = ['Empleado de Area', 'Administrador'];

// GET /api/ayudas/:tipo/sin-revisar   (tipo: subsidio | credito)
// Lista para el panel del área: pedidos de subsidio o crédito sin revisar.
export const obtenerAyudasSinRevisar = async (req, res) => {
    if (!ROLES_AREA.includes(req.usuarioLogueado?.tipoUsuario)) {
        return res.status(403).json({ error: 'No tiene permiso para ver estas solicitudes.' });
    }
    const { tipo } = req.params;
    if (!TIPOS_AYUDA.includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de solicitud inválido.' });
    }

    try {
        res.json(await modelAyudasSinRevisar(tipo));
    } catch (error) {
        console.error(`Error al obtener ${tipo}s sin revisar:`, error);
        res.status(500).json({ error: 'No se pudieron obtener las solicitudes.' });
    }
};
