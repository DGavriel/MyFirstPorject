/* ==========================================================================
   דף נחיתה – החזרי מס
   כאן עורכים שאלות, נוסחים וכתובות. המנוע יושב ב-form.js ולא נוגעים בו.
   ========================================================================== */

const FORM = {
  name: 'החזרי מס',

  endpoint: 'https://script.google.com/macros/s/AKfycbz2Jtna5o5JmnUj0VQ5U5Fet5cwwI5K5ATKRJAtzLEplOoJ_rGasuEmAVq3MwPCLqoY/exec',

  storageKey: 'tax-lead',
  enterFrom: 'left',
  homeUrl: '',

  /* מד הזכאות. נקודת הבסיס נצברת בהדרגה, כך שהמד מטפס
     לאורך השאלון ונוחת בין 75% ל-100%. תשובה פוסלת מאפסת. */
  meter: {
    base: 50,
    cap: 100,
    bands: [
      { upTo: 0,   color: '#dc2626', note: 'לפי התשובות שלכם לא נוכל לקדם בקשה' },
      { upTo: 45,  color: '#2563eb', note: 'ממשיכים לאסוף נתונים' },
      { upTo: 75,  color: '#d97706', note: 'מסתמן סיכוי להחזר' },
      { upTo: 100, color: '#059669', note: 'סיכוי גבוה מאוד שמגיע לכם החזר' }
    ]
  },

  steps: [
    {
      id: 'intro',
      type: 'intro',
      eyebrow: 'בדיקת זכאות מקוונת',
      title: 'אולי מגיע לכם <span style="display:inline-block;padding:2px 13px;border-radius:99px;background:#ecfdf5;color:#047857;animation:pill 2.6s ease-in-out infinite">החזר מס?</span>',
      lead: '<span>בדיקה עד</span> <span>6 שנים אחורה</span>',
      bullets: [
        '<strong>טעויות בחישוב מס</strong> נפוצות הרבה יותר ממה שנדמה',
        'החוק מאפשר לבדוק <strong>6 שנים אחורה</strong>',
        'מדד ההתאמה מתעדכן <strong>בזמן אמת</strong>'
      ],
      cta: 'בדקו כמה מגיע לכם',
      note: '<span>הבדיקה אורכת פחות מדקה</span><br><span>ללא התחייבות</span>'
    },

    {
      id: 'taxPaid',
      type: 'choice',
      title: 'האם ירד לכם מס הכנסה בתלוש ב-6 השנים האחרונות?',
      hint: 'הכוונה למס הכנסה בלבד – לא ביטוח לאומי ולא מס בריאות',
      options: ['כן', 'לא'],
      points: { 'כן': 10, 'לא': 4 }
    },
    {
      id: 'salary',
      type: 'choice',
      title: 'מה המשכורת הממוצעת שלכם ב-6 השנים האחרונות?',
      options: ['עד 7,000 ₪', '7,000 – 15,000 ₪', 'מעל 15,000 ₪'],
      points: { 'עד 7,000 ₪': 3, '7,000 – 15,000 ₪': 7, 'מעל 15,000 ₪': 7 }
    },
    {
      id: 'jobs',
      type: 'choice',
      title: 'האם החלפתם מקום עבודה ב-6 השנים האחרונות?',
      hint: 'החלפת עבודה היא הסיבה הנפוצה ביותר לתשלום מס ביתר',
      options: ['כן', 'לא'],
      points: { 'כן': 7, 'לא': 3 }
    },
    {
      id: 'pension',
      type: 'choice',
      title: 'האם משכתם כספי פנסיה ב-6 השנים האחרונות וירד לכם 35% מס?',
      options: ['כן', 'לא'],
      points: { 'כן': 6, 'לא': 2 }
    },
    {
      id: 'insurance',
      type: 'choice',
      title: 'האם יש לכם ביטוחים פרטיים כיום?',
      hint: 'ביטוח חיים או ביטוח בריאות מזכים בהחזר על חלק מהפרמיות',
      options: ['כן', 'לא'],
      points: { 'כן': 5, 'לא': 3 }
    },
    {
      id: 'mortgage',
      type: 'choice',
      title: 'האם יש לכם משכנתא ואתם משלמים ביטוח חיים למשכנתא?',
      options: ['כן', 'לא'],
      points: { 'כן': 5, 'לא': 2 }
    },
    {
      id: 'children',
      type: 'choice',
      title: 'האם יש לכם ילדים מתחת לגיל 18?',
      hint: 'נקודות זיכוי על ילדים מגדילות את ההחזר',
      options: ['כן', 'לא'],
      points: { 'כן': 5, 'לא': 3 }
    },
    {
      id: 'bankruptcy',
      type: 'choice',
      title: 'האם אתם כיום בהליך פשיטת רגל או חדלות פירעון?',
      options: ['לא', 'כן'],
      points: { 'לא': 5, 'כן': 0 },
      disqualifyIf: value => value === 'כן',
      disqualifyTitle: 'לא נוכל לקדם בקשה בשלב זה',
      disqualifyText: [
        'בהליך פשיטת רגל, החזר מס שמתקבל <strong>מועבר לנאמן</strong> ולא אליכם.',
        'בסיום ההליך נשמח שתחזרו — הזכאות נשמרת <strong>6 שנים אחורה</strong>.'
      ]
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
      id: 'lostMoney',
      type: 'choice',
      title: 'מעוניינים שנבדוק עבורכם גם <strong>איתור כספים אבודים</strong>?',
      hint: 'מדובר על פיצויים או קופות פנסיה מעבודות קודמות שרשומות על שמכם ונשכחו',
      options: ['כן', 'לא']
    },

    {
      id: 'done',
      type: 'done',
      showScore: true,
      title: 'פנייתכם התקבלה!',
      body: [
        'קיבלנו את הפרטים ואנחנו כבר מתחילים לבדוק את הזכאות שלכם.',
        '<strong>נציגנו יחזרו אליכם ב-24 השעות הקרובות.</strong>'
      ],
      actions: [
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ]
    },
    {
      id: 'blocked',
      type: 'blocked',
      title: 'כבר קיבלנו מכם פנייה',
      body: [
        'המספר הזה כבר השאיר פנייה לבדיקת החזרי מס <strong>ב-24 השעות האחרונות</strong>, ואין צורך לשלוח שוב.',
        'נציגנו יחזרו אליכם בהקדם.'
      ],
      actions: [
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ],
      showIf: () => false
    },
    {
      id: 'disqualified',
      type: 'deadEnd',
      title: 'לא נוכל לקדם בקשה בשלב זה',
      body: [
        'לפי התשובות שלכם לא נוכל להגיש בקשה להחזר מס כרגע.',
        'אם המצב ישתנה, נשמח שתחזרו אלינו.'
      ],
      cta: 'חזרה לחוף מבטחים',
      ctaHref: 'https://www.google.com',
      showIf: () => false
    }
  ]
};
