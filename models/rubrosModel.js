import { pool } from '../config/db.js';
import { conTransaccion } from './facturasModel.js';

// Rubro (idRubro, Nombre, IconoMapa). IconoMapa vacío ('') = sin icono: el mapa usa el pin básico de ubicación.

// Lista pública (sugerencias del rubro en el Formulario de Inicio)
export const modelListarNombresRubros = async () => {
    const [filas] = await pool.query('SELECT idRubro, Nombre FROM Rubro ORDER BY Nombre;');
    return filas;
};

// Lista para Administración de Rubros, de a porPagina: con su icono y cuántos emprendimientos lo usan.
// Si la página pedida ya no existe (por ejemplo, la última quedó vacía) se devuelve la última.
export const modelListarRubros = async (pagina, porPagina) => {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM Rubro;');
    const totalPaginas = Math.ceil(total / porPagina);
    const paginaFinal = Math.max(1, Math.min(pagina, totalPaginas));
    const [rubros] = await pool.query(
        `SELECT r.idRubro, r.Nombre, r.IconoMapa, COUNT(e.idEmprendimiento) AS Emprendimientos
         FROM Rubro r
         LEFT JOIN Emprendimiento e ON e.idRubro = r.idRubro
         GROUP BY r.idRubro, r.Nombre, r.IconoMapa
         ORDER BY r.Nombre
         LIMIT ? OFFSET ?;`,
        [porPagina, (paginaFinal - 1) * porPagina]
    );
    return { rubros, pagina: paginaFinal, totalPaginas, totalRegistros: total };
};

export const modelObtenerRubro = async (idRubro, conexion = pool) => {
    const [[fila]] = await conexion.query('SELECT idRubro, Nombre, IconoMapa FROM Rubro WHERE idRubro = ?;', [idRubro]);
    return fila || null;
};

// El icono se guarda después (su archivo lleva el id del rubro): guardarIcono(idRubro) devuelve su ruta web o ''
export const modelCrearRubro = (nombre, guardarIcono, auditoria) => conTransaccion(auditoria, async (conexion) => {
    const [resultado] = await conexion.query('INSERT INTO Rubro (Nombre, IconoMapa) VALUES (?, \'\');', [nombre]);
    const icono = await guardarIcono(resultado.insertId);
    if (icono) await conexion.query('UPDATE Rubro SET IconoMapa = ? WHERE idRubro = ?;', [icono, resultado.insertId]);
    return modelObtenerRubro(resultado.insertId, conexion);
});

// icono: undefined = no cambia; '' = se quita; ruta web = el nuevo. Devuelve el rubro anterior (para borrar su icono)
export const modelEditarRubro = (idRubro, nombre, icono, auditoria) => conTransaccion(auditoria, async (conexion) => {
    const [[anterior]] = await conexion.query('SELECT idRubro, Nombre, IconoMapa FROM Rubro WHERE idRubro = ? FOR UPDATE;', [idRubro]);
    if (!anterior) return null;
    await conexion.query('UPDATE Rubro SET Nombre = ?, IconoMapa = ? WHERE idRubro = ?;',
        [nombre, icono === undefined ? anterior.IconoMapa : icono, idRubro]);
    return { anterior, actual: await modelObtenerRubro(idRubro, conexion) };
});
