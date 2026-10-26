// Departamentos de Santiago del Estero aceptados en formularios y cargas del sistema
export const departamentosSantiago = [
  'Aguirre', 'Alberdi', 'Atamisqui', 'Avellaneda', 'Banda', 'Belgrano', 'Capital', 'Choya', 'Copo',
  'Figueroa', 'General Taboada', 'Guasayán', 'Jiménez', 'Juan Felipe Ibarra', 'Loreto', 'Mitre', 'Moreno',
  'Ojo de Agua', 'Pellegrini', 'Quebrachos', 'Río Hondo', 'Rivadavia', 'Robles', 'Salavina', 'San Martín',
  'Sarmiento', 'Silípica'
];

// Rectángulo que contiene a la provincia (con un pequeño margen). En Santiago del Estero
// latitud y longitud son siempre negativas: así se detecta, por ejemplo, un signo "-" olvidado.
export const limitesSantiago = { latMin: -30.6, latMax: -25.5, lngMin: -65.4, lngMax: -61.4 };

export const mensajeFueraDeSantiago =
  'Las coordenadas quedan fuera de Santiago del Estero. Revisá que latitud y longitud sean negativas (ej: -27.78, -64.26).';

export const coordenadasEnSantiago = (latitud, longitud) =>
  Number.isFinite(latitud) && Number.isFinite(longitud) &&
  latitud >= limitesSantiago.latMin && latitud <= limitesSantiago.latMax &&
  longitud >= limitesSantiago.lngMin && longitud <= limitesSantiago.lngMax;
