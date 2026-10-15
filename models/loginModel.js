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

const expresionPersonaUsuario = `COALESCE(
    NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(e.Nombre), ''), NULLIF(TRIM(e.Apellido), ''))), ''),
    NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(empr.Nombre), ''), NULLIF(TRIM(empr.Apellido), ''))), ''),
    NULLIF(TRIM(u.Correo), ''),
    'Sin vínculo'
)`;

const construirFiltrosUsuarios = (filtros) => {
    const condiciones = [];
    const parametros = [];

    if (filtros.tipoUsuario) {
        condiciones.push('u.TipoUsuario = ?');
        parametros.push(filtros.tipoUsuario);
    }
    if (filtros.activa !== null) {
        condiciones.push('u.Activa = ?');
        parametros.push(filtros.activa);
    }
    if (filtros.buscar) {
        condiciones.push(`(
            u.Correo LIKE ?
            OR e.Nombre LIKE ?
            OR e.Apellido LIKE ?
            OR CONCAT_WS(' ', e.Nombre, e.Apellido) LIKE ?
            OR empr.Nombre LIKE ?
            OR empr.Apellido LIKE ?
            OR CONCAT_WS(' ', empr.Nombre, empr.Apellido) LIKE ?
        )`);
        const termino = `%${filtros.buscar}%`;
        parametros.push(termino, termino, termino, termino, termino, termino, termino);
    }

    return {
        sql: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
        parametros
    };
};

export const modelContarUsuariosAdministracion = async (filtros = {}) => {
    const condiciones = construirFiltrosUsuarios(filtros);
    const [filas] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM Usuario u
         LEFT JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         LEFT JOIN Emprendedor empr ON empr.idEmprendedor = u.idEmprendedor
         ${condiciones.sql}`,
        condiciones.parametros
    );

    return Number(filas[0].total);
};

export const modelListarUsuariosAdministracion = async (filtros = {}, limite = 10, offset = 0) => {
    const condiciones = construirFiltrosUsuarios(filtros);
    const orden = filtros.orden === 'desc' ? 'DESC' : 'ASC';
    const [filas] = await pool.query(
        `SELECT
            u.idUsuario,
            u.Correo,
            u.TipoUsuario,
            u.Activa,
            u.idEmpleado,
            u.idEmprendedor,
            e.Cargo AS CargoEmpleado,
            ${expresionPersonaUsuario} AS Persona
         FROM Usuario u
         LEFT JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         LEFT JOIN Emprendedor empr ON empr.idEmprendedor = u.idEmprendedor
         ${condiciones.sql}
         ORDER BY LOWER(Persona) ${orden}, LOWER(u.Correo) ASC, u.idUsuario ASC
         LIMIT ? OFFSET ?`,
        [...condiciones.parametros, limite, offset]
    );

    return filas;
};

export const modelActualizarUsuarioAdministracion = async (idUsuario, cambios, datosAuditoria) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);

        const [filas] = await conexion.query(
            `SELECT
                u.idUsuario,
                u.Correo,
                u.TipoUsuario,
                u.Activa,
                u.idEmpleado,
                u.idEmprendedor,
                e.Cargo AS CargoEmpleado
             FROM Usuario u
             LEFT JOIN Empleado e ON e.idEmpleado = u.idEmpleado
             WHERE u.idUsuario = ?
             FOR UPDATE`,
            [idUsuario]
        );
        const usuario = filas[0];

        if (!usuario) {
            const error = new Error('No se encontró el usuario seleccionado.');
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        let cambioRealizado = false;

        if (Object.hasOwn(cambios, 'correo') && cambios.correo !== usuario.Correo) {
            if (usuario.idEmpleado) {
                await conexion.query('UPDATE Empleado SET Correo = ? WHERE idEmpleado = ?', [cambios.correo, usuario.idEmpleado]);
            } else if (usuario.idEmprendedor) {
                await conexion.query('UPDATE Emprendedor SET Correo = ? WHERE idEmprendedor = ?', [cambios.correo, usuario.idEmprendedor]);
            }

            await conexion.query('UPDATE Usuario SET Correo = ? WHERE idUsuario = ?', [cambios.correo, idUsuario]);
            cambioRealizado = true;
        }

        if (Object.hasOwn(cambios, 'tipoUsuario')) {
            if (!usuario.idEmpleado) {
                const error = new Error('El tipo de una cuenta de emprendedor no puede cambiarse a un rol de empleado sin un registro de empleado asociado.');
                error.code = 'TYPE_CHANGE_REQUIRES_EMPLOYEE_RECORD';
                throw error;
            }

            const cargoNuevo = cambios.cargo;
            if (usuario.CargoEmpleado !== cargoNuevo) {
                await conexion.query('UPDATE Empleado SET Cargo = ? WHERE idEmpleado = ?', [cargoNuevo, usuario.idEmpleado]);
                cambioRealizado = true;
            }
            if (usuario.TipoUsuario !== cambios.tipoUsuario) {
                await conexion.query('UPDATE Usuario SET TipoUsuario = ? WHERE idUsuario = ?', [cambios.tipoUsuario, idUsuario]);
                cambioRealizado = true;
            }
        }

        if (Object.hasOwn(cambios, 'activa') && Number(usuario.Activa) !== cambios.activa) {
            await conexion.query('UPDATE Usuario SET Activa = ? WHERE idUsuario = ?', [cambios.activa, idUsuario]);
            cambioRealizado = true;
        }

        await conexion.commit();
        return { cambioRealizado };
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
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