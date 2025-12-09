<?php
// Muestra las últimas 10 filas de readings
header('Content-Type: text/plain; charset=utf-8');
require __DIR__.'/../backend/connection.php';

$stmt = $pdo->query("SELECT * FROM readings ORDER BY id DESC LIMIT 10");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
