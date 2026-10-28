import nodemailer from 'nodemailer';

// Envío de correos automáticos (ej: enlace para que el emprendedor aprobado cree su contraseña).
// Se configura en el .env:
//   SMTP_USER=cuenta@gmail.com          cuenta que envía
//   SMTP_PASS=xxxx xxxx xxxx xxxx       "contraseña de aplicación" de Google (no la contraseña normal)
//   SMTP_HOST / SMTP_PORT               opcionales: por defecto Gmail (smtp.gmail.com, 465)
//   CORREO_REMITENTE                    opcional: nombre que ve quien recibe el correo
let transporte = null;

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

export const enviarCorreo = async ({ para, asunto, html, texto }) => {
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
        html
    });
};
