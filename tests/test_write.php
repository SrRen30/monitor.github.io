<?php
// Inserta una fila de prueba en la tabla readings
header('Content-Type: text/plain; charset=utf-8');
require __DIR__.'/../backend/connection.php';

try {
    $stmt = $pdo->prepare("INSERT INTO readings (timestamp,s1,s2,s3,s4) VALUES (NOW(),?,?,?,?,?)");
} catch (PDOException $e) {
    // corrección: 5 valores
}
try {
    $stmt = $pdo->prepare("INSERT INTO readings (timestamp,s1,s2,s3,s4) VALUES (NOW(),?,?,?,?)");
    $stmt->execute([25.5, 26.0, 27.2, 28.1]);
    echo "Inserción OK, id=" . $pdo->lastInsertId();
} catch (PDOException $e) {
    echo "Error al insertar: " . $e->getMessage();
}
