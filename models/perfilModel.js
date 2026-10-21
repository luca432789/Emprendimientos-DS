import { pool } from '../config/db.js';

// Datos públicos del emprendimiento y de contacto del emprendedor (no se exponen DNI ni domicilio personal)
export const modelDatosEmprendimiento = async (idEmprendimiento) => {
    const [filas] = await pool.query(
        `SELECT e.idEmprendimiento, e.Nombre, e.Calle, e.NúmeroCalle AS NumeroCalle, e.Barrio,
                e.Departamento, e.Localidad, e.EnMarcha, e.ActividadPrincipal, e.Latitud, e.Longitud,
                r.Nombre AS Rubro, r.IconoMapa,
                em.Nombre AS EmprendedorNombre, em.Apellido AS EmprendedorApellido,
                em.Teléfono AS Telefono, em.Correo
         FROM Emprendimiento e
         LEFT JOIN Rubro r ON r.idRubro = e.idRubro
         LEFT JOIN Emprendedor em ON em.idEmprendimiento = e.idEmprendimiento
         WHERE e.idEmprendimiento = ?;`,
        [idEmprendimiento]
    );
    return filas[0];
};

// Emprendimiento del usuario emprendedor logueado
export const modelIdEmprendimientoDeUsuario = async (idUsuario) => {
    const [filas] = await pool.query(
        `SELECT em.idEmprendimiento
         FROM Usuario u
         INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         WHERE u.idUsuario = ? AND u.TipoUsuario = 'Emprendedor' AND u.Activa = 1;`,
        [idUsuario]
    );
    return filas[0]?.idEmprendimiento;
};
