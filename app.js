// Configuracion inicial del sistema
import 'dotenv/config'; // 👈 ESTA LÍNEA DEBE SER LA PRIMERA DEL ARCHIVO
console.log("REVISANDO CLAVE JWT:", process.env.JWT_SECRET);

// Librerias del sistema
import express from 'express';
import cors from 'cors';

// Importamos los enrutadores externos
import etiquetasRouter from './routes/etiquetasRoutes.js';
import loginRouter from './routes/loginRoutes.js';
import solicitudesInicioRouter from './routes/solicitudesInicioRoutes.js';
import empleadoRouter from './routes/empleadoRoutes.js';

// inicializamos la app express
const app = express();

app.set('trust proxy', true); // para captura de ip

// Middlewares de control (CORS y procesamiento de JSON)
app.use(cors()); 
app.use(express.json());

app.use(express.static('public')); // Servirá tus HTMLs, CSS e Imágenes automáticos

// Servir los PDFs guardados físicamente en tu servidor
app.use('/uploads', express.static('uploads'));

// Configuracion de las rutas
app.use('/api', etiquetasRouter); // Todo lo de etiquetas colgará de /api/etiquetas
app.use('/api', loginRouter);      // Todo lo de login colgará de /api/login
app.use('/api', solicitudesInicioRouter);
app.use('/api', empleadoRouter);

// Encendido del servidor
const PORT = process.env.PORT ||3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});
