use ProyectoEmprendimientos2026;

-- PARA REALIZAR PRUEBA DE AUDITORIA EJECUTAR AMBAS LINEAS DE ABAJO
SET @usuario_id = 10; -- El ID del empleado que está logueado en ese momento
SET @usuario_ip = '222.555.33.4';
-- select * from auditoria;
-- select * from empleado;
 -- -----------------------------------------------------------------------------------------------------------
-- INSERTANDO DATOS --------------------------------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
-- EMPLEADOS
-- Empleado (idEmpleado (PK), Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo (Mesa de Entrada - Técnico - Social - Administrador), Activo (Si-No))
 insert into Empleado (Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo, Activo)
values ('Luca', 'Rios', '12354678', 'Barrio la pampuna entre pellegrini y san martin', '3846892734', 'empleadoriosnum1@gmail.com', 'Técnico', true), -- Empleado 1
('Sebastian', 'Santillan', '20987654', 'Av. Belgrano 550, Edificio A, Piso 3', '3855112233', 'empleaSebas.santill@gmail.com', 'Administrador', true), -- Empleado 2
('Victor', 'Ibañes', '20372234', 'Barrio la Puñalada, entre av san martin y rojas', '3854321223', 'IbaVictor123@gmail.com', 'Técnico', False), -- Empleado 3
('Miguel', 'Stefanici', '43567213', 'Barrio Centro', '3856789034', 'stefaniMiguel@gmail.com', 'Social', true), -- Empleado 4
('Ari', 'Vasquez', '43567214', 'Barrio Centro', '3856789034', 'AriCorreoItse@gmail.com', 'Mesa de Entrada', true); -- Empleado 5


-- SolicitudInicio (idSolicitudInicio (PK), DireccionPDF, DirectorioFotos, FechaRecibidoMesa, FechaRecibidoArea, EstadoRevisionArea (0: Sin revisar, 1: En proceso, 2: Finalizado), FechaInicioRev, FechaFinRev, idEmpleadoTecRevisor (FK), idEmpleadoSocRevisor (FK), AprobacionArea (si-no), AprobacionMinistro (Si-No), FechaResolucionMin, CorreoVal)
-- SolicitudInicio (DireccionPDF, DirectorioFotos, FechaRecibidoMesa)
insert into SolicitudInicio (DireccionPDF, DirectorioFotos, FechaRecibidoMesa)
values ('C:\Solicitudes\SolicitudInicial\FormIni01.pdf', 'C:\Fotos\FotosSolicitudInicial\FormIni01', '2010-01-15'), -- 1
('C:\Solicitudes\SolicitudInicial\FormIni02.pdf', 'C:\Fotos\FotosSolicitudInicial\FormIni02', default), -- 2 
('C:\Solicitudes\SolicitudInicial\FormIni03.pdf', 'C:\Fotos\FotosSolicitudInicial\FormIni03', '2011-01-28'); -- 3 
/*
-- SolicitudInicio (DireccionPDF, DirectorioFotos, FechaRecibido, EstadoRevisionTec, FechaInicioTec, FechaFinTec, idEmpleadoTecRevisor (FK), AprobacionTec)
insert into SolicitudInicio (DireccionPDF, DirectorioFotos, FechaRecibido, EstadoRevisionTec, FechaInicioTec, FechaFinTec, idEmpleadoTecRevisor, AprobacionTec)
values ('C:\Solicitudes\SolicitudInicial\FormIni04.pdf', 'C:\Fotos\FotosSolicitudInicial\FormIni04', '2010-01-15', 1, '2010-01-18', default, 1, default), -- 4
('C:\Solicitudes\SolicitudInicial\FormIni05.pdf', 'C:\Fotos\FotosSolicitudInicial\FormIni05', '2010-01-17', 2, '2010-01-20', '2010-01-25', 1, 1); -- 5
 
-- SolicitudInicio (DireccionPDF, DirectorioFotos, FechaRecibido, EstadoRevisionTec, FechaInicioTec, FechaFinTec, idEmpleadoTecRevisor (FK), AprobacionTec, EstadoRevisionSoc, FechaInicioSoc, FechaFinSoc, idEmpleadoSocRevisor(FK), AprobacionSoc, Válido (Si-No), FechaResolucion, CorreoVal)
insert into SolicitudInicio (DireccionPDF, DirectorioFotos, FechaRecibido, EstadoRevisionTec, FechaInicioTec, FechaFinTec, idEmpleadoTecRevisor, AprobacionTec, EstadoRevisionSoc, FechaInicioSoc, FechaFinSoc, idEmpleadoSocRevisor, AprobacionSoc, Válido, FechaResolucion, CorreoVal)
values ('C:\Solicitudes\SolicitudInicial\FormIni06.pdf', 'C:\Fotos\FotosSolicitudInicial\FormIni06', '2010-01-26', 2, '2010-01-27', '2010-01-28', 2, 1, 
2, '2010-01-29', '2010-01-30', 4, 1, 1, '2010-01-30', 'TE ACEPTAMOS, EN ESTE LINK INGRESA LA CONTRASEÑA DE TU USUARIO DEL SISTEMA. PARA INGRESAR EN EL SISTEMA UTILIZA TU CORREO X PARA INICIAR SECION Y LA CONTRASEÑA'); -- 6
*/


-- Emprendimiento (idEmprendimiento (PK), Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha (Si-No), ActividadPrincipal, UbicaciónGM (pluscode), idSolicitudInicio (FK))
-- QUITAR RUBRO DE LOS INSERT
insert into Emprendimiento (Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha, ActividadPrincipal, UbicaciónGM, idSolicitudInicio)
values ('Los bombitos de TUCUMAN', 'T78-PO-09', 'San martin del Prado', 256, 'Los palermos', 'Banda', 'La Banda', true, 'Fabricacion de Bombos: Fabricar artesanalmente bombos de cuero de cabra', '574Q7QGG+V44', 1); -- 1
/*
('Los ponchos ponchin', 2, 'Pellegrini', 300, 'Jerarquizado Nacional', 'Jimenez', 'Pozo Hondo', false, 'Fabricacion de ponchos', 'Fabricar artesanalmente ponchos de multiples colores', '574QRGQ2+272', 5), -- 2
('Taller El Nogal', 3, 'Ruta 34', 15, 'El Algarrobo', 'Atamisqui', 'Estación Atamisqui', true, 'Carpintería de Arte', 'Elaboración de tallas, marcos y pequeños muebles de madera de algarrobo y nogal', '574R7V4G+X64', 6), -- 3
('Tapicería La Esmeralda', 4, 'Calle Maipú', 55, 'Centro Termal', 'Río Hondo', 'Las Termas de Río Hondo', true, 'Servicios de Tapicería', 'Restauración y retapizado de muebles antiguos y tapizado de vehículos', '575R8X4M+C23', 7), -- 4
*/
insert into Emprendedor (Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, idEmprendimiento)
values ('Alberto', 'Sanchez', '22999098', 'Banda', 'Ardiles', 'Ardiles, B. los palermos entre San Martin del Prado y pellegrini 489', '7836231312', 'AlbertoSanche@gmail.com', 1);-- 1
/*
insert into Emprendedor (Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, idEmprendimiento)
values ('Alberto', 'Sanchez', '22999098', 'Banda', 'Ardiles', 'Ardiles, B. los palermos entre San Martin del Prado y pellegrini 489', '7836231312', 'AlbertoSanche@gmail.com', 1);-- 1
('Sofia', 'Carrizo', '35123456', 'Jiménez', 'Pozo Hondo, Barrio Centro, Gral. Güemes 123', '3856554433', 'sofia.carrizo@mail.com', 2), -- 2
('Ramón', 'Díaz', '18765432', 'Atamisqui', 'Estación Atamisqui, Calle Sarmiento 89', '3855776655', 'ramon.diaz@mail.com', 3), -- 3
('Lucía', 'Giménez', '40567890', 'Río Hondo', 'Las Termas, Av. Juan B. Justo 1050', '3858901234', 'lucia.gimenez@mail.com', 4), -- 4
('Juan', 'Herrera', '20101202', 'Capital', 'Santiago del Estero, Barrio Gorriti, Pje. Colón 20', '3854123456', 'juan.herrera@mail.com', 5), -- 5
('Mónica', 'Juárez', '30405060', 'Robles', 'Fernández, Calle San Juan 45, B° Este', '3855678901', 'monica.juarez@mail.com', 6), -- 6
('Esteban', 'Vega', '25876543', 'Guasayán', 'Villa Guasayán, Ruta 9 Km 15, Casa 3', '3856789012', 'esteban.vega@mail.com', 7), -- 7
('Valeria', 'Nieva', '42345678', 'Loreto', 'Loreto, B. Centro, Calle 9 de Julio 50', '3855234567', 'valeria.nieva@mail.com', 8); -- 8
*/
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado)
values ('AlbertoSanche@gmail.com', '$2b$10$dZcQwXODcXg.o0Pz.XdWDuHMthBjFyGMCojygNN/Wf.gYbb.EoJ/i', 'Emprendedor', true, 2, null); -- Emprendedor 1 contra: 1234sANCHE--
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado)
values ('empleaSebas.santill@gmail.com', '$2b$10$mEIN/RBMUB5G28bVno2gju3y9doFDfGfIcnq180L0036NaxCgymhO', 'Administrador', true, null, 2), -- Empleado 1 (admin) contra: 1234sEBASss--
('empleadoriosnum1@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 1), -- Empleado 2 (Técnico) contra: 1234rIOSss--
('AriCorreoItse@gmail.com', '$2b$10$yfy6kvzMAlLMXZ7OIL2UH.gp1YNY9L6RU7swuAUy.tgg6cLbWKVtK', 'Empleado de Mesa', true, null, 5); -- Empleado 3 (de Mesa) contra: 1234AriItse--
/*
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado)
values ('empleadonum1@gmail.com', '1234567890', 'Empleado', true, null, 1), -- empleado 1
('marta.gomez@gmail.com', '1234567890', 'Empleado', true, null, 2), -- empleado 2
('javi.perez@gmail.com', '1234567890', 'Empleado', true, null, 3), -- empleado 3
('ana.lopez@gmail.com', '1234567890', 'Empleado', true, null, 4), -- empleado 4
('carlos.diaz@gmail.com', '1234567890', 'Empleado', true, null, 5), -- empleado 5
('sofia.juarez@gmail.com', '1234567890', 'Empleado', false, null, 6), -- empleado 6
('pedro.vera@gmail.com', '1234567890', 'Empleado', true, null, 7), -- empleado 7
('elena.nunez@gmail.com', '1234567890', 'Empleado', true, null, 8), -- empleado 8
('AlbertoSanche@gmail.com', '1234567890', 'Emprendedor', true, 1, null), -- Emprendedor 1
('sofia.carrizo@mail.com', '1234567890', 'Emprendedor', true, 2, null), -- Emprendedor 2
('ramon.diaz@mail.com', '1234567890', 'Emprendedor', true, 3, null), -- Emprendedor 3
('lucia.gimenez@mail.com', '1234567890', 'Emprendedor', true, 4, null), -- Emprendedor 4
('juan.herrera@mail.com', '1234567890', 'Emprendedor', true, 5, null), -- Emprendedor 5
('monica.juarez@mail.com', '1234567890', 'Emprendedor', false, 6, null), -- Emprendedor 6
('esteban.vega@mail.com', '1234567890', 'Emprendedor', true, 7, null), -- Emprendedor 7
('valeria.nieva@mail.com', '1234567890', 'Emprendedor', false, 8, null); -- Emprendedor 8
*/

-- Etiqueta (idEtiqueta, nombre, activa) -----------------------------------------------------------------------------------------------------------------------------------------
insert into Etiqueta (Nombre, Activa)
values ('Madera', true),
('Reciclaje', true),
('Metal', false),
('Reutilizacion', true);


/*
insert into Subsidio (PathFormularioSub, monto, FechaRecibido, Aprobado, FechaAprobacion, PathDirectorioFacturas, FacturasEntregadas, FechaFacturasValidadas, PuestaMarchaAcreditada, FechaPuestaMarcha, idEmprendimiento, idEmpleadoRevisor)
values ('C:\Solicitudes\Subsidio\Formularios\FormSub01.pdf', 500000.00, '2010-03-20', true, '2010-04-01', 'C:\Solicitudes\Subsidio\Facturas\Formulario01', true, '2010-04-20', true, '2010-05-01', 1, 1), -- 1. Aprobado (Empr 1 - Empleado 1)
('C:\Solicitudes\Subsidio\Formularios\FormSub02.pdf', 9500000.00, '2010-03-21', false, '2010-04-01', null, null, null, null, null, 1, 2), -- 2. Denegado (Empr 1 - Empleado 2)
('C:\Solicitudes\Subsidio\Formularios\FormSub03.pdf', 400000.00, '2010-04-21', null, null, null, null, null, null, null, 2, null), -- 3. Sin revisar (Empr 2)
-- aprobados ------------
('C:\Solicitudes\Subsidio\Formularios\FormSub04.pdf', 700000.00, '2011-01-05', true, '2011-01-20', 'C:\Solicitudes\Subsidio\Facturas\Formulario04', true, '2011-02-10', true, '2011-03-01', 3, 3), -- 4. Aprobado (Empr 3 - Empleado 3)
('C:\Solicitudes\Subsidio\Formularios\FormSub05.pdf', 550000.00, '2011-01-10', true, '2011-01-25', 'C:\Solicitudes\Subsidio\Facturas\Formulario05', true, '2011-02-15', true, '2011-03-10', 4, 4), -- 5. Aprobado (Empr 4 - Empleado 4)
('C:\Solicitudes\Subsidio\Formularios\FormSub06.pdf', 850000.00, '2011-02-01', true, '2011-02-15', 'C:\Solicitudes\Subsidio\Facturas\Formulario06', true, '2011-03-05', true, '2011-04-01', 5, 5), -- 6. Aprobado (Empr 5 - Empleado 5)
('C:\Solicitudes\Subsidio\Formularios\FormSub07.pdf', 600000.00, '2011-02-10', true, '2011-02-25', 'C:\Solicitudes\Subsidio\Facturas\Formulario07', true, '2011-03-15', true, '2011-04-10', 6, 6), -- 7. Aprobado (Empr 6 - Empleado 6)
('C:\Solicitudes\Subsidio\Formularios\FormSub08.pdf', 900000.00, '2011-03-01', true, '2011-03-15', 'C:\Solicitudes\Subsidio\Facturas\Formulario08', true, '2011-04-05', true, '2011-05-01', 7, 1), -- 8. Aprobado (Empr 7 - Empleado 1)
('C:\Solicitudes\Subsidio\Formularios\FormSub09.pdf', 450000.00, '2011-03-10', true, '2011-03-25', 'C:\Solicitudes\Subsidio\Facturas\Formulario09', true, '2011-04-15', true, '2011-05-10', 8, 2), -- 9. Aprobado (Empr 8 - Empleado 2)
('C:\Solicitudes\Subsidio\Formularios\FormSub10.pdf', 900000.00, '2011-06-10', true, '2011-06-25', 'C:\Solicitudes\Subsidio\Facturas\Formulario10', true, '2011-07-15', true, '2011-08-10', 6, 6), -- 10. Aprobado (Empr 6 - Empleado 6)
-- Denegados -------------------------
('C:\Solicitudes\Subsidio\Formularios\FormSub11.pdf', 750000.00, '2011-04-01', false, '2011-04-15', null, null, null, null, null, 2, 3), -- 11. Denegado (Empr 2 - Empleado 3)
('C:\Solicitudes\Subsidio\Formularios\FormSub12.pdf', 500000.00, '2011-04-10', false, '2011-04-25', null, null, null, null, null, 3, 4), -- 12. Denegado (Empr 3 - Empleado 4)
('C:\Solicitudes\Subsidio\Formularios\FormSub13.pdf', 650000.00, '2011-05-01', false, '2011-05-15', null, null, null, null, null, 4, 5), -- 13. Denegado (Empr 4 - Empleado 5)
-- Sin revisar --------------------
('C:\Solicitudes\Subsidio\Formularios\FormSub14.pdf', 400000.00, '2011-05-10', null, null, null, null, null, null, null, 5, null), -- 14. Sin Revisar (Empr 5)
('C:\Solicitudes\Subsidio\Formularios\FormSub15.pdf', 800000.00, '2011-06-01', null, null, null, null, null, null, null, 7, null); -- 15. Sin Revisar (Empr 7)

insert into Credito (PathFormularioCredito, monto, FechaRecibido, Aprobado, FechaAprobacion, PathDirectorioFacturas, FacturasEntregadas, FechaFacturasValidadas, PuestaMarchaAcreditada, FechaPuestaMarcha, idEmprendimiento, idEmpleadoRevisor)
values ('C:\Solicitudes\Credito\Formularios\FormSub01.pdf', 200000.00, '2010-05-20', true, '2010-06-01', 'C:\Solicitudes\Credito\Facturas\Formulario01', true, '2010-06-20', true, '2010-07-01', 1, 1), -- 1. Aprobado (Empr 1 - Empleado 1)
('C:\Solicitudes\Credito\Formularios\FormSub02.pdf', 9000000.00, '2010-04-21', false, '2010-05-01', null, null, null, null, null, 1, 2), -- 2. Denegado (Empr 1 - Empleado 2)
('C:\Solicitudes\Credito\Formularios\FormSub03.pdf', 400000.00, '2010-04-23', null, null, null, null, null, null, null, 2, null), -- 3. Sin revisar (Empr 2)
('C:\Solicitudes\Credito\Formularios\FormCredito04.pdf', 750000.00, '2011-01-15', true, '2011-02-01', 'C:\Solicitudes\Credito\Facturas\Formulario04', true, '2011-02-20', true, '2011-03-15', 3, 3),   -- 4. Aprobado (Empr 3 - Empleado 3)
('C:\Solicitudes\Credito\Formularios\FormCredito05.pdf', 500000.00, '2011-03-01', false, '2011-03-15', null, null, null, null, null, 4, 4), -- 5. Denegado (Empr 4 - Empleado 4)
('C:\Solicitudes\Credito\Formularios\FormCredito06.pdf', 800000.00, '2011-04-01', false, '2011-04-15', null, null, null, null, null, 5, 5), -- 6. Denegado (Empr 5 - Empleado 5)
('C:\Solicitudes\Credito\Formularios\FormCredito07.pdf', 450000.00, '2011-05-01', null, null, null, null, null, null, null, 6, null), -- 7. Sin Revisar (Empr 6)
('C:\Solicitudes\Credito\Formularios\FormCredito08.pdf', 600000.00, '2011-06-01', null, null, null, null, null, null, null, 7, null); -- 8. Sin Revisar (Empr 7)

insert into Expediente (NroExpediente, idEmprendimiento)
values (101,1),
(102,2),
(103,3),
(104,4),
(105,5),
(106,6),
(107,7),
(108,8);
*/

