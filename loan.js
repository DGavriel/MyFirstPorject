/* ==========================================================================
   דף נחיתה – הלוואה כנגד נכס
   כאן עורכים שאלות, נוסחים וכתובות. המנוע יושב ב-form.js ולא נוגעים בו.
   כל הפניות ללקוח בלשון רבים – לא יודעים אם מדובר בגבר או באישה.
   ========================================================================== */

const FORM = {
  name: 'הלוואה',

  // כתובת ה-Web App של Google Apps Script
  endpoint: '/api/send.php',

  // מפתח אחסון מקומי – חייב להיות שונה בין הדפים
  storageKey: 'loan-lead',

  // כיוון הסליידר: 'left' = שקופית חדשה נכנסת משמאל (טבעי לעברית)
  enterFrom: 'left',

  // לאן מוביל "חזרה לדף הראשי" במסך אי-ההתאמה.
  // ריק = חוזר להתחלת השאלון.
  homeUrl: '',

  steps: [
    {
      id: 'intro',
      type: 'intro',
      eyebrow: 'בדיקת זכאות ללא עלות',
      title: 'הלוואה כנגד <span style="display:inline-block;padding:2px 13px;border-radius:99px;background:#ecfdf5;color:#047857;animation:pill 2.6s ease-in-out infinite">נכס</span> או <span style="display:inline-block;padding:2px 13px;border-radius:99px;background:#ecfdf5;color:#047857;animation:pill 2.6s ease-in-out .4s infinite">רכב</span>',
      lead: '<span>30,000 ₪</span> <span>ועד 10,000,000 ₪</span>',
      bullets: [
        '<span style="display:inline-block;animation:softPulse 2.6s ease-in-out .8s infinite">הכספים מועברים תוך <strong>7 ימי עסקים</strong> מרגע אישור עקרוני</span>',
        '<span style="display:inline-block;animation:softPulse 2.6s ease-in-out 1.2s infinite">מתאים ל<strong>שכירים ולעצמאים</strong> כאחד</span>',
        '<span style="display:inline-block;padding:7px 14px;border-radius:99px;background:#ecfdf5;color:#047857;font-size:15px;font-weight:800;animation:pill 2.6s ease-in-out 1.6s infinite">אין נכס? יש מסלול גם כנגד <span style="white-space:nowrap">רכב ללא שעבוד</span></span>'
      ],
      cta: '👈 בדקו זכאות עכשיו!',
      note: '<span>הבדיקה אורכת פחות מדקה</span><br><span>ללא עלות</span> · <span>ללא התחייבות</span>'
    },

    /* ---- בלוק הסינון – ראשון, כדי שמי שלא מתאים ייעצר מהר ---- */
    {
      id: 'property',
      type: 'choice',
      title: 'האם יש לכם נכס בבעלותכם כיום?',
      options: ['כן', 'לא']
      // "לא" לא פוסל – ממשיכים למסלול הרכב
    },
    {
      id: 'propertyValue',
      type: 'choice',
      title: 'מהו שווי הנכס?',
      options: ['עד 1,000,000 ש״ח', '1,000,000 ~ 3,000,000', '3,000,000 +'],
      showIf: answers => answers.property === 'כן'
    },
    {
      // מסלול חלופי – רק למי שאין לו נכס
      id: 'vehicle',
      type: 'choice',
      title: 'האם יש רכב בבעלותכם?',
      options: ['כן', 'לא'],
      showIf: answers => answers.property === 'לא',
      disqualifyIf: value => value === 'לא',
      disqualifyText: [
        'המימון שאנחנו מאתרים ניתן כנגד <strong>נכס בבעלות</strong> או כנגד <strong>רכב בבעלות</strong>. ללא אחד מהשניים לא נוכל לאתר עבורכם הצעה מתאימה.',
        '<strong>אבל אולי דווקא זה יעניין אתכם:</strong>'
      ]
    },
    {
      id: 'vehicleLien',
      type: 'choice',
      title: 'האם הרכב <u class="mark-red">משועבד</u>?',
      hint: 'רכב שנרכש במימון, ליסינג או הלוואה שטרם סולקה נחשב משועבד',
      options: ['כן', 'לא'],
      showIf: answers => answers.property === 'לא' && answers.vehicle === 'כן',
      disqualifyIf: value => value === 'כן',
      disqualifyTitle: 'השירות לא רלוונטי עבורכם',
      disqualifyText: [
        'הלוואה כנגד רכב אפשרית רק כאשר הרכב <strong>אינו משועבד</strong>. כל עוד קיים שעבוד לא נוכל לאתר עבורכם הצעה.',
        'אם השעבוד יסולק בעתיד נשמח שתחזרו. <strong>בינתיים אולי זה יעניין אתכם:</strong>'
      ]
    },
    {
      id: 'vehicleValue',
      type: 'choice',
      title: 'מהו שווי הרכב?',
      options: ['עד 30,000 ש״ח', '30,000 עד 150,000', '150,000 +'],
      showIf: answers => answers.property === 'לא' && answers.vehicle === 'כן' && answers.vehicleLien === 'לא',
      disqualifyIf: value => value === 'עד 30,000 ש״ח',
      disqualifyTitle: 'השירות לא רלוונטי עבורכם',
      disqualifyText: [
        'הלוואה כנגד רכב אפשרית רק כאשר שווי הרכב <strong>מעל 30,000 ש״ח</strong>. מתחת לסכום הזה לא נוכל לאתר עבורכם הצעה.',
        '<strong>אבל אולי דווקא זה יעניין אתכם:</strong>'
      ]
    },

    /* ---- פרטים וסכומים – רק אחרי שעברו את הסינון ---- */
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
      id: 'amount',
      type: 'choice',
      title: 'מהו סכום ההלוואה שאתם דורשים?',
      options: [
        'עד 200,000',
        '200,000 עד 1,000,000',
        '1,000,000 עד 3,000,000',
        '3,000,000 +'
      ]
    },
    {
      id: 'reason',
      type: 'choice',
      title: 'מהי סיבת בקשת ההלוואה?',
      options: ['כיסוי חובות/הלוואות', 'רכישת רכב חדש', 'רכישת דירה', 'אחר']
    },
    {
      id: 'bankruptcy',
      type: 'choice',
      title: 'האם אתם כיום בפשיטת רגל ללא הסדר?',
      options: ['לא', 'כן']
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
      cta: 'הגישו בדיקת זכאות'
    },
    {
      id: 'done',
      type: 'done',
      title: 'הבקשה נשלחה בהצלחה!',
      body: [
        'קיבלנו את הפרטים ואנחנו כבר מתחילים לאתר עבורכם את ההצעה המשתלמת ביותר.',
        '<strong>נציגנו יחזרו אליכם ב-48 השעות הקרובות.</strong>',
        'ומרגע קבלת אישור עקרוני, הכספים מועברים תוך <strong>7 ימי עסקים בלבד</strong>.'
      ],
      actions: [
        { label: 'לבדיקה מקיפה להוזלת הביטוחים הפרטיים', sub: 'לחצו כאן', href: 'insurance.html', style: 'pulse', color: 'green' },
        { label: 'לביטוח כתבי שירות והתאמת כיסוי משתלם', sub: 'לחצו כאן', href: 'services.html',  style: 'pulse', color: 'purple' },
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ]
    },
    {
      // מוצג כשאותו מספר כבר השאיר פנייה בדף הזה ב-24 השעות האחרונות
      id: 'blocked',
      type: 'blocked',
      title: 'כבר קיבלנו מכם פנייה',
      body: [
        'המספר הזה כבר השאיר פנייה בבדיקת הזכאות <strong>ב-24 השעות האחרונות</strong>, ואין צורך לשלוח שוב.',
        'נציגנו יחזרו אליכם בהקדם. <strong>בינתיים אולי יעניין אתכם:</strong>'
      ],
      actions: [
        { label: 'לבדיקה מקיפה להוזלת הביטוחים הפרטיים', sub: 'לחצו כאן', href: 'insurance.html', style: 'pulse', color: 'green' },
        { label: 'לביטוח כתבי שירות והתאמת כיסוי משתלם', sub: 'לחצו כאן', href: 'services.html',  style: 'pulse', color: 'purple' },
        { label: 'חזרה לחוף מבטחים', href: 'https://www.google.com', style: 'ghost' }
      ],
      showIf: () => false
    },
    {
      id: 'disqualified',
      type: 'deadEnd',
      title: 'המסלול הזה לא מתאים עבורכם',
      body: [
        'המימון שאנחנו מאתרים ניתן כנגד <strong>נכס</strong> או <strong>רכב בבעלות</strong>. ללא אחד מהשניים לא נוכל לאתר עבורכם הצעה.',
        '<strong>אבל אולי דווקא זה יעניין אתכם:</strong>'
      ],
      cta: 'חזרה לחוף מבטחים',
      ctaHref: 'https://www.google.com',
      actions: [
        { label: 'לבדיקה מקיפה להוזלת הביטוחים הפרטיים', sub: 'לחצו כאן', href: 'insurance.html', style: 'pulse', color: 'green' }
      ],
      showIf: () => false
    }
  ]
};