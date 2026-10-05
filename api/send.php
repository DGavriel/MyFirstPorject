<?php
/* ==========================================================================
   שער הטפסים
   הדפדפן מדבר רק עם הקובץ הזה. כתובת ה-Apps Script יושבת כאן בלבד,
   בצד השרת, ולעולם לא מגיעה לדפדפן — אי אפשר לראות אותה ב-F12.
   ========================================================================== */

/* הכתובת האמיתית. היחידה שצריך לעדכן אחרי פריסה חדשה. */
$TARGET = 'https://script.google.com/macros/s/AKfycbz2Jtna5o5JmnUj0VQ5U5Fet5cwwI5K5ATKRJAtzLEplOoJ_rGasuEmAVq3MwPCLqoY/exec';

/* רק מהדומיין שלנו. */
$ALLOWED_HOST = 'sykru-finance.com';

/* ---------- בדיקות שער ---------- */

function reject($code = 403) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['result' => 'error']);
  exit;
}

/* רק POST */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reject(405);

/* דפדפן אמיתי שולח Origin או Referer. בקשה ישירה מסקריפט לרוב לא שולחת
   אף אחד מהם — וזו הסינון הראשון. */
$origin  = $_SERVER['HTTP_ORIGIN']  ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$source  = $origin !== '' ? $origin : $referer;

if ($source === '') reject();

$host = parse_url($source, PHP_URL_HOST);
if ($host === null) reject();
if ($host !== $ALLOWED_HOST && $host !== 'www.' . $ALLOWED_HOST) reject();

/* גוף הבקשה */
$body = file_get_contents('php://input');
if ($body === false || $body === '' || strlen($body) > 20000) reject(400);

/* ---------- העברה ליעד האמיתי ---------- */

$type = $_SERVER['CONTENT_TYPE'] ?? 'application/json';

$ch = curl_init($TARGET);
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $body,
  CURLOPT_HTTPHEADER     => ['Content-Type: ' . $type],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,   /* חובה: Apps Script מחזיר הפניה */
  CURLOPT_TIMEOUT        => 20,
]);

$response = curl_exec($ch);
$status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
  http_response_code(502);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['result' => 'error']);
  exit;
}

http_response_code($status ?: 200);
header('Content-Type: application/json; charset=utf-8');
echo $response;
