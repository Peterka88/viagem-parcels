#!/bin/sh
# Stiahne a naimportuje VFR (kompletné dáta, originálne hranice)
# pre všetky obce uvedené v /data/obce_okres.txt.
set -e

DATUM="${DATUM:-20260930}"
BASE="https://vdp.cuzk.gov.cz/vymenny_format/soucasna"
PG="PG:host=db dbname=parcely user=admin password=admin"
DIR=/data/okres
mkdir -p "$DIR"

KODY=$(tr -d '\r' < /data/obce_okres.txt)

# 1. Stiahnutie (už stiahnuté súbory preskočí, takže sa dá spustiť znova)
for KOD in $KODY; do
  NAZEV="${DATUM}_OB_${KOD}_UKSH.xml.zip"
  if [ ! -s "$DIR/$NAZEV" ]; then
    echo "Stahujem obec $KOD"
    # ZMENA: sťahuje sa do .part, premenuje až po úspechu
    python3 -c "import sys, urllib.request; urllib.request.urlretrieve(sys.argv[1], sys.argv[2])" \
      "$BASE/$NAZEV" "$DIR/$NAZEV.part"
    mv "$DIR/$NAZEV.part" "$DIR/$NAZEV"
  fi
done

# 2. Import: prvá obec tabuľky vytvorí nanovo, ďalšie sa pripájajú
MODE="-overwrite"
for KOD in $KODY; do
  NAZEV="${DATUM}_OB_${KOD}_UKSH.xml"
  XML="/vsizip/$DIR/$NAZEV.zip/$NAZEV"
  echo "Importujem obec $KOD"
  ogr2ogr -f PostgreSQL "$PG" "$XML" Parcely          -nln parcely_raw $MODE -nlt PROMOTE_TO_MULTI --config PG_USE_COPY YES
  ogr2ogr -f PostgreSQL "$PG" "$XML" KatastralniUzemi -nln ku_raw      $MODE -nlt PROMOTE_TO_MULTI --config PG_USE_COPY YES
  ogr2ogr -f PostgreSQL "$PG" "$XML" Obce             -nln obce_raw    $MODE -nlt PROMOTE_TO_MULTI --config PG_USE_COPY YES
  MODE="-addfields"
done

echo "Done -> 01_db.sql"