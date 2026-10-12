// Configuracion inicial del sistema
import 'dotenv/config'; // 👈 ESTA LÍNEA DEBE SER LA PRIMERA DEL ARCHIVO
console.log("REVISANDO CLAVE JWT:", process.env.JWT_SECRET);

// Librerias del sistema
import express from 'express';
import cors from 'cors';

// Importamos los enrutadores externos
import etiquetasRouter from './routes/etiquetasRoutes.js';
import loginRouter from './routes/loginRoutes.js';
import formulariosDigitalesRouter from './routes/formulariosDigitalesRoutes.js';

// inicializamos la app express
const app = express();

// Middlewares de control (CORS y procesamiento de JSON)
app.use(cors()); 
app.use(express.json({ limit: '24mb' }));

app.use(express.static('public')); // Servirá tus HTMLs, CSS e Imágenes automáticos

// Configuracion de las rutas
app.use('/api', etiquetasRouter); // Todo lo de etiquetas colgará de /api/etiquetas
app.use('/api', loginRouter);      // Todo lo de login colgará de /api/login
app.use('/api', formulariosDigitalesRouter);

// Encendido del servidor
const PORT = process.env.PORT ||3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});
