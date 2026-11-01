/* ==========================================================================
   שני שינויים ב-Apps Script. אין צורך לגעת בשום דבר אחר בקובץ.
   ========================================================================== */


/* ---------- שינוי 1 ----------
   להוסיף את שתי השורות האלה למעלה, ליד MAX_PER_MINUTE.
   הסיסמה חייבת להיות זהה ל-$SECRET שב-send.php.                      */

const SHARED_SECRET = 'PASTE_THE_SAME_LONG_RANDOM_STRING_IN_BOTH_FILES';

// אורך מרבי לערך בודד. זה מה שחוסם את הג'יבריש הארוך.
const MAX_FIELD_LEN = 300;


/* ---------- שינוי 2 ----------
   להחליף את פונקציית doPost כולה בזו שלמטה.                          */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    /* השער. רק מי שמחזיק בסיסמה כותב לגיליון — כלומר send.php בלבד.
       הסיסמה יושבת בצד השרת ולא מגיעה לדפדפן, ולכן גם מי שמצא את
       כתובת ה-exec ב-F12 לא יכול להשתמש בה.
       מחזירים ok בשקט: בוט שמקבל שגיאה מתאים את עצמו. */
    if (data.secret !== SHARED_SECRET) {
      return json({ status: 'ok' });
    }
    delete data.secret;

    // ערך חריג באורכו הוא זבל, לא ליד. זה מה שהפיל את הגיליון.
    for (const key in data) {
      if (typeof data[key] === 'string' && data[key].length > MAX_FIELD_LEN) {
        return json({ status: 'ok' });
      }
    }

    const layout = LAYOUT[data.form];

    if (!layout) {
      return json({ status: 'error', message: 'טופס לא מוכר: ' + data.form });
    }

    // בלם הצפה – לפני כל גישה לגיליון
    if (floodDetected()) {
      return json({ status: 'error', message: 'יותר מדי פניות בזמן קצר' });
    }

    const phone = normalizePhone(data.phone);
    const name = String(data.name || '').trim();

    // ולידציה בצד השרת – לא סומכים על מה שהדפדפן שלח
    if (!/^05\d{8}$/.test(phone)) {
      return json({ status: 'error', message: 'מספר נייד לא תקין' });
    }

    if (name.length < 2) {
      return json({ status: 'error', message: 'שם חסר' });
    }

    // נעילה: בדיקת הכפילות והכתיבה חייבות להיות פעולה אחת.
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);

    try {
      const sheet = getSheet(layout);

      if (isDuplicate(sheet, layout, phone)) {
        return json({ status: 'duplicate' });
      }

      data.timestamp = new Date();
      data.phone = phone;

      appendLead(sheet, layout, data);
      SpreadsheetApp.flush();

    } finally {
      lock.releaseLock();
    }

    return json({ status: 'ok' });

  } catch (err) {
    return json({ status: 'error', message: String(err) });
  }
}
