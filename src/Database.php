<?php
declare(strict_types=1);

final class Database
{
    public static function connect(): PDO
    {
        return new PDO(
            getenv('DB_DSN') ?: 'pgsql:host=localhost;port=5433;dbname=parcely',
            getenv('DB_USER') ?: 'admin',
            getenv('DB_PASS') ?: 'admin',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
}
