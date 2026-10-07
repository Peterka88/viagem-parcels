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

const PARCELY_MINZOOM = 13;

const map = new maplibregl.Map({
    container: 'map',
    center: [15.352, 50.437],
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
                'source-layer': 'parcely',
                paint: {
                    'fill-color': colorLand(),
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
                filter: ['==', ['id'], -1],
                paint: { 'line-color': '#d7191c', 'line-width': 3 },
            },
        ],
    },
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl());

function colorLand () {
    const vyraz = ['match', ['get', 'druh_pozemku_kod']];
    for (const [kod, druh] of Object.entries(DRUHY_POZEMKU)) {
        vyraz.push(Number(kod), druh.barva);
    }
    vyraz.push('#999999');
    return vyraz;
}


let pickedParcelId = null;

map.on('click', 'parcely-plocha', (e) => {
    pickParcel(e.features[0].id);
});

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

function renderBpej(p) {
    if (!p.bpej || p.bpej.length === 0) return '—';
    return p.bpej
        .map((b) => `${escapeHtml(b.kod)}${b.vymera != null ? ` (${escapeHtml(b.vymera)} m²)` : ''}`)
        .join('<br>');
}

async function pickParcel(id) {
    const source = { source: 'parcely', sourceLayer: 'parcely' };

    map.setFilter('parcely-vybrana', ['==', ['id'], id]);
    if (pickedParcelId !== null) {
        map.setFeatureState({ ...source, id: pickedParcelId }, { vybrana: false });
    }
    pickedParcelId = id;
    map.setFeatureState({ ...source, id }, { vybrana: true });

    const detail = document.getElementById('detail');
    detail.innerHTML = '<p>Načítavam...</p>';

    try {
        const res = await fetch('/api/parcel/' + encodeURIComponent(id));
        const p = await res.json();
        if (!res.ok) throw new Error(p.error ?? res.statusText);

        const druh = DRUHY_POZEMKU[p.druh_pozemku_kod];

        detail.innerHTML = `
          <h2>${escapeHtml(p.cislo)}</h2>
          <p class="sub">k.ú. ${escapeHtml(p.katastralni_uzemi.nazev)}</p>
          <table>
            <tr><th>Výměra</th><td>${escapeHtml(p.vymera)} m²</td></tr>
            <tr><th>Obec</th><td>${escapeHtml(p.obec)}</td></tr>
            <tr><th>Katastrální území</th><td>${escapeHtml(p.katastralni_uzemi.nazev)} [${escapeHtml(p.katastralni_uzemi.kod)}]</td></tr>
            <tr><th>Druh pozemku</th><td>${escapeHtml(druh ? druh.nazev : p.druh_pozemku_kod)}</td></tr>
            <tr><th>Způsob využití</th><td>${escapeHtml(p.zpusob_vyuziti_kod ?? '—')}</td></tr>
            <tr><th>BPEJ</th><td>${renderBpej(p)}</td></tr>
          </table>
          <a class="btn" target="_blank" rel="noopener" href="${escapeHtml(p.nahlizeni_url)}">
            Otevřít v Nahlížení do KN ↗
          </a>
          <p class="muted" style="font-size:12px;margin-top:12px">
            Vlastník a číslo LV nejsou součástí otevřených dat — jsou dostupné v Nahlížení do KN.
          </p>
        `;
    } catch (err) {
        detail.innerHTML = `<p>Nepodarilo sa načítať parcelu: ${escapeHtml(err.message)}</p>`;
    }
}

map.on('mouseenter', 'parcely-plocha', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'parcely-plocha', () => { map.getCanvas().style.cursor = ''; });

document.getElementById('legend').innerHTML = Object.values(DRUHY_POZEMKU)
    .map((druh) => `<div><span style="background:${druh.barva}"></span>${druh.nazev}</div>`)
    .join('');