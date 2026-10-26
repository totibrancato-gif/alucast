-- =========================================================================
-- Alucast: crear la empresa y darle acceso a los usuarios.
-- Antes, crear cada usuario en Authentication → Users → Add user → Create new user.
-- =========================================================================

-- 1) Crear la empresa y sumar el primer usuario (se corre una sola vez).
with e as (insert into public.empresas (nombre) values ('Alucast') returning id)
insert into public.miembros (user_id, empresa_id)
select u.id, e.id from auth.users u, e
where u.email = 'brunoalucast@gmail.com';

-- 2) Para sumar otro usuario a la misma empresa más adelante: cambiar el correo y correr solo esto.
-- insert into public.miembros (user_id, empresa_id)
-- select u.id, (select id from public.empresas where nombre = 'Alucast')
-- from auth.users u where u.email = 'otro@correo.com';

-- Para ver quién tiene acceso:
-- select u.email, e.nombre from public.miembros m
-- join auth.users u on u.id = m.user_id join public.empresas e on e.id = m.empresa_id;
