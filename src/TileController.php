<?php
declare(strict_types=1);


final class TileController {

    public function __construct(private PDO $db) {}

    public function getTile(int $z, int $x, int $y): void {
        if ($z < 13){
            $sql = $this->getKuTile($z, $x, $y);
        }else {
            $sql = $this->getParcelTile($z, $x, $y);
        }

        $query = $this->db->prepare($sql);
        $query->execute([':z' => $z, ':x' => $x, ':y' => $y]);
        $tile = $query->fetchColumn();

        if (is_resource($tile)) {
            $tile = stream_get_contents($tile);
        }

        header('Content-Type: application/vnd.mapbox-vector-tile');
        header('Cache-Control: public, max-age=3600');
        echo $tile ?: '';
    }

    public function getParcelTile(int $z, int $x, int $y): string {

        return <<<SQL
            WITH tile AS ( 
                SELECT ST_TileEnvelope(:z, :x, :y) as bounds
             ),
            features AS ( 
                SELECT p.id, p.druh_pozemku_kod,
                       ST_AsMVTGeom(p.geom, tile.bounds) as geom
                FROM parcely p, tile
                WHERE p.geom && tile.bounds
             )
            SELECT ST_AsMVT(features, 'parcely', 4096, 'geom', 'id') FROM features
            SQL;
    }

    private function getKuTile(int $z, int $x, int $y): string {
        return <<<SQL
            WITH tile AS (
                SELECT ST_TileEnvelope(:z, :x, :y) as bounds
            ),
            features AS (
                SELECT k.kod, k.nazev,
                       ST_AsMVTGeom(k.geom, tile.bounds) as geom
                FROM katastralni_uzemi k, tile
                WHERE k.geom && tile.bounds
            )
            SELECT ST_AsMVT(features, 'katastralni', 4096, 'geom') FROM features
            SQL;

    }


}