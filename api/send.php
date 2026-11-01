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

$LOG = sys_get_temp_dir() . '/leadgate.log';

/* ==========================================================================
   מכאן והלאה לא נוגעים
   ========================================================================== */

/* פנייה חסומה מקבלת תשובת "הצלחה".
   בכוונה: בוט שמקבל שגיאה מתאים את עצמו, בוט שמקבל אישור ממשיך
   לשדר לתוך הריק. מה שנחסם נרשם ביומן ולא מגיע לגיליון. */
function drop($why) {
  global $LOG;
  @file_put_contents(
    $LOG,
    date('Y-m-d H:i:s') . "\t" . ($_SERVER['REMOTE_ADDR'] ?? '?') . "\t" . $why . "\n",
    FILE_APPEND
  );
  reply(['status' => 'ok']);
}

function reply($payload) {
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
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
if (hits('all', 60) > $PER_MINUTE)      drop('flood-global');
if (hits('ip' . $ip, 3600) > $PER_IP_HOUR) drop('flood-ip');

/* גוף הבקשה */
$body = file_get_contents('php://input');
if ($body === false || $body === '')   drop('empty');
if (strlen($body) > $MAX_BODY)         drop('too-big:' . strlen($body));

$data = json_decode($body, true);
if (!is_array($data))                  drop('not-json');
if (count($data) > $MAX_FIELDS)        drop('too-many-fields:' . count($data));

/* זה מה שהפיל לך את הגיליון: ערך ענק בשדה בודד. */
foreach ($data as $key => $value) {
  if (!is_string($key) || strlen($key) > 40) drop('bad-key');

  if (is_string($value)) {
    $limit = ($key === 'userAgent') ? $MAX_UA : $MAX_VALUE;
    if (mb_strlen($value) > $limit) drop('long-value:' . $key . ':' . mb_strlen($value));
  } elseif ($value !== null && !is_scalar($value)) {
    drop('bad-value:' . $key);
  }
}

/* ולידציה בסיסית — מה שלא נראה כמו ליד לא עובר */
$phone = preg_replace('/\D/', '', (string) ($data['phone'] ?? ''));
if (!preg_match('/^05\d{8}$/', $phone)) drop('bad-phone');

if (mb_strlen(trim((string) ($data['name'] ?? ''))) < 2) drop('no-name');

/* ---------- העברה ליעד האמיתי ---------- */

/* ה-IP האמיתי, כפי שהשרת רואה אותו. דורס את מה שהדפדפן שלח,
   כי הערך ההוא נשלט לגמרי על ידי השולח וניתן לזיוף. */
$data['ip']     = $ip;
$data['secret'] = $SECRET;

$ch = curl_init($TARGET);
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => json_encode($data, JSON_UNESCAPED_UNICODE),
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,   /* חובה: Apps Script מחזיר הפניה */
  CURLOPT_TIMEOUT        => 25,
]);

$response = curl_exec($ch);
$code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $code !== 200) {
  @file_put_contents($LOG, date('Y-m-d H:i:s') . "\tUPSTREAM\t" . $code . "\n", FILE_APPEND);
  http_response_code(502);
  reply(['status' => 'neterror']);
}

header('Content-Type: application/json; charset=utf-8');
echo $response;
