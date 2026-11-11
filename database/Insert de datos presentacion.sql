use ProyectoEmprendimientos2026;

-- -----------------------------------------------------------------------------------------------------------
-- INSERT DE DATOS PARA PRESENTACIONES ------------------------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
/* Reemplaza a "Insert de datos.sql" (no ejecutar los dos). Orden sobre una base vacía:
   1. Tablas.sql   2. Triggers.sql   3. Usuario Conexion.sql   4. este archivo
   5. node database/preparar-archivos-presentacion.js  (copia las imágenes de Adjunto/ a uploads/ y genera los PDF)

   Las fechas son relativas al día en que se ejecuta (curdate() - interval N day): así los plazos de facturas (30 días)
   y de puesta en marcha (90 días) se ven igual sin importar el día de la presentación.

   Contraseñas: empleados, las mismas de "Insert de datos.sql" | emprendedores: 1234Emprend--2
   Correos de emprendedores, solicitantes y garantes: alias "+" de las 3 casillas de prueba (los correos del sistema
   llegan a esas casillas). Las direcciones sin "+" quedan libres para cargar un Formulario de Inicio en vivo.

   Qué se puede mostrar con cada usuario:
   - Mesa de Entrada (AriCorreoItse@gmail.com): 3 solicitudes sin expediente (9, 10 y 11).
   - Área (empleadoriosnum1@gmail.com / stefaniMiguel@gmail.com): 3 solicitudes sin revisar (12, 13 y 14), 2 en revisión
     (15 y 16), 1 esperando el formulario de Subsidio (17), Subsidios y Créditos sin revisar / en revisión / con reenvío
     pedido (18, 19 y 20), 1 lista para enviar al Ministro (21) y 1 esperando la resolución del Ministro (22).
   - Administración de Emprendimientos: facturas validadas (1 y 8), en revisión (2), observadas (3), pendientes (4 y 5),
     vencidas con antecedente (6), puesta en marcha acreditada (1) y una carga histórica (7).
   - Moderación de publicaciones: 4 pendientes (3 nuevas y 1 edición) y 1 rechazada.
   - Finalizadas: rechazada por el Área (23), por Subsidio (24), por el Ministro (25) y por falta de formulario (26).
*/

-- Los triggers de auditoría necesitan la IP; idUsuario NULL = carga hecha por el sistema
SET @usuario_id = NULL;
SET @usuario_ip = '127.0.0.1';


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- EMPLEADO ------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Empleado (idEmpleado (PK), Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo (Mesa de Entrada - Técnico - Social - Administrador), Activo (Si-No))
-- Mismos DNI y correos que "Insert de datos.sql" (así se mantienen los inicios de sesión)
insert into Empleado (Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo, Activo)
values ('Sebastian', 'Santillan', '20987654', 'Av. Belgrano 550, Edificio A, Piso 3', '3855112233', 'empleaSebas.santill@gmail.com', 'Administrador', true), -- Empleado 1 admin
('Gabriela', 'Juárez', '20100001', 'Barrio Centro, Av. Libertad 312', '3856000001', 'admin2@gmail.com', 'Administrador', true), -- Empleado 2 admin
--
('Luca', 'Rios', '12354678', 'Barrio la pampuna entre pellegrini y san martin', '3846892734', 'empleadoriosnum1@gmail.com', 'Técnico', true), -- Empleado 3 tecnico
('Carolina', 'Ibáñez', '20100002', 'Barrio Sarmiento, calle Tucumán 845', '3856000002', 'tecnico2@gmail.com', 'Técnico', true), -- Empleado 4 tecnico
('Diego', 'Barraza', '20100003', 'Barrio Autonomía, Pje. Las Rosas 120', '3856000003', 'tecnico3@gmail.com', 'Técnico', true), -- Empleado 5 tecnico
('Natalia', 'Corvalán', '20100004', 'Barrio Jorge Newbery, calle 12 Nº 455', '3856000004', 'tecnico4@gmail.com', 'Técnico', true), -- Empleado 6 tecnico
('Martín', 'Salvatierra', '20100005', 'Barrio Belgrano, Av. Roca 1630', '3856000005', 'tecnico5@gmail.com', 'Técnico', true), -- Empleado 7 tecnico
('Lucía', 'Ruiz', '20100006', 'Barrio Tradición, calle Jujuy 78', '3856000006', 'tecnico6@gmail.com', 'Técnico', true), -- Empleado 8 tecnico
--
('Miguel', 'Stefanici', '43567213', 'Barrio Centro', '3856789034', 'stefaniMiguel@gmail.com', 'Social', true), -- Empleado 9 social
('Andrea', 'Gerez', '20100007', 'Barrio Ejército Argentino, calle Pringles 230', '3856000007', 'social2@gmail.com', 'Social', true), -- Empleado 10 social
('Jorge', 'Suárez', '20100008', 'Barrio Huaico Hondo, Mza. 4 Casa 17', '3856000008', 'social3@gmail.com', 'Social', true), -- Empleado 11 social
('Florencia', 'Díaz', '20100009', 'Barrio Mosconi, calle Catamarca 940', '3856000009', 'social4@gmail.com', 'Social', true), -- Empleado 12 social
('Ramiro', 'Acosta', '20100010', 'Barrio Siglo XX, Pje. Los Molles 55', '3856000010', 'social5@gmail.com', 'Social', true), -- Empleado 13 social
--
('Ari', 'Vasquez', '43567214', 'Barrio Centro', '3856789034', 'AriCorreoItse@gmail.com', 'Mesa de Entrada', true), -- Empleado 14 Mesa
('Valeria', 'Sosa', '20100011', 'Barrio Almirante Brown, calle Salta 410', '3856000011', 'Mesa2@gmail.com', 'Mesa de Entrada', true), -- Empleado 15 Mesa
('Sergio', 'Leiva', '20100012', 'Barrio Primera Junta, calle Mitre 1015', '3856000012', 'Mesa3@gmail.com', 'Mesa de Entrada', true), -- Empleado 16 Mesa
('Romina', 'Carabajal', '20100013', 'Barrio Santa Lucía, Pje. Ombú 33', '3856000013', 'Mesa4@gmail.com', 'Mesa de Entrada', true), -- Empleado 17 Mesa
('Hugo', 'Medina', '20100014', 'Barrio Industria, calle Formosa 702', '3856000014', 'Mesa5@gmail.com', 'Mesa de Entrada', false); -- Empleado 18 Mesa (dado de baja)


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- USUARIO EMPLEADO -------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Usuario (idUsuario (PK), Correo, Contraseña, TipoUsuario, Activa (Si-No), Noticiero (Si-No), idEmprendedor (FK), idEmpleado (FK))
-- Noticiero: usuarios 1, 3 y 9 (autores de las noticias)
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, Noticiero, idEmprendedor, idEmpleado)
values ('empleaSebas.santill@gmail.com', '$2b$10$mEIN/RBMUB5G28bVno2gju3y9doFDfGfIcnq180L0036NaxCgymhO', 'Administrador', true, true, null, 1), -- Usuario 1 (admin) contra: 1234sEBASss--
('admin2@gmail.com', '$2b$10$erGWSB9zNBKnO26HXEBeM.3NTItonfUKwOO6HZM8KwSotx3PFM.Y2', 'Administrador', true, false, null, 2), -- Usuario 2 (admin) contra: admiN1234@-2
--
('empleadoriosnum1@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, true, null, 3), -- Usuario 3 (Técnico) contra: 1234rIOSss--
('tecnico2@gmail.com', '$2b$10$SIrHTqdX14BnNShs4uMbJusLFUGNMPHkmm12x.BFLWsHc5onSOF/e', 'Empleado de Area', true, false, null, 4), -- Usuario 4 (Técnico) contra: tecNIco12@-2
('tecnico3@gmail.com', '$2b$10$SIrHTqdX14BnNShs4uMbJusLFUGNMPHkmm12x.BFLWsHc5onSOF/e', 'Empleado de Area', true, false, null, 5), -- Usuario 5 (Técnico) contra: tecNIco12@-2
('tecnico4@gmail.com', '$2b$10$SIrHTqdX14BnNShs4uMbJusLFUGNMPHkmm12x.BFLWsHc5onSOF/e', 'Empleado de Area', true, false, null, 6), -- Usuario 6 (Técnico) contra: tecNIco12@-2
('tecnico5@gmail.com', '$2b$10$SIrHTqdX14BnNShs4uMbJusLFUGNMPHkmm12x.BFLWsHc5onSOF/e', 'Empleado de Area', true, false, null, 7), -- Usuario 7 (Técnico) contra: tecNIco12@-2
('tecnico6@gmail.com', '$2b$10$SIrHTqdX14BnNShs4uMbJusLFUGNMPHkmm12x.BFLWsHc5onSOF/e', 'Empleado de Area', true, false, null, 8), -- Usuario 8 (Técnico) contra: tecNIco12@-2
--
('stefaniMiguel@gmail.com', '$2b$10$1EGoG7630TMdjjQk2iwNUewAm6o7thXYYs0zZfhtohLT5/syEVWd6', 'Empleado de Area', true, true, null, 9), -- Usuario 9 (Social) contra: SOcial10!Fun
('social2@gmail.com', '$2b$10$vr4tw15i7/w5Euntne8zb.905PXi9jFH0i.OdB2dkAGIPgM9Kiks6', 'Empleado de Area', true, false, null, 10), -- Usuario 10 (Social) contra: SOcial123@-2
('social3@gmail.com', '$2b$10$vr4tw15i7/w5Euntne8zb.905PXi9jFH0i.OdB2dkAGIPgM9Kiks6', 'Empleado de Area', true, false, null, 11), -- Usuario 11 (Social) contra: SOcial123@-2
('social4@gmail.com', '$2b$10$vr4tw15i7/w5Euntne8zb.905PXi9jFH0i.OdB2dkAGIPgM9Kiks6', 'Empleado de Area', true, false, null, 12), -- Usuario 12 (Social) contra: SOcial123@-2
('social5@gmail.com', '$2b$10$vr4tw15i7/w5Euntne8zb.905PXi9jFH0i.OdB2dkAGIPgM9Kiks6', 'Empleado de Area', true, false, null, 13), -- Usuario 13 (Social) contra: SOcial123@-2
--
('AriCorreoItse@gmail.com', '$2b$10$yfy6kvzMAlLMXZ7OIL2UH.gp1YNY9L6RU7swuAUy.tgg6cLbWKVtK', 'Empleado de Mesa', true, false, null, 14), -- Usuario 14 (de Mesa) contra: 1234AriItse--
('Mesa2@gmail.com', '$2b$10$YvYeJ/9uw3NycUjSLJb./OS1VD4tyxi/Kg.mo/MNXb/OzWxVR9CkK', 'Empleado de Mesa', true, false, null, 15), -- Usuario 15 (de Mesa) contra: MesA123!4@-2
('Mesa3@gmail.com', '$2b$10$YvYeJ/9uw3NycUjSLJb./OS1VD4tyxi/Kg.mo/MNXb/OzWxVR9CkK', 'Empleado de Mesa', true, false, null, 16), -- Usuario 16 (de Mesa) contra: MesA123!4@-2
('Mesa4@gmail.com', '$2b$10$YvYeJ/9uw3NycUjSLJb./OS1VD4tyxi/Kg.mo/MNXb/OzWxVR9CkK', 'Empleado de Mesa', true, false, null, 17), -- Usuario 17 (de Mesa) contra: MesA123!4@-2
('Mesa5@gmail.com', '$2b$10$YvYeJ/9uw3NycUjSLJb./OS1VD4tyxi/Kg.mo/MNXb/OzWxVR9CkK', 'Empleado de Mesa', false, false, null, 18); -- Usuario 18 (de Mesa, cuenta desactivada) contra: MesA123!4@-2


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- RUBRO ---------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Rubro (idRubro (PK), Nombre, IconoMapa)
insert into Rubro (Nombre, IconoMapa)
values ('Bombos artesanales', '/uploads/IconoMapa/Bombo.png'), -- 1
('Telares artesanales', '/uploads/IconoMapa/Telares.png'), -- 2
('Muebles', '/uploads/IconoMapa/Muebles.png'), -- 3
('Carpintería General', '/uploads/IconoMapa/Carpinteria - General.png'), -- 4
('Bisutería', '/uploads/IconoMapa/Bisuteria.png'), -- 5
('Indumentaria', '/uploads/IconoMapa/Indumentaria.png'), -- 6
('Talabartería y Cuero', '/uploads/IconoMapa/Talabarteria-Cuero.png'); -- 7


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- SolicitudInicio -----------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- SolicitudInicio (idSolicitudInicio (PK), DireccionPDF, FechaRecibidoMesa, FechaRecibidoArea, EstadoRevisionArea (0: Sin revisar, 1: En proceso, 2: Finalizado), FechaInicioRev, FechaFinRev, idEmpleadoTecRevisor (FK), idEmpleadoSocRevisor (FK), AprobacionArea (si-no), MotivoRechazo, EnvioMinistro (0: Sin enviar, 1: Enviado a ministro, 2: No corresponde), FechaEnvioMinistro, AprobacionMinistro (Si-No), FechaResolucionMin, MensajeResolucionFinal, FechaResolucionFinal, CargaHistorica)
-- FechaRecibidoArea la carga el trigger del Expediente (más abajo se corrige con la fecha de carga del expediente)
insert into SolicitudInicio (DireccionPDF, FechaRecibidoMesa, EstadoRevisionArea, FechaInicioRev, FechaFinRev, idEmpleadoTecRevisor, idEmpleadoSocRevisor, AprobacionArea, MotivoRechazo, EnvioMinistro, FechaEnvioMinistro, AprobacionMinistro, FechaResolucionMin, MensajeResolucionFinal, FechaResolucionFinal, CargaHistorica)
values
-- Aprobadas por el Ministro (tienen Emprendimiento) ------------------------------------------
('/uploads/solicitudesinicio/Presentacion-Inicio-01.pdf', curdate() - interval 150 day, 2, curdate() - interval 140 day, curdate() - interval 130 day, 3, 9, true, null, 1, curdate() - interval 110 day, true, curdate() - interval 100 day, 'Emprendimiento Aprobado por ministro', curdate() - interval 100 day, false), -- 1 Bombos Santos
('/uploads/solicitudesinicio/Presentacion-Inicio-02.pdf', curdate() - interval 70 day, 2, curdate() - interval 60 day, curdate() - interval 50 day, 4, 10, true, null, 1, curdate() - interval 26 day, true, curdate() - interval 20 day, 'Emprendimiento Aprobado por ministro', curdate() - interval 20 day, false), -- 2 Los Telares de Marta
('/uploads/solicitudesinicio/Presentacion-Inicio-03.pdf', curdate() - interval 75 day, 2, curdate() - interval 65 day, curdate() - interval 55 day, 3, 9, true, null, 1, curdate() - interval 30 day, true, curdate() - interval 25 day, 'Emprendimiento Aprobado por ministro', curdate() - interval 25 day, false), -- 3 Mauricio Muebles
('/uploads/solicitudesinicio/Presentacion-Inicio-04.pdf', curdate() - interval 60 day, 2, curdate() - interval 50 day, curdate() - interval 40 day, 5, 9, true, null, 1, curdate() - interval 17 day, true, curdate() - interval 12 day, 'Emprendimiento Aprobado por ministro', curdate() - interval 12 day, false), -- 4 La Carpinteria Pajaro Loco
('/uploads/solicitudesinicio/Presentacion-Inicio-05.pdf', curdate() - interval 55 day, 2, curdate() - interval 45 day, curdate() - interval 35 day, 3, 11, true, null, 1, curdate() - interval 9 day, true, curdate() - interval 4 day, 'Emprendimiento Aprobado por ministro', curdate() - interval 4 day, false), -- 5 Bijoutery Paola
('/uploads/solicitudesinicio/Presentacion-Inicio-06.pdf', curdate() - interval 100 day, 2, curdate() - interval 90 day, curdate() - interval 80 day, 6, 10, true, null, 1, curdate() - interval 50 day, true, curdate() - interval 45 day, 'Emprendimiento Aprobado por ministro', curdate() - interval 45 day, false), -- 6 Indumentaria Sofia
('/uploads/solicitudesinicio/Presentacion-Inicio-07.pdf', '2023-03-14', 2, null, null, null, null, true, null, 1, null, true, '2023-06-20', 'Emprendimiento Aprobado por ministro', '2023-06-20', true), -- 7 La Talabarteria de Edu (carga histórica)
('/uploads/solicitudesinicio/Presentacion-Inicio-08.pdf', curdate() - interval 120 day, 2, curdate() - interval 110 day, curdate() - interval 100 day, 3, 9, true, null, 1, curdate() - interval 68 day, true, curdate() - interval 60 day, 'Emprendimiento Aprobado por ministro', curdate() - interval 60 day, false), -- 8 Cintos Hernan
-- Mesa de Entrada: sin expediente ------------------------------------------------------------
('/uploads/solicitudesinicio/Presentacion-Inicio-09.pdf', curdate() - interval 2 day, 0, null, null, null, null, null, null, 0, null, null, null, null, null, false), -- 9 Tejidos Las Abuelas
('/uploads/solicitudesinicio/Presentacion-Inicio-10.pdf', curdate() - interval 1 day, 0, null, null, null, null, null, null, 0, null, null, null, null, null, false), -- 10 Bombos El Cardón
('/uploads/solicitudesinicio/Presentacion-Inicio-11.pdf', curdate(), 0, null, null, null, null, null, null, 0, null, null, null, null, null, false), -- 11 Aros y Collares Luna
-- Área: sin revisar ------------------------------------------------------------------------
('/uploads/solicitudesinicio/Presentacion-Inicio-12.pdf', curdate() - interval 6 day, 0, null, null, null, null, null, null, 0, null, null, null, null, null, false), -- 12 Carpintería Don Tito
('/uploads/solicitudesinicio/Presentacion-Inicio-13.pdf', curdate() - interval 8 day, 0, null, null, null, null, null, null, 0, null, null, null, null, null, false), -- 13 Marroquinería Atamisqui
('/uploads/solicitudesinicio/Presentacion-Inicio-14.pdf', curdate() - interval 9 day, 0, null, null, null, null, null, null, 0, null, null, null, null, null, false), -- 14 Ropa de Niños Mía
-- Área: en revisión (visita técnica y social) ------------------------------------------------
('/uploads/solicitudesinicio/Presentacion-Inicio-15.pdf', curdate() - interval 15 day, 1, curdate() - interval 6 day, null, 3, 9, null, null, 0, null, null, null, null, null, false), -- 15 Muebles del Monte
('/uploads/solicitudesinicio/Presentacion-Inicio-16.pdf', curdate() - interval 18 day, 1, curdate() - interval 10 day, null, 4, 9, null, null, 0, null, null, null, null, null, false), -- 16 Ponchos del Salado
-- Aprobadas por el Área: etapa de Subsidio / Crédito y envío al Ministro ----------------------
('/uploads/solicitudesinicio/Presentacion-Inicio-17.pdf', curdate() - interval 30 day, 2, curdate() - interval 25 day, curdate() - interval 3 day, 3, 9, true, null, 0, null, null, null, null, null, false), -- 17 Platería Santiagueña (falta el formulario de Subsidio)
('/uploads/solicitudesinicio/Presentacion-Inicio-18.pdf', curdate() - interval 40 day, 2, curdate() - interval 35 day, curdate() - interval 10 day, 5, 10, true, null, 0, null, null, null, null, null, false), -- 18 Bombos La Chacarera (Subsidio sin revisar)
('/uploads/solicitudesinicio/Presentacion-Inicio-19.pdf', curdate() - interval 45 day, 2, curdate() - interval 38 day, curdate() - interval 15 day, 3, 11, true, null, 0, null, null, null, null, null, false), -- 19 Taller de Cuero El Rastro (Crédito en revisión)
('/uploads/solicitudesinicio/Presentacion-Inicio-20.pdf', curdate() - interval 50 day, 2, curdate() - interval 42 day, curdate() - interval 20 day, 6, 9, true, null, 0, null, null, null, null, null, false), -- 20 Mueblería Los Quebrachos (Crédito con reenvío pedido)
('/uploads/solicitudesinicio/Presentacion-Inicio-21.pdf', curdate() - interval 55 day, 2, curdate() - interval 45 day, curdate() - interval 22 day, 3, 9, true, null, 0, null, null, null, null, null, false), -- 21 Tejeduría Los Telares (lista para enviar al Ministro)
('/uploads/solicitudesinicio/Presentacion-Inicio-22.pdf', curdate() - interval 70 day, 2, curdate() - interval 60 day, curdate() - interval 35 day, 3, 9, true, null, 1, curdate() - interval 8 day, null, null, null, null, false), -- 22 Carpintería El Algarrobo (esperando al Ministro)
-- Finalizadas sin aprobar ------------------------------------------------------------------
('/uploads/solicitudesinicio/Presentacion-Inicio-23.pdf', curdate() - interval 35 day, 2, curdate() - interval 25 day, curdate() - interval 12 day, 4, 10, false,
	'En la visita técnica se constató que la actividad es reventa de prendas compradas, no producción propia. El plan financia emprendimientos productivos.', 0, null, null, null, 'Rechazado por el Área', curdate() - interval 12 day, false), -- 23 Remeras Estampadas Fénix
('/uploads/solicitudesinicio/Presentacion-Inicio-24.pdf', curdate() - interval 60 day, 2, curdate() - interval 50 day, curdate() - interval 30 day, 5, 11, true, null, 0, null, null, null, 'Rechazado por Subsidio', curdate() - interval 18 day, false), -- 24 Telar Doña Teresa
('/uploads/solicitudesinicio/Presentacion-Inicio-25.pdf', curdate() - interval 90 day, 2, curdate() - interval 80 day, curdate() - interval 55 day, 3, 9, true,
	'El emprendedor tiene un crédito anterior del plan (2024) que todavía no fue cancelado.', 1, curdate() - interval 28 day, false, curdate() - interval 15 day, 'Emprendimiento Rechazado por ministro', curdate() - interval 15 day, false), -- 25 Sillas Materas Gorosito
('/uploads/solicitudesinicio/Presentacion-Inicio-26.pdf', curdate() - interval 80 day, 2, curdate() - interval 70 day, curdate() - interval 50 day, 6, 12, true, null, 2, null, null, null,
	'Pasaron más de 30 días desde la aprobación del Área y la emprendedora no envió el formulario de Subsidio.', curdate() - interval 10 day, false); -- 26 Collares Alma


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- DatosSolicitudInicio ------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- DatosSolicitudInicio (idDatosSolicitudInicio (PK), PersonaNombre, PersonaApellido, PersonaDNI, PersonaDepartamento, PersonaLocalidad, PersonaDomicilio, PersonaTeléfono, PersonaCorreo, EmprendimientoNombre, EmprendimientoCalle, EmprendimientoNroCalle, EmprendimientoBarrio, EmprendimientoDepto, EmprendimientoLocalidad, EmprendimientoActPrincipal, EmprendimientoMarcha, EmprendimientoRubro, EleccionAyuda, EmprendimientoLatitud, EmprendimientoLongitud, idSolicitudInicio (fk))
-- La solicitud 7 es de carga histórica: no tiene datos del formulario. Las coordenadas las carga el Área al aprobar.
insert into DatosSolicitudInicio (PersonaNombre, PersonaApellido, PersonaDNI, PersonaDepartamento, PersonaLocalidad, PersonaDomicilio, PersonaTeléfono, PersonaCorreo,
EmprendimientoNombre, EmprendimientoCalle, EmprendimientoNroCalle, EmprendimientoBarrio, EmprendimientoDepto, EmprendimientoLocalidad, EmprendimientoActPrincipal, EmprendimientoMarcha, EmprendimientoRubro, EleccionAyuda, EmprendimientoLatitud, EmprendimientoLongitud, idSolicitudInicio)
values ('Pedro', 'Santos', '30111222', 'Banda', 'La Banda', 'Barrio Villa Unión, calle Salta 845', '3854112233', 'lucariosazul+bombossantos@gmail.com',
'Bombos Santos', 'Salta', '845', 'Villa Unión', 'Banda', 'La Banda', 'Fabricación artesanal de bombos legüeros con madera de ceibo y parche de cuero de cabra', true, 'Bombos artesanales', 'Subsidio', -27.7351000000, -64.2425000000, 1),
('Marta', 'Ledesma', '27333444', 'Figueroa', 'La Cañada', 'Paraje La Cañada, casa 12', '3854223344', 'lucariossantillan.trabajo+telaresmarta@gmail.com',
'Los Telares de Marta', 'Ruta Provincial 5', '120', 'Centro', 'Figueroa', 'La Cañada', 'Tejido en telar criollo de ponchos, chales, bufandas y caminos de mesa con lana de oveja', true, 'Telares artesanales', 'Subsidio', -27.6519000000, -63.7731000000, 2),
('Mauricio', 'Paz', '32555666', 'Capital', 'Santiago del Estero', 'Barrio Autonomía, Av. Solís 1520', '3855334455', 'lucariossantillan.trabajo+mauriciomuebles@gmail.com',
'Mauricio Muebles', 'Av. Solís', '1520', 'Autonomía', 'Capital', 'Santiago del Estero', 'Fabricación de muebles a medida en melamina y madera maciza: escritorios, cómodas y placares', true, 'Muebles', 'Credito', -27.7988000000, -64.2701000000, 3),
('Julio', 'Juárez', '29444555', 'Río Hondo', 'Las Termas de Río Hondo', 'Barrio Jorge Newbery, Pje. Los Ceibos 233', '3858445566', 'lucariosazul+pajaroloco@gmail.com',
'La Carpinteria Pajaro Loco', 'Caseros', '410', 'Centro', 'Río Hondo', 'Las Termas de Río Hondo', 'Carpintería de obra: puertas, ventanas, bibliotecas y estanterías a medida', true, 'Carpintería General', 'Credito', -27.4952000000, -64.8601000000, 4),
('Paola', 'Herrera', '35666777', 'Capital', 'Santiago del Estero', 'Barrio Belgrano, calle Libertad 1120', '3855556677', 'lucariossantillan.trabajo+bijouterypaola@gmail.com',
'Bijoutery Paola', 'Libertad', '1120', 'Belgrano', 'Capital', 'Santiago del Estero', 'Diseño y armado de bijouterie artesanal: collares, pulseras, aros y broches', true, 'Bisutería', 'Subsidio', -27.7905000000, -64.2528000000, 5),
('Sofía', 'Coronel', '38777888', 'Robles', 'Fernández', 'Barrio San Martín, calle 9 de Julio 356', '3854667788', 'lucariossantillan.trabajo+indumentariasofia@gmail.com',
'Indumentaria Sofia', '9 de Julio', '356', 'San Martín', 'Robles', 'Fernández', 'Confección de indumentaria con bordados y guardas tradicionales: blusas, pulóveres y mochilas', false, 'Indumentaria', 'Subsidio', -27.9236000000, -63.8968000000, 6),
('Hernán', 'Villalba', '31999000', 'Choya', 'Frías', 'Barrio Ferroviario, calle Rivadavia 640', '3854778899', 'lucariossantillan.trabajo+cintoshernan@gmail.com',
'Cintos Hernan', 'Rivadavia', '640', 'Ferroviario', 'Choya', 'Frías', 'Confección de cintos de cuero y carpincho con trenzados y tejido pampa', true, 'Talabartería y Cuero', 'Subsidio', -28.6372000000, -65.1288000000, 8),
-- Mesa de Entrada
('Rosa', 'Gerez', '26111333', 'Atamisqui', 'Villa Atamisqui', 'Barrio San José, calle Belgrano 98', '3854889900', 'lucariosazul+tejidosabuelas@gmail.com',
'Tejidos Las Abuelas', 'Belgrano', '98', 'San José', 'Atamisqui', 'Villa Atamisqui', 'Tejido en telar de mantas y caminos de mesa con lana hilada a mano por un grupo de abuelas', true, 'Telares artesanales', 'Subsidio', null, null, 9),
('Ramón', 'Chazarreta', '33222111', 'Banda', 'Clodomira', 'Barrio Centro, calle Sarmiento 210', '3854990011', 'lucariossantillan.trabajo+bomboscardon@gmail.com',
'Bombos El Cardón', 'Sarmiento', '210', 'Centro', 'Banda', 'Clodomira', 'Fabricación de bombos legüeros y cajas chayeras con madera de cardón', true, 'Bombos artesanales', 'Credito', null, null, 10),
('Luciana', 'Ferreyra', '40111222', 'Capital', 'Santiago del Estero', 'Barrio Juramento, calle Pedro León Gallo 455', '3855001122', 'lucariossantillan.trabajo+arosluna@gmail.com',
'Aros y Collares Luna', 'Pedro León Gallo', '455', 'Juramento', 'Capital', 'Santiago del Estero', 'Armado de aros y collares con semillas, piedras y alambre', false, 'Bisutería', 'Subsidio', null, null, 11),
-- Área: sin revisar
('Héctor', 'Bravo', '28555111', 'Pellegrini', 'Nueva Esperanza', 'Barrio Norte, calle San Martín 77', '3854112200', 'lucariosazul+carpinteriatito@gmail.com',
'Carpintería Don Tito', 'San Martín', '77', 'Norte', 'Pellegrini', 'Nueva Esperanza', 'Carpintería general: aberturas, tranqueras y muebles rurales', true, 'Carpintería General', 'Credito', null, null, 12),
('Graciela', 'Orellana', '30666222', 'Atamisqui', 'Estación Atamisqui', 'Barrio Estación, calle Las Heras 15', '3854223300', 'lucariossantillan.trabajo+marroquineria@gmail.com',
'Marroquinería Atamisqui', 'Las Heras', '15', 'Estación', 'Atamisqui', 'Estación Atamisqui', 'Confección de bolsos, billeteras y portamates de cuero', true, 'Talabartería y Cuero', 'Subsidio', null, null, 13),
('Camila', 'Montenegro', '39888111', 'Banda', 'La Banda', 'Barrio Los Lagos, calle Alberdi 1302', '3854334400', 'lucariossantillan.trabajo+ropamia@gmail.com',
'Ropa de Niños Mía', 'Alberdi', '1302', 'Los Lagos', 'Banda', 'La Banda', 'Confección de ropa para bebés y niños con algodón y tejido de punto', true, 'Indumentaria', 'Subsidio', null, null, 14),
-- Área: en revisión
('Walter', 'Luna', '27999222', 'Moreno', 'Quimilí', 'Barrio Centro, Av. Belgrano 560', '3854445500', 'lucariosazul+mueblesmonte@gmail.com',
'Muebles del Monte', 'Av. Belgrano', '560', 'Centro', 'Moreno', 'Quimilí', 'Fabricación de mesas, sillas y bancos de algarrobo y quebracho', true, 'Muebles', 'Credito', null, null, 15),
('Nélida', 'Sosa', '24777333', 'Avellaneda', 'Herrera', 'Paraje El Salado, casa 4', '3854556600', 'lucariossantillan.trabajo+ponchossalado@gmail.com',
'Ponchos del Salado', 'Ruta Provincial 21', 's/n', 'El Salado', 'Avellaneda', 'Herrera', 'Tejido de ponchos y fajas en telar criollo con tintes naturales', true, 'Telares artesanales', 'Subsidio', null, null, 16),
-- Aprobadas por el Área
('Rocío', 'Lescano', '37444555', 'Capital', 'Santiago del Estero', 'Barrio Centenario, calle Lavalle 820', '3855667700', 'lucariossantillan.trabajo+plateria@gmail.com',
'Platería Santiagueña', 'Lavalle', '820', 'Centenario', 'Capital', 'Santiago del Estero', 'Orfebrería en alpaca y plata: aros, anillos y dijes con motivos santiagueños', true, 'Bisutería', 'Subsidio', -27.8012000000, -64.2589000000, 17),
('Ángel', 'Figueroa', '29111444', 'Silípica', 'Arraga', 'Barrio Centro, calle Independencia 45', '3854778800', 'lucariosazul+bomboschacarera@gmail.com',
'Bombos La Chacarera', 'Independencia', '45', 'Centro', 'Silípica', 'Arraga', 'Fabricación de bombos legüeros con parche de cuero de oveja y aros de madera', true, 'Bombos artesanales', 'Subsidio', -27.9420000000, -64.2075000000, 18),
('Ricardo', 'Ibarra', '26444777', 'Guasayán', 'San Pedro de Guasayán', 'Barrio Centro, calle Moreno 133', '3854889911', 'lucariossantillan.trabajo+cueroelrastro@gmail.com',
'Taller de Cuero El Rastro', 'Moreno', '133', 'Centro', 'Guasayán', 'San Pedro de Guasayán', 'Talabartería: riendas, cabezadas, monturas y cintos de cuero crudo', true, 'Talabartería y Cuero', 'Credito', -27.9686000000, -65.1713000000, 19),
('Silvia', 'Carrizo', '31222555', 'Quebrachos', 'Sumampa', 'Barrio Santa Rosa, calle Urquiza 410', '3854990022', 'lucariossantillan.trabajo+losquebrachos@gmail.com',
'Mueblería Los Quebrachos', 'Urquiza', '410', 'Santa Rosa', 'Quebrachos', 'Sumampa', 'Fabricación de placares, alacenas y bajo mesadas a medida', true, 'Muebles', 'Credito', -29.3794000000, -63.4683000000, 20),
('Dora', 'Maldonado', '23555888', 'Salavina', 'Los Telares', 'Barrio Centro, calle Mitre 22', '3854001133', 'lucariosazul+tejeduria@gmail.com',
'Tejeduría Los Telares', 'Mitre', '22', 'Centro', 'Salavina', 'Los Telares', 'Tejido en telar de alfombras, matras y caminos de mesa', true, 'Telares artesanales', 'Subsidio', -28.8680000000, -63.4440000000, 21),
('Oscar', 'Barrionuevo', '28333666', 'San Martín', 'Brea Pozo', 'Barrio Centro, calle Rivadavia 300', '3854112244', 'lucariossantillan.trabajo+elalgarrobo@gmail.com',
'Carpintería El Algarrobo', 'Rivadavia', '300', 'Centro', 'San Martín', 'Brea Pozo', 'Carpintería de obra y muebles rústicos de algarrobo', true, 'Carpintería General', 'Credito', -28.2440000000, -63.9520000000, 22),
-- Finalizadas sin aprobar
('Franco', 'Ávalos', '41222333', 'Capital', 'Santiago del Estero', 'Barrio Cabildo, calle Avellaneda 615', '3855223355', 'lucariossantillan.trabajo+remerasfenix@gmail.com',
'Remeras Estampadas Fénix', 'Avellaneda', '615', 'Cabildo', 'Capital', 'Santiago del Estero', 'Estampado de remeras y buzos con diseños propios', true, 'Indumentaria', 'Subsidio', null, null, 23),
('Teresa', 'Pereyra', '22444999', 'Mitre', 'Villa Unión', 'Barrio Centro, calle 25 de Mayo 40', '3854334466', 'lucariosazul+telarteresa@gmail.com',
'Telar Doña Teresa', '25 de Mayo', '40', 'Centro', 'Mitre', 'Villa Unión', 'Tejido de ponchos y colchas en telar criollo', true, 'Telares artesanales', 'Subsidio', -29.4134000000, -62.7926000000, 24),
('Raúl', 'Gorosito', '30888444', 'Alberdi', 'Campo Gallo', 'Barrio Centro, calle Sarmiento 515', '3854445577', 'lucariossantillan.trabajo+sillasmateras@gmail.com',
'Sillas Materas Gorosito', 'Sarmiento', '515', 'Centro', 'Alberdi', 'Campo Gallo', 'Fabricación de sillas materas y banquetas de madera con asiento de tiento', true, 'Muebles', 'Credito', -26.5833000000, -62.8500000000, 25),
('Mariela', 'Tévez', '36555222', 'Sarmiento', 'Garza', 'Barrio Centro, calle Belgrano 210', '3854556688', 'lucariossantillan.trabajo+collaresalma@gmail.com',
'Collares Alma', 'Belgrano', '210', 'Centro', 'Sarmiento', 'Garza', 'Armado de collares y pulseras con cuentas de vidrio y semillas', true, 'Bisutería', 'Subsidio', -28.1500000000, -63.5390000000, 26);


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- EXPEDIENTE ----------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Expediente (idExpediente (PK), NroExpediente, idSolicitudInicio, FechaCarga, idUsuarioCargo (FK a Usuario: 14 y 15 son de Mesa de Entrada; la carga histórica la hace el Área))
-- Las solicitudes 9, 10 y 11 todavía no tienen expediente (bandeja de Mesa de Entrada)
insert into Expediente (NroExpediente, idSolicitudInicio, FechaCarga, idUsuarioCargo)
values ('EX-2026-FORMINICIO-BAN-001', 1, now() - interval 149 day, 14),
('EX-2026-FORMINICIO-FIG-011', 2, now() - interval 69 day, 15),
('EX-2026-FORMINICIO-CAP-009', 3, now() - interval 74 day, 14),
('EX-2026-FORMINICIO-RHO-012', 4, now() - interval 59 day, 14),
('EX-2026-FORMINICIO-CAP-013', 5, now() - interval 54 day, 15),
('EX-2026-FORMINICIO-ROB-005', 6, now() - interval 99 day, 14),
('EX-2023-FORMINICIO-LOR-014', 7, '2023-03-15 10:20:00', 3),
('EX-2026-FORMINICIO-CHO-003', 8, now() - interval 119 day, 15),
('EX-2026-FORMINICIO-PEL-024', 12, now() - interval 5 day, 14),
('EX-2026-FORMINICIO-ATA-023', 13, now() - interval 7 day, 15),
('EX-2026-FORMINICIO-BAN-022', 14, now() - interval 8 day, 14),
('EX-2026-FORMINICIO-MOR-021', 15, now() - interval 14 day, 14),
('EX-2026-FORMINICIO-AVE-020', 16, now() - interval 17 day, 15),
('EX-2026-FORMINICIO-CAP-018', 17, now() - interval 29 day, 14),
('EX-2026-FORMINICIO-SIL-016', 18, now() - interval 39 day, 15),
('EX-2026-FORMINICIO-GUA-015', 19, now() - interval 44 day, 14),
('EX-2026-FORMINICIO-QUE-014', 20, now() - interval 49 day, 14),
('EX-2026-FORMINICIO-SAL-012', 21, now() - interval 54 day, 15),
('EX-2026-FORMINICIO-SMA-008', 22, now() - interval 69 day, 14),
('EX-2026-FORMINICIO-CAP-017', 23, now() - interval 34 day, 15),
('EX-2026-FORMINICIO-MIT-010', 24, now() - interval 59 day, 14),
('EX-2026-FORMINICIO-ALB-006', 25, now() - interval 89 day, 15),
('EX-2026-FORMINICIO-SAR-007', 26, now() - interval 79 day, 14);

-- El trigger after_expediente_insert deja FechaRecibidoArea con la fecha de hoy: el Área la recibió el día de carga del expediente
update SolicitudInicio s
inner join Expediente e on e.idSolicitudInicio = s.idSolicitudInicio
set s.FechaRecibidoArea = date(e.FechaCarga)
where s.idSolicitudInicio > 0; -- condición por clave: el "safe update mode" de Workbench no deja actualizar sin ella


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- SUBSIDIO ------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Subsidio (idSubsidio (PK), PathFormularioSub, monto, MontoAnterior, FechaRecibido, EstadoRevision, ReenvioSolicitado, Aprobado (Si-No), FechaResolucion, MotivoRechazo, MensajeSolicitudReenvio, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK), idEmpleadoFacturas (FK), idEmpleadoPuestaMarcha (FK))
-- Facturas y puesta en marcha: 0 con la ayuda aprobada o pendiente, NULL con la ayuda rechazada (CHECK de la tabla)
insert into Subsidio (PathFormularioSub, monto, MontoAnterior, FechaRecibido, EstadoRevision, ReenvioSolicitado, Aprobado, FechaResolucion, MotivoRechazo, MensajeSolicitudReenvio, PathDirectorioFacturas, FacturasEntregadas, FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada, FechaPuestaMarcha, idSolicitudInicio, idEmpleadoRevisor, idEmpleadoFacturas, idEmpleadoPuestaMarcha)
values ('/uploads/subsidios/Presentacion-Subsidio-01.pdf', 850000.00, null, curdate() - interval 126 day, 2, false, true, curdate() - interval 118 day, null, null,
	'/uploads/facturas/subsidio-1-7d3f9a2c41b8e605', 1, curdate() - interval 85 day, curdate() - interval 80 day, null, 1, curdate() - interval 30 day, 1, 3, 3, 9), -- 1 Bombos Santos: facturas validadas y puesta en marcha acreditada
('/uploads/subsidios/Presentacion-Subsidio-02.pdf', 620000.00, null, curdate() - interval 45 day, 2, false, true, curdate() - interval 30 day, null, null,
	'/uploads/facturas/subsidio-2-c58e1b7a903d4f26', 1, curdate() - interval 3 day, null, null, 0, null, 2, 10, null, null), -- 2 Los Telares de Marta: facturas enviadas a revisar
('/uploads/subsidios/Presentacion-Subsidio-03.pdf', 450000.00, null, curdate() - interval 30 day, 2, false, true, curdate() - interval 12 day, null, null,
	null, 0, null, null, null, 0, null, 5, 3, null, null), -- 3 Bijoutery Paola: todavía no subió facturas
('/uploads/subsidios/Presentacion-Subsidio-04.pdf', 700000.00, null, curdate() - interval 75 day, 2, false, true, curdate() - interval 55 day, null, null,
	null, 0, null, null, null, 0, null, 6, 10, null, null), -- 4 Indumentaria Sofia: plazo de facturas vencido
('/uploads/subsidios/Presentacion-Subsidio-05.pdf', 540000.00, null, curdate() - interval 95 day, 2, false, true, curdate() - interval 75 day, null, null,
	'/uploads/facturas/subsidio-5-2b9e4d61f07a8c35', 1, curdate() - interval 40 day, curdate() - interval 35 day, null, 0, null, 8, 3, 9, null), -- 5 Cintos Hernan: facturas validadas, falta la puesta en marcha
('/uploads/subsidios/Presentacion-Subsidio-06.pdf', 780000.00, null, curdate() - interval 2 day, 0, false, null, null, null, null,
	null, 0, null, null, null, 0, null, 18, null, null, null), -- 6 Bombos La Chacarera: sin revisar
('/uploads/subsidios/Presentacion-Subsidio-07.pdf', 500000.00, null, curdate() - interval 10 day, 2, false, true, curdate() - interval 4 day, null, null,
	null, 0, null, null, null, 0, null, 21, 9, null, null), -- 7 Tejeduría Los Telares: aprobado, falta enviar al Ministro
('/uploads/subsidios/Presentacion-Subsidio-08.pdf', 900000.00, null, curdate() - interval 25 day, 2, false, false, curdate() - interval 18 day,
	'Los presupuestos adjuntos no corresponden a los bienes declarados en la hoja de costos y superan el monto del plan.', null,
	null, null, null, null, null, null, null, 24, 5, null, null); -- 8 Telar Doña Teresa: rechazado


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- CREDITO -------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Credito (idCredito (PK), PathFormularioCredito, monto, MontoAnterior, FechaRecibido, EstadoRevision, ReenvioSolicitado, ParteReenvio, Aprobado (Si-No), FechaResolucion, MotivoRechazo, MensajeSolicitudReenvio, PathDirectorioFacturas, FacturasEntregadas (Si-No), FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada (Si-No), FechaPuestaMarcha, idSolicitudInicio (FK), idEmpleadoRevisor (FK), idEmpleadoFacturas (FK), idEmpleadoPuestaMarcha (FK))
insert into Credito (PathFormularioCredito, monto, MontoAnterior, FechaRecibido, EstadoRevision, ReenvioSolicitado, ParteReenvio, Aprobado, FechaResolucion, MotivoRechazo, MensajeSolicitudReenvio, PathDirectorioFacturas, FacturasEntregadas, FechaEntregaFacturas, FechaFacturasValidadas, MotivoObservacionFacturas, PuestaMarchaAcreditada, FechaPuestaMarcha, idSolicitudInicio, idEmpleadoRevisor, idEmpleadoFacturas, idEmpleadoPuestaMarcha)
values ('/uploads/creditos/Presentacion-Credito-01.pdf', 1500000.00, null, curdate() - interval 50 day, 2, false, null, true, curdate() - interval 35 day, null, null,
	'/uploads/facturas/credito-1-91f0c3e8a2d5b746', 0, curdate() - interval 10 day, null,
	'La factura de la cepilladora no está a nombre del emprendedor y falta la factura de la madera declarada en el presupuesto. Suba las facturas corregidas y vuelva a enviarlas.',
	0, null, 3, 3, 3, null), -- 1 Mauricio Muebles: facturas observadas
('/uploads/creditos/Presentacion-Credito-02.pdf', 1200000.00, null, curdate() - interval 35 day, 2, false, null, true, curdate() - interval 22 day, null, null,
	'/uploads/facturas/credito-2-4a7d2e9c6b1f0835', 0, null, null, null, 0, null, 4, 9, null, null), -- 2 La Carpinteria Pajaro Loco: subió facturas, falta enviarlas
('/uploads/creditos/Presentacion-Credito-03.pdf', 950000.00, null, '2023-04-10', 2, false, null, true, '2023-05-30', null, null,
	null, 0, null, null, null, 0, null, 7, null, null, null), -- 3 La Talabarteria de Edu (carga histórica)
('/uploads/creditos/Presentacion-Credito-04.pdf', 1350000.00, 1420000.00, curdate() - interval 6 day, 1, false, 'Completo', null, null, null,
	'En la hoja de costos el total solicitado no coincide con los presupuestos adjuntos. Reenvíe el formulario completo con los montos corregidos.',
	null, 0, null, null, null, 0, null, 19, null, null, null), -- 4 Taller de Cuero El Rastro: en revisión (ya reenviado con otro monto)
('/uploads/creditos/Presentacion-Credito-05.pdf', 1100000.00, null, curdate() - interval 14 day, 1, true, 'Garante', null, null, null,
	'El recibo de sueldo del garante es de hace tres meses y la fotocopia del DNI no está autenticada. Reenvíe la hoja del garante con el último recibo y el DNI autenticado.',
	null, 0, null, null, null, 0, null, 20, null, null, null), -- 5 Mueblería Los Quebrachos: reenvío del garante pedido
('/uploads/creditos/Presentacion-Credito-06.pdf', 1800000.00, null, curdate() - interval 20 day, 2, false, null, true, curdate() - interval 12 day, null, null,
	null, 0, null, null, null, 0, null, 22, 3, null, null), -- 6 Carpintería El Algarrobo: aprobado, enviado al Ministro
('/uploads/creditos/Presentacion-Credito-07.pdf', 1000000.00, null, curdate() - interval 40 day, 2, false, null, true, curdate() - interval 32 day, null, null,
	null, 0, null, null, null, 0, null, 25, 9, null, null); -- 7 Sillas Materas Gorosito: aprobado por el Área, rechazado por el Ministro


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- GARANTE -------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Garante (idGarante (PK), NombreCompleto, DNI, Cuil, Telefono, Correo, PathFormularioGarante, idCredito (FK))
-- El crédito 3 es de carga histórica: no tiene garante cargado en el sistema
insert into Garante (NombreCompleto, DNI, Cuil, Telefono, Correo, PathFormularioGarante, idCredito)
values ('Ana María Paz', '20345678', '27203456781', '3855112244', 'lucariossantillan.trabajo+garantepaz@gmail.com', '/uploads/garantes/Presentacion-Garante-01.pdf', 1),
('Roberto Juárez', '22456789', '20224567899', '3858112255', 'lucariosazul+garantejuarez@gmail.com', '/uploads/garantes/Presentacion-Garante-02.pdf', 2),
('Claudia Ibarra', '24567890', '27245678903', '3854112266', 'lucariossantillan.trabajo+garanteibarra@gmail.com', '/uploads/garantes/Presentacion-Garante-03.pdf', 4),
('Néstor Carrizo', '21678901', '20216789017', '3854112277', 'lucariossantillan.trabajo+garantecarrizo@gmail.com', '/uploads/garantes/Presentacion-Garante-04.pdf', 5),
('Liliana Barrionuevo', '23789013', '27237890138', '3854112288', 'lucariosazul+garantebarrionuevo@gmail.com', '/uploads/garantes/Presentacion-Garante-05.pdf', 6),
('Daniel Gorosito', '25890123', '20258901232', '3854112299', 'lucariossantillan.trabajo+garantegorosito@gmail.com', '/uploads/garantes/Presentacion-Garante-06.pdf', 7);


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- EMPRENDIMIENTO ------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Emprendimiento (idEmprendimiento (PK), Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha (Si-No), ActividadPrincipal, Latitud, Longitud, idSolicitudInicio (FK), idRubro (fk))
-- idEmprendimiento = idSolicitudInicio (solicitudes 1 a 8)
insert into Emprendimiento (Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha, ActividadPrincipal, Latitud, Longitud, idSolicitudInicio, idRubro)
values ('Bombos Santos', '2026-BAN-001', 'Salta', '845', 'Villa Unión', 'Banda', 'La Banda', true, 'Fabricación artesanal de bombos legüeros con madera de ceibo y parche de cuero de cabra', -27.7351000000, -64.2425000000, 1, 1), -- 1
('Los Telares de Marta', '2026-FIG-006', 'Ruta Provincial 5', '120', 'Centro', 'Figueroa', 'La Cañada', true, 'Tejido en telar criollo de ponchos, chales, bufandas y caminos de mesa con lana de oveja', -27.6519000000, -63.7731000000, 2, 2), -- 2
('Mauricio Muebles', '2026-CAP-005', 'Av. Solís', '1520', 'Autonomía', 'Capital', 'Santiago del Estero', true, 'Fabricación de muebles a medida en melamina y madera maciza: escritorios, cómodas y placares', -27.7988000000, -64.2701000000, 3, 3), -- 3
('La Carpinteria Pajaro Loco', '2026-RHO-007', 'Caseros', '410', 'Centro', 'Río Hondo', 'Las Termas de Río Hondo', true, 'Carpintería de obra: puertas, ventanas, bibliotecas y estanterías a medida', -27.4952000000, -64.8601000000, 4, 4), -- 4
('Bijoutery Paola', '2026-CAP-008', 'Libertad', '1120', 'Belgrano', 'Capital', 'Santiago del Estero', true, 'Diseño y armado de bijouterie artesanal: collares, pulseras, aros y broches', -27.7905000000, -64.2528000000, 5, 5), -- 5
('Indumentaria Sofia', '2026-ROB-003', '9 de Julio', '356', 'San Martín', 'Robles', 'Fernández', false, 'Confección de indumentaria con bordados y guardas tradicionales: blusas, pulóveres y mochilas', -27.9236000000, -63.8968000000, 6, 6), -- 6 (sin poner en marcha)
('La Talabarteria de Edu', '2023-LOR-014', 'Av. San Martín', '230', 'Centro', 'Loreto', 'Loreto', true, 'Talabartería tradicional: monturas, cintos, portabotellas y artículos de cuero crudo y curtido', -28.3008000000, -64.1892000000, 7, 7), -- 7 (carga histórica)
('Cintos Hernan', '2026-CHO-002', 'Rivadavia', '640', 'Ferroviario', 'Choya', 'Frías', true, 'Confección de cintos de cuero y carpincho con trenzados y tejido pampa', -28.6372000000, -65.1288000000, 8, 7); -- 8


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- EMPRENDEDOR ---------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Emprendedor (idEmprendedor (PK), Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, Antecedentes, DescripcionAntecedente, idEmprendimiento (FK))
insert into Emprendedor (Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, Antecedentes, DescripcionAntecedente, idEmprendimiento)
values ('Pedro', 'Santos', '30111222', 'Banda', 'La Banda', 'Barrio Villa Unión, calle Salta 845', '3854112233', 'lucariosazul+bombossantos@gmail.com', false, null, 1), -- 1
('Marta', 'Ledesma', '27333444', 'Figueroa', 'La Cañada', 'Paraje La Cañada, casa 12', '3854223344', 'lucariossantillan.trabajo+telaresmarta@gmail.com', false, null, 2), -- 2
('Mauricio', 'Paz', '32555666', 'Capital', 'Santiago del Estero', 'Barrio Autonomía, Av. Solís 1520', '3855334455', 'lucariossantillan.trabajo+mauriciomuebles@gmail.com', false, null, 3), -- 3
('Julio', 'Juárez', '29444555', 'Río Hondo', 'Las Termas de Río Hondo', 'Barrio Jorge Newbery, Pje. Los Ceibos 233', '3858445566', 'lucariosazul+pajaroloco@gmail.com', false, null, 4), -- 4
('Paola', 'Herrera', '35666777', 'Capital', 'Santiago del Estero', 'Barrio Belgrano, calle Libertad 1120', '3855556677', 'lucariossantillan.trabajo+bijouterypaola@gmail.com', false, null, 5), -- 5
('Sofía', 'Coronel', '38777888', 'Robles', 'Fernández', 'Barrio San Martín, calle 9 de Julio 356', '3854667788', 'lucariossantillan.trabajo+indumentariasofia@gmail.com', true,
	'No entregó las Facturas de Ley dentro de los 30 días desde la aprobación del Ministro. Se la llamó por teléfono y se comprometió a presentarlas.', 6), -- 6
('Eduardo', 'Ávila', '25888999', 'Loreto', 'Loreto', 'Barrio Centro, calle Belgrano 77', '3854889922', 'lucariosazul+talabarteriaedu@gmail.com', false, null, 7), -- 7
('Hernán', 'Villalba', '31999000', 'Choya', 'Frías', 'Barrio Ferroviario, calle Rivadavia 640', '3854778899', 'lucariossantillan.trabajo+cintoshernan@gmail.com', false, null, 8); -- 8


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- USUARIO EMPRENDEDOR -------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Todos con la contraseña 1234Emprend--2 (usuarios 19 a 26)
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, Noticiero, idEmprendedor, idEmpleado)
values ('lucariosazul+bombossantos@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 1, null), -- Usuario 19
('lucariossantillan.trabajo+telaresmarta@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 2, null), -- Usuario 20
('lucariossantillan.trabajo+mauriciomuebles@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 3, null), -- Usuario 21
('lucariosazul+pajaroloco@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 4, null), -- Usuario 22
('lucariossantillan.trabajo+bijouterypaola@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 5, null), -- Usuario 23
('lucariossantillan.trabajo+indumentariasofia@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 6, null), -- Usuario 24
('lucariosazul+talabarteriaedu@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 7, null), -- Usuario 25
('lucariossantillan.trabajo+cintoshernan@gmail.com', '$2b$10$FWxrKuusrwuIVBWMlKWR0ury8TTFvC1bdnHz5LGaFbKBIgF9MzP7y', 'Emprendedor', true, false, 8, null); -- Usuario 26


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- PUBLICACION ---------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Publicacion (idPublicacion (PK), idEmprendimiento (FK), TituloActual, DescripcionActual, DirectorioFotosActual, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion (0: Sin cambios, 1: Revision pendiente, 2: Rechazado), FechaSolicitud, FechaRevision, MotivoRechazo, idEmpleadoModerador (FK))
-- Máximo 2 por emprendimiento. Las fotos las copia preparar-archivos-presentacion.js
-- Como en el sistema, todas entran "en revisión" (el trigger de INSERT registra el título propuesto) y después se moderan
insert into Publicacion (idEmprendimiento, TituloPendiente, DescripcionPendiente, DirectorioFotosPendiente, EstadoModeracion, FechaSolicitud)
values (1, 'Bombos legüeros hechos a mano', 'En nuestro taller de La Banda fabricamos bombos legüeros con madera de ceibo y parche de cuero de cabra. Cada bombo se arma, se ata y se afina a mano. Hacemos bombos personalizados con nombres, guardas y dibujos pintados.',
	'/uploads/publicaciones/1/presentacion-1', 1, curdate() - interval 90 day), -- 1 aprobada
(1, 'Nuevo taller y entregas a todo el país', 'Con el subsidio del plan compramos un torno y herramientas nuevas: ahora fabricamos el doble de bombos por mes. Hacemos envíos a todo el país y recibimos encargos para conjuntos folklóricos y escuelas de danza.',
	'/uploads/publicaciones/2/presentacion-1', 1, curdate() - interval 25 day), -- 2 aprobada
(2, 'Tejidos en telar criollo', 'Tejemos ponchos, chales y caminos de mesa en telar criollo, con lana de oveja hilada y teñida por nosotras. Cada pieza lleva varios días de trabajo y conserva las guardas tradicionales de Figueroa.',
	'/uploads/publicaciones/3/presentacion-1', 1, curdate() - interval 15 day), -- 3 aprobada
(2, 'Feria de invierno en La Cañada', 'Este sábado estaremos en la feria de la plaza de La Cañada con chales, bufandas y ponchos nuevos. También tomamos encargos de caminos de mesa con los colores que elijas.',
	'/uploads/publicaciones/4/presentacion-1', 1, curdate() - interval 1 day), -- 4 nueva, pendiente de revisión
(3, 'Muebles a medida para tu casa', 'Fabricamos escritorios, cómodas y placares a medida en melamina y madera maciza. Tomamos las medidas en tu casa, te mostramos el diseño y lo entregamos armado.',
	'/uploads/publicaciones/5/presentacion-1', 1, curdate() - interval 21 day), -- 5 aprobada (más abajo se le carga una edición pendiente)
(4, 'Carpintería de obra en Las Termas', 'Hacemos puertas, ventanas, bibliotecas y estanterías a medida. Trabajamos con madera seca de primera calidad y hacemos la colocación en obra.',
	'/uploads/publicaciones/6/presentacion-1', 1, curdate() - interval 10 day), -- 6 aprobada
(4, 'Promoción de aberturas', 'Puertas y ventanas con 20% de descuento todo el mes. Escribinos al 3858 445566 o pasá por el taller de calle Caseros.',
	'/uploads/publicaciones/7/presentacion-1', 1, curdate() - interval 6 day), -- 7 rechazada
(5, 'Bijouterie artesanal hecha en Santiago', 'Diseño y armo collares, pulseras, aros y broches con piedras, nácar, cuero y alambre. Cada pieza es única. ¡Gracias al plan Santiago Productivo pude comprar herramientas y materiales!',
	'/uploads/publicaciones/8/presentacion-1', 1, curdate()), -- 8 nueva, pendiente de revisión (primera publicación de la emprendedora)
(6, 'Blusas bordadas a mano', 'Confeccionamos blusas de algodón con bordados de flores hechos a mano, en talles del S al XXL. También hacemos prendas a pedido para grupos de danza.',
	'/uploads/publicaciones/9/presentacion-1', 1, curdate() - interval 40 day), -- 9 aprobada
(6, 'Abrigos y mochilas con guardas', 'Para este invierno sumamos pulóveres de lana con guardas tradicionales y mochilas de cuero con tejido en telar.',
	'/uploads/publicaciones/10/presentacion-1', 1, curdate() - interval 30 day), -- 10 aprobada
(7, 'Talabartería tradicional en Loreto', 'Hace más de veinte años trabajamos el cuero en Loreto: monturas, riendas, cintos, portabotellas y canastos materos. Usamos cuero crudo y curtido de la zona y costuras a mano.',
	'/uploads/publicaciones/11/presentacion-1', 1, curdate() - interval 60 day), -- 11 aprobada
(8, 'Cintos de cuero y carpincho', 'Hacemos cintos de cuero vacuno y carpincho con trenzados y tejido pampa. Elegí el largo, el color y la hebilla.',
	'/uploads/publicaciones/12/presentacion-1', 1, curdate() - interval 50 day), -- 12 aprobada
(8, 'Nuevos modelos para el Día del Padre', 'Llegaron los cintos con tejido pampa en tres combinaciones de colores y los de cuero liso con hebilla de bronce. Hacemos grabados con iniciales sin cargo.',
	'/uploads/publicaciones/13/presentacion-1', 1, curdate() - interval 1 day); -- 13 nueva, pendiente de revisión

-- Aprobadas: lo pendiente pasa a lo visible (igual que la moderación del sistema), al día siguiente de pedirse
update Publicacion
set TituloActual = TituloPendiente, DescripcionActual = DescripcionPendiente, DirectorioFotosActual = DirectorioFotosPendiente,
	TituloPendiente = null, DescripcionPendiente = null, DirectorioFotosPendiente = null,
	EstadoModeracion = 0, FechaRevision = FechaSolicitud + interval 1 day, MotivoRechazo = null,
	idEmpleadoModerador = case when idPublicacion in (1, 3, 6, 11) then 3 when idPublicacion = 9 then 10 else 9 end
where idPublicacion in (1, 2, 3, 5, 6, 9, 10, 11, 12);

-- Rechazada
update Publicacion
set EstadoModeracion = 2, FechaRevision = curdate() - interval 5 day, idEmpleadoModerador = 9,
	MotivoRechazo = 'La publicación incluye un número de teléfono personal y una promoción con precios que el Ministerio no puede verificar. Quite esos datos y vuelva a enviarla.'
where idPublicacion = 7;

-- Edición pendiente de la publicación 5: sigue visible lo aprobado hasta que se revise la nueva versión
update Publicacion
set TituloPendiente = 'Muebles a medida para tu casa y oficina',
	DescripcionPendiente = 'Fabricamos escritorios, cómodas, placares y muebles de oficina a medida en melamina y madera maciza. Con el crédito del plan sumamos una escuadradora: ahora entregamos en la mitad de tiempo.',
	DirectorioFotosPendiente = '/uploads/publicaciones/5/presentacion-2', EstadoModeracion = 1, FechaSolicitud = curdate() - interval 2 day
where idPublicacion = 5;


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- PRODUCTO ------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Producto (idProducto (PK), idEmprendimiento (FK), Nombre, Precio (null = Consultar precio), Descripcion, PathFoto, Activo (Si-No), FechaAlta)
-- Máximo 4 por emprendimiento (contando los ocultos)
insert into Producto (idEmprendimiento, Nombre, Precio, Descripcion, PathFoto, Activo, FechaAlta)
values (1, 'Bombo legüero personalizado', 185000.00, 'Bombo de ceibo con parche de cuero de cabra, guardas pampa y el nombre que elijas pintado a mano.', '/uploads/productos/1/producto-1-presentacion.jpg', true, curdate() - interval 85 day),
(1, 'Bombo legüero con sol de Mayo', 210000.00, 'Bombo de ceibo pintado con el sol de Mayo, flores y nombre personalizado. Incluye palillos.', '/uploads/productos/1/producto-2-presentacion.jpg', true, curdate() - interval 85 day),
(1, 'Mates bombito pintados', 18000.00, 'Mates de madera con forma de bombo, pintados a mano. Precio por unidad.', '/uploads/productos/1/producto-3-presentacion.jpg', true, curdate() - interval 20 day),
--
(2, 'Chal tejido con bordado de flores', 65000.00, 'Chal de lana de oveja tejido en telar, con flores bordadas a mano y flecos.', '/uploads/productos/2/producto-1-presentacion.jpg', true, curdate() - interval 14 day),
(2, 'Camino de mesa con guarda pampa', 42000.00, 'Camino de mesa de 1,50 m tejido en telar criollo con guarda pampa.', '/uploads/productos/2/producto-2-presentacion.jpg', true, curdate() - interval 14 day),
(2, 'Bufandas tejidas con flores bordadas', null, 'Bufandas de lana en varios colores con flores bordadas. Consultá por colores disponibles.', '/uploads/productos/2/producto-3-presentacion.jpg', true, curdate() - interval 12 day),
--
(3, 'Escritorio para computadora', 145000.00, 'Escritorio de melamina con bandeja para teclado y estante para CPU e impresora.', '/uploads/productos/3/producto-1-presentacion.jpg', true, curdate() - interval 20 day),
(3, 'Escritorio curvo de diseño', null, 'Escritorio de madera maciza con tapa curva, hecho a medida.', '/uploads/productos/3/producto-2-presentacion.jpg', true, curdate() - interval 20 day),
(3, 'Cómoda cambiador de 4 cajones', 260000.00, 'Cómoda con bandeja cambiador, 4 cajones y frente de madera natural.', '/uploads/productos/3/producto-3-presentacion.jpg', true, curdate() - interval 18 day),
--
(4, 'Biblioteca modular y estantes', 230000.00, 'Biblioteca baja con patas de madera y estantes de pared en multilaminado de pino.', '/uploads/productos/4/producto-1-presentacion.jpg', true, curdate() - interval 9 day),
(4, 'Ventana de madera con vidrio repartido', 175000.00, 'Ventana de cedro de abrir hacia afuera, con vidrio repartido. Se hace a medida.', '/uploads/productos/4/producto-2-presentacion.jpg', true, curdate() - interval 9 day),
(4, 'Puertas placa a medida', 190000.00, 'Puertas placa con barral, en tres terminaciones de madera.', '/uploads/productos/4/producto-3-presentacion.jpg', false, curdate() - interval 8 day), -- oculto en el perfil público
--
(5, 'Pulseras de cuero trenzado', 12000.00, 'Pulseras de cuero trenzado con dijes de alpaca y piedras de colores.', '/uploads/productos/5/producto-1-presentacion.jpg', true, curdate() - interval 2 day),
(5, 'Collar de nácar verde', 28000.00, 'Collar con colmillos de nácar verde sobre cordón encerado.', '/uploads/productos/5/producto-2-presentacion.jpg', true, curdate() - interval 2 day),
(5, 'Broche flor de alambre y perla', 35000.00, 'Broche en forma de flor, hecho con alambre y resina, con una perla en el centro.', '/uploads/productos/5/producto-3-presentacion.png', true, curdate() - interval 1 day),
--
(6, 'Blusas bordadas a mano', 38000.00, 'Blusas de algodón con bordado de flores en el escote. Talles S a XXL.', '/uploads/productos/6/producto-1-presentacion.jpg', true, curdate() - interval 40 day),
(6, 'Mochila de cuero con guarda tejida', 95000.00, 'Mochila de cuero negro con solapa de tejido en telar y herrajes metálicos.', '/uploads/productos/6/producto-2-presentacion.jpg', true, curdate() - interval 30 day),
(6, 'Pulóver de lana con guarda', 72000.00, 'Pulóver de lana de oveja tejido a mano con guarda tradicional.', '/uploads/productos/6/producto-3-presentacion.jpg', true, curdate() - interval 30 day),
--
(7, 'Montura de cuero repujada', 480000.00, 'Montura criolla de cuero repujado con costuras a mano.', '/uploads/productos/7/producto-1-presentacion.jpg', true, curdate() - interval 60 day),
(7, 'Portabotellas de cuero', 45000.00, 'Portabotellas de cuero curtido con costura cruzada y correa regulable.', '/uploads/productos/7/producto-2-presentacion.jpg', true, curdate() - interval 60 day),
(7, 'Canasto matero de cuero', 52000.00, 'Canasto con divisiones para termo, mate y yerbera, con asa de cuero.', '/uploads/productos/7/producto-3-presentacion.webp', true, curdate() - interval 55 day),
--
(8, 'Cinto con tejido pampa', 32000.00, 'Cinto de cuero negro con tejido pampa en verde, rojo y crudo. Hebilla de bronce.', '/uploads/productos/8/producto-1-presentacion.jpg', true, curdate() - interval 50 day),
(8, 'Cinto de carpincho trenzado', 48000.00, 'Cinto de carpincho con bordes trenzados y hebilla de alpaca.', '/uploads/productos/8/producto-2-presentacion.jpg', true, curdate() - interval 50 day),
(8, 'Cinto de cuero liso', 22000.00, 'Cinto de cuero vacuno con costura y hebilla niquelada.', '/uploads/productos/8/producto-3-presentacion.jpg', true, curdate() - interval 45 day);


-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- NOTICIA -------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Noticia (idNoticia (PK), Titulo, Contenido, ImagenUrl (carpeta con foto-1 y foto-2), Visible (Si-No), idAutor (FK a Usuario con Noticiero), FechaCreacion, FechaEdicion)
insert into Noticia (Titulo, Contenido, ImagenUrl, Visible, idAutor, FechaCreacion)
values ('Jornada de formalización: monotributo social y facturación',
	'Más de 40 emprendedores participaron de la jornada de formalización. Se explicó cómo inscribirse en el Monotributo Social, cómo emitir facturas desde el celular y por qué las Facturas de Ley son necesarias para rendir el Subsidio o el Crédito del plan.',
	'/uploads/NoticiasImagen/noticia-presentacion-5', true, 9, now() - interval 60 day),
('Los emprendedores del plan participaron de la Expo Artesanal de La Banda',
	'Durante el fin de semana, emprendedores de los rubros telares, talabartería y bombos artesanales expusieron y vendieron sus productos en la Expo Artesanal de La Banda. Fue una gran oportunidad para mostrar el trabajo realizado con el apoyo del plan Santiago Productivo.',
	'/uploads/NoticiasImagen/noticia-presentacion-2', true, 1, now() - interval 40 day),
('Feria de Emprendedores en el Parque Aguirre',
	'El próximo sábado de 17 a 22 hs se realizará una nueva Feria de Emprendedores en el Parque Aguirre. Habrá más de 30 puestos con bijouterie, indumentaria, muebles y artesanías de toda la provincia. La entrada es libre y gratuita.',
	'/uploads/NoticiasImagen/noticia-presentacion-1', true, 1, now() - interval 20 day),
('Capacitación en costos y precios para emprendedores',
	'Se dictó la capacitación "¿Cuánto cobro por mi trabajo?", en la que se trabajó cómo calcular el costo de la materia prima, la mano de obra y los gastos fijos para ponerle precio a cada producto. La próxima edición será en el interior de la provincia.',
	'/uploads/NoticiasImagen/noticia-presentacion-3', true, 3, now() - interval 8 day),
('Taller de fotografía de productos con el celular',
	'Para que las publicaciones de los emprendimientos luzcan mejor, se realizó un taller práctico de fotografía de productos con el celular: luz natural, fondos simples y encuadre. Las fotos se pueden subir directamente desde la cuenta de cada emprendedor.',
	'/uploads/NoticiasImagen/noticia-presentacion-4', true, 9, now() - interval 3 day),
('Cambio de horario de Mesa de Entrada durante el receso invernal',
	'Durante el receso invernal, Mesa de Entrada atenderá de 8 a 12 hs. Los formularios digitales se pueden seguir enviando desde la página los lunes, miércoles y viernes.',
	null, false, 1, now() - interval 130 day); -- oculta en la página pública
