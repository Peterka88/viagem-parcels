<?php
declare(strict_types=1);

require __DIR__ . '/../src/Database.php';
require __DIR__ . '/../src/TileController.php';
require __DIR__ . '/../src/ParcelController.php';
require __DIR__ . '/../src/KuController.php';

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

    if ($path === '/api/ku') {
        (new KuController($db))->getAllKu();
        exit;
    }

    if ($path === '/api/parcel/search') {
        $kmen = filter_input(INPUT_GET, 'kmen', FILTER_VALIDATE_INT);
        $ku = filter_input(INPUT_GET, 'ku', FILTER_VALIDATE_INT);
        $druh = filter_input(INPUT_GET, 'druh', FILTER_VALIDATE_INT);
        $pod = filter_input(INPUT_GET, 'pod', FILTER_VALIDATE_INT);

        if (!$kmen || !$ku || !in_array($druh, [1, 2], true)) {
            http_response_code(400);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Neplatné parametry']);
            exit;
        }

        (new ParcelController($db))->searchParcels($kmen, $ku, $druh, $pod ?: null);
        exit;
    }

    if (preg_match('#^/tiles/(\d+)/(\d+)/(\d+)\.pbf$#', $path, $m)) {
        (new TileController($db))->getTile((int) $m[1], (int) $m[2], (int) $m[3]);
        exit;
    } elseif (preg_match('#^/api/parcel/(\d+)$#', $path, $m)) {
        (new ParcelController($db))->getParcelDetails((int) $m[1]);
        exit;
    }
}catch (Throwable $e) {
    http_response_code(500);
    error_log((string) $e);
    echo 'Server error';
}