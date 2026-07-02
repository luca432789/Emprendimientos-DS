document.addEventListener('DOMContentLoaded', async () => {

    console.log("🗺️ Inicializando mapa de emprendimientos...");

    // ========================================================
    // 1. ELEMENTOS UI
    // ========================================================
    const panel = document.getElementById("panel-edicion-mapa");
    const btnGuardar = document.getElementById("btn-guardar-ubicacion");
    const estadoSeleccion = document.getElementById("estado-seleccion");

    // ========================================================
    // 2. AUTENTICACIÓN (SESSION STORAGE)
    // ========================================================
    const token = sessionStorage.getItem('token_ministerio');

    let esAdmin = false;

    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));

            const rol = payload.tipoUsuario || payload.rol;

            esAdmin = (
                rol === "Administrador" ||
                rol === "Empleado de Mesa" ||
                rol === "Empleado de Area"
            );

        } catch (error) {
            console.warn("⚠️ Token inválido");
            esAdmin = false;
        }
    }

    // ========================================================
    // 3. CONTROL DE UI SEGÚN ROL
    // ========================================================
    if (esAdmin) {
        console.log("🔐 Modo edición habilitado");

        if (panel) panel.style.display = "block";

    } else {
        console.log("👀 Modo visitante");

        if (panel) panel.style.display = "none";
    }

    // ========================================================
    // 4. INICIALIZAR MAPA
    // ========================================================
    const map = L.map('map').setView([-27.7833, -64.2667], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // ========================================================
    // 5. VARIABLES DE CONTROL
    // ========================================================
    let nuevaUbicacion = null;

    // ========================================================
    // 6. CLICK EN MAPA (SOLO ADMIN)
    // ========================================================
    if (esAdmin) {

        map.on('click', (e) => {

            nuevaUbicacion = e.latlng;

            console.log("📍 Ubicación seleccionada:", nuevaUbicacion);

            if (estadoSeleccion) {
                estadoSeleccion.innerText =
                    `Ubicación: ${nuevaUbicacion.lat.toFixed(5)}, ${nuevaUbicacion.lng.toFixed(5)}`;
            }

            if (btnGuardar) {
                btnGuardar.disabled = false;
            }
        });
    }

    // ========================================================
    // 7. GUARDAR UBICACIÓN (SOLO ADMIN)
    // ========================================================
    if (esAdmin && btnGuardar) {

        btnGuardar.addEventListener('click', async () => {

            if (!nuevaUbicacion) return;

            const idEmprendimiento = 1; // 🔥 luego lo hacemos dinámico

            try {
                await fetch(`/api/emprendimientos/${idEmprendimiento}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        latitud: nuevaUbicacion.lat,
                        longitud: nuevaUbicacion.lng
                    })
                });

                alert("✅ Ubicación guardada correctamente");

                btnGuardar.disabled = true;
                estadoSeleccion.innerText = "Seleccione un emprendimiento";

            } catch (error) {
                console.error("❌ Error guardando ubicación:", error);
            }
        });
    }

    // ========================================================
    // 8. CARGAR EMPRENDIMIENTOS
    // ========================================================
    let emprendimientos = [];

    try {
        const res = await fetch('/api/emprendimientos');
        emprendimientos = await res.json();

    } catch (error) {
        console.error("❌ Error cargando datos:", error);
        return;
    }

    let marcadores = [];

    // ========================================================
    // 9. CREAR MARCADORES
    // ========================================================
    emprendimientos.forEach(emp => {

        const lat = parseFloat(emp.Latitud);
        const lng = parseFloat(emp.Longitud);

        if (!isNaN(lat) && !isNaN(lng)) {

            const marker = L.marker([lat, lng], {
                draggable: esAdmin // solo admin puede mover
            }).addTo(map);

            marker.bindPopup(`
                <div>
                    <h3>${emp.Nombre}</h3>
                    <p><b>Actividad:</b> ${emp.ActividadPrincipal}</p>
                    <p><b>Localidad:</b> ${emp.Localidad}</p>
                </div>
            `);

            // ====================================================
            // 10. DRAG SOLO ADMIN
            // ====================================================
            if (esAdmin) {

                marker.on('dragend', async () => {

                    const pos = marker.getLatLng();

                    try {
                        await fetch(`/api/emprendimientos/${emp.idEmprendimiento}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                latitud: pos.lat,
                                longitud: pos.lng
                            })
                        });

                        console.log("📍 Actualizado en BD");

                    } catch (error) {
                        console.error("❌ Error update:", error);
                    }
                });
            }

            marcadores.push(marker);
        }
    });

    console.log(`📌 Emprendimientos cargados: ${marcadores.length}`);

});