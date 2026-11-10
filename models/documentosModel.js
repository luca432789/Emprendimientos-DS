import { pool } from '../config/db.js';
import { modelDetalleEmprendimiento } from './emprendimientosAdminModel.js';

// "Mis Documentos" del emprendedor: los mismos datos que ve el Área en Administración de Emprendimientos
// (solicitud de inicio, formulario de la ayuda, facturas), buscados por su cuenta.
export const modelDocumentosDelEmprendedor = async (idUsuario) => {
    const [[usuario]] = await pool.query(
        `SELECT em.idEmprendimiento FROM Usuario u
         INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         WHERE u.idUsuario = ? AND u.TipoUsuario = 'Emprendedor' AND u.Activa = 1;`,
        [idUsuario]
    );
    if (!usuario) return null;
    const detalle = await modelDetalleEmprendimiento(usuario.idEmprendimiento);
    if (!detalle) return null;
    // Crédito: el documento del garante vigente (el de mayor idGarante)
    let garante = null;
    if (detalle.tipo === 'credito') {
        [[garante]] = await pool.query(
            'SELECT NombreCompleto, PathFormularioGarante FROM Garante WHERE idCredito = ? ORDER BY idGarante DESC LIMIT 1;',
            [detalle.idAyuda]
        );
    }
    return { ...detalle, Garante: garante?.NombreCompleto ?? null, PathGarante: garante?.PathFormularioGarante ?? null };
};
