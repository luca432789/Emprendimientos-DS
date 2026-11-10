use ProyectoEmprendimientos2026;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
-- DATOS INICIALES: lo único que necesita una instalación nueva (también la del servidor).
-- Se ejecuta después de Tablas.sql, Triggers.sql y Usuario Conexion.sql.
-- El primer Administrador NO se carga acá (su contraseña no debe quedar en el repositorio): se crea una sola vez con
--   npm run crear-admin            (o, con Docker: docker compose exec app npm run crear-admin)
-- Los datos de prueba / demostración están aparte, en "Insert de datos.sql" (no usar en el servidor).
-- ---------------------------------------------------------------------------------------------------------------------------------------------------------------

-- Quien hace el cambio, para la auditoría: la instalación (sin usuario)
SET @usuario_id = NULL;
SET @usuario_ip = 'instalacion';

-- RUBRO ------------------------------------------------------------------------------------------------------------------------------------------------------
-- Rubro (idRubro (PK), Nombre, IconoMapa). Los iconos están en uploads/IconoMapa (se agregan más desde Administración de Rubros)
insert into Rubro (Nombre, IconoMapa)
values ('Bombos artesanal', '/uploads/IconoMapa/Bombo.png'), -- 1
('Telares artesanal', '/uploads/IconoMapa/Telares.png'), -- 2
('Muebles', '/uploads/IconoMapa/Muebles.png'), -- 3
('Carpinteria General', '/uploads/IconoMapa/Carpinteria - General.png'); -- 4
