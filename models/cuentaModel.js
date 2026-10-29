import crypto from 'crypto';
import { pool } from '../config/db.js';

// Enlaces para crear o restablecer la contraseña (tabla EnlaceContrasena): el del emprendedor
// aprobado y el de "Olvidé mi contraseña" (cualquier usuario activo).
// El código del enlace es aleatorio (256 bits) y en la base solo se guarda su SHA-256:
// quien lea la base no puede armar un enlace válido.
const HORAS_VALIDEZ_ENLACE = 72;
export const HORAS_VALIDEZ_RECUPERACION = 1;

const hashCodigo = (codigo) => crypto.createHash('sha256').update(String(codigo)).digest('hex');

// Datos del emprendedor para armar el correo (solo cuentas de Emprendedor)
export const modelDatosCorreoActivacion = async (idUsuario) => {
    const [filas] = await pool.query(
        `SELECT u.idUsuario, u.Correo, em.Nombre, em.Apellido, e.Nombre AS NombreEmprendimiento
         FROM Usuario u
         INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         INNER JOIN Emprendimiento e ON e.idEmprendimiento = em.idEmprendimiento
         WHERE u.idUsuario = ? AND u.TipoUsuario = 'Emprendedor';`,
        [idUsuario]
    );
    return filas[0] || null;
};

// Cuenta activa con ese correo y el nombre de la persona, para "Olvidé mi contraseña"
export const modelDatosRecuperacion = async (correo) => {
    const [filas] = await pool.query(
        `SELECT u.idUsuario, u.Correo, COALESCE(em.Nombre, e.Nombre) AS Nombre, COALESCE(em.Apellido, e.Apellido) AS Apellido
         FROM Usuario u
         LEFT JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         LEFT JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         WHERE u.Correo = ? AND u.Activa = TRUE;`,
        [correo]
    );
    return filas[0] || null;
};

// Crea un enlace nuevo y anula los anteriores sin usar del mismo usuario (solo vale el último enviado).
// Devuelve el código, que va únicamente en el correo.
// recuperacion = true: pedido desde "Olvidé mi contraseña" (vence antes y se audita distinto)
export const modelCrearEnlaceContrasena = async (idUsuario, datosAuditoria, { recuperacion = false } = {}) => {
    const horas = recuperacion ? HORAS_VALIDEZ_RECUPERACION : HORAS_VALIDEZ_ENLACE;
    const codigo = crypto.randomBytes(32).toString('base64url');
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        await conexion.query('UPDATE EnlaceContrasena SET Usado = TRUE WHERE idUsuario = ? AND Usado = FALSE;', [idUsuario]);
        await conexion.query(
            `INSERT INTO EnlaceContrasena (idUsuario, TokenHash, Vence)
             VALUES (?, ?, NOW() + INTERVAL ${horas} HOUR);`,
            [idUsuario, hashCodigo(codigo)]
        );
        await conexion.query(
            `INSERT INTO Auditoria (idUsuario, Accion, Tabla_Afectada, idRegistroAfectado, Detalle, DireccionIP)
             VALUES (?, 'INSERT', 'EnlaceContrasena', ?, ?, ?);`,
            [datosAuditoria.idUsuario ?? null, idUsuario,
             recuperacion
                 ? `Se pidió restablecer la contraseña desde "Olvidé mi contraseña" (enlace enviado al correo de la cuenta, vence en ${horas} h).`
                 : `Se generó un enlace para crear la contraseña de la cuenta de emprendedor (vence en ${horas} h).`,
             datosAuditoria.ipCliente]
        );
        await conexion.commit();
        return codigo;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

// Enlace vigente (no usado y sin vencer) con los datos que muestra la página "Crear contraseña"
export const modelBuscarEnlaceVigente = async (codigo) => {
    const [filas] = await pool.query(
        `SELECT ec.idEnlace, ec.idUsuario, u.Correo, e.Nombre AS NombreEmprendimiento
         FROM EnlaceContrasena ec
         INNER JOIN Usuario u ON u.idUsuario = ec.idUsuario
         LEFT JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         LEFT JOIN Emprendimiento e ON e.idEmprendimiento = em.idEmprendimiento
         WHERE ec.TokenHash = ? AND ec.Usado = FALSE AND ec.Vence > NOW() AND u.Activa = TRUE;`,
        [hashCodigo(codigo)]
    );
    return filas[0] || null;
};

// Guarda la contraseña nueva y marca el enlace como usado, todo junto.
// Si dos pedidos llegan a la vez con el mismo enlace, solo el primero lo puede usar.
export const modelUsarEnlaceContrasena = async (codigo, contraseñaEncriptada, ipCliente) => {
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        const [enlaces] = await conexion.query(
            `SELECT idEnlace, idUsuario FROM EnlaceContrasena
             WHERE TokenHash = ? AND Usado = FALSE AND Vence > NOW() FOR UPDATE;`,
            [hashCodigo(codigo)]
        );
        const enlace = enlaces[0];
        if (!enlace) {
            await conexion.rollback();
            return null;
        }

        await conexion.query('UPDATE EnlaceContrasena SET Usado = TRUE WHERE idEnlace = ?;', [enlace.idEnlace]);
        // El trigger de Usuario registra el cambio de contraseña en Auditoria con quién y desde qué IP
        await conexion.query('SET @usuario_id = ?, @usuario_ip = ?;', [enlace.idUsuario, ipCliente]);
        await conexion.query('UPDATE Usuario SET Contraseña = ? WHERE idUsuario = ?;', [contraseñaEncriptada, enlace.idUsuario]);
        await conexion.commit();
        return enlace.idUsuario;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        await conexion.query('SET @usuario_id = NULL, @usuario_ip = NULL;').catch(() => {});
        conexion.release();
    }
};
