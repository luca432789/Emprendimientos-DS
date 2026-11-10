import {
    TIPOS_AYUDA,
    PARTES_REENVIO_CREDITO,
    modelAyudasSinRevisar,
    modelAyudasEnRevision,
    modelIniciarRevisionAyuda,
    modelSolicitarReenvioAyuda,
    modelResolverAyuda,
    modelDatosCorreoAyuda
} from '../models/ayudasModel.js';
import {
    enviarCorreo, escaparHtml, urlDelSitio, plantillaCorreo, cuadroTexto, avisoNuevaSolicitud, avisoNuevaSolicitudHtml, intentarCorreo, textoResultadoIntento
} from '../helpers/correo.js';
import { obtenerIpCliente } from '../helpers/ipCliente.js';

const ROLES_AREA = ['Empleado de Area', 'Administrador'];

// Subsidio y Crédito se revisan igual; cambian los textos, el formulario del link y cómo queda la solicitud al rechazar
const AYUDAS = {
    subsidio: {
        nombre: 'subsidio', Nombre: 'Subsidio', plural: 'subsidios', formulario: 'formulario-Subsidio',
        seccion: 'En Revisión: Solicitudes de Subsidio', rechazo: 'Rechazado por Subsidio'
    },
    credito: {
        nombre: 'crédito', Nombre: 'Crédito', plural: 'créditos', formulario: 'formulario-Credito',
        seccion: 'En Revisión: Solicitudes de Créditos', rechazo: 'Rechazado por Crédito'
    }
};

const esDelArea = (req, res) => {
    if (ROLES_AREA.includes(req.usuarioLogueado?.tipoUsuario)) return true;
    res.status(403).json({ error: 'Solo empleados del Área y administradores pueden revisar subsidios y créditos.' });
    return false;
};

// tipo de la ruta (subsidio | credito); si no es válido responde 400
const tipoDeRuta = (req, res) => {
    const { tipo } = req.params;
    if (TIPOS_AYUDA.includes(tipo)) return tipo;
    res.status(400).json({ error: 'Tipo de solicitud inválido.' });
    return null;
};

// GET /api/ayudas/:tipo/sin-revisar   (tipo: subsidio | credito)
// Lista para el panel del área: pedidos de subsidio o crédito sin revisar.
export const obtenerAyudasSinRevisar = async (req, res) => {
    if (!ROLES_AREA.includes(req.usuarioLogueado?.tipoUsuario)) {
        return res.status(403).json({ error: 'No tiene permiso para ver estas solicitudes.' });
    }
    const tipo = tipoDeRuta(req, res);
    if (!tipo) return;

    try {
        res.json(await modelAyudasSinRevisar(tipo));
    } catch (error) {
        console.error(`Error al obtener ${tipo}s sin revisar:`, error);
        res.status(500).json({ error: 'No se pudieron obtener las solicitudes.' });
    }
};

// GET /api/ayudas/:tipo/en-revision -> compartida por todo el Área
export const obtenerAyudasEnRevision = async (req, res) => {
    if (!esDelArea(req, res)) return;
    const tipo = tipoDeRuta(req, res);
    if (!tipo) return;
    try {
        res.json(await modelAyudasEnRevision(tipo));
    } catch (error) {
        responderErrorAyuda(res, error, `No se pudieron obtener los ${AYUDAS[tipo].plural} en revisión.`);
    }
};

// ---------- Correos al emprendedor ----------

// Crédito: qué parte del formulario tiene que volver a enviar (el resto se conserva)
const PARTES_CREDITO = {
    Completo: {
        texto: 'Debe completar y enviar nuevamente el formulario de crédito completo (hojas 1 a 7, presupuestos y documentación del garante). Complételo junto a su garante: se necesita la firma de ambos.',
        boton: 'Completar formulario de crédito'
    },
    Titular: {
        texto: 'Solo debe volver a completar la parte del titular: hojas 1 a 6 y los presupuestos. La hoja y la documentación de su garante se conservan: no hace falta que el garante vuelva a firmar.',
        boton: 'Completar la parte del titular'
    },
    Garante: {
        texto: 'Solo debe volver a completar la parte del garante: la hoja 7 con sus datos, su firma y su documentación. Lo que completó usted (hojas 1 a 6 y presupuestos) se conserva. Complétela junto a su garante.',
        boton: 'Completar la parte del garante'
    }
};

const enviarCorreoReenvio = (req, tipo, datos) => {
    const { nombre, Nombre, formulario } = AYUDAS[tipo];
    const parte = tipo === 'credito' ? PARTES_CREDITO[datos.ParteReenvio] || PARTES_CREDITO.Completo : null;
    const enlace = `${urlDelSitio(req)}/${formulario}?expediente=${encodeURIComponent(datos.NroExpediente || '')}`;
    return enviarCorreo({
        para: datos.Correo,
        asunto: `Solicitud de ${Nombre} de Emprendimiento - Reenvío`,
        texto: [
            `Hola ${datos.Solicitante}:`,
            '',
            `El Área de Economía Social revisó el formulario de ${nombre} de su emprendimiento "${datos.Emprendimiento}" y le solicita que lo complete y envíe nuevamente teniendo en cuenta lo siguiente:`,
            '',
            datos.MensajeSolicitudReenvio,
            ...(parte ? ['', parte.texto] : []),
            '',
            `Nº de expediente: ${datos.NroExpediente}`,
            `Formulario de ${nombre}: ${enlace}`,
            '',
            'Para ingresar use su Nº de expediente, su correo electrónico y su DNI, los mismos de su solicitud de inicio.'
        ].join('\n'),
        html: plantillaCorreo(`Reenvío del formulario de ${nombre}`, `
            <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
            <p>El Área de Economía Social revisó el formulario de ${nombre} de su emprendimiento
               <strong>"${escaparHtml(datos.Emprendimiento)}"</strong> y le solicita que lo complete y envíe nuevamente
               teniendo en cuenta lo siguiente:</p>
            ${cuadroTexto(datos.MensajeSolicitudReenvio)}
            ${parte ? `<p><strong>${escaparHtml(parte.texto)}</strong></p>` : ''}
            <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
            <p style="text-align:center; margin:28px 0;">
                <a href="${escaparHtml(enlace)}" style="background:#2f4e78; color:#fff; padding:12px 26px; border-radius:30px; text-decoration:none; font-weight:bold;">${parte ? parte.boton : `Completar formulario de ${nombre}`}</a>
            </p>
            <p style="font-size:13px; color:#555;">Para ingresar use su Nº de expediente, su correo electrónico y su DNI, los mismos de su solicitud de inicio.
               Si el botón no funciona, copie esta dirección en el navegador:<br>
               <span style="word-break:break-all;">${escaparHtml(enlace)}</span></p>`)
    });
};

const enviarCorreoRechazo = (tipo, datos) => {
    const { nombre, Nombre } = AYUDAS[tipo];
    return enviarCorreo({
        para: datos.Correo,
        asunto: `Solicitud de ${Nombre} de Emprendimiento - Rechazo`,
        texto: [
            `Hola ${datos.Solicitante}:`,
            '',
            `Le informamos que la solicitud de ${nombre} de su emprendimiento "${datos.Emprendimiento}" fue rechazada por el siguiente motivo:`,
            '',
            datos.MotivoRechazo,
            '',
            `Nº de expediente: ${datos.NroExpediente}`,
            '',
            avisoNuevaSolicitud(datos.FechaResolucion || new Date())
        ].join('\n'),
        html: plantillaCorreo(`Solicitud de ${nombre} rechazada`, `
            <p>Hola ${escaparHtml(datos.Solicitante)}:</p>
            <p>Le informamos que la solicitud de ${nombre} de su emprendimiento <strong>"${escaparHtml(datos.Emprendimiento)}"</strong>
               fue rechazada por el siguiente motivo:</p>
            ${cuadroTexto(datos.MotivoRechazo)}
            <p>Nº de expediente: <strong>${escaparHtml(datos.NroExpediente)}</strong></p>
            ${avisoNuevaSolicitudHtml(datos.FechaResolucion || new Date())}`)
    });
};


// ---------- Acciones de la revisión ----------

const idDeRuta = (req, res, tipo) => {
    const id = Number(req.params.id);
    if (Number.isInteger(id) && id > 0) return id;
    res.status(400).json({ error: `El identificador del ${AYUDAS[tipo].nombre} no es válido.` });
    return null;
};

// Tipo e id de la ruta, solo para el Área (null si ya se respondió con un error)
const pedidoDeRuta = (req, res) => {
    if (!esDelArea(req, res)) return null;
    const tipo = tipoDeRuta(req, res);
    if (!tipo) return null;
    const id = idDeRuta(req, res, tipo);
    return id ? { tipo, id, ...AYUDAS[tipo] } : null;
};

const auditoriaDe = (req) => ({ idUsuario: req.usuarioLogueado.idUsuario, ipCliente: obtenerIpCliente(req) });

// Texto escrito por el empleado (va al correo y a la base): sin espacios de más, de 10 a 512 caracteres
const textoEmpleado = (valor) => {
    const texto = typeof valor === 'string' ? valor.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '';
    return texto.length >= 10 && texto.length <= 512 ? texto : null;
};

const responderErrorAyuda = (res, error, mensajeGenerico) => {
    const estados = {
        NO_ENCONTRADO: 404, YA_RESUELTO: 409, NO_VIGENTE: 409, YA_COMENZADO: 409, SIN_COMENZAR: 409, EMPLEADO_INACTIVO: 403, SIN_GARANTE: 409
    };
    if (estados[error.codigo]) return res.status(estados[error.codigo]).json({ error: error.message });
    if (error.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({ error: 'Falta ejecutar "Actualizacion revision de creditos 2026-11-09.sql" en la base de datos.' });
    }
    console.error(mensajeGenerico, error);
    return res.status(500).json({ error: mensajeGenerico });
};

// PUT /api/ayudas/:tipo/:id/iniciar-revision -> pasa a "En Revisión"
export const iniciarRevisionAyuda = async (req, res) => {
    const pedido = pedidoDeRuta(req, res);
    if (!pedido) return;
    const { tipo, id, nombre, seccion } = pedido;
    try {
        await modelIniciarRevisionAyuda(tipo, id, auditoriaDe(req));
        res.json({ mensaje: `La revisión del ${nombre} #${id} comenzó. Ahora está en "${seccion}", disponible para todo el Área.` });
    } catch (error) {
        responderErrorAyuda(res, error, `No se pudo comenzar la revisión del ${nombre}.`);
    }
};

// POST /api/ayudas/:tipo/:id/solicitar-reenvio { mensaje, parte } -> habilita el reenvío y avisa al emprendedor.
// parte (solo crédito): 'Completo' | 'Titular' | 'Garante'
export const solicitarReenvioAyuda = async (req, res) => {
    const pedido = pedidoDeRuta(req, res);
    if (!pedido) return;
    const { tipo, id, nombre } = pedido;
    const mensaje = textoEmpleado(req.body?.mensaje);
    if (!mensaje) return res.status(400).json({ error: 'Escriba qué le solicita al emprendedor (de 10 a 512 caracteres).' });
    const parte = tipo === 'credito' ? req.body?.parte : null;
    if (tipo === 'credito' && !PARTES_REENVIO_CREDITO.includes(parte)) {
        return res.status(400).json({ error: 'Elija qué parte del formulario de crédito debe reenviar: completo, solo el titular o solo el garante.' });
    }

    try {
        const datos = await modelSolicitarReenvioAyuda(tipo, id, mensaje, parte, auditoriaDe(req));
        const correo = await intentarCorreo(() => enviarCorreoReenvio(req, tipo, datos), datos.Correo);
        res.json({
            mensaje: `Se registró el pedido de reenvío del ${nombre} #${id}: el emprendedor ya puede volver a enviar el formulario.${textoResultadoIntento(correo)}`,
            ...correo
        });
    } catch (error) {
        responderErrorAyuda(res, error, 'No se pudo solicitar el reenvío del formulario.');
    }
};

// PUT /api/ayudas/:tipo/:id/resolver { aprobado: 1 | 0, motivo } -> quien decide queda como idEmpleadoRevisor
export const resolverAyuda = async (req, res) => {
    const pedido = pedidoDeRuta(req, res);
    if (!pedido) return;
    const { tipo, id, nombre, rechazo } = pedido;
    const aprobado = req.body?.aprobado;
    if (aprobado !== 0 && aprobado !== 1) return res.status(400).json({ error: `Elija aprobar o rechazar el ${nombre}.` });
    const motivo = aprobado === 0 ? textoEmpleado(req.body?.motivo) : null;
    if (aprobado === 0 && !motivo) return res.status(400).json({ error: 'Escriba el motivo del rechazo (de 10 a 512 caracteres).' });

    try {
        const datos = await modelResolverAyuda(tipo, id, aprobado, motivo, auditoriaDe(req));
        if (aprobado === 1) {
            return res.json({ mensaje: `El ${nombre} #${id} fue aprobado. La solicitud de inicio ya se puede enviar al Ministro desde "En Revisión: Solicitudes de Inicio".` });
        }
        const correo = await intentarCorreo(() => enviarCorreoRechazo(tipo, datos), datos.Correo);
        res.json({
            mensaje: `El ${nombre} #${id} fue rechazado y la solicitud de inicio quedó finalizada ("${rechazo}").${textoResultadoIntento(correo)}`,
            ...correo
        });
    } catch (error) {
        responderErrorAyuda(res, error, `No se pudo registrar la decisión sobre el ${nombre}.`);
    }
};

// POST /api/ayudas/:tipo/:id/reenviar-correo -> vuelve a mandar el correo pendiente (reenvío o rechazo)
export const reenviarCorreoAyuda = async (req, res) => {
    const pedido = pedidoDeRuta(req, res);
    if (!pedido) return;
    const { tipo, id, nombre } = pedido;
    try {
        const datos = await modelDatosCorreoAyuda(tipo, id);
        if (!datos) return res.status(404).json({ error: `No se encontró el ${nombre}.` });

        let enviar;
        if (datos.Aprobado !== null && Number(datos.Aprobado) === 0) enviar = () => enviarCorreoRechazo(tipo, datos);
        else if (datos.Aprobado === null && Number(datos.ReenvioSolicitado) === 1) enviar = () => enviarCorreoReenvio(req, tipo, datos);
        else return res.status(409).json({ error: `Este ${nombre} no tiene ningún correo pendiente para enviar.` });

        const correo = await intentarCorreo(enviar, datos.Correo);
        res.status(correo.correoEnviado ? 200 : 502).json({
            ...correo,
            mensaje: correo.correoEnviado ? `Se envió el correo a ${correo.correo}.` : `No se pudo enviar el correo: ${correo.motivoCorreo}`,
            error: correo.correoEnviado ? undefined : `No se pudo enviar el correo: ${correo.motivoCorreo}`
        });
    } catch (error) {
        responderErrorAyuda(res, error, 'No se pudo reenviar el correo.');
    }
};
