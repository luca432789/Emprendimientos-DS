// Dentro de js/script.js (JavaScript del Cliente/Navegador)

// // 1. Capturamos el contenedor del HTML usando su ID
// const listaEtiquetasWeb = document.getElementById('lista-etiquetas');

// // Esta función se ejecuta cada vez que apretás un botón
// function cargarEtiquetas(filtro) {
    
//     // 1. Extraemos el token que guardamos en el sessionStorage durante el Login
//     const tokenSeguro = sessionStorage.getItem('token_ministerio');

//     // Mostramos un mensaje de carga temporal para mejorar la experiencia de usuario
//     listaEtiquetasWeb.innerHTML = '<li>Cargando datos desde el Ministerio...</li>';

//     // Le pegamos a Node pasándole el filtro en la URL (ej: http://localhost:3000/api/etiquetas?estado=activas)
//     fetch(`/api/etiquetas?estado=${filtro}`, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//             // 🔒 LE MOSTRAMOS EL PASE AL POLICÍA DEL BACKEND (Formato estándar Bearer)
//             'Authorization': `Bearer ${tokenSeguro}`
//         }
//     })
    
//     .then(respuesta => {
//         //CONTROL DE OBSOLESCENCIA (5min)
//         if (respuesta.status === 401 || respuesta.status === 403) {
            
//             // Limpiamos el sessionStorage para borrar los datos viejos/undefined
//             sessionStorage.clear(); 

//             // Si tienen SweetAlert2 pueden usar Swal.fire, si no, este alert clásico cumple la función:
//             alert("Su sesión ha expirado por inactividad (5 minutos) o no tiene autorización. Por favor, ingrese nuevamente.");
            
//             // Redireccionamos inmediatamente al Login o Index para que se vuelva a autenticar
//             window.location.href = 'index.html'; 
            
//             // Cortamos la ejecución de la promesa lanzando un error intencional
//             throw new Error("Sesión inválida o token expirado.");
//         }
        
//         // Si el estado es 200 OK, convertimos la respuesta a JSON normalmente
//         return respuesta.json();
//     })
    
//     .then(etiquetas => {
//         listaEtiquetasWeb.innerHTML = ''; // Limpiamos el contenedor

//         if (etiquetas.length === 0) {
//             listaEtiquetasWeb.innerHTML = '<li>No se encontraron etiquetas para este filtro.</li>';
//             return;
//         }

//         // Recorremos los datos que devolvió la API
//         etiquetas.forEach(etiqueta => {
//             const li = document.createElement('li');
//             li.innerHTML = `<strong>ID:</strong> ${etiqueta.idEtiqueta} | <strong>Nombre:</strong> ${etiqueta.Nombre} | <strong>Estado:</strong> ${etiqueta.Activa === 1 ? 'Activa' : 'Inactiva'}`;
//             listaEtiquetasWeb.appendChild(li);
//         });
//     })
//     .catch(error => {
//         console.error("Error al conectar con el backend:", error);
//         // El error de expiracion de token se maneja arriba, por falla de conexión se mostrará el siguiente
//         if (error.message !== "Sesión inválida o token expirado.") {
//             listaEtiquetasWeb.innerHTML = '<li>Error crítico al cargar las etiquetas.</li>';
//         };
//     });
// }


/*
¿Cómo te ayuda esto a deducir lo de la tabla Empleado?
Fijate en el patrón que acabás de construir:

Creás un endpoint en Node (app.get('/api/empleados')).

Adentro tirás un SELECT * FROM Empleado.

En tu frontend creás un botón que llame a ese endpoint y dibuje los empleados en un <ul> usando un .forEach().
*/

const listaEmpleadosWeb = document.getElementById('lista-empleados');

// fetch('http://localhost:3000/api/etiquetas') // Esto hace que se cargue junto a la pagina html

// Esta función se ejecuta cada vez que apretás un botón
function cargarEmpleados(filtro) {
    
    // Mostramos un mensaje de carga temporal para mejorar la experiencia de usuario
    listaEmpleadosWeb.innerHTML = '<li>Cargando datos desde el Ministerio...</li>';

    // Le pegamos a Node pasándole el filtro en la URL (ej: http://localhost:3000/api/etiquetas?estado=activas)
    fetch(`http://localhost:3000/api/empleados?estado=${filtro}`)
        .then(respuesta => respuesta.json())
        .then(empleados => {
            listaEmpleadosWeb.innerHTML = ''; // Limpiamos el contenedor

            if (empleados.length === 0) {
                listaEmpleadosWeb.innerHTML = '<li>No se encontraron etiquetas para este filtro.</li>';
                return;
            }

            // Recorremos los datos que devolvió la API
            empleados.forEach(empleado => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>ID:</strong> ${empleado.idEmpleado} | <strong>Nombre:</strong> ${empleado.Nombre} | <strong>DNI:</strong> ${empleado.DNI} | <strong>Cargo:</strong> ${empleado.Cargo}`;
                listaEmpleadosWeb.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Error al conectar con el backend:", error);
            listaEmpleadosWeb.innerHTML = '<li>Error crítico al cargar los empleados.</li>';
        });
}

// Ingreso de nuevo empleado
const formularioEmpleado = document.getElementById('formulario-empleado');

if (formularioEmpleado) {
    formularioEmpleado.addEventListener('submit', function(evento) {
        evento.preventDefault(); // Evita que la página se recargue (comportamiento por defecto)

        // 1. Armamos el objeto con los datos exactos que pide el backend
        const nuevoEmpleado = {
            Nombre: document.getElementById('emp-nombre').value,
            Apellido: document.getElementById('emp-apellido').value,
            DNI: document.getElementById('emp-dni').value,
            Domicilio: document.getElementById('emp-domicilio').value,
            Telefono: document.getElementById('emp-telefono').value,
            Correo: document.getElementById('emp-correo').value,
            Cargo: document.getElementById('emp-cargo').value
        };

        // 2. Despachamos la petición POST hacia Node.js
        fetch('http://localhost:3000/api/empleados', {
            method: 'POST', // Especificamos el método de escritura
            headers: {
                'Content-Type': 'application/json' // Le avisamos a Node que le mandamos un JSON
            },
            body: JSON.stringify(nuevoEmpleado) // Convertimos el objeto JS a un texto JSON string puro
        })
        .then(respuesta => respuesta.json())
        .then(data => {
            if (data.error) {
                alert(`Error del servidor: ${data.error}`);
            } else {
                alert('¡Empleado registrado exitosamente en el Ministerio!');
                formularioEmpleado.reset(); // Limpia las cajas de texto del formulario
                cargarEmpleados('todas');   // Refresca la lista automáticamente para ver al nuevo empleado
            }
        })
        .catch(error => {
            console.error("Error al intentar insertar el empleado:", error);
            alert("No se pudo conectar con el backend para guardar.");
        });
    });
}

