use ProyectoEmprendimientos2026;

-- PARA REALIZAR PRUEBA DE AUDITORIA EJECUTAR AMBAS LINEAS DE ABAJO
SET @usuario_id = 10; -- El ID del empleado que está logueado en ese momento
SET @usuario_ip = '222.555.33.4';
-- select * from auditoria;
-- select * from empleado;
 -- -----------------------------------------------------------------------------------------------------------
-- INSERTANDO DATOS --------------------------------------------------------------------------------
-- -----------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- EMPLEADO ------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Empleado (idEmpleado (PK), Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo (Mesa de Entrada - Técnico - Social - Administrador), Activo (Si-No))
 /*insert into Empleado (Nombre, Apellido, DNI, Domicilio, Teléfono, Correo, Cargo, Activo)
values ('Sebastian', 'Santillan', '20987654', 'Av. Belgrano 550, Edificio A, Piso 3', '3855112233', 'empleaSebas.santill@gmail.com', 'Administrador', true), -- Empleado 1 admin
('Admin2', 'Santillan', '20100001', 'Barrio domicilio admin 1', '3856000001', 'admin2@gmail.com', 'Administrador', true), -- Empleado 2 admin
-- 
('Luca', 'Rios', '12354678', 'Barrio la pampuna entre pellegrini y san martin', '3846892734', 'empleadoriosnum1@gmail.com', 'Técnico', true), -- Empleado 3 tecnico
('Tecnico2', 'Ibañes2', '20100002', 'Barrio domicilio tecnico 2', '3856000002', 'tecnico2@gmail.com', 'Técnico', False), -- Empleado 4 tecnico
('Tecnico3', 'Ibañes3', '20100003', 'Barrio domicilio tecnico 3', '3856000003', 'tecnico3@gmail.com', 'Técnico', False), -- Empleado 5 tecnico
('Tecnico4', 'Ibañes4', '20100004', 'Barrio domicilio tecnico 4', '3856000004', 'tecnico4@gmail.com', 'Técnico', False), -- Empleado 6 tecnico
('Tecnico5', 'Ibañes5', '20100005', 'Barrio domicilio tecnico 5', '3856000005', 'tecnico5@gmail.com', 'Técnico', False), -- Empleado 7 tecnico
('Tecnico6', 'Ibañes6', '20100006', 'Barrio domicilio tecnico 6', '3856000006', 'tecnico6@gmail.com', 'Técnico', False), -- Empleado 8 tecnico
-- 
('Miguel', 'Stefanici', '43567213', 'Barrio Centro', '3856789034', 'stefaniMiguel@gmail.com', 'Social', true), -- Empleado 9 social
('Social2', 'Stefanici2', '20100007', 'Barrio domicilio social 2', '3856000007', 'social2@gmail.com', 'Social', true), -- Empleado 10 social
('Social3', 'Stefanici3', '20100008', 'Barrio domicilio social 3', '3856000008', 'social3@gmail.com', 'Social', true), -- Empleado 11 social
('Social4', 'Stefanici4', '20100009', 'Barrio domicilio social 4', '3856000009', 'social4@gmail.com', 'Social', true), -- Empleado 12 social
('Social5', 'Stefanici5', '20100010', 'Barrio domicilio social 5', '3856000010', 'social5@gmail.com', 'Social', true), -- Empleado 13 social
--
('Ari', 'Vasquez', '43567214', 'Barrio Centro', '3856789034', 'AriCorreoItse@gmail.com', 'Mesa de Entrada', true), -- Empleado 14 Mesa
('Mesa2', 'Vasquez2', '20100011', 'Barrio domicilio Mesa 2', '3856000011', 'Mesa2@gmail.com', 'Mesa de Entrada', true), -- Empleado 15 Mesa
('Mesa3', 'Vasquez3', '20100012', 'Barrio domicilio Mesa 3', '3856000012', 'Mesa3@gmail.com', 'Mesa de Entrada', true), -- Empleado 16 Mesa
('Mesa4', 'Vasquez4', '20100013', 'Barrio domicilio Mesa 4', '3856000013', 'Mesa4@gmail.com', 'Mesa de Entrada', true), -- Empleado 17 Mesa
('Mesa5', 'Vasquez5', '20100014', 'Barrio domicilio Mesa 5', '3856000014', 'Mesa5@gmail.com', 'Mesa de Entrada', true); -- Empleado 18 Mesa
*/

-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- SolicitudInicio -----------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- EMPRENDIMIENTO ------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------

-- Emprendimiento (idEmprendimiento (PK), Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha (Si-No), ActividadPrincipal, UbicaciónGM (pluscode), idSolicitudInicio (FK))
-- QUITAR RUBRO DE LOS INSERT
insert into Emprendimiento (Nombre, NroProyecto, Calle, NúmeroCalle, Barrio, Departamento, Localidad, EnMarcha, ActividadPrincipal, UbicaciónGM, idSolicitudInicio)
values ('Los bombitos de TUCUMAN', 'T78-PO-09', 'San martin del Prado', 256, 'Los palermos', 'Banda', 'La Banda', true, 'Fabricacion de Bombos: Fabricar artesanalmente bombos de cuero de cabra', '574Q7QGG+V44', 1); -- 1
/*
('Los ponchos ponchin', 2, 'Pellegrini', 300, 'Jerarquizado Nacional', 'Jimenez', 'Pozo Hondo', false, 'Fabricacion de ponchos', 'Fabricar artesanalmente ponchos de multiples colores', '574QRGQ2+272', 5), -- 2
('Taller El Nogal', 3, 'Ruta 34', 15, 'El Algarrobo', 'Atamisqui', 'Estación Atamisqui', true, 'Carpintería de Arte', 'Elaboración de tallas, marcos y pequeños muebles de madera de algarrobo y nogal', '574R7V4G+X64', 6), -- 3
('Tapicería La Esmeralda', 4, 'Calle Maipú', 55, 'Centro Termal', 'Río Hondo', 'Las Termas de Río Hondo', true, 'Servicios de Tapicería', 'Restauración y retapizado de muebles antiguos y tapizado de vehículos', '575R8X4M+C23', 7), -- 4
*/

-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- EMPRENDEDOR ------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
select * from emprendedor;
insert into Emprendedor (Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, idEmprendimiento)
values ('Alberto', 'Sanchez', '22999098', 'Banda', 'Ardiles', 'Ardiles, B. los palermos entre San Martin del Prado y pellegrini 489', '7836231312', 'AlbertoSanche@gmail.com', 1);-- emprendedor fundador 1
/* insert into Emprendedor (Nombre, Apellido, DNI, Departamento, Localidad, Domicilio, Teléfono, Correo, idEmprendimiento)
values ('Emprendedor2', 'Luca2', '46000001', 'Banda', 'Ardiles', 'Ardiles, B. los palermos entre San Martin del Prado y pellegrini 489', '3856000001', 'Emprendedor2prueba@gmail.com', 2),-- 2
('Emprendedor3', 'rios3', '46000002', 'Banda', 'Chaupi Pozo', 'Chaupi Pozo, B. los pozo entre pellegrini 100 y san jose', '3856000002', 'Emprendedor3prueba@gmail.com', 1),-- 3
('Emprendedor4', 'iba4', '46000003', 'Juan Felipe Ibarra', 'El Colorado', 'El colorado, B. los colorados entre x y x', '3856000003', 'Emprendedor4prueba@gmail.com', 1),-- 4
('Emprendedor5', 'Fern5', '46000004', 'Choya', 'Choya', 'Choya, B. los choya entre y x y', '3856000004', 'Emprendedor5prueba@gmail.com', 1),-- 5
('Emprendedor6', 'sanche6', '46000005', 'Guasayan', 'Guampacha', 'Guampacha, B. los Guampachanos entre g c g', '3856000005', 'Emprendedor6prueba@gmail.com', 1),-- 6
('Emprendedor7', 'Dias7', '46000006', 'Ojo de Agua', 'Pozo grande', 'Pozo grande, B. los grandes entre s y 7', '3856000006', 'Emprendedor7prueba@gmail.com', 1),-- 7
('Emprendedor8', 'stefa8', '46000007', 'Rivadavia', 'Colonia Alpina', 'Col. Alpina, B. los alpines entre o u o', '3856000007', 'Emprendedor8prueba@gmail.com', 1),-- 8
('Emprendedor9', 'juarez9', '46000008', 'Aguirre', 'Casares', 'Casares, B. los casarenses entre c y u', '3856000008', 'Emprendedor9prueba@gmail.com', 1),-- 9
('Emprendedor10', 'Setfa10', '46000008', 'Jimenez', 'Pozo Hondo', 'Pozo Hondo, B. los xxxxxx', '3856000009', 'Emprendedor10prueba@gmail.com', 1);-- 10
*/

-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- USUARIO ------------------------------------------------------------------------------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Usuario EMPLEADO -----------------------------------------------
/*
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado) -- contraseña de 12 caracteres: 1 mayus, 1 minus, 1 numero, 1 carac especial (ej: @, $, !, %, *, ?, &, -).
values ('empleaSebas.santill@gmail.com', '$2b$10$mEIN/RBMUB5G28bVno2gju3y9doFDfGfIcnq180L0036NaxCgymhO', 'Administrador', true, null, 1), -- Empleado 1 (admin) contra: 1234sEBASss--
('admin2@gmail.com', '$2b$10$mEIN/RBMUB5G28bVno2gju3y9doFDfGfIcnq180L0036NaxCgymhO', 'Administrador', true, null, 2), -- Empleado 2 (admin) contra: admiN1234@-2
--
('empleadoriosnum1@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 3), -- Empleado 3 (Técnico) contra: 1234rIOSss--
('tecnico2@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 4), -- Empleado 4 (Técnico) contra: tecNIco12@-2
('tecnico3@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 5), -- Empleado 5 (Técnico) contra: tecNIco12@-3
('tecnico4@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 6), -- Empleado 6 (Técnico) contra: tecNIco12@-4
('tecnico5@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 7), -- Empleado 7 (Técnico) contra: tecNIco12@-5
('tecnico6@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 8), -- Empleado 8 (Técnico) contra: tecNIco12@-6
--
('stefaniMiguel@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 9), -- Empleado 9 (Social) contra: SOcial10!Fun
('social2@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 10), -- Empleado 10 (Social) contra: SOcial123@-2
('social3@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 11), -- Empleado 11 (Social) contra: SOcial123@-3
('social4@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 12), -- Empleado 12 (Social) contra: SOcial123@-4
('social5@gmail.com', '$2b$10$r0T.pOzD/Z9WJP6xN8L4UeezeUwfROvI9990bC6MEyz5u5nUowp.q', 'Empleado de Area', true, null, 13), -- Empleado 13 (Social) contra: SOcial123@-5
--
('AriCorreoItse@gmail.com', '$2b$10$yfy6kvzMAlLMXZ7OIL2UH.gp1YNY9L6RU7swuAUy.tgg6cLbWKVtK', 'Empleado de Mesa', true, null, 14), -- Empleado 14 (de Mesa) contra: 1234AriItse--
('Mesa2@gmail.com', '$2b$10$yfy6kvzMAlLMXZ7OIL2UH.gp1YNY9L6RU7swuAUy.tgg6cLbWKVtK', 'Empleado de Mesa', true, null, 15), -- Empleado 15 (de Mesa) contra: MesA123!4@-2
('Mesa3@gmail.com', '$2b$10$yfy6kvzMAlLMXZ7OIL2UH.gp1YNY9L6RU7swuAUy.tgg6cLbWKVtK', 'Empleado de Mesa', true, null, 16), -- Empleado 16 (de Mesa) contra: MesA123!4@-3
('Mesa4@gmail.com', '$2b$10$yfy6kvzMAlLMXZ7OIL2UH.gp1YNY9L6RU7swuAUy.tgg6cLbWKVtK', 'Empleado de Mesa', true, null, 17), -- Empleado 17 (de Mesa) contra: MesA123!4@-4
('Mesa5@gmail.com', '$2b$10$yfy6kvzMAlLMXZ7OIL2UH.gp1YNY9L6RU7swuAUy.tgg6cLbWKVtK', 'Empleado de Mesa', true, null, 18); -- Empleado 18 (de Mesa) contra: MesA123!4@-5
*/
-- Usuario EMPRENDEDOR --------------------------------------------
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado)
values ('AlbertoSanche@gmail.com', '$2b$10$dZcQwXODcXg.o0Pz.XdWDuHMthBjFyGMCojygNN/Wf.gYbb.EoJ/i', 'Emprendedor', true, 2, null); -- Emprendedor 1 contra: 1234sANCHE--
/*
insert into Usuario (Correo, Contraseña, TipoUsuario, Activa, idEmprendedor, idEmpleado)
values ('Emprendedor2prueba@gmail.com', 'contraseña', 'Emprendedor', true, 2, null), -- Emprendedor 2 1234Empre--2
('Emprendedor3prueba@gmail.com', 'contraseña', 'Emprendedor', true, 3, null), -- Emprendedor 3 1234Empre--3
('Emprendedor4prueba@gmail.com', 'contraseña', 'Emprendedor', true, 4, null), -- Emprendedor 4 1234Empre--4
('Emprendedor5prueba@gmail.com', 'contraseña', 'Emprendedor', true, 5, null), -- Emprendedor 5 1234Empre--5
('Emprendedor6prueba@gmail.com', 'contraseña', 'Emprendedor', true, 6, null), -- Emprendedor 6 1234Empre--6
('Emprendedor7prueba@gmail.com', 'contraseña', 'Emprendedor', false, 7, null), -- Emprendedor 7 1234Empre--7
('Emprendedor8prueba@gmail.com', 'contraseña', 'Emprendedor', true, 8, null), -- Emprendedor 8 1234Empre--8
('Emprendedor9prueba@gmail.com', 'contraseña', 'Emprendedor', true, 9, null), -- Emprendedor 9 1234Empre--9
('Emprendedor10prueba@gmail.com', 'contraseña', 'Emprendedor', true, 10, null); -- Emprendedor 10 1234Empre-10
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

