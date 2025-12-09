<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__.'/connection.php';

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 300;
if ($limit <= 0) $limit = 300;

$stmt = $pdo->prepare("SELECT id, timestamp, s1, s2, s3, s4 FROM readings ORDER BY timestamp ASC LIMIT ?");
$stmt->bindValue(1, $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($rows);
