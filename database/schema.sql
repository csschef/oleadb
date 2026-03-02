﻿-- OleaDB database schema
-- Generated with pg_dump --schema-only
-- NOTE: This file contains only structure (no data)
--
-- PostgreSQL database dump
--

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ingredient_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient_category (
    id integer CONSTRAINT category_id_not_null NOT NULL,
    name text CONSTRAINT category_name_not_null NOT NULL
);


--
-- Name: category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.category_id_seq OWNED BY public.ingredient_category.id;


--
-- Name: ingredient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient (
    id integer NOT NULL,
    name text NOT NULL,
    name_normalized text GENERATED ALWAYS AS (lower(TRIM(BOTH FROM name))) STORED,
    ingredient_category_id integer
);


--
-- Name: ingredient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingredient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ingredient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingredient_id_seq OWNED BY public.ingredient.id;


--
-- Name: recipe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    servings integer,
    prep_time_minutes integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image_url text
);


--
-- Name: recipe_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    CONSTRAINT recipe_categories_type_check CHECK (((type)::text = ANY ((ARRAY['component'::character varying, 'main_ingredient'::character varying, 'cuisine'::character varying, 'time'::character varying, 'occasion'::character varying])::text[])))
);


--
-- Name: recipe_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recipe_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recipe_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recipe_categories_id_seq OWNED BY public.recipe_categories.id;


--
-- Name: recipe_category_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_category_map (
    recipe_id integer NOT NULL,
    category_id integer NOT NULL
);


--
-- Name: recipe_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recipe_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recipe_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recipe_id_seq OWNED BY public.recipe.id;


--
-- Name: recipe_step_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_step_ingredients (
    id integer NOT NULL,
    recipe_step_id integer NOT NULL,
    ingredient_name character varying(255) NOT NULL,
    amount character varying(100),
    sort_order integer DEFAULT 1 NOT NULL,
    unit_id integer NOT NULL
);


--
-- Name: recipe_step_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recipe_step_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recipe_step_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recipe_step_ingredients_id_seq OWNED BY public.recipe_step_ingredients.id;


--
-- Name: recipe_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_steps (
    id integer NOT NULL,
    recipe_id integer NOT NULL,
    title character varying(255),
    instructions text,
    sort_order integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: recipe_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recipe_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recipe_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recipe_steps_id_seq OWNED BY public.recipe_steps.id;


--
-- Name: unit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit (
    id integer NOT NULL,
    name text NOT NULL,
    abbreviation text NOT NULL,
    is_amount_optional boolean DEFAULT false
);


--
-- Name: unit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_id_seq OWNED BY public.unit.id;


--
-- Name: ingredient id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient ALTER COLUMN id SET DEFAULT nextval('public.ingredient_id_seq'::regclass);


--
-- Name: ingredient_category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_category ALTER COLUMN id SET DEFAULT nextval('public.category_id_seq'::regclass);


--
-- Name: recipe id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe ALTER COLUMN id SET DEFAULT nextval('public.recipe_id_seq'::regclass);


--
-- Name: recipe_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_categories ALTER COLUMN id SET DEFAULT nextval('public.recipe_categories_id_seq'::regclass);


--
-- Name: recipe_step_ingredients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_step_ingredients ALTER COLUMN id SET DEFAULT nextval('public.recipe_step_ingredients_id_seq'::regclass);


--
-- Name: recipe_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_steps ALTER COLUMN id SET DEFAULT nextval('public.recipe_steps_id_seq'::regclass);


--
-- Name: unit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit ALTER COLUMN id SET DEFAULT nextval('public.unit_id_seq'::regclass);


--
-- Name: ingredient_category category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_category
    ADD CONSTRAINT category_name_key UNIQUE (name);


--
-- Name: ingredient_category category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient_category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);


--
-- Name: ingredient ingredient_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT ingredient_name_key UNIQUE (name);


--
-- Name: ingredient ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT ingredient_pkey PRIMARY KEY (id);


--
-- Name: recipe_categories recipe_categories_name_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_categories
    ADD CONSTRAINT recipe_categories_name_type_key UNIQUE (name, type);


--
-- Name: recipe_categories recipe_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_categories
    ADD CONSTRAINT recipe_categories_pkey PRIMARY KEY (id);


--
-- Name: recipe_category_map recipe_category_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_category_map
    ADD CONSTRAINT recipe_category_map_pkey PRIMARY KEY (recipe_id, category_id);


--
-- Name: recipe recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT recipe_pkey PRIMARY KEY (id);


--
-- Name: recipe_step_ingredients recipe_step_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_step_ingredients
    ADD CONSTRAINT recipe_step_ingredients_pkey PRIMARY KEY (id);


--
-- Name: recipe_steps recipe_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_pkey PRIMARY KEY (id);


--
-- Name: unit unit_abbreviation_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit
    ADD CONSTRAINT unit_abbreviation_key UNIQUE (abbreviation);


--
-- Name: unit unit_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit
    ADD CONSTRAINT unit_name_key UNIQUE (name);


--
-- Name: unit unit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit
    ADD CONSTRAINT unit_pkey PRIMARY KEY (id);


--
-- Name: ingredient_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ingredient_name_unique ON public.ingredient USING btree (name_normalized);


--
-- Name: ingredient ingredient_ingredient_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT ingredient_ingredient_category_id_fkey FOREIGN KEY (ingredient_category_id) REFERENCES public.ingredient_category(id);


--
-- Name: recipe_category_map recipe_category_map_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_category_map
    ADD CONSTRAINT recipe_category_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.recipe_categories(id) ON DELETE CASCADE;


--
-- Name: recipe_category_map recipe_category_map_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_category_map
    ADD CONSTRAINT recipe_category_map_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id) ON DELETE CASCADE;


--
-- Name: recipe_step_ingredients recipe_step_ingredients_recipe_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_step_ingredients
    ADD CONSTRAINT recipe_step_ingredients_recipe_step_id_fkey FOREIGN KEY (recipe_step_id) REFERENCES public.recipe_steps(id) ON DELETE CASCADE;


--
-- Name: recipe_step_ingredients recipe_step_ingredients_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_step_ingredients
    ADD CONSTRAINT recipe_step_ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id);


--
-- Name: recipe_steps recipe_steps_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
