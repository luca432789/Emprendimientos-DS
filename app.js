import 'dotenv/config'; // 👈 ESTA LÍNEA DEBE SER LA PRIMERA DEL ARCHIVO
console.log("REVISANDO CLAVE JWT:", process.env.JWT_SECRET);

import express from 'express';
import cors from 'cors';

// Importamos los enrutadores externos
import etiquetasRouter from './routes/etiquetasRoutes.js';
import loginRouter from './routes/loginRoutes.js';


const app = express();
const PORT = 3000;

// Middlewares globales
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Servirá tus HTMLs, CSS e Imágenes automáticos

// Conectamos las rutas al servidor web
app.use('/api', etiquetasRouter); // Todo lo de etiquetas colgará de /api/etiquetas
app.use('/api', loginRouter);      // Todo lo de login colgará de /api/login

// Encendido del servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});
