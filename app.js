/// Configuración inicial del sistema
import 'dotenv/config'; // 👈 ESTA LÍNEA DEBE SER LA PRIMERA DEL ARCHIVO
// console.log("REVISANDO CLAVE JWT:", process.env.JWT_SECRET);

// Librerías del sistema
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importamos los enrutadores externos
import etiquetasRouter from './routes/etiquetasRoutes.js';
import loginRouter from './routes/loginRoutes.js';
import solicitudesInicioRouter from './routes/solicitudesInicioRoutes.js';
import empleadoRouter from './routes/empleadoRoutes.js';
import mapaRouter from './routes/mapaRoutes.js';
import formulariosDigitalesRouter from './routes/formulariosDigitalesRoutes.js';
import notificacionesRouter from './routes/notificacionesRoutes.js';
import publicacionesRouter from './routes/publicacionesRoutes.js';
import auditoriaRouter from './routes/auditoriaRoutes.js';
import productosRouter from './routes/productosRoutes.js';
import perfilRouter from './routes/perfilRoutes.js';

// Inicializamos la app express
const app = express();

app.set('trust proxy', true); // para captura de ip

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares de control (CORS y procesamiento de JSON)
app.use(cors()); 
app.use(express.json({ limit: '25mb' })); // los formularios digitales envían adjuntos en base64 (hasta 16 MB)

app.use(express.static(path.resolve('./public')));  // Servirá tus HTMLs, CSS e Imágenes automáticos

// Servir los PDFs guardados físicamente en tu servidor
app.use('/uploads', express.static('uploads'));

// Configuración de las rutas API
app.use('/api', etiquetasRouter); // Todo lo de etiquetas colgará de /api/etiquetas
app.use('/api', loginRouter);      // Todo lo de login colgará de /api/login
app.use('/api', solicitudesInicioRouter);
app.use('/api', empleadoRouter);
app.use('/api', mapaRouter);       // Todo lo de mapa colgará de /api/emprendimientos mapa
app.use('/api', formulariosDigitalesRouter); // Generación de PDFs de formularios (/api/formularios-digitales)
app.use('/api', notificacionesRouter); // Campanita del navbar (/api/notificaciones)
app.use('/api', publicacionesRouter); // Publicaciones del emprendedor y moderación (/api/publicaciones)
app.use('/api', auditoriaRouter);
app.use('/api', productosRouter); // Productos del emprendedor (/api/productos)
app.use('/api', perfilRouter);    // Perfil del emprendimiento: público y del dueño (/api/perfil)

// ==========================================
// VISTAS FRONTEND (RUTAS DE PÁGINAS)
// ==========================================

// 1. Ruta para la página de Inicio (raíz)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Ruta para la vista del Mapa (Renderizada con EJS)
app.get('/mapa', (req, res) => {
    res.render('mapa');
});

// Redirección de compatibilidad si entran mediante /mapa.html
app.get('/mapa.html', (req, res) => {
    res.redirect('/mapa');
});

// 3. Ruta para Formularios
app.get('/formularios', (req, res) => {
    console.log("ENTRÉ A /FORMULARIOS"); // 👈 DEBUG
    res.sendFile(path.join(__dirname, 'public', 'Camino FORMULARIOS.html'));
});

// 3b. Ruta para Publicaciones (todas las publicaciones aprobadas de los emprendimientos)
app.get('/publicaciones', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Camino PUBLICACIONES.html'));
});

// 4. Ruta para Contactos
app.get('/contactos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Camino CONTACTOS.html'));
});

// 5. Ruta para Inicio de sesión
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Camino LOG IN.html'));
});

// ==========================================

// Encendido del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});