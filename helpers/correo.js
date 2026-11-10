import nodemailer from 'nodemailer';

// Envío de correos automáticos (ej: enlace para que el emprendedor aprobado cree su contraseña).
// Se configura en el .env:
//   SMTP_USER=cuenta@gmail.com          cuenta que envía
//   SMTP_PASS=xxxx xxxx xxxx xxxx       "contraseña de aplicación" de Google (no la contraseña normal)
//   SMTP_HOST / SMTP_PORT               opcionales: por defecto Gmail (smtp.gmail.com, 465)
//   CORREO_REMITENTE                    opcional: nombre que ve quien recibe el correo
let transporte = null;

// Para meter textos escritos por usuarios dentro del HTML del correo
export const escaparHtml = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Dirección del sitio para los enlaces: APP_URL del .env (ej. la de Render) o la del pedido actual
export const urlDelSitio = (req) => (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

export const correoConfigurado = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const obtenerTransporte = () => {
    if (!transporte) {
        const puerto = Number(process.env.SMTP_PORT) || 465;
        transporte = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: puerto,
            secure: puerto === 465, // 465 usa TLS directo; 587 lo activa después (STARTTLS)
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            connectionTimeout: 15000
        });
    }
    return transporte;
};

// Marco de los correos al emprendedor (título, subtítulo del sitio y el contenido)
export const plantillaCorreo = (titulo, contenidoHtml) => `
    <div style="font-family:Arial,Helvetica,sans-serif; max-width:560px; margin:0 auto; color:#1f2933;">
        <h2 style="color:#2f4e78; margin-bottom:4px;">${titulo}</h2>
        <p style="color:#555; margin-top:0;">El Camino de los Emprendedores · Ministerio de Desarrollo Social</p>
        ${contenidoHtml}
    </div>`;

// Texto escrito por un empleado (motivo, pedido), destacado y respetando sus saltos de línea
export const cuadroTexto = (texto) => `<p style="white-space:pre-line; background:#f1f5f9; border-left:4px solid #2f4e78; padding:12px 14px;">${escaparHtml(texto)}</p>`;

// Tras un rechazo, el emprendedor puede presentar una nueva solicitud de inicio pasados estos días
export const DIAS_ESPERA_NUEVA_SOLICITUD = 7;
export const avisoNuevaSolicitud = (desde = new Date()) => {
    const fecha = new Date(desde);
    fecha.setDate(fecha.getDate() + DIAS_ESPERA_NUEVA_SOLICITUD);
    return `Podrá volver a presentar una nueva Solicitud de Inicio pasados ${DIAS_ESPERA_NUEVA_SOLICITUD} días de este rechazo, `
        + `a partir del ${fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}.`;
};

// El mismo aviso, destacado dentro del HTML del correo
export const avisoNuevaSolicitudHtml = (desde = new Date()) =>
    `<p style="background:#fff4e5; border-left:4px solid #d35400; padding:12px 14px;"><strong>${escaparHtml(avisoNuevaSolicitud(desde))}</strong></p>`;

// El cambio ya quedó guardado aunque falle el correo: devuelve el resultado para avisar en el panel y ofrecer reintentarlo
export const intentarCorreo = async (enviar, para) => {
    try {
        await enviar();
        return { correoEnviado: true, correo: para };
    } catch (error) {
        console.error('No se pudo enviar el correo:', error.message);
        return {
            correoEnviado: false,
            correo: para,
            motivoCorreo: error.code === 'CORREO_NO_CONFIGURADO'
                ? 'El envío de correos no está configurado en el servidor.'
                : 'El servidor de correo no aceptó el envío.'
        };
    }
};

export const textoResultadoIntento = (resultado) => resultado.correoEnviado
    ? ` Se envió el correo a ${resultado.correo}.`
    : ` ATENCIÓN: no se pudo enviar el correo a ${resultado.correo} (${resultado.motivoCorreo}) Puede reintentarlo.`;

// adjuntos (opcional): [{ filename, content: Buffer, contentType }]
export const enviarCorreo = async ({ para, asunto, html, texto, adjuntos }) => {
    if (!correoConfigurado()) {
        const error = new Error('El envío de correos no está configurado (faltan SMTP_USER y SMTP_PASS en el .env).');
        error.code = 'CORREO_NO_CONFIGURADO';
        throw error;
    }
    const remitente = process.env.CORREO_REMITENTE || 'El Camino de los Emprendedores';
    await obtenerTransporte().sendMail({
        from: `"${remitente.replace(/"/g, '')}" <${process.env.SMTP_USER}>`,
        to: para,
        subject: asunto,
        text: texto,
        html,
        ...(adjuntos?.length ? { attachments: adjuntos } : {})
    });
};
