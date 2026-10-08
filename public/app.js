const DRUHY_POZEMKU = {
    2:  { name: 'Orná půda',               color: '#e9d97a' },
    3:  { name: 'Chmelnice',               color: '#b5c95a' },
    4:  { name: 'Vinice',                  color: '#a86fb0' },
    5:  { name: 'Zahrada',                 color: '#9ccf6b' },
    6:  { name: 'Ovocný sad',              color: '#7fbf4d' },
    7:  { name: 'Trvalý travní porost',    color: '#b8e08f' },
    10: { name: 'Lesní pozemek',           color: '#4f9a4f' },
    11: { name: 'Vodní plocha',            color: '#7db7e8' },
    13: { name: 'Zastavěná plocha',        color: '#d98c7a' },
    14: { name: 'Ostatní plocha',          color: '#c9c9c9' },
};

const map = new maplibregl.Map({
    container: 'map',
    center: [15.352, 50.437],
    zoom: 16,
    style: {
        version: 8,
        sources: {
            osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
            parcely: {
                type: 'vector',
                tiles: [window.location.origin + '/tiles/{z}/{x}/{y}.pbf'],
                minzoom: 9,
                maxzoom: 20,
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
                    'fill-color': landColor(),
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
            {
                id: 'ku-plocha',
                type: 'fill',
                source: 'parcely',
                'source-layer': 'katastralni',
                paint: {
                    'fill-color': '#6c8ebf',
                    'fill-opacity': 0.25,
                },
            },
            {
                id: 'ku-hranice',
                type: 'line',
                source: 'parcely',
                'source-layer': 'katastralni',
                paint: { 'line-color': '#3d5a8a', 'line-width': 1 },
            },
        ],
    },
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl());

function landColor () {
    const color = ['match', ['get', 'druh_pozemku_kod']];
    for (const [kod, druh] of Object.entries(DRUHY_POZEMKU)) {
        color.push(Number(kod), druh.color);
    }
    color.push('#999999');
    return color;
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
    detail.innerHTML = '<p>Načítam...</p>';

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
            <tr><th>Druh pozemku</th><td>${escapeHtml(druh ? druh.name : p.druh_pozemku_kod)}</td></tr>
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
        detail.innerHTML = `<p>Nepodařilo se načíst parcelu: ${escapeHtml(err.message)}</p>`;
    }
}

map.on('mouseenter', 'parcely-plocha', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'parcely-plocha', () => { map.getCanvas().style.cursor = ''; });

document.getElementById('legend').innerHTML = Object.values(DRUHY_POZEMKU)
    .map((druh) => `<div><span style="background:${druh.color}"></span>${druh.name}</div>`)
    .join('');

async function loadKu() {
    const select = document.getElementById('search-ku');
    try {
        const res = await fetch('/api/ku');
        if (!res.ok) throw new Error(res.statusText);
        const ku = await res.json();
        select.innerHTML = '<option value="">— katastrální území —</option>' + ku
            .map((k) => `<option value="${escapeHtml(k.kod)}">${escapeHtml(k.nazev)}</option>`)
            .join('');
    } catch (err) {
        select.innerHTML = '<option value="">Nepodařilo se načíst k.ú.</option>';
    }
}

loadKu();


document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const detail = document.getElementById('detail');
    const match = document.getElementById('search-cislo').value.trim().match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
    const ku = document.getElementById('search-ku').value;

    if (!match || !ku) {
        detail.innerHTML = '<p>Zadejte číslo parcely (např. 123/4) a katastrální území.</p>';
        return;
    }

    const params = new URLSearchParams({
        kmen: match[1],
        ku,
        druh: document.getElementById('search-druh-cislovani').value,
    });
    if (match[2] !== undefined) params.set('pod', match[2]);

    try {
        const res = await fetch('/api/parcel/search?' + params);
        const r = await res.json();
        if (!res.ok) throw new Error(r.error ?? res.statusText);

        map.fitBounds([[r.minx, r.miny], [r.maxx, r.maxy]], { padding: 80, maxZoom: 19 });
        pickParcel(r.id);
    } catch (err) {
        detail.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    }
});
