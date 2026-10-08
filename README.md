# Parcely

Webová mapa katastrálnych parciel (otvorené dáta ČÚZK). PHP backend, PostGIS databáza a frontend na MapLibre. Parcely sa posielajú ako vector tiles (`/tiles/{z}/{x}/{y}.pbf`)

## Požiadavky

- Docker

## Spustenie

### 1. Spustiť databázu

```bash
docker compose up -d db
```

PostGIS beží na porte `5433` (DB `parcely`, používateľ `admin`, heslo `admin`)

### 2. Naimportovať dáta

Dáta sú vo výmennom formáte VFR od ČÚZK. Importujú sa cez GDAL (`ogr2ogr`) do pomocných tabuliek `*_raw` 

**Všetky obce z `data/obce_okres.txt`** (stiahne ZIP súbory do `data/okres/` a naimportuje ich):

```bash
docker compose run --rm gdal sh /scripts/import_okres.sh
```

### 3. Vytvoriť finálne tabuľky

SQL skript z `*_raw` tabuliek vytvorí `parcely`, `katastralni_uzemi` a `obec` (geometrie prepočíta do EPSG:3857) a vytvorí indexy. Spúšťa sa po každom novom importe:

```bash
  docker compose exec db psql -U admin -d parcely -f /db/01_db.sql
  ```

### 4. Spustiť aplikáciu

```bash
docker compose up -d php
```

Aplikácia beží na http://localhost:8080.

## Spustenie bez Dockeru pre PHP

Databáza musí bežať (krok 1). Potrebujete PHP 8.3+ s rozšírením `pdo_pgsql`:

```bash
php -S localhost:8080 -t public public/index.php
```

Predvolené pripojenie je `pgsql:host=localhost;port=5433;dbname=parcely` s `admin`/`admin`. Dá sa prepísať premennými prostredia `DB_DSN`, `DB_USER` a `DB_PASS`.

## Endpointy

| Endpoint | Popis |
| --- | --- |
| `GET /` | Frontend (`public/index.html`) |
| `GET /tiles/{z}/{x}/{y}.pbf` | Vector tiles s parcelami a katastrálnymi územiami |
| `GET /api/ku` | Zoznam katastrálnych území |
| `GET /api/parcel/{id}` | Detail parcely |
| `GET /api/parcel/search?kmen=&ku=&druh=&pod=` | Vyhľadanie parcely podľa čísla (`druh`: 1 = stavebná, 2 = pozemková) |

## Štruktúra

- `public/` – `index.php` (router), `index.html`, `app.js` (mapa)
- `src/` – kontroléry (`TileController`, `ParcelController`, `KuController`) a `Database`
- `db/01_db.sql` – príprava finálnych tabuliek
- `scripts/import_okres.sh` – hromadný import obcí
- `data/` – dáta ČÚZK (`obce_okres.txt` je zoznam kódov obcí pre hromadný import)

## Zápisník

### Dáta

240 katastrálnych území, 271995 parciel.

### Rozhodnutia
**Dáta vopred stiahnuť, nie ťahať live z WFS**
Nechcel som, aby aplikácia za behu závisela od služby tretej strany. Keby
WFS ČÚZK nefungovalo alebo bolo pomalé, nefungovala by ani mapa. WFS má
navyše limit počtu prvkov na jednu odpoveď, takže pri zobrazení celého okresu
by mapa nebola plynulá. Dáta som preto stiahol vo výmennom formáte RÚIAN
(VFR, „kompletní data, originální hranice“) a naimportoval do vlastnej
PostGIS databázy. ČÚZK je potrebné len pri importe.
Externé zostávajú len podkladová mapa (OpenStreetMap) a knižnica MapLibre.

**Import cez GDAL (`ogr2ogr`) do `*_raw` tabuliek, potom SQL na finálne tabuľky**
Raw tabuľky ostávajú presne také ako zdroj (S-JTSK). `db/01_db.sql` z nich
spraví čisté tabuľky s čitateľnejšími stĺpcami, geometriou vo formáte ktorý požaduje
MapLibre pre dlaždice (EPSG:3857) a taktiež som pridal indexi podla primárnych 
klúčov a podla geometrie parciel
Prepočet súradníc sa tak robí raz pri importe, nie pri každej dlaždici.

**Vektorové dlaždice generované v PostGIS**
Prehliadač dostane vždy len výrez mapy, ktorý potrebuje resp. ktory je vidieť. Jeden SQL dotaz
(`ST_TileEnvelope` → výber cez GiST index → `ST_AsMVTGeom` → `ST_AsMVT`)
nájde, oreže a zabalí parcely do dlaždic.

**Parcely až od zoomu 13 inak len obrysy KÚ.**
Pri menšom zoome by mala jedna dlaždica megabajty a parcely by aj tak neboli
rozoznateľné.

**Do dlaždice idú len `id` a druh pozemku, detail sa načíta po kliknutí.**
Dlaždice ostávajú malé, detail (číslo, KÚ, výmera, BPEJ) vracia `/api/parcel/{id}`.

**Čisté PHP bez frameworku, rozdelené na kontroléry.**
Malý router v `index.php`, každý kontrolér má jednu zodpovednosť. 
Framework by pre pár endpointov pridal viac kódu, než ušetrí.

**Vyhľadávanie podľa KÚ + druh číslovania + kmeňové číslo + poddelenie.**
Samotné číslo parcely nie je unikátne (napr. parcela 100 je v obci Jičín 5×).
Unikátna je až kombinácia KÚ, druhu číslovania a čísla.

### Čo mi zabralo najviac času

Najviac času mi zabralo zorientovať sa v službách a dátach, ktoré ČÚZK
poskytuje (WFS, WMS, INSPIRE, RÚIAN), a pochopiť, čo
ktorá obsahuje.

Ďalší čas zabralo pozrieť si PostGIS a MapLibre a ako sa používajú. Predtým som s nimi
nepracoval, takže som si musel pozriet aj prácu so súradnicovými
formatmi (S-JTSK vs. EPSG:3857 vs. GPS 4326) a ako fungujú
vektorové dlaždice. Na samotnú aplikačnú logiku v PHP potom už toľko
času nepadlo.

### Čo ma prekvapilo

- **Rovnaké čísla parciel.** V každom KÚ existuje parcela `100` aj `st. 100`
  a sú to dva rôzne pozemky
- **Spôsob využitia pozemku je vyplnený len pri časti parciel**
- - **Koľko spôsobov ponúka na získanie dát existuje.** WMS (obrázky),
    WFS a INSPIRE (vektory cez službu) aj RÚIAN (súbory na stiahnutie)

### Čo by som s viac časom riešil inak

- **Aktualizovanie dát** job ktorý by raz za mesiac skontroloval či sa nevydala nová verzia katastra a naimportoval by ju
- **Cache dlaždíc** na disku alebo cez nginx, aby sa každá generovala len raz
- **Názvy  ČÚZK** (spôsob využitia, ochrana pozemku, BPEJ) namiesto kódov
- **Testy**, napr. pre formátovanie čísla parcely a validáciu vstupov