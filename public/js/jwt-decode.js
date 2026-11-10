// Lee el contenido (payload) del token de sesión para mostrar el menú según el rol, como la librería jwt-decode.
// No verifica la firma: eso lo hace siempre el servidor en cada pedido.
// window.jwtDecode(token) devuelve el objeto del token o lanza un error si el token está mal formado.
window.jwtDecode = (token) => {
  const partes = String(token || '').split('.');
  if (partes.length !== 3 || !partes[1]) throw new Error('Token inválido: no tiene el formato esperado.');
  // base64url -> base64 (con el relleno "=" que falte) -> texto UTF-8 (tildes y ñ incluidas)
  const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(partes[1].length / 4) * 4, '=');
  try {
    const bytes = Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Token inválido: no se pudo leer su contenido.');
  }
};
