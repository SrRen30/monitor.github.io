<?php
/* connection.php
   - Conecta a MySQL con PDO
   - Crea base de datos y tabla si no existen
*/
$DB_HOST = 'localhost';
$DB_USER = 'root';
$DB_PASS = '';           // cambia si tu MySQL tiene contraseña
$DB_NAME = 'heat_monitor';

try {
    // Conexión al servidor (sin seleccionar DB)
    $pdo = new PDO("mysql:host=$DB_HOST;charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Crear DB si no existe
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$DB_NAME` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    // Conectar a esa DB
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Crear tabla si no existe
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS readings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp DATETIME NOT NULL,
          s1 FLOAT DEFAULT 0,
          s2 FLOAT DEFAULT 0,
          s3 FLOAT DEFAULT 0,
          s4 FLOAT DEFAULT 0
        )
    ");
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'error'=>'DB error: '.$e->getMessage()]);
    exit;
}
