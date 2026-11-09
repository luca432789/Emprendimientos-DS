import {
    TIPOS_AYUDA,
    modelAyudasSinRevisar,
    modelSubsidiosEnRevision,
    modelIniciarRevisionSubsidio,
    modelSolicitarReenvioSubsidio,
    modelResolverSubsidio,
    modelDatosCorreoSubsidio
} from '../models/ayudasModel.js';
import {
    enviarCorreo, escaparHtml, urlDelSitio, plantillaCorreo, cuadroTexto, avisoNuevaSolicitud, avisoNuevaSolicitudHtml, intentarCorreo, textoResultadoIntento
} from '../helpers/correo.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

const ROLES_AREA = ['Empleado de Area', 'Administrador'];

const esDelArea = (req, res) => {
    if (ROLES_AREA.includes(req.usuarioLogueado?.tipoUsuario)) return true;
    res.status(403).json({ error: 'Solo empleados del Área y administradores pueden revisar subsidios.' });
    return false;
};

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

// GET /api/ayudas/subsidio/en-revision -> compartida por todo el Área
export const obtenerSubsidiosEnRevision = async (req, res) => {
    if (!esDelArea(req, res)) return;
    try {
        res.json(await modelSubsidiosEnRevision());
    } catch (error) {
        console.error('Error al obtener subsidios en revisión:', error);
        res.status(500).json({ error: 'No se pudieron obtener los subsidios en revisión.' });
    }
};

// ---------- Correos al emprendedor ----------

const ASUNTO_REENVIO = 'Solicitud de Subsidio de Emprendimiento - Reenvío';
const ASUNTO_RECHAZO = 'Solicitud de Subsidio de Emprendimiento - Rechazo';

const enviarCorreoReenvio = (req, datos) => {
    const enlace = `${urlDelSitio(req)}/formulario-Subsidio?expediente=${encodeURIComponent(datos.NroExpediente || '')}`;
    return enviarCorreo({
        para: datos.Correo,
        asunto: ASUNTO_REENVIO,
        texto: [
            `Hola ${datos.Solicitante}:`,
            '',
            `El Área de Economía Social revisó el formulario de subsidio de su emprendimiento "${datos.Emprendimiento}" y le solicita que lo complete y envíe nuevamente teniendo en cuenta lo siguiente:`,
            '',
            datos.MensajeSolicitudReenvio,
            '',
            `Nº de expediente: ${datos.NroExpediente}`,
            `Formulario de subsidio: ${enlace}`,
            '',
            'Para ingresar use su Nº de expediente, su correo electrónico y su DNI, los mismos de su solicitud de inicio.'
        ].join('\n'),
        html: plantillaCorreo('Reenvío del formulario de subsidio', `
            <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
            <p>El Área de Economía Social revisó el formulario de subsidio de su emprendimiento
               <strong>"${escaparHtml(datos.Emprendimiento)}"</strong> y le solicita que lo complete y envíe nuevamente
               teniendo en cuenta lo siguiente:</p>
            ${cuadroTexto(datos.MensajeSolicitudReenvio)}
            <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
            <p style="text-align:center; margin:28px 0;">
                <a href="${escaparHtml(enlace)}" style="background:#2f4e78; color:#fff; padding:12px 26px; border-radius:30px; text-decoration:none; font-weight:bold;">Completar formulario de subsidio</a>
            </p>
            <p style="font-size:13px; color:#555;">Para ingresar use su Nº de expediente, su correo electrónico y su DNI, los mismos de su solicitud de inicio.
               Si el botón no funciona, copie esta dirección en el navegador:<br>
               <span style="word-break:break-all;">${escaparHtml(enlace)}</span></p>`)
    });
};

const enviarCorreoRechazo = (datos) => enviarCorreo({
    para: datos.Correo,
    asunto: ASUNTO_RECHAZO,
    texto: [
        `Hola ${datos.Solicitante}:`,
        '',
        `Le informamos que la solicitud de subsidio de su emprendimiento "${datos.Emprendimiento}" fue rechazada por el siguiente motivo:`,
        '',
        datos.MotivoRechazo,
        '',
        `Nº de expediente: ${datos.NroExpediente}`,
        '',
        avisoNuevaSolicitud(datos.FechaResolucion || new Date())
    ].join('\n'),
    html: plantillaCorreo('Solicitud de subsidio rechazada', `
        <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
        <p>Le informamos que la solicitud de subsidio de su emprendimiento <strong>"${escaparHtml(datos.Emprendimiento)}"</strong>
           fue rechazada por el siguiente motivo:</p>
        ${cuadroTexto(datos.MotivoRechazo)}
        <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
        ${avisoNuevaSolicitudHtml(datos.FechaResolucion || new Date())}`)
});


// ---------- Acciones de la revisión ----------

const idDeRuta = (req, res) => {
    const id = Number(req.params.id);
    if (Number.isInteger(id) && id > 0) return id;
    res.status(400).json({ error: 'El identificador del subsidio no es válido.' });
    return null;
};

const auditoriaDe = (req) => ({ idUsuario: req.usuarioLogueado.idUsuario, ipCliente: obtenerIpCliente(req) });

// Texto escrito por el empleado (va al correo y a la base): sin espacios de más, de 10 a 512 caracteres
const textoEmpleado = (valor) => {
    const texto = typeof valor === 'string' ? valor.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '';
    return texto.length >= 10 && texto.length <= 512 ? texto : null;
};

const responderErrorSubsidio = (res, error, mensajeGenerico) => {
    const estados = {
        NO_ENCONTRADO: 404, YA_RESUELTO: 409, NO_VIGENTE: 409, YA_COMENZADO: 409, SIN_COMENZAR: 409, EMPLEADO_INACTIVO: 403
    };
    if (estados[error.codigo]) return res.status(estados[error.codigo]).json({ error: error.message });
    if (error.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({ error: 'Falta ejecutar "Actualizacion revision de subsidios 2026-11-07.sql" en la base de datos.' });
    }
    console.error(mensajeGenerico, error);
    return res.status(500).json({ error: mensajeGenerico });
};

// PUT /api/ayudas/subsidio/:id/iniciar-revision -> pasa a "En Revisión"
export const iniciarRevisionSubsidio = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    try {
        await modelIniciarRevisionSubsidio(id, auditoriaDe(req));
        res.json({ mensaje: `La revisión del subsidio #${id} comenzó. Ahora está en "En Revisión: Solicitudes de Subsidio", disponible para todo el Área.` });
    } catch (error) {
        responderErrorSubsidio(res, error, 'No se pudo comenzar la revisión del subsidio.');
    }
};

// POST /api/ayudas/subsidio/:id/solicitar-reenvio { mensaje } -> habilita el reenvío y avisa al emprendedor
export const solicitarReenvioSubsidio = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    const mensaje = textoEmpleado(req.body?.mensaje);
    if (!mensaje) return res.status(400).json({ error: 'Escriba qué le solicita al emprendedor (de 10 a 512 caracteres).' });

    try {
        const datos = await modelSolicitarReenvioSubsidio(id, mensaje, auditoriaDe(req));
        const correo = await intentarCorreo(() => enviarCorreoReenvio(req, datos), datos.Correo);
        res.json({
            mensaje: `Se registró el pedido de reenvío del subsidio #${id}: el emprendedor ya puede volver a enviar el formulario.${textoResultadoIntento(correo)}`,
            ...correo
        });
    } catch (error) {
        responderErrorSubsidio(res, error, 'No se pudo solicitar el reenvío del formulario.');
    }
};

// PUT /api/ayudas/subsidio/:id/resolver { aprobado: 1 | 0, motivo } -> quien decide queda como idEmpleadoRevisor
export const resolverSubsidio = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    const aprobado = req.body?.aprobado;
    if (aprobado !== 0 && aprobado !== 1) return res.status(400).json({ error: 'Elija aprobar o rechazar el subsidio.' });
    const motivo = aprobado === 0 ? textoEmpleado(req.body?.motivo) : null;
    if (aprobado === 0 && !motivo) return res.status(400).json({ error: 'Escriba el motivo del rechazo (de 10 a 512 caracteres).' });

    try {
        const datos = await modelResolverSubsidio(id, aprobado, motivo, auditoriaDe(req));
        if (aprobado === 1) {
            return res.json({ mensaje: `El subsidio #${id} fue aprobado. La solicitud de inicio ya se puede enviar al Ministro desde "En Revisión: Solicitudes de Inicio".` });
        }
        const correo = await intentarCorreo(() => enviarCorreoRechazo(datos), datos.Correo);
        res.json({
            mensaje: `El subsidio #${id} fue rechazado y la solicitud de inicio quedó finalizada ("Rechazado por Subsidio").${textoResultadoIntento(correo)}`,
            ...correo
        });
    } catch (error) {
        responderErrorSubsidio(res, error, 'No se pudo registrar la decisión sobre el subsidio.');
    }
};

// POST /api/ayudas/subsidio/:id/reenviar-correo -> vuelve a mandar el correo pendiente (reenvío o rechazo)
export const reenviarCorreoSubsidio = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const id = idDeRuta(req, res);
    if (!id) return;
    try {
        const datos = await modelDatosCorreoSubsidio(id);
        if (!datos) return res.status(404).json({ error: 'No se encontró el subsidio.' });

        let enviar;
        if (datos.Aprobado !== null && Number(datos.Aprobado) === 0) enviar = () => enviarCorreoRechazo(datos);
        else if (datos.Aprobado === null && Number(datos.ReenvioSolicitado) === 1) enviar = () => enviarCorreoReenvio(req, datos);
        else return res.status(409).json({ error: 'Este subsidio no tiene ningún correo pendiente para enviar.' });

        const correo = await intentarCorreo(enviar, datos.Correo);
        res.status(correo.correoEnviado ? 200 : 502).json({
            ...correo,
            mensaje: correo.correoEnviado ? `Se envió el correo a ${correo.correo}.` : `No se pudo enviar el correo: ${correo.motivoCorreo}`,
            error: correo.correoEnviado ? undefined : `No se pudo enviar el correo: ${correo.motivoCorreo}`
        });
    } catch (error) {
        responderErrorSubsidio(res, error, 'No se pudo reenviar el correo.');
    }
};
