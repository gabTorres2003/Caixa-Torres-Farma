-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text,
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT stores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['ADMIN'::text, 'CAIXA_MANHA'::text, 'CAIXA_TARDE'::text])),
  store_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.pending_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  received_at timestamp with time zone,
  notes text,
  motorcycle_courier_id uuid,
  comanda text,
  valor numeric,
  tipo_saida character varying,
  forma_pagamento_real character varying,
  conferido boolean NOT NULL DEFAULT false,
  observacoes text,
  conciliado boolean NOT NULL DEFAULT false,
  CONSTRAINT pending_deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT pending_deliveries_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT pending_deliveries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  value numeric NOT NULL,
  origin text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  cancelled boolean DEFAULT false,
  origem character varying,
  data_caixa date,
  valor numeric,
  categoria character varying,
  responsavel_nome character varying,
  destino text,
  status_troca character varying DEFAULT 'CONCLUIDA'::character varying,
  recebido_por character varying,
  recebido_em timestamp with time zone,
  detalhes_troca jsonb,
  valor_recebido numeric DEFAULT 0.00,
  CONSTRAINT deposits_pkey PRIMARY KEY (id),
  CONSTRAINT deposits_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT deposits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.pre_closings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  cash_value numeric DEFAULT 0.00,
  card_value numeric DEFAULT 0.00,
  pix_value numeric DEFAULT 0.00,
  check_value numeric DEFAULT 0.00,
  pending_card numeric DEFAULT 0.00,
  pending_pix numeric DEFAULT 0.00,
  total numeric NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  vale_compras_value numeric DEFAULT 0.00,
  pending_cash numeric DEFAULT 0.00,
  obs_dinheiro text,
  obs_cartao text,
  obs_pix text,
  obs_cheque text,
  obs_vale text,
  obs_geral text,
  CONSTRAINT pre_closings_pkey PRIMARY KEY (id),
  CONSTRAINT pre_closings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT pre_closings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.divergences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  delivery_id uuid,
  type text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT divergences_pkey PRIMARY KEY (id),
  CONSTRAINT divergences_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT divergences_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.pending_deliveries(id)
);
CREATE TABLE public.cash_denominations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['NOTA'::text, 'MOEDA'::text])),
  valor numeric NOT NULL,
  quantidade_atual integer DEFAULT 0,
  quantidade_ideal integer DEFAULT 0,
  quantidade_minima integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cash_denominations_pkey PRIMARY KEY (id),
  CONSTRAINT cash_denominations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.cash_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  created_by uuid NOT NULL,
  tipo_movimento text NOT NULL CHECK (tipo_movimento = ANY (ARRAY['ENTRADA'::text, 'SAIDA'::text, 'CONTAGEM_INICIAL'::text])),
  valor_total numeric NOT NULL,
  origem text,
  destino text,
  detalhamento jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cash_movements_pkey PRIMARY KEY (id),
  CONSTRAINT cash_movements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT cash_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.shift_closures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  shift_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type = ANY (ARRAY['CAIXA_MANHA'::text, 'CAIXA_TARDE'::text])),
  closed_by uuid NOT NULL,
  closed_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT shift_closures_pkey PRIMARY KEY (id),
  CONSTRAINT shift_closures_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT shift_closures_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id)
);
CREATE TABLE public.motoboys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  nome text NOT NULL,
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  horario_trabalho text,
  CONSTRAINT motoboys_pkey PRIMARY KEY (id),
  CONSTRAINT motoboys_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.motoboy_time_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  motoboy_id uuid NOT NULL,
  tipo_registro text NOT NULL CHECK (tipo_registro = ANY (ARRAY['ENTRADA'::text, 'SAIDA'::text, 'FOLGA'::text, 'FERIAS'::text, 'ATESTADO'::text, 'FALTA'::text, 'TROCA_DE_ESCALA'::text, 'FOLGA_FERIADO'::text])),
  registro_time timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  registered_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  observacoes text,
  CONSTRAINT motoboy_time_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT motoboy_time_tracking_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT motoboy_time_tracking_motoboy_id_fkey FOREIGN KEY (motoboy_id) REFERENCES public.motoboys(id),
  CONSTRAINT motoboy_time_tracking_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id)
);
CREATE TABLE public.motoboy_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  motoboy_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PREPARANDO'::text CHECK (status = ANY (ARRAY['PREPARANDO'::text, 'EM_ROTA'::text, 'CONCLUIDA'::text])),
  departure_time timestamp with time zone,
  return_time timestamp with time zone,
  total_distance_km numeric DEFAULT 0.00,
  estimated_time_minutes integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT motoboy_routes_pkey PRIMARY KEY (id),
  CONSTRAINT motoboy_routes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT motoboy_routes_motoboy_id_fkey FOREIGN KEY (motoboy_id) REFERENCES public.motoboys(id),
  CONSTRAINT motoboy_routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.motoboy_route_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  dna_order_id text,
  customer_name text NOT NULL,
  address text NOT NULL,
  delivery_status text DEFAULT 'PENDENTE'::text CHECK (delivery_status = ANY (ARRAY['PENDENTE'::text, 'ENTREGUE'::text, 'FALHA'::text])),
  time_limit_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT motoboy_route_deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT motoboy_route_deliveries_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.motoboy_routes(id)
);