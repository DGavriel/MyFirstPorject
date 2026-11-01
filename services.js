/* ==========================================================================
   דף נחיתה – כתבי שירות רפואיים
   כאן עורכים שאלות, נוסחים וכתובות. המנוע יושב ב-form.js ולא נוגעים בו.
   כל הפניות ללקוח בלשון רבים – לא יודעים אם מדובר בגבר או באישה.
   ========================================================================== */

const FORM = {
  name: 'כתבי שירות',

  // כתובת ה-Web App של Google Apps Script (מגיע בשלב הבא)
  endpoint: '/api/send.php',

  storageKey: 'services-lead',
  enterFrom: 'left',
  homeUrl: '',

  steps: [
    {
      id: 'intro',
      type: 'intro',
      eyebrow: 'בדיקת התאמה ללא עלות',
      title: 'כתבי שירות רפואיים',
      lead: '<span>רפואה פרטית</span> <span>בלי להמתין חודשים</span>',
      bullets: [
        'תורים ל<strong>רופאים מומחים</strong> תוך ימים, לא חודשים',
        '<strong>רופא עד הבית</strong>, דנטל, רפואה משלימה ולחצן מצוקה',
        'התאמת כיסוי <strong>לכל המשפחה</strong> לפי הצרכים שלכם'
      ],
      cta: 'בדקו התאמה ללא עלות',
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
      id: 'maritalStatus',
      type: 'choice',
      title: 'מה הסטטוס המשפחתי שלכם?',
      options: ['רווק/ה', 'נשוי/אה', 'גרוש/ה', 'אלמן/ה']
    },
    {
      // רלוונטי רק למי שלא רווק/ה – שם הסבירות לילדים גבוהה
      id: 'children',
      type: 'choice',
      title: 'כמה ילדים יש לכם?',
      options: ['אין ילדים', 'ילד אחד', '2 ילדים', '3 ילדים', '4 ילדים', '5 ילדים', '6 ומעלה'],
      showIf: answers => ['נשוי/אה', 'גרוש/ה', 'אלמן/ה'].includes(answers.maritalStatus)
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
      cta: 'שלחו לבדיקת התאמה'
    },
    {
      id: 'done',
      type: 'done',
      title: 'הבקשה נשלחה בהצלחה!',
      body: [
        'קיבלנו את הפרטים ואנחנו כבר מתחילים להתאים עבורכם את הכיסוי המשתלם ביותר.',
        '<strong>נציגנו יחזרו אליכם ב-48 השעות הקרובות.</strong>'
      ],
      actions: [
        { label: 'להלוואה כנגד נכס',                sub: 'לחצו כאן', href: 'index.html',     style: 'pulse' },
        { label: 'לבדיקה מקיפה להוזלת הביטוחים הפרטיים', sub: 'לחצו כאן', href: 'insurance.html', style: 'pulse', color: 'green' },
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ]
    },
    {
      // מוצג כשאותו מספר כבר השאיר פנייה בדף הזה ב-24 השעות האחרונות
      id: 'blocked',
      type: 'blocked',
      title: 'כבר קיבלנו מכם פנייה',
      body: [
        'המספר הזה כבר השאיר פנייה לבדיקת כתבי שירות <strong>ב-24 השעות האחרונות</strong>, ואין צורך לשלוח שוב.',
        'נציגנו יחזרו אליכם בהקדם. בינתיים אולי יעניין אתכם:'
      ],
      actions: [
        { label: 'להלוואה כנגד נכס',                sub: 'לחצו כאן', href: 'index.html',     style: 'pulse' },
        { label: 'לבדיקה מקיפה להוזלת הביטוחים הפרטיים', sub: 'לחצו כאן', href: 'insurance.html', style: 'pulse', color: 'green' },
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ],
      showIf: () => false
    }
  ]
};
