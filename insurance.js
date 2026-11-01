/* ==========================================================================
   דף נחיתה – בדיקת תיק ביטוחי
   כאן עורכים שאלות, נוסחים וכתובות. המנוע יושב ב-form.js ולא נוגעים בו.
   כל הפניות ללקוח בלשון רבים – לא יודעים אם מדובר בגבר או באישה.
   ========================================================================== */

const FORM = {
  name: 'ביטוח',

  // כתובת ה-Web App של Google Apps Script (מגיע בשלב הבא)
  endpoint: 'https://script.google.com/macros/s/AKfycbxxY1ZSe-MlXtwQjBxVwGBDrp0KLHfF1sYRaQOtUUCt41lyjaXTii38Q-ALTko1XnV0/exec',

  // מפתח אחסון מקומי – שונה מזה של דף ההלוואה
  storageKey: 'insurance-lead',

  enterFrom: 'left',
  homeUrl: '',

  steps: [
    {
      id: 'intro',
      type: 'intro',
      eyebrow: 'בדיקה מקיפה ללא עלות',
      title: 'בדיקת תיק ביטוחי',
      lead: '<span>חיסכון של אלפי שקלים</span> <span>בשנה</span>',
      bullets: [
        'בדיקה <strong>מקיפה של כל הפוליסות</strong> שיש לכם היום',
        'איתור <strong>כפילויות וכיסויים מיותרים</strong> שאתם משלמים עליהם',
        'נציגנו חוזרים אליכם תוך <strong>48 שעות</strong> עם התמונה המלאה'
      ],
      cta: 'התחילו בדיקה ללא עלות',
      note: '<span>הבדיקה אורכת פחות מדקה</span><br><span>ללא עלות</span> · <span>ללא התחייבות</span>'
    },
    {
      id: 'name',
      type: 'text',
      title: 'מה השם המלא שלכם?',
      placeholder: 'רשמו כאן שם ושם משפחה',
      hint: 'אותיות בעברית בלבד',
      filter: 'hebrew',
      autocomplete: 'name',
      validate: 'name',
      cta: 'המשיכו'
    },
    {
      id: 'idNumber',
      type: 'id',
      title: 'מהו מספר תעודת הזהות שלכם?',
      placeholder: 'יש לרשום 9 ספרות',
      hint: 'נדרש לצורך שליפת הפוליסות הקיימות<br>אם התעודה מתחילה ב-0, יש לרשום גם אותו',
      filter: 'id',
      validate: 'id',
      cta: 'המשיכו'
    },
    {
      id: 'maritalStatus',
      type: 'choice',
      title: 'מה הסטטוס המשפחתי שלכם?',
      options: ['רווק/ה', 'נשוי/אה', 'גרוש/ה', 'אלמן/ה']
    },
    {
      id: 'phone',
      type: 'tel',
      title: 'מהו מספר הנייד שלכם?',
      placeholder: 'יש לרשום מספר נייד תקין',
      hint: '10 ספרות, ללא מקפים או רווחים',
      filter: 'phone',
      autocomplete: 'tel',
      validate: 'phone',
      cta: 'שלחו לבדיקה'
    },
    {
      id: 'done',
      type: 'done',
      title: 'הבקשה נשלחה בהצלחה!',
      body: [
        'קיבלנו את הפרטים ואנחנו כבר מתחילים לבדוק את התיק הביטוחי שלכם.',
        '<strong>נציגנו יחזרו אליכם ב-48 השעות הקרובות.</strong>'
      ],
      actions: [
        { label: 'להלוואה כנגד נכס',                sub: 'לחצו כאן', href: 'index.html',    style: 'pulse' },
        { label: 'לביטוח כתבי שירות והתאמת כיסוי משתלם', sub: 'לחצו כאן', href: 'services.html', style: 'pulse', color: 'purple' },
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ]
    },
    {
      // מוצג כשאותו מספר כבר השאיר פנייה בדף הזה ב-24 השעות האחרונות
      id: 'blocked',
      type: 'blocked',
      title: 'כבר קיבלנו מכם פנייה',
      body: [
        'המספר הזה כבר השאיר פנייה לבדיקת התיק הביטוחי <strong>ב-24 השעות האחרונות</strong>, ואין צורך לשלוח שוב.',
        'נציגנו יחזרו אליכם בהקדם. בינתיים אולי יעניין אתכם:'
      ],
      actions: [
        { label: 'להלוואה כנגד נכס',                sub: 'לחצו כאן', href: 'index.html',    style: 'pulse' },
        { label: 'לביטוח כתבי שירות והתאמת כיסוי משתלם', sub: 'לחצו כאן', href: 'services.html', style: 'pulse', color: 'purple' },
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ],
      showIf: () => false
    }
  ]
};
