-- Propiedades: el nombre como papá lo dice, no como se cargó (mayúsculas y prefijos).
-- 7 filas. Daniel, 24-sep-2026: «a) los cambio yo en la base».
update rent_properties set name = 'Marquis 7A'           where id = 5  and name = 'Condominio Marquis piso 7A';
update rent_properties set name = 'Brisa Marina'         where id = 6  and name = 'PH BRISA MARINA';
update rent_properties set name = 'Parque Marbella'      where id = 7  and name = 'PH parque Marbella';
update rent_properties set name = 'Torre del Pacífico'   where id = 8  and name = 'P H TORRE DEL PACIFICO';
update rent_properties set name = 'Brisa Marbella'       where id = 9  and name = 'P H BRISA MARBELLA';
update rent_properties set name = 'Crillón'              where id = 10 and name = 'P H CRILLON';
update rent_properties set name = 'Terreno Carrasquilla' where id = 11 and name = 'TERRENO  CARRASQUILLA';
