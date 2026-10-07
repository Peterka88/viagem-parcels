BEGIN;

-- Parcely --
DROP TABLE IF EXISTS parcely;

CREATE TABLE parcely AS
SELECT DISTINCT ON (id)
    id,
    katastralniuzemikod                AS ku_kod,
    kmenovecislo                       AS kmenove_cislo,
    pododdelenicisla                   AS pododdeleni_cisla,
    druhcislovanikod                   AS druh_cislovani_kod,  -- 1 = stavebná, 2 = pozemková
    druhpozemkukod                     AS druh_pozemku_kod,
    zpusobyvyuzitipozemku              AS zpusob_vyuziti_kod,
    vymeraparcely                      AS vymera,
    zpusobochranykod                   AS ochrana_kody,
    bonitovanydilbonitovanajednotkakod AS bpej_kody,
    bonitovanydilvymera                AS bpej_vymery,
    ST_Transform(originalnihranice, 3857) AS geom
    FROM parcely_raw
    WHERE originalnihranice IS NOT NULL
    ORDER BY id;

ALTER TABLE parcely ADD PRIMARY KEY (id);
CREATE INDEX parcela_geom_idx ON parcely USING gist (geom);

-- Katastralne uzemia --
DROP TABLE IF EXISTS katastralni_uzemi;

CREATE TABLE katastralni_uzemi AS
SELECT DISTINCT ON (kod)
    kod,
    nazev,
    obeckod AS obec_kod,
    ST_Transform(originalnihranice, 3857) AS geom
    FROM ku_raw
    ORDER BY kod;

ALTER TABLE katastralni_uzemi ADD PRIMARY KEY (kod);
CREATE INDEX katastralni_uzemi_geom_idx ON katastralni_uzemi USING gist (geom);

-- Obce --
DROP TABLE IF EXISTS obec;

CREATE TABLE obec AS
SELECT DISTINCT ON (kod) kod, nazev
    FROM obce_raw
    ORDER BY kod;

ALTER TABLE obec ADD PRIMARY KEY (kod);

COMMIT;

ANALYZE parcely;
ANALYZE katastralni_uzemi;
ANALYZE obec;