<?php
/* ==========================================================================
   שער הטפסים
   הדפדפן מדבר רק עם הקובץ הזה. כתובת ה-Apps Script והסיסמה יושבות כאן
   בלבד, בצד השרת, ולעולם לא מגיעות לדפדפן — אי אפשר לראות אותן ב-F12.
   ========================================================================== */

/* ---- שני הערכים שצריך לעדכן אחרי פריסה חדשה ---- */

$TARGET = 'PASTE_YOUR_EXEC_URL_HERE';

/* חייב להיות זהה ל-SHARED_SECRET שב-Apps Script */
$SECRET = 'PASTE_THE_SAME_LONG_RANDOM_STRING_IN_BOTH_FILES';

/* ---- מדיניות ---- */

$ALLOWED_HOST  = 'sykru-finance.com';
$MAX_BODY      = 8000;   // תווים בכל הבקשה
$MAX_FIELDS    = 30;     // כמה שדות מותר
$MAX_VALUE     = 300;    // אורך מרבי לערך בודד
$MAX_UA        = 400;    // חריג: מחרוזת הדפדפן ארוכה מטבעה
$PER_IP_HOUR   = 5;      // פניות מאותו IP בשעה
$PER_MINUTE    = 40;     // פניות מכל המקורות בדקה

/* היומן יושב לצד הקובץ כדי שאפשר יהיה לפתוח אותו ב-File Manager.
   ה-.htaccess שבתיקייה חוסם גישה אליו מהדפדפן. */
$LOG = __DIR__ . '/leadgate.log';

/* ==========================================================================
   מכאן והלאה לא נוגעים
   ========================================================================== */

function logline($text) {
  global $LOG;
  @file_put_contents(
    $LOG,
    date('Y-m-d H:i:s') . "\t" . ($_SERVER['REMOTE_ADDR'] ?? '?') . "\t" . $text . "\n",
    FILE_APPEND
  );
}

function reply($payload, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

/* פנייה חסומה מקבלת תשובת "הצלחה".
   בכוונה: בוט שמקבל שגיאה מתאים את עצמו, בוט שמקבל אישור ממשיך
   לשדר לתוך הריק. מה שנחסם נרשם ביומן ולא מגיע לגיליון. */
function drop($why) {
  logline('DROP ' . $why);
  reply(['status' => 'ok']);
}

/* ספירה בחלון זמן, על קובץ. מחזיר את המונה אחרי ההגדלה. */
function hits($bucket, $window) {
  $path = sys_get_temp_dir() . '/lg_' . md5($bucket . floor(time() / $window));
  $count = (int) @file_get_contents($path) + 1;
  @file_put_contents($path, $count, LOCK_EX);
  return $count;
}

/* ---------- השער ---------- */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') drop('not-post');

/* דפדפן אמיתי שולח Origin או Referer. בקשה ישירה מסקריפט לרוב לא. */
$source = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($source === '') drop('no-origin');

$host = parse_url($source, PHP_URL_HOST);
if ($host !== $ALLOWED_HOST && $host !== 'www.' . $ALLOWED_HOST) drop('bad-origin:' . $host);

/* קצב */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if (hits('all', 60) > $PER_MINUTE)         drop('flood-global');
if (hits('ip' . $ip, 3600) > $PER_IP_HOUR) drop('flood-ip');

/* גוף הבקשה */
$body = file_get_contents('php://input');
if ($body === false || $body === '')   drop('empty');
if (strlen($body) > $MAX_BODY)         drop('too-big:' . strlen($body));

$data = json_decode($body, true);
if (!is_array($data))                  drop('not-json');
if (count($data) > $MAX_FIELDS)        drop('too-many-fields:' . count($data));

/* זה מה שהפיל את הגיליון: ערך ענק בשדה בודד. */
foreach ($data as $key => $value) {
  if (!is_string($key) || strlen($key) > 40) drop('bad-key');

  if (is_string($value)) {
    $limit = ($key === 'userAgent') ? $MAX_UA : $MAX_VALUE;
    $len = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
    if ($len > $limit) drop('long-value:' . $key . ':' . $len);
  } elseif ($value !== null && !is_scalar($value)) {
    drop('bad-value:' . $key);
  }
}

/* ולידציה בסיסית — מה שלא נראה כמו ליד לא עובר */
$phone = preg_replace('/\D/', '', (string) ($data['phone'] ?? ''));
if (!preg_match('/^05\d{8}$/', $phone)) drop('bad-phone');

if (strlen(trim((string) ($data['name'] ?? ''))) < 2) drop('no-name');

/* ---------- העברה ליעד האמיתי ---------- */

/* ה-IP האמיתי, כפי שהשרת רואה אותו. דורס את מה שהדפדפן שלח,
   כי הערך ההוא נשלט לגמרי על ידי השולח וניתן לזיוף. */
$data['ip']     = $ip;
$data['secret'] = $SECRET;

$payload = json_encode($data, JSON_UNESCAPED_UNICODE);

/* Apps Script תמיד עונה בהפניה אל googleusercontent, ושם יושבת התשובה.
   אי אפשר להסתמך על CURLOPT_FOLLOWLOCATION: כשהאחסון מגדיר
   open_basedir — וזה המצב ברוב אחסוני השיתוף — PHP מסרב להפעיל אותו.
   לכן עוקבים אחרי ההפניה בעצמנו. */

function httpPost($url, $payload) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => $payload,
      CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 25,
    ]);
    $out  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $next = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
    $err  = curl_error($ch);
    curl_close($ch);
    return [$out, $code, $next, $err];
  }
  return streamRequest($url, 'POST', $payload);
}

function httpGet($url) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 25,
    ]);
    $out  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $next = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
    $err  = curl_error($ch);
    curl_close($ch);
    return [$out, $code, $next, $err];
  }
  return streamRequest($url, 'GET', null);
}

/* גיבוי לאחסון שבו cURL כבוי לגמרי */
function streamRequest($url, $method, $payload) {
  $options = [
    'http' => [
      'method'        => $method,
      'header'        => "Content-Type: application/json\r\n",
      'content'       => $payload,
      'timeout'       => 25,
      'ignore_errors' => true,
      'follow_location' => 1,
      'max_redirects'   => 5
    ]
  ];

  $out = @file_get_contents($url, false, stream_context_create($options));
  $code = 0;

  if (isset($http_response_header[0]) &&
      preg_match('{HTTP/\S+\s+(\d{3})}', implode("\n", $http_response_header), $m)) {
    // בשרשרת הפניות מעניין הסטטוס האחרון
    foreach ($http_response_header as $line) {
      if (preg_match('{^HTTP/\S+\s+(\d{3})}', $line, $one)) $code = (int) $one[1];
    }
  }

  return [$out, $code, '', $out === false ? 'stream failed' : ''];
}

list($out, $code, $next, $err) = httpPost($TARGET, $payload);

$hops = 0;
while (in_array($code, [301, 302, 303, 307, 308], true) && $next !== '' && $hops < 4) {
  list($out, $code, $next, $err) = httpGet($next);
  $hops++;
}

if ($out === false || $code !== 200) {
  logline('UPSTREAM code=' . $code . ' hops=' . $hops . ' err=' . $err);
  reply(['status' => 'neterror'], 502);
}

/* התשובה אמורה להיות ה-JSON של doPost. אם חזר משהו אחר,
   אל תעביר אותו הלאה — form.js מנסה לפענח אותו ונשבר. */
$parsed = json_decode($out, true);

if (!is_array($parsed)) {
  logline('BAD-UPSTREAM-BODY ' . substr((string) $out, 0, 200));
  reply(['status' => 'neterror'], 502);
}

reply($parsed);
