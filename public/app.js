// Druhy pozemku z katastru (kód -> název a barva na mapě)
const DRUHY_POZEMKU = {
    2:  { nazev: 'Orná půda',               barva: '#e9d97a' },
    3:  { nazev: 'Chmelnice',               barva: '#b5c95a' },
    4:  { nazev: 'Vinice',                  barva: '#a86fb0' },
    5:  { nazev: 'Zahrada',                 barva: '#9ccf6b' },
    6:  { nazev: 'Ovocný sad',              barva: '#7fbf4d' },
    7:  { nazev: 'Trvalý travní porost',    barva: '#b8e08f' },
    10: { nazev: 'Lesní pozemek',           barva: '#4f9a4f' },
    11: { nazev: 'Vodní plocha',            barva: '#7db7e8' },
    13: { nazev: 'Zastavěná plocha',        barva: '#d98c7a' },
    14: { nazev: 'Ostatní plocha',          barva: '#c9c9c9' },
};

// Od tohto zoomu server posiela parcely (musí sedieť s PARCELY_MINZOOM v TileController.php)
const PARCELY_MINZOOM = 13;

const map = new maplibregl.Map({
    container: 'map',
    center: [15.352, 50.437], // Jičín
    zoom: 14,
    style: {
        version: 8,
        sources: {
            osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                maxzoom: 19,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
            parcely: {
                type: 'vector',
                tiles: [window.location.origin + '/tiles/{z}/{x}/{y}.pbf'],
                minzoom: PARCELY_MINZOOM,
                // Nad zoom 16 MapLibre už nepýta nové dlaždice, len zväčší tie zo zoomu 16.
                // Presnosť stačí a server generuje oveľa menej dlaždíc.
                maxzoom: 16,
                attribution: '© <a href="https://www.cuzk.cz">ČÚZK</a>',
            },
        },
        layers: [
            { id: 'osm', type: 'raster', source: 'osm' },
            {
                id: 'parcely-plocha',
                type: 'fill',
                source: 'parcely',
                'source-layer': 'parcely', // názov vrstvy z ST_AsMVT(..., 'parcely', ...)
                paint: {
                    'fill-color': farbaPodlaDruhu(),
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'vybrana'], false], 0.8,
                        0.45,
                    ],
                },
            },
            {
                id: 'parcely-hranice',
                type: 'line',
                source: 'parcely',
                'source-layer': 'parcely',
                paint: {
                    'line-color': '#5a4a3a',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.2, 18, 1.2],
                },
            },
            {
                id: 'parcely-vybrana',
                type: 'line',
                source: 'parcely',
                'source-layer': 'parcely',
                filter: ['==', ['id'], -1], // na začiatku nič nie je vybrané
                paint: { 'line-color': '#d7191c', 'line-width': 3 },
            },
        ],
    },
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl());

// Výraz pre MapLibre: farba podľa druh_pozemku_kod, neznámy kód = sivá
function farbaPodlaDruhu() {
    const vyraz = ['match', ['get', 'druh_pozemku_kod']];
    for (const [kod, druh] of Object.entries(DRUHY_POZEMKU)) {
        vyraz.push(Number(kod), druh.barva);
    }
    vyraz.push('#999999');
    return vyraz;
}


let pickedParcelId = null;

map.on('click', 'parcely-plocha', (e) => {
    const parcel = e.features[0];
    pickParcel(parcel.id);

    const propertyType = DRUHY_POZEMKU[parcel.properties.druh_pozemku_kod];
    document.getElementById('detail').innerHTML = `
        <h2>Parcela</h2>
        <p><b>ID:</b> ${parcel.id}</p>
        <p><b>Druh pozemku:</b> ${propertyType ? propertyType.nazev : 'neznámý'}</p>
    `;
});

function pickParcel(id) {
    const source = { source: 'parcely', sourceLayer: 'parcely' };

    if (pickedParcelId !== null) {
        map.setFeatureState({ ...source, id: pickedParcelId }, { vybrana: false });
    }
    pickedParcelId = id;
    map.setFeatureState({ ...source, id }, { vybrana: true });
    map.setFilter('parcely-vybrana', ['==', ['id'], id]);
}

map.on('mouseenter', 'parcely-plocha', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'parcely-plocha', () => { map.getCanvas().style.cursor = ''; });

document.getElementById('legend').innerHTML = Object.values(DRUHY_POZEMKU)
    .map((druh) => `<div><span style="background:${druh.barva}"></span>${druh.nazev}</div>`)
    .join('');