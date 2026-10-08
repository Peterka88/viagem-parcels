<?php
declare(strict_types=1);


final class KuController {

    public function __construct(private PDO $db) {}

    public function getAllKu(): void {

        $sql = <<<SQL
        SELECT k.kod, k.nazev FROM katastralni_uzemi k 
        ORDER BY k.nazev COLLATE "cs-CZ-x-icu"
        SQL;

        $data = $this->db->query($sql)->fetchAll();

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    }
}
