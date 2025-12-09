<?php
require __DIR__.'/connection.php';

try{
    if (ob_get_level()) ob_end_clean();
    header_remove();

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=heat_readings_' . date('Ymd_His') . '.csv');
    header('Pragma: no-cache');
    header('Expires: 0');

    $out = fopen('php://output', 'w');
    // BOM UTF-8 para Excel
    fprintf($out, "\xEF\xBB\xBF");

    fputcsv($out, ['id','timestamp','s1','s2','s3','s4']);

    $stmt = $pdo->query("SELECT id,timestamp,s1,s2,s3,s4 FROM readings ORDER BY timestamp ASC");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        fputcsv($out, [$row['id'],$row['timestamp'],$row['s1'],$row['s2'],$row['s3'],$row['s4']]);
    }

    fclose($out);
    exit;
} catch (Throwable $e){
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Error al exportar CSV: ".$e->getMessage();
}
