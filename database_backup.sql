--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: global_summary; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.global_summary (
    id integer NOT NULL,
    total_schemes_integrated integer,
    fully_completed_schemes integer,
    total_villages_integrated integer,
    fully_completed_villages integer,
    total_esr_integrated integer,
    fully_completed_esr integer
);


ALTER TABLE public.global_summary OWNER TO neondb_owner;

--
-- Name: global_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.global_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.global_summary_id_seq OWNER TO neondb_owner;

--
-- Name: global_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.global_summary_id_seq OWNED BY public.global_summary.id;


--
-- Name: region; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.region (
    region_id integer NOT NULL,
    region_name text NOT NULL,
    total_esr_integrated integer,
    fully_completed_esr integer,
    partial_esr integer,
    total_villages_integrated integer,
    fully_completed_villages integer,
    total_schemes_integrated integer,
    fully_completed_schemes integer
);


ALTER TABLE public.region OWNER TO neondb_owner;

--
-- Name: region_region_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.region_region_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.region_region_id_seq OWNER TO neondb_owner;

--
-- Name: region_region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.region_region_id_seq OWNED BY public.region.region_id;


--
-- Name: scheme_status; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.scheme_status (
    scheme_id integer NOT NULL,
    scheme_name text NOT NULL,
    region_name text,
    agency text,
    total_villages_in_scheme integer,
    total_esr_in_scheme integer,
    villages_integrated_on_iot integer,
    fully_completed_villages integer,
    esr_request_received integer,
    esr_integrated_on_iot integer,
    fully_completed_esr integer,
    balance_for_fully_completion integer,
    fm_integrated integer,
    rca_integrated integer,
    pt_integrated integer,
    scheme_completion_status text
);


ALTER TABLE public.scheme_status OWNER TO neondb_owner;

--
-- Name: scheme_status_scheme_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.scheme_status_scheme_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheme_status_scheme_id_seq OWNER TO neondb_owner;

--
-- Name: scheme_status_scheme_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.scheme_status_scheme_id_seq OWNED BY public.scheme_status.scheme_id;


--
-- Name: global_summary id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.global_summary ALTER COLUMN id SET DEFAULT nextval('public.global_summary_id_seq'::regclass);


--
-- Name: region region_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.region ALTER COLUMN region_id SET DEFAULT nextval('public.region_region_id_seq'::regclass);


--
-- Name: scheme_status scheme_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheme_status ALTER COLUMN scheme_id SET DEFAULT nextval('public.scheme_status_scheme_id_seq'::regclass);


--
-- Data for Name: global_summary; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.global_summary (id, total_schemes_integrated, fully_completed_schemes, total_villages_integrated, fully_completed_villages, total_esr_integrated, fully_completed_esr) FROM stdin;
9	64	14	492	171	626	277
\.


--
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.region (region_id, region_name, total_esr_integrated, fully_completed_esr, partial_esr, total_villages_integrated, fully_completed_villages, total_schemes_integrated, fully_completed_schemes) FROM stdin;
1	Nagpur	117	58	58	91	38	15	9
2	Chhatrapati Sambhajinagar	147	73	69	140	71	10	2
3	Pune	97	31	66	53	16	9	0
4	Konkan	11	1	10	11	0	4	0
5	Amravati	149	59	86	121	24	11	1
6	Nashik	106	23	46	76	4	11	1
\.


--
-- Data for Name: scheme_status; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.scheme_status (scheme_id, scheme_name, region_name, agency, total_villages_in_scheme, total_esr_in_scheme, villages_integrated_on_iot, fully_completed_villages, esr_request_received, esr_integrated_on_iot, fully_completed_esr, balance_for_fully_completion, fm_integrated, rca_integrated, pt_integrated, scheme_completion_status) FROM stdin;
1	Retro. Bargaonpimpri & 6 VRWSS Tal Sinnar	Nashik	M/S Ceinsys	7	16	5	0	16	11	0	16	7	11	0	Partial
2	Nirhale-Fatehpur and 5 villages, Tal. Sinnar	Nashik	M/S Ceinsys	5	11	3	0	8	2	0	11	3	2	1	Partial
3	Retro.Chandwad and WSS 44 villages. Ta. Chandwad	Nashik	M/S Ceinsys	58	68	7	0	25	7	0	68	0	2	5	Partial
4	Retrofitting To Wadzire (Naigaon) & 4 Villages RRWSS	Nashik	M/S Ceinsys	4	5	1	0	4	1	0	5	1	1	0	Partial
5	Ozar-Sakore & 2 Villages	Nashik	M/S Ceinsys	4	10	4	1	9	8	5	5	6	7	5	Partial
6	Paldhi (bk& Kh) RR Tal DHARANGAON	Nashik	M/S Ceinsys	2	6	2	2	5	5	5	1	5	5	5	Fully-Completed
7	Retro.Sonai Karjgaon and 16 villages, Tal. Nevasa	Nashik	M/S Ceinsys	18	35	5	0	6	6	0	35	4	5	0	Partial
8	Burahnnagar & 45 Vill. Retro RRWSS Ta- Nagar	Nashik	M/S Ceinsys	0	80	0	0	0	0	0	80	0	0	0	Partial
9	Retro Rui & Shingave R.R.W.S.S Tal Rahata	Nashik	M/S Ceinsys	2	6	2	2	6	6	6	0	6	5	4	Fully-Completed
10	Retro.Kelvad Bk.& 2 villages RRWSS. Ta.Rahta	Nashik	M/S Ceinsys	3	5	2	0	2	2	0	5	2	2	0	Partial
11	Retro.Talegaon Dighe and 16 villages, Tal. Sangamner	Nashik	M/S Ceinsys	20	48	4	0	6	6	4	44	6	6	4	Partial
12	Retro.Nimon and 4 villages, Tal. Sangamner	Nashik	M/S Ceinsys	6	15	5	0	12	12	5	10	11	5	7	Partial
13	83 Village RRWS Scheme MJP RR (C 39)	Amravati	M/S Ceinsys	87	124	24	8	27	27	24	100	27	27	24	Partial
14	105 villages RRWSS	Amravati	M/S Ceinsys	113	173	41	1	63	52	10	163	51	14	40	Partial
15	Shahanur & 9 Villages RRWS	Amravati	M/S Ceinsys	10	14	7	1	8	8	3	11	6	6	6	Partial
16	Takli & 4 Villages RRWS	Amravati	M/S Ceinsys	5	8	5	0	7	7	0	8	6	3	2	Partial
17	Malpathar 28 villages, (Reju.)	Amravati	M/S Ceinsys	30	51	8	0	10	10	0	51	7	0	9	Partial
18	Akot 84 VRRWSS Tq. Akola, Akot & Telhara Dist. Akola	Amravati	M/S Ceinsys	82	104	3	1	5	4	0	104	3	3	0	Partial
19	Langhapur 50 VRRWSS Tq. Murtizapur Dist. Akola	Amravati	M/S Ceinsys	52	60	1	0	1	1	0	60	1	0	1	Partial
20	Hingne Gavhad 13 Vill RRWS (C39, MJP)	Amravati	M/S Ceinsys	16	30	0	0	0	0	0	30	0	0	0	Partial
21	Kurha and 2 villages, Tal. Motala	Amravati	M/S Ceinsys	3	4	2	1	4	3	1	3	3	3	1	Partial
22	Padli and 5 villages	Amravati	M/S Ceinsys	6	7	6	6	7	7	7	0	7	7	7	Fully-Completed
23	Dhamangaon Deshmukh and 10 villages RRWSS	Amravati	M/S Ceinsys	10	15	10	4	15	15	9	6	15	13	9	Partial
24	Pophali & 3 VRRWSS	Amravati	M/S Ceinsys	0	7	4	2	7	6	5	2	6	6	5	Partial
25	Wangani RRWSS	Pune	Chetas	3	6	4	0	6	6	0	6	6	4	0	Partial
26	RR Girvi WSS	Pune	Chetas	4	5	5	0	5	5	2	3	5	5	2	Partial
27	Peth & two Villages	Pune	Chetas	3	5	3	0	5	5	0	5	4	5	0	Partial
28	MURTI & 7 VILLAGES RRWSS	Pune	Chetas	6	13	7	2	13	13	6	7	13	5	7	Partial
29	HOL SASTEWADI	Pune	Chetas	4	8	2	0	8	8	3	5	8	7	3	Partial
30	LONI BHAPKAR RRWSS	Pune	Chetas	9	20	8	1	20	20	14	6	20	12	16	Partial
31	Done Adhale RR	Pune	Chetas	4	4	4	1	4	4	2	2	7	5	3	Partial
32	Alegaon shirbhavi 82 Village	Pune	Chetas	82	60	17	8	22	22	11	49	22	16	17	Partial
33	Peth RR	Pune	Chetas	8	32	3	0	11	11	0	32	10	6	0	Partial
34	Shahapada 38 Villages-20020563	Konkan	Indo Chetas JV	38	6	5	2	5	5	0	6	5	5	0	Partial
35	Devnhave water supply scheme-20028168	Konkan	Indo Chetas JV	4	1	1	0	1	1	0	1	1	1	0	Partial
36	Retrofiting of Gotheghar Dahisar R.R. Water Supply Scheme-20092478	Konkan	Indo Chetas JV	4	1	1	0	1	1	0	1	1	0	0	Partial
37	Modgaon & Tornipada RWSS-20047871	Konkan	Indo Chetas JV	2	4	4	0	4	4	0	4	4	4	0	Partial
38	Mokhada taluka 58 villages RRWS-20028070	Konkan	Indo Chetas JV	58	89	0	0	0	0	0	89	0	0	0	Partial
39	Bada Pokharana Retrofitting RPWSS-4918426	Konkan	Indo Chetas JV	29	66	0	0	0	0	0	66	0	0	0	Partial
40	Padghe & 19 villages PWSS-20017952	Konkan	Indo Chetas JV	19	31	0	0	0	0	0	31	0	0	0	Partial
41	20036500 Vyahad & 2 Village RR WSS	Nagpur	M/S Rite Water	3	5	3	0	3	3	0	5	3	3	0	Partial
42	20036536 Bothali & 7 Villages Rrwss	Nagpur	M/S Rite Water	8	8	8	6	8	8	5	3	8	8	5	Partial
43	20036862 Bor Chandli 5 Village Rr Wss	Nagpur	M/S Rite Water	5	5	5	5	5	5	5	0	5	5	5	Fully-Completed
44	2009882 Ghot Rrwss	Nagpur	M/S Rite Water	3	4	3	3	4	4	4	0	4	4	3	Fully-Completed
45	631010 Gobarwahi RR Retrofitting	Nagpur	M/S Rite Water	9	11	9	9	11	11	11	0	11	10	9	Fully-Completed
46	7890965 Mul 24 Villages RR WSS Retrofitting	Nagpur	M/S Rite Water	25	28	11	1	11	11	0	28	10	11	0	Partial
47	7891298 Pipri Meghe and 13 villages RR WSS	Nagpur	M/S Rite Water	13	23	9	5	15	14	10	13	14	14	10	Partial
48	7940695 Bidgaon Tarodi Wss	Nagpur	M/S Rite Water	2	4	2	2	4	4	4	0	4	4	4	Fully-Completed
49	GOREGAON RR Retrofitting (20019216)	Nagpur	M/S Rite Water	5	7	5	5	7	7	7	0	7	7	5	Fully-Completed
50	Kudwa-Katangikala Peri Urban RR- (2003645)	Nagpur	M/S Rite Water	2	5	2	2	5	5	4	1	5	5	3	Fully-Completed
51	Allapalli-Nagapalli RR (7890975)	Nagpur	M/S Rite Water	2	2	2	2	2	2	2	0	2	2	2	Fully-Completed
52	Pombhurna Grid & 15 Villages RR Retrofitting (7928270)	Nagpur	M/S Rite Water	17	22	15	0	17	17	0	22	16	17	0	Partial
53	Dewadi RR WSS (20017217)	Nagpur	M/S Rite Water	6	7	6	6	7	7	6	1	7	7	6	Fully-Completed
54	Wadhamna WSS (20009650)	Nagpur	M/S Rite Water	2	7	2	1	7	7	4	3	7	7	4	Fully-Completed
55	Chinchala and 7 Villages RR Water Supply Scheme(20050368)	Nagpur	M/S Rite Water	8	10	8	0	9	9	0	10	9	8	0	Partial
56	Pangaon 10 villages WSS (20030820)	Chhatrapati Sambhajinagar	M/S Rite Water	5	8	0	0	0	0	0	8	0	0	0	Partial
57	Osmamnagar Shirdhon Combined WS (7338000)	Chhatrapati Sambhajinagar	M/S Rite Water	4	7	4	0	7	7	0	7	6	7	0	Partial
58	Sakol 7 villages WSS (20030815)	Chhatrapati Sambhajinagar	M/S Rite Water	3	4	3	0	4	4	0	4	3	2	0	Partial
59	Rachnawadi 6 villages WSS (20030459)	Chhatrapati Sambhajinagar	M/S Rite Water	2	2	2	2	2	2	1	1	2	2	1	Fully-Completed
60	Manjram WSS (7942142)	Chhatrapati Sambhajinagar	M/S Rite Water	2	2	2	2	2	2	0	2	2	2	0	Fully-Completed
61	Kawtha Bk & 9 Vill RR WSS (20023330)	Chhatrapati Sambhajinagar	M/S Rite Water	23	23	1	0	23	1	0	23	1	1	0	Partial
62	Shirsala & 4 Village RRWS (20017395)	Chhatrapati Sambhajinagar	M/S Rite Water	5	7	0	0	0	0	0	7	0	0	0	Partial
63	Hadgaon & Himayatnagar 132 Villages Grid WSS	Chhatrapati Sambhajinagar	M/S Rite Water	92	92	35	14	37	34	14	78	30	33	17	Partial
64	Paithan Taluka 178 Villages Grid WS	Chhatrapati Sambhajinagar	M/S Rite Water	53	53	43	38	46	44	38	15	43	43	37	Partial
65	373 Villages Gangapur-Vaijapur Grid WS	Chhatrapati Sambhajinagar	M/S Rite Water	56	57	39	19	43	40	18	39	34	34	25	Partial
\.


--
-- Name: global_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.global_summary_id_seq', 9, true);


--
-- Name: region_region_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.region_region_id_seq', 6, true);


--
-- Name: scheme_status_scheme_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.scheme_status_scheme_id_seq', 65, true);


--
-- Name: global_summary global_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.global_summary
    ADD CONSTRAINT global_summary_pkey PRIMARY KEY (id);


--
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (region_id);


--
-- Name: scheme_status scheme_status_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheme_status
    ADD CONSTRAINT scheme_status_pkey PRIMARY KEY (scheme_id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

