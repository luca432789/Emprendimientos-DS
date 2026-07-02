// Configuracion inicial del sistema
import 'dotenv/config'; // 👈 ESTA LÍNEA DEBE SER LA PRIMERA DEL ARCHIVO
console.log("REVISANDO CLAVE JWT:", process.env.JWT_SECRET);

// Librerias del sistema
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importamos los enrutadores externos
import etiquetasRouter from './routes/etiquetasRoutes.js';
import loginRouter from './routes/loginRoutes.js';
import mapaRouter from './routes/mapaRoutes.js';

// inicializamos la app express
const app = express();

// Middlewares de control (CORS y procesamiento de JSON)
app.use(cors()); 
app.use(express.json());

app.use(express.static(path.resolve('./public')));  // Servirá tus HTMLs, CSS e Imágenes automáticos

// Configuracion de las rutas
app.use('/api', etiquetasRouter); // Todo lo de etiquetas colgará de /api/etiquetas
app.use('/api', loginRouter);      // Todo lo de login colgará de /api/login
app.use('/api', mapaRouter);       // Todo lo de mapa colgará de /api/emprendimientos mapa

// ==========================================
// VISTAS FRONTEND (RUTAS DE PÁGINAS)
// ==========================================

// 1. Ruta para la página de Inicio (raíz)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Ruta para la vista del Mapa (esta ya la tenías)
app.get('/mapa', (req, res) => {
    console.log("ENTRÉ A /MAPA"); // 👈 DEBUG
    res.sendFile(path.join(__dirname, 'public', 'mapa.html'));
});

// 3. Ruta para Formularios (agregada aquí)
app.get('/formularios', (req, res) => {
    console.log("ENTRÉ A /FORMULARIOS"); // 👈 DEBUG
    res.sendFile(path.join(__dirname, 'public', 'Camino FORMULARIO DE INSCRIPCION.html'));
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