create type public.app_role as enum ('admin','secretario','subsecretario','rh','administrativo','consulta');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.role_permissions (
  role app_role not null,
  permissao text not null,
  primary key (role, permissao)
);
grant select, insert, delete on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;
alter table public.role_permissions enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_perm(_perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.ativo
    where ur.user_id = auth.uid()
      and (ur.role = 'admin' or exists (select 1 from public.role_permissions rp where rp.role = ur.role and rp.permissao = _perm))
  )
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id and p.ativo where ur.user_id = auth.uid())
$$;

create or replace function public.my_permissions()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select rp.permissao x from public.user_roles ur join public.profiles p on p.id = ur.user_id and p.ativo join public.role_permissions rp on rp.role = ur.role where ur.user_id = auth.uid()
    union select 'admin' where public.has_role(auth.uid(),'admin')
  ) s
$$;

create policy "own or admin read profiles" on public.profiles for select to authenticated using (id = auth.uid() or public.has_perm('usuarios.gerenciar'));
create policy "admin update profiles" on public.profiles for update to authenticated using (public.has_perm('usuarios.gerenciar'));
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_perm('usuarios.gerenciar'));
create policy "members read perms" on public.role_permissions for select to authenticated using (public.is_member());
create policy "admin insert perms" on public.role_permissions for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete perms" on public.role_permissions for delete to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.role_permissions (role, permissao) values
 ('secretario','servidores.ver'),('secretario','servidores.editar'),('secretario','cpf.ver'),('secretario','cadastros.editar'),('secretario','vagas.editar'),('secretario','relatorios.ver'),('secretario','auditoria.ver'),
 ('subsecretario','servidores.ver'),('subsecretario','servidores.editar'),('subsecretario','vagas.editar'),('subsecretario','relatorios.ver'),
 ('rh','servidores.ver'),('rh','servidores.editar'),('rh','servidores.excluir'),('rh','servidores.importar'),('rh','cpf.ver'),('rh','cadastros.editar'),('rh','vagas.editar'),('rh','relatorios.ver'),('rh','auditoria.ver'),
 ('administrativo','servidores.ver'),('administrativo','relatorios.ver'),
 ('consulta','servidores.ver'),('consulta','relatorios.ver');

create table public.cargos (id uuid primary key default gen_random_uuid(), nome text not null unique, created_at timestamptz not null default now());
create table public.funcoes (id uuid primary key default gen_random_uuid(), nome text not null unique, created_at timestamptz not null default now());
create table public.vinculos (id uuid primary key default gen_random_uuid(), nome text not null unique, categoria text not null default 'outro', created_at timestamptz not null default now());
create table public.situacoes (id uuid primary key default gen_random_uuid(), nome text not null unique, categoria text not null default 'outro', em_exercicio boolean not null default true, created_at timestamptz not null default now());
create table public.unidades (
  id uuid primary key default gen_random_uuid(), nome text not null unique, codigo text unique, endereco text, localidade text,
  tipo text, situacao text not null default 'Ativa', observacoes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.turmas (
  id uuid primary key default gen_random_uuid(), unidade_id uuid not null references public.unidades(id) on delete cascade,
  ano_letivo int not null default extract(year from now())::int, etapa text not null, nome text not null, turno text,
  created_at timestamptz not null default now()
);

create table public.servidores (
  id uuid primary key default gen_random_uuid(),
  nome text not null, matricula text not null unique,
  email text, telefone text,
  cargo_id uuid references public.cargos(id), funcao_id uuid references public.funcoes(id),
  vinculo_id uuid references public.vinculos(id), situacao_id uuid references public.situacoes(id),
  unidade_id uuid references public.unidades(id),
  secretaria_origem text, municipio_exercicio text,
  data_admissao date, data_desligamento date,
  carga_horaria text, turno text, ato_numero text, ato_data date, observacoes text,
  ativo boolean not null default true,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.servidores(cargo_id); create index on public.servidores(unidade_id); create index on public.servidores(situacao_id); create index on public.servidores(vinculo_id);

create table public.servidores_sensiveis (
  servidor_id uuid primary key references public.servidores(id) on delete cascade,
  cpf text not null unique check (cpf ~ '^[0-9]{11}$')
);

create table public.vagas (
  id uuid primary key default gen_random_uuid(),
  ano_referencia int not null default extract(year from now())::int,
  cargo_id uuid not null references public.cargos(id), funcao_id uuid references public.funcoes(id), unidade_id uuid references public.unidades(id),
  previstas_lei int, autorizadas int, reservadas int not null default 0,
  previstas_concurso int, previstas_pss int, previstas_temporaria int,
  status_validacao text not null default 'em_analise' check (status_validacao in ('em_analise','confirmado')),
  justificativa text, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.importacoes (
  id uuid primary key default gen_random_uuid(), arquivo_nome text not null, aba text,
  usuario_id uuid, usuario_email text,
  novos int not null default 0, atualizados int not null default 0, ignorados int not null default 0, para_correcao int not null default 0,
  mapeamento jsonb, dados_originais jsonb, pendencias jsonb,
  created_at timestamptz not null default now()
);

create table public.auditoria (
  id bigserial primary key, tabela text not null, registro_id text, acao text not null,
  usuario_id uuid, usuario_email text, antes jsonb, depois jsonb, created_at timestamptz not null default now()
);

create table public.configuracoes (
  id int primary key default 1 check (id = 1),
  municipio text not null default 'Prefeitura Municipal',
  secretaria text not null default 'Secretaria Municipal de Educação',
  brasao_url text, logo_url text, updated_at timestamptz not null default now()
);
insert into public.configuracoes (id) values (1);

grant select, insert, update, delete on public.cargos, public.funcoes, public.vinculos, public.situacoes, public.unidades, public.turmas, public.servidores, public.servidores_sensiveis, public.vagas to authenticated;
grant select, insert on public.importacoes to authenticated;
grant select on public.auditoria to authenticated;
grant select, update on public.configuracoes to authenticated;
grant all on public.cargos, public.funcoes, public.vinculos, public.situacoes, public.unidades, public.turmas, public.servidores, public.servidores_sensiveis, public.vagas, public.importacoes, public.auditoria, public.configuracoes to service_role;
grant usage, select on sequence public.auditoria_id_seq to service_role;

alter table public.cargos enable row level security;
alter table public.funcoes enable row level security;
alter table public.vinculos enable row level security;
alter table public.situacoes enable row level security;
alter table public.unidades enable row level security;
alter table public.turmas enable row level security;
alter table public.servidores enable row level security;
alter table public.servidores_sensiveis enable row level security;
alter table public.vagas enable row level security;
alter table public.importacoes enable row level security;
alter table public.auditoria enable row level security;
alter table public.configuracoes enable row level security;

do $$ declare t text; begin
  foreach t in array array['cargos','funcoes','vinculos','situacoes','unidades','turmas'] loop
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.has_perm(''cadastros.editar'') or public.has_perm(''servidores.importar''))', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.has_perm(''cadastros.editar''))', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.has_perm(''cadastros.editar''))', t);
  end loop;
end $$;

create policy "ver servidores" on public.servidores for select to authenticated using (public.has_perm('servidores.ver') or public.has_perm('servidores.editar'));
create policy "inserir servidores" on public.servidores for insert to authenticated with check (public.has_perm('servidores.editar') or public.has_perm('servidores.importar'));
create policy "editar servidores" on public.servidores for update to authenticated using (public.has_perm('servidores.editar') or public.has_perm('servidores.importar'));
create policy "excluir servidores" on public.servidores for delete to authenticated using (public.has_perm('servidores.excluir'));

create policy "ver cpf" on public.servidores_sensiveis for select to authenticated using (public.has_perm('cpf.ver'));
create policy "inserir cpf" on public.servidores_sensiveis for insert to authenticated with check (public.has_perm('cpf.ver') and (public.has_perm('servidores.editar') or public.has_perm('servidores.importar')));
create policy "editar cpf" on public.servidores_sensiveis for update to authenticated using (public.has_perm('cpf.ver') and public.has_perm('servidores.editar'));
create policy "excluir cpf" on public.servidores_sensiveis for delete to authenticated using (public.has_perm('cpf.ver') and public.has_perm('servidores.editar'));

create policy "ver vagas" on public.vagas for select to authenticated using (public.is_member());
create policy "inserir vagas" on public.vagas for insert to authenticated with check (public.has_perm('vagas.editar'));
create policy "editar vagas" on public.vagas for update to authenticated using (public.has_perm('vagas.editar'));
create policy "excluir vagas" on public.vagas for delete to authenticated using (public.has_perm('vagas.editar'));

create policy "ver importacoes" on public.importacoes for select to authenticated using (public.has_perm('servidores.importar') or public.has_perm('auditoria.ver'));
create policy "registrar importacao" on public.importacoes for insert to authenticated with check (public.has_perm('servidores.importar') and usuario_id = auth.uid());
create policy "ver auditoria" on public.auditoria for select to authenticated using (public.has_perm('auditoria.ver'));
create policy "ler config" on public.configuracoes for select to authenticated using (public.is_member());
create policy "admin config" on public.configuracoes for update to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.fn_auditoria() returns trigger language plpgsql security definer set search_path = public as $$
declare a jsonb; d jsonb; rid text; em text;
begin
  select email into em from auth.users where id = auth.uid();
  if tg_op <> 'INSERT' then a := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then d := to_jsonb(new); end if;
  if tg_table_name = 'servidores_sensiveis' then
    if a is not null then a := jsonb_set(a,'{cpf}','"***"'); end if;
    if d is not null then d := jsonb_set(d,'{cpf}','"***"'); end if;
    rid := coalesce(d->>'servidor_id', a->>'servidor_id');
  elsif tg_table_name = 'role_permissions' then
    rid := coalesce(d->>'role', a->>'role');
  else
    rid := coalesce(d->>'id', a->>'id');
  end if;
  insert into public.auditoria(tabela, registro_id, acao, usuario_id, usuario_email, antes, depois)
  values (tg_table_name, rid,
    case when tg_op='UPDATE' and tg_table_name='servidores' and (a->>'ativo')::boolean and not (d->>'ativo')::boolean then 'INATIVACAO' else tg_op end,
    auth.uid(), em, a, d);
  return coalesce(new, old);
end $$;

create or replace function public.fn_touch() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_table_name in ('servidores','vagas') then new.updated_by := auth.uid(); end if;
  if tg_op = 'INSERT' and tg_table_name = 'servidores' then new.created_by := auth.uid(); end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['cargos','funcoes','vinculos','situacoes','unidades','turmas','servidores','servidores_sensiveis','vagas','role_permissions','user_roles','configuracoes'] loop
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.fn_auditoria()', t);
  end loop;
  foreach t in array array['servidores','vagas','unidades'] loop
    execute format('create trigger trg_touch before insert or update on public.%I for each row execute function public.fn_touch()', t);
  end loop;
end $$;

create or replace function public.contar_servidores_unicos(_ids uuid[])
returns int language sql stable security definer set search_path = public as $$
  select case when public.has_perm('servidores.ver') or public.has_perm('servidores.editar') then
    (select count(distinct coalesce('C'||ss.cpf, 'M'||s.matricula))::int from public.servidores s left join public.servidores_sensiveis ss on ss.servidor_id = s.id where s.id = any(_ids))
  else null end
$$;

create or replace function public.existe_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where role='admin')
$$;
grant execute on function public.existe_admin() to anon, authenticated;

insert into public.vinculos (nome, categoria) values
 ('Efetivo (Estatutário)','efetivo'),('Contrato temporário','temporario'),('Processo seletivo (PSS)','processo_seletivo'),('Comissionado','comissionado');
insert into public.situacoes (nome, categoria, em_exercicio) values
 ('Em exercício','ativo',true),('Cedido','cedido',true),('Permutado','permutado',true),('Desvio de função','desvio',true),('Requisitado','requisitado',true),
 ('Licença sem vencimento','licenca',false),('Aposentado','aposentado',false),('Exonerado','exonerado',false),('Desligado','desligado',false);