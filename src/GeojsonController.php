<?php
declare(strict_types=1);

final class GeoJsonController {

    public function __construct(private PDO $db) {}

    public function getAll(): void {

        $sql = <<<SQL
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', COALESCE(json_agg(json_build_object(
                    'type', 'Feature',
                    'id', p.id,
                    'geometry', ST_AsGeoJSON(ST_Transform(p.geom, 4326), 6)::json,
                    'properties', json_build_object('druh_pozemku_kod', p.druh_pozemku_kod)
                )), '[]'::json)
            )
            FROM parcely p
            SQL;

        $json = $this->db->query($sql)->fetchColumn();

        header('Content-Type: application/geo+json');
        echo $json;
    }
}