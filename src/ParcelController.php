<?php
declare(strict_types=1);

final class ParcelController {

    public function __construct(private PDO $db) {}

    public function getParcelDetails(int $parcelId): void {

        $sql = <<<SQL
        SELECT p.id, 
               p.kmenove_cislo, 
               p.pododdeleni_cisla, 
               p.druh_cislovani_kod,
               p.druh_pozemku_kod,
               p.zpusob_vyuziti_kod,
               p.vymera,
               array_to_json(p.bpej_kody) AS bpej_kody,
               array_to_json(p.bpej_vymery) AS bpej_vymery,
               k.kod AS ku_kod,
               k.nazev AS ku_nazev,
               o.nazev AS obec_nazev
        FROM parcely p
        JOIN katastralni_uzemi k ON k.kod = p.ku_kod
        JOIN obec o ON o.kod = k.obec_kod
        WHERE p.id = :parcelId
        SQL;

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['parcelId' => $parcelId]);
        $row = $stmt->fetch();

        if ($row === false) {
            $this->json(['error' => 'Parcela nenalezena'], 404);
            return;
        }

        $this->json([
            'id' => $row['id'],
            'cislo' => $this->formatParcelNumber($row),
            'katastralni_uzemi' => [
                'kod' => $row['ku_kod'],
                'nazev' => $row['ku_nazev'],
            ],
            'obec' => $row['obec_nazev'],
            'vymera' => $row['vymera'],
            'druh_pozemku_kod' => $row['druh_pozemku_kod'],
            'zpusob_vyuziti_kod' => $row['zpusob_vyuziti_kod'],
            'bpej' => $this->formatBpej($row),
            'nahlizeni_url' => 'https://nahlizenidokn.cuzk.gov.cz/ZobrazObjekt.aspx?typ=parcela&id=' . $row['id'],
        ]);
    }

    private function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function formatParcelNumber(array $row): string
    {
        $cislo = (string) $row['kmenove_cislo'];

        if ($row['pododdeleni_cisla'] !== null) {
            $cislo .= '/' . $row['pododdeleni_cisla'];
        }

        if ((int) $row['druh_cislovani_kod'] === 1) {
            $cislo = 'st. ' . $cislo;
        }

        return $cislo;
    }

    private function formatBpej(array $row): array
    {
        $kody = json_decode($row['bpej_kody'] ?? 'null', true) ?? [];
        $vymery = json_decode($row['bpej_vymery'] ?? 'null', true) ?? [];

        $bpej = [];
        foreach ($kody as $i => $kod) {
            $bpej[] = [
                'kod' => str_pad((string) $kod, 5, '0', STR_PAD_LEFT), // BPEJ má vždy 5 číslic
                'vymera' => $vymery[$i] ?? null,
            ];
        }

        return $bpej;
    }
}
