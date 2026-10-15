import { pool } from '../config/db.js';

// Ejecuta las consultas en una conexión dedicada con las variables de auditoría cargadas,
// así los triggers registran quién hizo la acción (idUsuario null = formulario público)
const ejecutarConAuditoria = async (datosAuditoria, consultas) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        await conexion.query('SET @usuario_id = ?;', [datosAuditoria.idUsuario ?? null]);
        await conexion.query('SET @usuario_ip = ?;', [datosAuditoria.ipCliente]);

        const resultado = await consultas(conexion);

        await conexion.commit();
        return resultado;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        await conexion.query('SET @usuario_id = NULL, @usuario_ip = NULL;').catch(() => {});
        conexion.release();
    }
};

// Formulario de Inicio: crea la SolicitudInicio y sus datos (tabla inmutable)
export const modelRegistrarSolicitudInicio = async (direccionPDF, datos, datosAuditoria) => {
    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [solicitud] = await conexion.query(
            'INSERT INTO SolicitudInicio (DireccionPDF) VALUES (?);',
            [direccionPDF]
        );

        await conexion.query(
            `INSERT INTO DatosSolicitudInicio
                (PersonaNombre, PersonaApellido, PersonaDNI, PersonaDepartamento, PersonaLocalidad,
                 PersonaDomicilio, PersonaTeléfono, PersonaCorreo, EmprendimientoCalle, EmprendimientoNroCalle,
                 EmprendimientoBarrio, EmprendimientoDepto, EmprendimientoMarcha, EmprendimientoRubro,
                 EleccionAyuda, idSolicitudInicio)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                datos.nombre, datos.apellido, datos.dniCuit, datos.departamentoPersona, datos.localidad,
                datos.domicilio, datos.telefono, datos.correo, datos.calleEmprendimiento, datos.numeroEmprendimiento,
                datos.barrio, datos.departamento, datos.enMarcha === 'Sí', datos.rubro,
                datos.tipoFinanciamiento, solicitud.insertId
            ]
        );

        return solicitud.insertId;
    });
};

// Busca la solicitud de inicio vinculada al usuario emprendedor logueado
export const modelObtenerSolicitudDeUsuario = async (idUsuario) => {
    const [filas] = await pool.query(
        `SELECT e.idSolicitudInicio
         FROM Usuario u
         INNER JOIN Emprendedor em ON em.idEmprendedor = u.idEmprendedor
         INNER JOIN Emprendimiento e ON e.idEmprendimiento = em.idEmprendimiento
         WHERE u.idUsuario = ? AND u.TipoUsuario = 'Emprendedor' AND u.Activa = 1;`,
        [idUsuario]
    );
    return filas[0]?.idSolicitudInicio;
};

const tablasAyuda = {
    Subsidio: { tabla: 'Subsidio', id: 'idSubsidio', path: 'PathFormularioSub' },
    Credito: { tabla: 'Credito', id: 'idCredito', path: 'PathFormularioCredito' }
};

// Indica si ya hay un pedido del mismo tipo sin resolver para esa solicitud
export const modelTienePedidoPendiente = async (tipo, idSolicitudInicio) => {
    const { tabla } = tablasAyuda[tipo];
    const [filas] = await pool.query(
        `SELECT 1 FROM ${tabla} WHERE idSolicitudInicio = ? AND Aprobado IS NULL LIMIT 1;`,
        [idSolicitudInicio]
    );
    return filas.length > 0;
};

// Subsidio / Credito: registra el pedido con la ruta del PDF generado
export const modelRegistrarPedidoAyuda = async (tipo, pathFormulario, monto, idSolicitudInicio, datosAuditoria) => {
    const { tabla, path } = tablasAyuda[tipo];

    return ejecutarConAuditoria(datosAuditoria, async (conexion) => {
        const [resultado] = await conexion.query(
            `INSERT INTO ${tabla} (${path}, monto, FechaRecibido, idSolicitudInicio)
             VALUES (?, ?, CURRENT_DATE(), ?);`,
            [pathFormulario, monto, idSolicitudInicio]
        );
        return resultado.insertId;
    });
};
