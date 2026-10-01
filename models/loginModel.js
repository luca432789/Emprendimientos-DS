// models/usuarioModel.js
import { pool } from '../config/db.js';

// 🔍 MODELO: Buscar un usuario web por Correo (Para el Login y Duplicados)
export const modelObtenerUsuarioPorCorreo = async (correo) => {
    const querySQL = 'SELECT idUsuario, Correo, Contraseña, TipoUsuario, Activa FROM Usuario WHERE Correo = ?';
    const [usuarios] = await pool.query(querySQL, [correo]);
    return usuarios[0] || null; // Devuelve el usuario encontrado o null si no existe
};

// 🔍 MODELO: Verificar si existe la persona física en Empleado o Emprendedor
export const modelVerificarPersonaFisica = async (tablaBusqueda, columnaId, correo) => {
    const columnas = tablaBusqueda === 'empleado' ? `${columnaId}, Cargo` : columnaId;
    const sql = `SELECT ${columnas} FROM ${tablaBusqueda} WHERE Correo = ?`;
    const [personas] = await pool.query(sql, [correo]);
    return personas[0] || null;
};

// 📥 MODELO: Insertar un nuevo usuario web y registrar su sesión de auditoría
export const modelInsertarUsuarioWeb = async (datos, datosAuditoria) => {
    // Definimos las variables de sesión para los triggers de auditoría de MySQL
    await pool.query("SET @usuario_id = ?;", [datosAuditoria.idAuditor]);
    await pool.query("SET @usuario_ip = ?;", [datosAuditoria.ipCliente]);

    const sqlInsertar = `
        INSERT INTO Usuario (Correo, Contraseña, TipoUsuario, idEmprendedor, idEmpleado) 
        VALUES (?, ?, ?, ?, ?)
    `;
    
    const [resultado] = await pool.query(sqlInsertar, [
        datos.correo, 
        datos.passwordEncriptada, 
        datos.tipoUsuario, 
        datos.idEmprendedorFK, 
        datos.idEmpleadoFK
    ]);
    
    return resultado;
};

export const modelListarUsuariosAdministracion = async () => {
    const [filas] = await pool.query(`
        SELECT
            u.idUsuario,
            u.Correo,
            u.TipoUsuario,
            u.Activa,
            COALESCE(
                CONCAT_WS(' ', e.Nombre, e.Apellido),
                CONCAT_WS(' ', empr.Nombre, empr.Apellido),
                'Sin vínculo'
            ) AS Persona
        FROM Usuario u
        LEFT JOIN Empleado e ON e.idEmpleado = u.idEmpleado
        LEFT JOIN Emprendedor empr ON empr.idEmprendedor = u.idEmprendedor
        ORDER BY u.Correo
    `);

    return filas;
};

// 📝 MODELO: Registrar Auditoría del Login (Ya que no se genera por Trigger al no ser un INSERT/UPDATE común de tabla)
export const modelRegistrarAuditoriaLogin = async (idUsuario, ipCliente) => {
    await pool.query("SET @usuario_id = ?;", [idUsuario]);
    await pool.query("SET @usuario_ip = ?;", [ipCliente]);

    const sqlAuditoria = `
        INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, Detalle, DireccionIP) 
        VALUES (?, 'LOGIN', 'Ninguna', 'Inicio de sesión exitoso con generación de token seguro de 5 min.', ?)
    `;
    await pool.query(sqlAuditoria, [idUsuario, ipCliente]);
};