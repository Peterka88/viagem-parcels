<?php
declare(strict_types=1);

require __DIR__ . '/../src/Database.php';
require __DIR__ . '/../src/TileController.php';
require __DIR__ . '/../src/ParcelController.php';
require __DIR__ . '/../src/GeojsonController.php';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (PHP_SAPI === 'cli-server' && $path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

try {
    $db = Database::connect();

    if ($path === '/') {
        readfile(__DIR__ . '/index.html');
        exit;
    }

    if (preg_match('#^/tiles/(\d+)/(\d+)/(\d+)\.pbf$#', $path, $m)) {
        (new TileController($db))->getTile((int) $m[1], (int) $m[2], (int) $m[3]);
        exit;
    } elseif (preg_match('#^/api/parcel/(\d+)$#', $path, $m)) {
        (new ParcelController($db))->getParcelDetails((int) $m[1]);
        exit;
    } elseif ($path === '/api/parcely.geojson') {
        (new GeoJsonController($db))->getAll();
        exit;
    } else {
        http_response_code(404);
        echo 'Not found';
    }
}catch (Throwable $e) {
    http_response_code(500);
    error_log((string) $e);
    echo 'Server error';
}