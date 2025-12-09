<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__.'/connection.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data && !empty($_POST)) {
    $data = $_POST;
}
if (!$data) {
    echo json_encode(['ok'=>false,'error'=>'No se recibió JSON ni POST']);
    exit;
}

$timestamp = $data['timestamp'] ?? date('Y-m-d H:i:s');
$s1 = isset($data['s1']) ? floatval($data['s1']) : null;
$s2 = isset($data['s2']) ? floatval($data['s2']) : null;
$s3 = isset($data['s3']) ? floatval($data['s3']) : null;
$s4 = isset($data['s4']) ? floatval($data['s4']) : null;

if ($s1===null || $s2===null || $s3===null || $s4===null) {
    echo json_encode(['ok'=>false,'error'=>'Faltan s1..s4']);
    exit;
}

try{
    $stmt = $pdo->prepare("INSERT INTO readings (timestamp,s1,s2,s3,s4) VALUES (?,?,?,?,?)");
    $stmt->execute([$timestamp,$s1,$s2,$s3,$s4]);
    echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]);
} catch (PDOException $e){
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
