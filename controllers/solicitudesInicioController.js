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
    ModelRegistrarEmprendimientoHistorico,
    ModelDatosCorreoSolicitud,
    ModelRechazarPorFaltaFormulario
} from '../models/solicitudesInicioModel.js';
import fs from 'fs/promises';
import { guardarPdfEnUploads } from '../helpers/archivosPdf.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';
import { enviarCorreoActivacion, textoResultadoCorreo } from './cuentaController.js';
import { departamentosSantiago, coordenadasEnSantiago, mensajeFueraDeSantiago } from '../helpers/departamentos.js';
import {
    enviarCorreo, escaparHtml, urlDelSitio, plantillaCorreo, cuadroTexto, avisoNuevaSolicitud, avisoNuevaSolicitudHtml, intentarCorreo, textoResultadoIntento
} from '../helpers/correo.js';

// ---------- Correos de la decisión del Área ----------
const ASUNTO_INICIO_APROBADO = 'Solicitud de Inicio de Emprendimiento - Aprobado';
const ASUNTO_INICIO_RECHAZO = 'Solicitud de Inicio de Emprendimiento - Rechazo';
const ASUNTO_RECHAZO_INACTIVIDAD = 'Solicitud de Inicio de Emprendimiento - Rechazo por inactividad';
const ASUNTO_ENVIO_MINISTRO = 'Solicitud de Emprendimiento - Última etapa de revisión';
const MENSAJE_RECHAZO_MINISTRO = 'Emprendimiento Rechazado por ministro';

// Día del rechazo, desde el que se cuentan los días para presentar una nueva solicitud
const fechaDelRechazo = (datos) => datos.FechaResolucionFinal || datos.FechaFinRev || new Date();

// Aprobada: el emprendedor sigue con el formulario de la ayuda que eligió (subsidio o crédito)
const enviarCorreoInicioAprobado = (req, datos) => {
    const esSubsidio = datos.EleccionAyuda === 'Subsidio';
    const formulario = esSubsidio ? 'Formulario de Subsidio' : 'Formulario de Crédito';
    const enlace = `${urlDelSitio(req)}/${esSubsidio ? 'formulario-Subsidio' : 'formulario-Credito'}`
        + `?expediente=${encodeURIComponent(datos.NroExpediente || '')}`;
    const recomendacion = 'Antes de completarlo, le recomendamos pedir presupuestos de los bienes que necesita para su proyecto '
        + '(maquinarias, herramientas, materia prima e insumos), ya que deberá cargarlos en el formulario y adjuntarlos.'
        // El crédito lleva la firma y la documentación del garante
        + (esSubsidio ? '' : ' Complételo junto a su garante: se necesita la firma de ambos y la documentación del garante '
            + '(fotocopia de DNI autenticada, constancia de CUIL, certificado de residencia, boleta de impuesto y su último recibo de sueldo).');
    const ingreso = 'Para ingresar use su Nº de expediente, su correo electrónico y su DNI, los mismos de su solicitud de inicio.';
    return enviarCorreo({
        para: datos.Correo,
        asunto: ASUNTO_INICIO_APROBADO,
        texto: [
            `Hola ${datos.Solicitante}:`,
            '',
            `Le informamos que la Solicitud de Inicio de su emprendimiento "${datos.Emprendimiento}" fue aprobada por el Área de Economía Social.`,
            `El siguiente paso es completar y enviar el ${formulario}.`,
            recomendacion,
            '',
            `Nº de expediente: ${datos.NroExpediente}`,
            `${formulario}: ${enlace}`,
            ingreso
        ].filter((linea, i, lineas) => linea !== '' || lineas[i - 1] !== '').join('\n'),
        html: plantillaCorreo('¡Su Solicitud de Inicio fue aprobada!', `
            <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
            <p>Le informamos que la Solicitud de Inicio de su emprendimiento <strong>"${escaparHtml(datos.Emprendimiento)}"</strong>
               fue aprobada por el Área de Economía Social. El siguiente paso es completar y enviar el <strong>${formulario}</strong>.</p>
            <p>${escaparHtml(recomendacion)}</p>
            <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
            <p style="text-align:center; margin:28px 0;">
                <a href="${escaparHtml(enlace)}" style="background:#2f4e78; color:#fff; padding:12px 26px; border-radius:30px; text-decoration:none; font-weight:bold;">Completar ${formulario}</a>
            </p>
            <p style="font-size:13px; color:#555;">${escaparHtml(ingreso)} Si el botón no funciona, copie esta dirección en el navegador:<br>
               <span style="word-break:break-all;">${escaparHtml(enlace)}</span></p>`)
    });
};

const enviarCorreoInicioRechazo = (datos) => enviarCorreo({
    para: datos.Correo,
    asunto: ASUNTO_INICIO_RECHAZO,
    texto: [
        `Hola ${datos.Solicitante}:`,
        '',
        `Le informamos que la Solicitud de Inicio de su emprendimiento "${datos.Emprendimiento}" fue rechazada por el siguiente motivo:`,
        '',
        datos.MotivoRechazo,
        '',
        `Nº de expediente: ${datos.NroExpediente}`,
        '',
        avisoNuevaSolicitud(fechaDelRechazo(datos))
    ].join('\n'),
    html: plantillaCorreo('Solicitud de Inicio rechazada', `
        <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
        <p>Le informamos que la Solicitud de Inicio de su emprendimiento <strong>"${escaparHtml(datos.Emprendimiento)}"</strong>
           fue rechazada por el siguiente motivo:</p>
        ${cuadroTexto(datos.MotivoRechazo)}
        <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
        ${avisoNuevaSolicitudHtml(fechaDelRechazo(datos))}`)
});

// El emprendedor nunca envió el formulario de subsidio / crédito: el texto lo escribió el empleado
const enviarCorreoRechazoFaltaFormulario = (datos) => enviarCorreo({
    para: datos.Correo,
    asunto: ASUNTO_RECHAZO_INACTIVIDAD,
    texto: [
        `Hola ${datos.Solicitante}:`,
        '',
        `Le informamos que la Solicitud de Inicio de su emprendimiento "${datos.Emprendimiento}" fue rechazada por inactividad:`,
        '',
        datos.MensajeResolucionFinal,
        '',
        `Nº de expediente: ${datos.NroExpediente}`,
        '',
        avisoNuevaSolicitud(fechaDelRechazo(datos))
    ].join('\n'),
    html: plantillaCorreo('Solicitud de Inicio rechazada por inactividad', `
        <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
        <p>Le informamos que la Solicitud de Inicio de su emprendimiento <strong>"${escaparHtml(datos.Emprendimiento)}"</strong>
           fue rechazada por inactividad:</p>
        ${cuadroTexto(datos.MensajeResolucionFinal)}
        <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
        ${avisoNuevaSolicitudHtml(fechaDelRechazo(datos))}`)
});

// Rechazo del Ministro: el texto lo escribió el empleado al registrar la resolución
const enviarCorreoRechazoMinistro = (datos) => enviarCorreo({
    para: datos.Correo,
    asunto: `Su emprendimiento "${datos.Emprendimiento}" fue rechazado`,
    texto: [
        `Hola ${datos.Solicitante}:`,
        '',
        datos.MotivoRechazo,
        '',
        `Nº de expediente: ${datos.NroExpediente}`,
        '',
        avisoNuevaSolicitud(fechaDelRechazo(datos))
    ].join('\n'),
    html: plantillaCorreo('Su emprendimiento fue rechazado', `
        <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
        <p>Emprendimiento: <strong>"${escaparHtml(datos.Emprendimiento)}"</strong></p>
        ${cuadroTexto(datos.MotivoRechazo)}
        <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
        ${avisoNuevaSolicitudHtml(fechaDelRechazo(datos))}`)
});

// Enviada al Ministro: el emprendedor queda avisado de que solo falta la decisión final
const enviarCorreoEnvioMinistro = (datos) => {
    const ayuda = datos.EleccionAyuda === 'Credito' ? 'Crédito' : 'Subsidio';
    return enviarCorreo({
        para: datos.Correo,
        asunto: ASUNTO_ENVIO_MINISTRO,
        texto: [
            `Hola ${datos.Solicitante}:`,
            '',
            `Le informamos que la solicitud de su emprendimiento "${datos.Emprendimiento}" del PLAN PROVINCIAL SANTIAGO PRODUCTIVO `
                + 'se encuentra en la última etapa de revisión para su decisión final.',
            `El Área de Economía Social aprobó su Solicitud de Inicio y su Formulario de ${ayuda}, y el expediente fue enviado a su revisión final.`,
            'Le avisaremos por este medio cuando se registre la resolución. No es necesario que realice ningún trámite mientras tanto.',
            '',
            `Nº de expediente: ${datos.NroExpediente}`
        ].join('\n'),
        html: plantillaCorreo('Su solicitud está en la última etapa de revisión', `
            <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
            <p>Le informamos que la solicitud de su emprendimiento <strong>"${escaparHtml(datos.Emprendimiento)}"</strong> del
               <strong>PLAN PROVINCIAL SANTIAGO PRODUCTIVO</strong> se encuentra en la <strong>última etapa de revisión</strong> para su decisión final.</p>
            <p>El Área de Economía Social aprobó su Solicitud de Inicio y su Formulario de ${ayuda}, y el expediente fue enviado a su revisión final.</p>
            <p>Le avisaremos por este medio cuando se registre la resolución. No es necesario que realice ningún trámite mientras tanto.</p>
            <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>`)
    });
};

// Correo que corresponde al estado ya guardado de la solicitud (null si no corresponde ninguno).
// La aprobación del Ministro tiene su propio correo (crear la contraseña), con su propio reenvío.
const correoDeLaSolicitud = (req, datos) => {
    if (!datos) return null;
    if (datos.MensajeResolucionFinal === MENSAJE_RECHAZO_MINISTRO) return () => enviarCorreoRechazoMinistro(datos);
    if (Number(datos.EnvioMinistro) === 2 && datos.MensajeResolucionFinal) return () => enviarCorreoRechazoFaltaFormulario(datos);
    if (Number(datos.EnvioMinistro) === 1 && datos.AprobacionMinistro === null) return () => enviarCorreoEnvioMinistro(datos);
    if (Number(datos.EstadoRevisionArea) !== 2 || datos.AprobacionArea === null) return null;
    if (Number(datos.AprobacionArea) === 0) return () => enviarCorreoInicioRechazo(datos);
    if (Number(datos.EnvioMinistro) === 0 && !datos.MensajeResolucionFinal) return () => enviarCorreoInicioAprobado(req, datos);
    return null;
};

const FALTA_MIGRACION_RESOLUCION = 'Falta ejecutar "Actualizacion resolucion final 2026-11-08.sql" en la base de datos.';

// Motivo escrito por el empleado: sin espacios de más, de 10 a 512 caracteres
const motivoEmpleado = (valor) => {
    const texto = typeof valor === 'string' ? valor.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '';
    return texto.length >= 10 && texto.length <= 512 ? texto : null;
};

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
        'MINISTER_STAGE_INVALID', 'MINISTER_ALREADY_SENT', 'AYUDA_NOT_APPROVED', 'MINISTER_NOT_SENT', 'MINISTER_ALREADY_RESOLVED',
        'REVIEW_DATA_NOT_FOUND', 'AYUDA_FORM_EXISTS', 'EMPRENDIMIENTO_DUPLICADO', 'EMPRENDEDOR_DUPLICADO', 'EXPEDIENTE_DUPLICADO'
    ].includes(error.code)) {
        return res.status(409).json({ error: error.message });
    }
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe un registro con esos datos (Nro de Proyecto, DNI o correo).' });
    }
    if (error.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({ error: FALTA_MIGRACION_RESOLUCION });
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
        // El envío ya quedó registrado aunque falle el correo (se puede reintentar desde el panel)
        const datos = await ModelDatosCorreoSolicitud(idSolicitud);
        const correo = await intentarCorreo(() => enviarCorreoEnvioMinistro(datos), datos.Correo);
        return res.status(200).json({ mensaje: 'Se registró el envío de la solicitud al Ministro.' + textoResultadoIntento(correo), ...correo });
    } catch (error) {
        return responderErrorEtapaMinistro(res, error, 'No se pudo registrar el envío al Ministro.');
    }
};

// PUT /api/solicitudes/:id/rechazo-falta-formulario -> el emprendedor nunca envió el formulario de subsidio / crédito
export const rechazarPorFaltaFormulario = async (req, res) => {
    const idUsuario = req.usuarioLogueado?.idUsuario;
    if (!idUsuario) {
        return res.status(401).json({ error: 'No se encontró el usuario autenticado.' });
    }

    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    const mensaje = motivoEmpleado(req.body.mensaje);
    if (!mensaje) {
        return res.status(400).json({ error: 'Escriba el mensaje del rechazo (de 10 a 512 caracteres): se le enviará al emprendedor.' });
    }

    try {
        await ModelRechazarPorFaltaFormulario(idSolicitud, idUsuario, obtenerIpCliente(req), mensaje);
        const datos = await ModelDatosCorreoSolicitud(idSolicitud);
        const correo = await intentarCorreo(() => enviarCorreoRechazoFaltaFormulario(datos), datos.Correo);
        return res.status(200).json({
            mensaje: 'La solicitud fue rechazada por falta de formulario y quedó finalizada.' + textoResultadoIntento(correo),
            ...correo
        });
    } catch (error) {
        return responderErrorEtapaMinistro(res, error, 'No se pudo registrar el rechazo por falta de formulario.');
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

    // Rechazo: el texto que escribió el empleado se le envía al emprendedor
    const motivoRechazo = aprobacionMinistro === 0 ? motivoEmpleado(req.body.motivoRechazo) : null;
    if (aprobacionMinistro === 0 && !motivoRechazo) {
        return res.status(400).json({ error: 'Escriba el mensaje del rechazo (de 10 a 512 caracteres): se le enviará al emprendedor.' });
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
        const { idUsuarioEmprendedor } = await ModelRegistrarResolucionMinistro(
            idSolicitud,
            idUsuario,
            aprobacionMinistro,
            obtenerIpCliente(req),
            nroProyecto,
            idRubro,
            motivoRechazo
        );
        if (aprobacionMinistro !== 1) {
            const datos = await ModelDatosCorreoSolicitud(idSolicitud);
            const correo = await intentarCorreo(() => enviarCorreoRechazoMinistro(datos), datos.Correo);
            return res.status(200).json({ mensaje: 'Se registró el rechazo del Ministro.' + textoResultadoIntento(correo), ...correo });
        }

        // Aprobado: se le envía al emprendedor el correo con el enlace para crear su contraseña
        const correo = await enviarCorreoActivacion(req, idUsuarioEmprendedor);
        return res.status(200).json({
            mensaje: `Se registró la aprobación del Ministro y se crearon el emprendimiento (Nro de Proyecto ${nroProyecto}), el emprendedor y su cuenta de usuario.`
                + textoResultadoCorreo(correo),
            correoEnviado: correo.enviado,
            idUsuarioEmprendedor
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

    const motivoRechazo = aprobacionArea === 0 ? motivoEmpleado(req.body.motivoRechazo) : null;
    if (aprobacionArea === 0 && !motivoRechazo) {
        return res.status(400).json({ error: 'Escriba el motivo del rechazo (de 10 a 512 caracteres): se le enviará al emprendedor.' });
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
            obtenerIpCliente(req),
            motivoRechazo
        );

        // Correo al emprendedor: aprobada -> completar el formulario de subsidio / crédito; rechazada -> motivo
        const datos = await ModelDatosCorreoSolicitud(idSolicitud);
        const correo = await intentarCorreo(correoDeLaSolicitud(req, datos), datos.Correo);
        const ayuda = datos.EleccionAyuda === 'Subsidio' ? 'subsidio' : 'crédito';
        return res.status(200).json({
            mensaje: (aprobacionArea === 1
                ? `El Área aprobó la solicitud y guardó sus coordenadas. Ahora el emprendedor debe enviar el formulario de ${ayuda}.`
                : 'El Área rechazó la solicitud y la revisión quedó finalizada.') + textoResultadoIntento(correo),
            ...correo
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
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({ error: FALTA_MIGRACION_RESOLUCION });
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

// POST /api/solicitudes/:id/reenviar-correo -> vuelve a mandar el último correo de la solicitud
// (decisión del Área, envío al Ministro, rechazo por falta de formulario o rechazo del Ministro)
export const reenviarCorreoSolicitud = async (req, res) => {
    if (!['Empleado de Area', 'Administrador'].includes(req.usuarioLogueado?.tipoUsuario)) {
        return res.status(403).json({ error: 'Solo empleados del Área y administradores pueden reenviar este correo.' });
    }
    const idSolicitud = Number(req.params.id);
    if (!Number.isInteger(idSolicitud) || idSolicitud < 1) {
        return res.status(400).json({ error: 'El identificador de solicitud no es válido.' });
    }

    try {
        const datos = await ModelDatosCorreoSolicitud(idSolicitud);
        if (!datos) return res.status(404).json({ error: 'No se encontró la solicitud.' });
        const enviar = correoDeLaSolicitud(req, datos);
        if (!enviar) {
            return res.status(409).json({ error: 'No hay un correo para reenviar en el estado actual de la solicitud.' });
        }

        const correo = await intentarCorreo(enviar, datos.Correo);
        const texto = correo.correoEnviado ? `Se envió el correo a ${correo.correo}.` : `No se pudo enviar el correo: ${correo.motivoCorreo}`;
        return res.status(correo.correoEnviado ? 200 : 502).json({ ...correo, mensaje: texto, error: correo.correoEnviado ? undefined : texto });
    } catch (error) {
        console.error('Error al reenviar el correo de la solicitud:', error);
        return res.status(500).json({ error: 'No se pudo reenviar el correo.' });
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
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({ error: 'Falta ejecutar "Actualizacion limpieza de columnas 2026-11-08.sql" en la base de datos.' });
        }
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

        const { idSolicitud, idEmprendimiento, idUsuarioEmprendedor } = await ModelRegistrarEmprendimientoHistorico(
            idUsuario,
            obtenerIpCliente(req),
            {
                ...carga,
                direccionPdfSolicitud: pdfSolicitud.direccionWeb,
                ayuda: { ...carga.ayuda, direccionPdf: pdfAyuda.direccionWeb }
            }
        );

        // El emprendedor recibe el correo con el enlace para crear su contraseña
        const correo = await enviarCorreoActivacion(req, idUsuarioEmprendedor);
        return res.status(201).json({
            mensaje: `Se registró el emprendimiento "${carga.emprendimiento.nombre}" (Nro de Proyecto ${carga.emprendimiento.nroProyecto}) con su emprendedor, su cuenta de usuario, la solicitud de inicio y el ${carga.ayuda.tipo === 'Subsidio' ? 'subsidio' : 'crédito'}.`
                + textoResultadoCorreo(correo),
            correoEnviado: correo.enviado,
            idUsuarioEmprendedor,
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