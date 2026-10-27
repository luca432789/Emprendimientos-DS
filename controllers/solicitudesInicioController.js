import { ModelIniciarRevisionSolicitud } from '../models/empleadoModel.js';
import {
    ModelListarRevisionesAsignadas,
    ModelObtenerSinExpediente,
    ModelAsignarExpediente,
    ModelResolverRevisionArea,
    ModelRegistrarEnvioMinistro,
    ModelRegistrarResolucionMinistro,
    ModelObtenerDepartamentosSinRevisar,
    ModelObtenerRubros,
    ModelRegistrarEmprendimientoHistorico
} from '../models/solicitudesInicioModel.js';
import fs from 'fs/promises';
import { guardarPdfEnUploads } from '../helpers/archivosPdf.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';
import { departamentosSantiago, coordenadasEnSantiago, mensajeFueraDeSantiago } from '../helpers/departamentos.js';

const responderErrorEtapaMinistro = (res, error, mensajeGenerico) => {
    if (['REVIEWER_NOT_ACTIVE', 'REVIEWER_ROLE_INVALID', 'REVIEW_NOT_ASSIGNED'].includes(error.code)) {
        return res.status(403).json({ error: error.message });
    }
    if (error.code === 'REVIEW_REQUEST_NOT_FOUND') {
        return res.status(404).json({ error: error.message });
    }
    if (error.code === 'RUBRO_NOT_FOUND') {
        return res.status(400).json({ error: error.message });
    }
    if ([
        'MINISTER_STAGE_INVALID', 'MINISTER_ALREADY_SENT', 'MINISTER_NOT_SENT', 'MINISTER_ALREADY_RESOLVED',
        'REVIEW_DATA_NOT_FOUND', 'EMPRENDIMIENTO_DUPLICADO', 'EMPRENDEDOR_DUPLICADO', 'EXPEDIENTE_DUPLICADO'
    ].includes(error.code)) {
        return res.status(409).json({ error: error.message });
    }
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe un registro con esos datos (Nro de Proyecto, DNI o correo).' });
    }

    console.error(mensajeGenerico, error);
    return res.status(500).json({ error: mensajeGenerico });
};

export const registrarEnvioMinistro = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    try {
        await ModelRegistrarEnvioMinistro(idSolicitud, idUsuario, obtenerIpCliente(req));
        return res.status(200).json({ mensaje: 'Se registró el envío de la solicitud al Ministro.' });
    } catch (error) {
        return responderErrorEtapaMinistro(res, error, 'No se pudo registrar el envío al Ministro.');
    }
};

export const registrarResolucionMinistro = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    const aprobacionMinistro = req.body.aprobacionMinistro;
    if (aprobacionMinistro !== 0 && aprobacionMinistro !== 1) {
        return res.status(400).json({ error: 'Selecciona si el Ministro aprobó o rechazó la solicitud.' });
    }

    let nroProyecto = null;
    let idRubro = null;
    if (aprobacionMinistro === 1) {
        nroProyecto = typeof req.body.nroProyecto === 'string' ? req.body.nroProyecto.trim() : '';
        if (!nroProyecto || nroProyecto.length > 50) {
            return res.status(400).json({ error: 'Ingresa el Nro de Proyecto (máximo 50 caracteres).' });
        }
        idRubro = Number(req.body.idRubro);
        if (!Number.isInteger(idRubro) || idRubro < 1) {
            return res.status(400).json({ error: 'Selecciona el rubro del emprendimiento.' });
        }
    }

    try {
        await ModelRegistrarResolucionMinistro(
            idSolicitud,
            idUsuario,
            aprobacionMinistro,
            obtenerIpCliente(req),
            nroProyecto,
            idRubro
        );
        return res.status(200).json({
            mensaje: aprobacionMinistro === 1
                ? `Se registró la aprobación del Ministro y se crearon el emprendimiento (Nro de Proyecto ${nroProyecto}), el emprendedor y su cuenta de usuario.`
                : 'Se registró el rechazo del Ministro.'
        });
    } catch (error) {
        return responderErrorEtapaMinistro(res, error, 'No se pudo registrar la resolución del Ministro.');
    }
};

export const obtenerRevisionesAsignadas = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const departamento = typeof req.query.departamento === 'string' ? req.query.departamento.trim() : '';
    if (departamento.length > 20) {
        return res.status(400).json({ error: 'El departamento excede la longitud permitida.' });
    }

    try {
        const resultado = await ModelListarRevisionesAsignadas(idUsuario, departamento || null);
        return res.status(200).json(resultado);
    } catch (error) {
        if (error.code === 'REVIEWER_NOT_ACTIVE' || error.code === 'REVIEWER_ROLE_INVALID') {
            return res.status(403).json({ error: error.message });
        }
        console.error('Error al obtener revisiones asignadas:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las revisiones asignadas.' });
    }
};

export const resolverRevisionArea = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    const aprobacionArea = req.body.aprobacionArea;
    if (aprobacionArea !== 0 && aprobacionArea !== 1) {
        return res.status(400).json({ error: 'Selecciona aprobar o rechazar la solicitud.' });
    }

    let latitud = null;
    let longitud = null;
    if (aprobacionArea === 1) {
        latitud = Number(req.body.latitud);
        longitud = Number(req.body.longitud);
        if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
            return res.status(400).json({ error: 'La latitud debe ser un número entre -90 y 90.' });
        }
        if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
            return res.status(400).json({ error: 'La longitud debe ser un número entre -180 y 180.' });
        }
        if (!coordenadasEnSantiago(latitud, longitud)) {
            return res.status(400).json({ error: mensajeFueraDeSantiago });
        }
    }

    try {
        await ModelResolverRevisionArea(
            idSolicitud,
            idUsuario,
            aprobacionArea,
            latitud,
            longitud,
            obtenerIpCliente(req)
        );

        return res.status(200).json({
            mensaje: aprobacionArea === 1
                ? 'El Área aprobó la solicitud y guardó sus coordenadas. Quedó pendiente la etapa del Ministro.'
                : 'El Área rechazó la solicitud y la revisión quedó finalizada.'
        });
    } catch (error) {
        if (error.code === 'REVIEWER_NOT_ACTIVE' || error.code === 'REVIEWER_ROLE_INVALID' || error.code === 'REVIEW_NOT_ASSIGNED') {
            return res.status(403).json({ error: error.message });
        }
        if (error.code === 'REVIEW_REQUEST_NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'REVIEW_ALREADY_RESOLVED') {
            return res.status(409).json({ error: error.message });
        }
        if (error.code === 'REVIEW_DATA_NOT_FOUND') {
            return res.status(409).json({ error: error.message });
        }
        if (error.code === 'ER_SIGNAL_EXCEPTION') {
            return res.status(409).json({
                error: 'La base de datos todavía bloquea los cambios de coordenadas. Ejecuta la migración de coordenadas de revisión del Área.'
            });
        }
        if (error.code === 'ER_SIGNAL_EXCEPTION') {
            return res.status(409).json({
                error: 'La base de datos aún no permite la actualización controlada de coordenadas. Ejecute la migración de revisión del Área.'
            });
        }

        console.error('Error al resolver revisión del Área:', error);
        return res.status(500).json({ error: 'No se pudo guardar la decisión del Área.' });
    }
};

export const iniciarRevisionArea = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }
    if (!['Empleado de Area', 'Administrador'].includes(req.usuarioLogueado.tipoUsuario)) {
        return res.status(403).json({ error: 'Solo empleados del Área y administradores pueden iniciar revisiones.' });
    }

    const idSolicitud = Number(req.params.id);
    const idEmpleadoCompañero = Number(req.body.idEmpleadoCompañero);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1 || !Number.isInteger(idEmpleadoCompañero) || idEmpleadoCompañero < 1) {
        return res.status(400).json({ error: 'La solicitud y el empleado compañero deben ser identificadores válidos.' });
    }

    try {
        const revisores = await ModelIniciarRevisionSolicitud(
            idSolicitud,
            idUsuario,
            idEmpleadoCompañero,
            obtenerIpCliente(req)
        );

        return res.status(200).json({
            mensaje: 'La revisión fue iniciada y ambos revisores quedaron asignados.',
            ...revisores
        });
    } catch (error) {
        if (error.code === 'INACTIVE_REVIEWER' || error.code === 'REVIEWER_ROLE_NOT_ALLOWED') {
            return res.status(403).json({ error: error.message });
        }
        if (error.code === 'INVALID_REVIEW_PARTNER') {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === 'REVIEW_REQUEST_NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'REVIEW_ALREADY_STARTED') {
            return res.status(409).json({ error: error.message });
        }

        console.error('Error al iniciar revisión de solicitud:', error);
        return res.status(500).json({ error: 'No se pudo iniciar la revisión.' });
    }
};

export const obtenerSinExpediente = async (req, res) => {
    try {
        const solicitudes = await ModelObtenerSinExpediente();
        res.json(solicitudes);
    } catch (error) {
        console.error("Error en obtenerSinExpediente:", error.message);
        res.status(500).json({ error: "Error interno al recuperar las solicitudes." });
    }
};

export const asignarExpedienteGED = async (req, res) => {
    const { id } = req.params;
    const { nroExpediente } = req.body;
    
    // Datos inyectados automáticamente por tu middleware de login
    const idUsuario = req.usuarioLogueado.idUsuario || req.usuarioLogueado.id; 
    const ipCliente = obtenerIpCliente(req);

    if (!nroExpediente) {
        return res.status(400).json({ error: "El número de expediente GED es obligatorio." });
    }

    try {
        
        const resultado = await ModelAsignarExpediente(id, nroExpediente, idUsuario, ipCliente);
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "La solicitud no existe." });
        }

        res.json({ mensaje: "Expediente asignado y registrado en auditoría con éxito." });
    } catch (error) {
        console.error("Error en asignarExpedienteGED:", error.message);
        res.status(500).json({ error: "Error interno al actualizar el expediente." });
    }
};

////////////////////////////////////////////////////////////
// Controlador para empleador area
import { ModelObtenerSolicitudesParaArea } from '../models/solicitudesInicioModel.js';

export const obtenerSolicitudesArea = async (req, res) => {
    try {
        // Como es un SELECT puro, recordá que no hace falta setear variables de auditoría @usuario_id
        const departamento = typeof req.query.departamento === 'string' ? req.query.departamento.trim() : '';
        if (departamento.length > 20) {
            return res.status(400).json({ error: 'El departamento excede la longitud permitida.' });
        }

        const [solicitudes, departamentos] = await Promise.all([
            ModelObtenerSolicitudesParaArea(departamento || null),
            ModelObtenerDepartamentosSinRevisar()
        ]);
        res.json({ solicitudes, departamentos });
    } catch (error) {
        console.error("Error en obtenerSolicitudesArea:", error.message);
        res.status(500).json({ error: "Error interno al recuperar las solicitudes para el Área Técnica." });
    }
};

export const obtenerRubros = async (req, res) => {
    try {
        res.json(await ModelObtenerRubros());
    } catch (error) {
        console.error('Error en obtenerRubros:', error.message);
        res.status(500).json({ error: 'No se pudieron cargar los rubros.' });
    }
};

////////////////////////////////////////////////////////////
// Carga histórica de emprendimientos antiguos ya aprobados (Empleado de Área / Administrador)
class ErrorCargaHistorica extends Error {}

const textoCarga = (valor, etiqueta, largoMaximo, obligatorio = true) => {
    const texto = typeof valor === 'string' ? valor.replace(/[\r\n]+/g, ' ').trim() : '';
    if (!texto) {
        if (obligatorio) throw new ErrorCargaHistorica(`Complete el campo "${etiqueta}".`);
        return null;
    }
    if (texto.length > largoMaximo) throw new ErrorCargaHistorica(`El campo "${etiqueta}" admite hasta ${largoMaximo} caracteres.`);
    return texto;
};

const hoyISO = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

const fechaCarga = (valor, etiqueta) => {
    const fecha = typeof valor === 'string' ? valor.trim() : '';
    const fechaUtc = new Date(`${fecha}T00:00:00Z`);
    const valida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(fechaUtc.getTime())
        && fechaUtc.toISOString().startsWith(fecha);
    if (!valida) throw new ErrorCargaHistorica(`Ingrese una fecha válida en "${etiqueta}".`);
    if (fecha > hoyISO()) throw new ErrorCargaHistorica(`La fecha "${etiqueta}" no puede ser posterior a hoy.`);
    return fecha;
};

const numeroOpcional = (valor, etiqueta, minimo, maximo) => {
    if (valor === null || valor === undefined || String(valor).trim() === '') return null;
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < minimo || numero > maximo) {
        throw new ErrorCargaHistorica(`"${etiqueta}" debe ser un número entre ${minimo} y ${maximo}.`);
    }
    return numero;
};

// Recibe el PDF como data URL base64 (igual que los formularios digitales) y devuelve sus bytes
const pdfCarga = (valor, etiqueta) => {
    const coincidencia = typeof valor === 'string' ? valor.match(/^data:application\/pdf;base64,/i) : null;
    if (!coincidencia) throw new ErrorCargaHistorica(`Adjunte el PDF de "${etiqueta}".`);
    const bytes = Buffer.from(valor.slice(coincidencia[0].length), 'base64');
    if (bytes.length > 10 * 1024 * 1024) throw new ErrorCargaHistorica(`El PDF de "${etiqueta}" no puede superar los 10 MB.`);
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw new ErrorCargaHistorica(`El archivo de "${etiqueta}" no es un PDF válido.`);
    return bytes;
};

const validarCargaHistorica = (cuerpo) => {
    const departamento = (valor, etiqueta) => {
        if (!departamentosSantiago.includes(valor)) throw new ErrorCargaHistorica(`Seleccione un departamento válido en "${etiqueta}".`);
        return valor;
    };

    const fechaRecibidoMesa = fechaCarga(cuerpo.fechaRecibidoMesa, 'Fecha de presentación de la solicitud');
    const fechaResolucionMin = fechaCarga(cuerpo.fechaResolucionMin, 'Fecha de resolución del Ministro');
    if (fechaResolucionMin < fechaRecibidoMesa) {
        throw new ErrorCargaHistorica('La resolución del Ministro no puede ser anterior a la presentación de la solicitud.');
    }

    const p = cuerpo.emprendedor || {};
    const correo = textoCarga(p.correo, 'Correo del emprendedor', 150).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new ErrorCargaHistorica('Ingrese un correo electrónico válido para el emprendedor.');
    const dni = textoCarga(p.dni, 'DNI del emprendedor', 15);
    if (!/^[A-Za-z0-9-]{4,15}$/.test(dni)) throw new ErrorCargaHistorica('El DNI o documento solo admite letras, números y guiones (4 a 15 caracteres).');
    const telefono = textoCarga(p.telefono, 'Teléfono del emprendedor', 25);
    if (!/^\d{6,25}$/.test(telefono)) throw new ErrorCargaHistorica('El teléfono del emprendedor solo puede contener números (mínimo 6).');

    const e = cuerpo.emprendimiento || {};
    const idRubro = Number(e.idRubro);
    if (!Number.isInteger(idRubro) || idRubro < 1) throw new ErrorCargaHistorica('Seleccione el rubro del emprendimiento.');
    const latitud = numeroOpcional(e.latitud, 'Latitud', -90, 90);
    const longitud = numeroOpcional(e.longitud, 'Longitud', -180, 180);
    if ((latitud === null) !== (longitud === null)) throw new ErrorCargaHistorica('Complete latitud y longitud juntas, o deje ambas vacías.');
    if (latitud !== null && !coordenadasEnSantiago(latitud, longitud)) throw new ErrorCargaHistorica(mensajeFueraDeSantiago);

    const a = cuerpo.ayuda || {};
    if (!['Subsidio', 'Credito'].includes(a.tipo)) throw new ErrorCargaHistorica('Elija Subsidio o Crédito como tipo de ayuda.');
    if (!['Aprobado', 'Rechazado', 'Pendiente'].includes(a.estado)) throw new ErrorCargaHistorica('Elija el estado de la ayuda.');
    const monto = Number(a.monto);
    if (!Number.isFinite(monto) || monto <= 0 || monto > 9999999999.99) throw new ErrorCargaHistorica('Ingrese un monto de la ayuda válido, mayor a 0.');
    const fechaRecibidoAyuda = fechaCarga(a.fechaRecibido, 'Fecha de presentación de la ayuda');
    if (fechaRecibidoAyuda < fechaRecibidoMesa) {
        throw new ErrorCargaHistorica('La presentación de la ayuda no puede ser anterior a la de la solicitud de inicio.');
    }
    let fechaResolucionAyuda = null;
    if (a.estado !== 'Pendiente') {
        fechaResolucionAyuda = fechaCarga(a.fechaResolucion, 'Fecha de resolución de la ayuda');
        if (fechaResolucionAyuda < fechaRecibidoAyuda) {
            throw new ErrorCargaHistorica('La resolución de la ayuda no puede ser anterior a su presentación.');
        }
    }

    return {
        nroExpediente: textoCarga(cuerpo.nroExpediente, 'Número de expediente', 50),
        fechaRecibidoMesa,
        fechaResolucionMin,
        bytesPdfSolicitud: pdfCarga(cuerpo.pdfSolicitud, 'Solicitud de inicio'),
        emprendedor: {
            nombre: textoCarga(p.nombre, 'Nombre del emprendedor', 40),
            apellido: textoCarga(p.apellido, 'Apellido del emprendedor', 40),
            dni,
            departamento: departamento(p.departamento, 'Departamento del emprendedor'),
            localidad: textoCarga(p.localidad, 'Localidad del emprendedor', 40),
            domicilio: textoCarga(p.domicilio, 'Domicilio del emprendedor', 512),
            telefono,
            correo
        },
        emprendimiento: {
            nombre: textoCarga(e.nombre, 'Nombre del emprendimiento', 50),
            nroProyecto: textoCarga(e.nroProyecto, 'Nro de Proyecto', 50),
            calle: textoCarga(e.calle, 'Calle del emprendimiento', 30),
            numeroCalle: textoCarga(e.numeroCalle, 'Número de calle', 6),
            barrio: textoCarga(e.barrio, 'Barrio', 50),
            departamento: departamento(e.departamento, 'Departamento del emprendimiento'),
            localidad: textoCarga(e.localidad, 'Localidad del emprendimiento', 40),
            enMarcha: e.enMarcha === true || e.enMarcha === 'true',
            actividadPrincipal: textoCarga(e.actividadPrincipal, 'Actividad principal', 400),
            latitud,
            longitud,
            idRubro
        },
        ayuda: {
            tipo: a.tipo,
            estado: a.estado,
            monto: Math.round(monto * 100) / 100,
            fechaRecibido: fechaRecibidoAyuda,
            fechaResolucion: fechaResolucionAyuda,
            mensajeResolucion: textoCarga(a.mensajeResolucion, 'Mensaje de resolución', 512, false),
            bytesPdf: pdfCarga(a.pdf, a.tipo === 'Subsidio' ? 'Formulario de Subsidio' : 'Formulario de Crédito')
        }
    };
};

// POST /api/solicitudes/carga-historica
export const registrarEmprendimientoHistorico = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }
    if (!['Empleado de Area', 'Administrador'].includes(req.usuarioLogueado.tipoUsuario)) {
        return res.status(403).json({ error: 'Solo empleados del Área y administradores pueden registrar emprendimientos.' });
    }

    let carga;
    try {
        carga = validarCargaHistorica(req.body || {});
    } catch (error) {
        if (error instanceof ErrorCargaHistorica) return res.status(400).json({ error: error.message });
        console.error('Error validando carga histórica:', error);
        return res.status(500).json({ error: 'No se pudo registrar el emprendimiento.' });
    }

    // Los PDF se guardan con la misma numeración que los formularios digitales; si la BD falla, se borran
    const archivosGuardados = [];
    try {
        const pdfSolicitud = await guardarPdfEnUploads('solicitudesinicio', 'SolicitudInicialFormIni', carga.bytesPdfSolicitud);
        archivosGuardados.push(pdfSolicitud.rutaArchivo);
        const pdfAyuda = carga.ayuda.tipo === 'Subsidio'
            ? await guardarPdfEnUploads('subsidios', 'SolicitudSubsidio', carga.ayuda.bytesPdf)
            : await guardarPdfEnUploads('creditos', 'SolicitudCredito', carga.ayuda.bytesPdf);
        archivosGuardados.push(pdfAyuda.rutaArchivo);

        const { idSolicitud, idEmprendimiento } = await ModelRegistrarEmprendimientoHistorico(
            idUsuario,
            obtenerIpCliente(req),
            {
                ...carga,
                direccionPdfSolicitud: pdfSolicitud.direccionWeb,
                ayuda: { ...carga.ayuda, direccionPdf: pdfAyuda.direccionWeb }
            }
        );

        return res.status(201).json({
            mensaje: `Se registró el emprendimiento "${carga.emprendimiento.nombre}" (Nro de Proyecto ${carga.emprendimiento.nroProyecto}) con su emprendedor, su cuenta de usuario, la solicitud de inicio y el ${carga.ayuda.tipo === 'Subsidio' ? 'subsidio' : 'crédito'}.`,
            idSolicitud,
            idEmprendimiento
        });
    } catch (error) {
        await Promise.all(archivosGuardados.map(ruta => fs.unlink(ruta).catch(() => {})));
        if (error.code === 'ER_BAD_FIELD_ERROR' && /CargaHistorica/.test(error.sqlMessage || '')) {
            return res.status(500).json({ error: 'Falta ejecutar la migración "Migracion Carga Historica.sql" en la base de datos.' });
        }
        return responderErrorEtapaMinistro(res, error, 'No se pudo registrar el emprendimiento.');
    }
};