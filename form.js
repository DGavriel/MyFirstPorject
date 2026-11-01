/* ==========================================================================
   מנוע השאלון – משותף לכל דפי הנחיתה.
   אל תערוך כאן שאלות. השאלות יושבות בקובץ ההגדרות של כל דף
   (loan.js / insurance.js), שנטען לפני הקובץ הזה.
   ========================================================================== */

const STEPS       = FORM.steps;
const ENDPOINT    = FORM.endpoint || '';
const ENTER_FROM  = FORM.enterFrom || 'left';
const HOME_URL    = FORM.homeUrl || '';
const STORAGE_KEY = FORM.storageKey;

/* ---------- מצב ---------- */

const el = {
  slides:        document.getElementById('slides'),
  progress:      document.getElementById('progress'),
  progressFill:  document.getElementById('progressFill'),
  progressLabel: document.getElementById('progressLabel'),
  meter:         document.getElementById('meter'),
  meterVal:      document.getElementById('meterVal'),
  meterFill:     document.getElementById('meterFill'),
  meterNote:     document.getElementById('meterNote'),
  topnote:       document.getElementById('topnote'),
  scene:         document.getElementById('scene')
};

let answers = loadAnswers();
let index = 0;
let animating = false;
let active = null;          // השקופית הפעילה כרגע (לא תמיד הראשונה ב-DOM)
let disqualifiedFrom = 0;   // מאיזו שאלה הגענו למסך אי-ההתאמה

/* ---------- עזרים ---------- */

const byId = id => STEPS.findIndex(s => s.id === id);

// השלבים שרלוונטיים למשיב הנוכחי (אחרי סינון showIf)
const visibleSteps = () => STEPS.filter(s => !s.showIf || s.showIf(answers));

function loadAnswers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAnswers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch { /* מצב פרטי / אחסון מלא – לא קריטי */ }
}

/* ---------- זיהוי המבקר, לצורך מעקב ידני אחרי ספאם ---------- */

// נשלף ברקע כבר בטעינת הדף, כך שבשליחה הוא כבר מוכן ולא מעכב כלום.
// אם השירות לא זמין – פשוט נשלח ריק, השליחה לא נפגעת.
let clientIp = '';

(async () => {
  try {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), 3000);

    const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: control.signal });
    clearTimeout(timer);

    const found = (await response.text()).match(/^ip=(.*)$/m);
    if (found) clientIp = found[1].trim();

  } catch { /* אין IP – לא עוצר כלום */ }
})();

/* ---------- חסימת פנייה כפולה ---------- */

// מפתח משותף לכל הדפים, כך שכל דף יודע מה נשלח בו
const SENT_KEY = 'sent-leads';
const BLOCK_MS = 24 * 60 * 60 * 1000;

function loadSent() {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY)) || {};
  } catch {
    return {};
  }
}

// האם המספר הזה כבר נשלח מהדף הזה ב-24 השעות האחרונות
function sentRecently(phone) {
  const at = loadSent()[FORM.name]?.[phone];
  return Boolean(at) && (Date.now() - at) < BLOCK_MS;
}

function markSent(phone) {
  const all = loadSent();
  const forThisForm = all[FORM.name] || {};

  forThisForm[phone] = Date.now();
  all[FORM.name] = forThisForm;

  // ניקוי רשומות שפג תוקפן, שלא ייצבר זבל
  Object.keys(all).forEach(form => {
    Object.entries(all[form]).forEach(([number, at]) => {
      if (Date.now() - at >= BLOCK_MS) delete all[form][number];
    });
  });

  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(all));
  } catch { /* לא קריטי */ }
}

const svgArrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
const svgCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const svgTick  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const svgInfo  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>';
const svgX     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const svgClock ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';

/* ---------- סצנת הפתיחה ---------- */

// רכב מצויר שחוצה את הרצועה פעם אחת, עם נהג שמנופף בשטרות.
// מוצג רק בשקופית הפתיחה, ולכן נעלם לגמרי ברגע שעוברים הלאה.
const scenes = {
  car: `
  <svg class="scene__road" viewBox="0 0 400 12" preserveAspectRatio="none">
    <path d="M0 6 H400" stroke="rgba(255,255,255,.16)" stroke-width="2" stroke-dasharray="20 16" stroke-linecap="round"/>
  </svg>

  <div class="scene__air">
    <span class="note-bill" style="--x:12%;--d:0s">₪</span>
    <span class="note-bill" style="--x:34%;--d:1.7s">₪</span>
    <span class="note-bill" style="--x:58%;--d:.9s">₪</span>
    <span class="note-bill" style="--x:80%;--d:2.6s">₪</span>
    <span class="note-bill" style="--x:94%;--d:4.1s">₪</span>
  </div>

  <div class="scene__rig">
    <div class="scene__bubble"><span></span></div>

    <svg class="scene__car" viewBox="-2 -36 244 138">
      <!-- מטח השטרות של הסיום -->
      <g class="burst">
        <g><rect x="96" y="30" width="18" height="11" rx="2.5" fill="#34d399" stroke="#059669" stroke-width="1.3"/></g>
        <g><rect x="96" y="30" width="18" height="11" rx="2.5" fill="#6ee7b7" stroke="#059669" stroke-width="1.3"/></g>
        <g><rect x="96" y="30" width="18" height="11" rx="2.5" fill="#34d399" stroke="#059669" stroke-width="1.3"/></g>
        <g><rect x="96" y="30" width="18" height="11" rx="2.5" fill="#a7f3d0" stroke="#059669" stroke-width="1.3"/></g>
        <g><rect x="96" y="30" width="18" height="11" rx="2.5" fill="#6ee7b7" stroke="#059669" stroke-width="1.3"/></g>
        <g><rect x="96" y="30" width="18" height="11" rx="2.5" fill="#34d399" stroke="#059669" stroke-width="1.3"/></g>
        <g><rect x="96" y="30" width="18" height="11" rx="2.5" fill="#a7f3d0" stroke="#059669" stroke-width="1.3"/></g>
      </g>

      <g class="car">
        <!-- עשן שיוצא מהאגזוז כל הזמן -->
        <g class="smoke" fill="#cbd5e1">
          <circle cx="190" cy="68" r="4"/>
          <circle cx="190" cy="68" r="4"/>
          <circle cx="190" cy="68" r="4"/>
          <circle cx="190" cy="68" r="4"/>
        </g>

        <!-- שלט על מוט שמבצבץ מאחורי הרכב ומתנדנד -->
        <g class="sign">
          <g transform="rotate(8 171 58)">
            <rect x="168.5" y="2" width="5" height="58" rx="2.5" fill="#94a3b8"/>
            <rect x="132" y="-28" width="78" height="32" rx="6" fill="#ffffff" stroke="#1d4ed8" stroke-width="2.2"/>
            <text x="171" y="-15" font-size="12.5" font-weight="900" fill="#1d4ed8" text-anchor="middle" direction="rtl">הלוואה</text>
            <text x="171" y="-2"  font-size="12.5" font-weight="900" fill="#dc2626" text-anchor="middle" direction="rtl">בדרך!</text>
          </g>
        </g>

        <!-- גוף -->
        <path d="M22 72 q-4 0-4-5 v-9 q0-13 13-15 l16-19 q4-5 11-5 h74 q7 0 11 5 l16 19 q13 2 13 15 v9 q0 5-4 5z" fill="#2563eb"/>
        <path d="M60 24 q3-4 9-4 h62 q6 0 9 4 l13 17 h-106z" fill="#1d4ed8"/>

        <!-- חלונות -->
        <path d="M70 38 l8-12 q1-2 4-2 h13 v14z" fill="#dbeafe"/>
        <path d="M101 24 h26 q3 0 4 2 l8 12 h-38z" fill="#dbeafe"/>

        <rect x="18" y="56" width="9" height="8" rx="3" fill="#fde68a"/>
        <rect x="176" y="58" width="8" height="6" rx="3" fill="#fca5a5"/>

        <!-- גלגלים -->
        <g><circle cx="58" cy="74" r="13" fill="#1e293b"/><circle class="hub" cx="58" cy="74" r="5.5" fill="#e2e8f0"/><path class="hub" d="M58 69v10M53 74h10" stroke="#94a3b8" stroke-width="1.4"/></g>
        <g><circle cx="152" cy="74" r="13" fill="#1e293b"/><circle class="hub" cx="152" cy="74" r="5.5" fill="#e2e8f0"/><path class="hub" d="M152 69v10M147 74h10" stroke="#94a3b8" stroke-width="1.4"/></g>

        <!-- הנהג יוצא מהחלון -->
        <g class="driver">
          <!-- כתפיים שיושבות על אדן החלון -->
          <path d="M75 42 q3-9 11-9 q8 0 11 9z" fill="#10b981"/>
          <path d="M75 42 q3-9 11-9 q1 5 0 9z" fill="#059669"/>

          <!-- אוזן וראש -->
          <circle cx="94" cy="27" r="2.4" fill="#f0b98a"/>
          <circle cx="86" cy="25" r="8.5" fill="#fcd9b6"/>

          <!-- תלתלים: אשכול עיגולים שיושב על הגולגולת -->
          <g class="hair">
            <circle cx="77.5" cy="24.5" r="3.6" fill="#ea580c"/>
            <circle cx="78.5" cy="19.5" r="4.2" fill="#f97316"/>
            <circle cx="83"   cy="15.8" r="4.7" fill="#ea580c"/>
            <circle cx="88.5" cy="14.6" r="4.9" fill="#f97316"/>
            <circle cx="93.5" cy="17.5" r="4.3" fill="#ea580c"/>
            <circle cx="95.5" cy="22"   r="3.5" fill="#f97316"/>
            <circle cx="84"   cy="20"   r="4.2" fill="#fb923c"/>
            <circle cx="90"   cy="19.5" r="4"   fill="#ea580c"/>
          </g>

          <!-- פנים. עין ימין קורצת אחת לחמש שניות. -->
          <circle cx="82.5" cy="26.5" r="1.5" fill="#0f172a"/>
          <circle class="eye-wink" cx="89.5" cy="26.5" r="1.5" fill="#0f172a"/>
          <path d="M83 31 q3.5 2.8 7 0" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round"/>

          <!-- היד יוצאת מהכתף עצמה: זרוע בשרוול, מרפק, ואמה שמנופפת -->
          <g class="arm">
            <path d="M80 35.5 q-7 2 -11 4" stroke="#059669" stroke-width="8.5" fill="none" stroke-linecap="round"/>
            <path d="M69 39.5 q-6-9 -9-17"  stroke="#fcd9b6" stroke-width="6" fill="none" stroke-linecap="round"/>
            <circle cx="60" cy="22" r="3.8" fill="#fcd9b6"/>

            <g class="cash">
              <g transform="rotate(-16 56.5 18.5)">
                <rect x="46" y="12" width="22" height="14" rx="2.5" fill="#34d399" stroke="#047857" stroke-width="1.5"/>
                <text x="57" y="23.5" font-size="11.5" font-weight="900" fill="#047857" text-anchor="middle">₪</text>
              </g>
              <g transform="rotate(-5 59.5 14.5)">
                <rect x="49" y="7" width="22" height="14" rx="2.5" fill="#6ee7b7" stroke="#047857" stroke-width="1.5"/>
                <text x="60" y="18.5" font-size="11.5" font-weight="900" fill="#047857" text-anchor="middle">₪</text>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  </div>`
};

/* ---------- ניקוי קלט ---------- */

// משאיר ספרות בלבד, ממיר קידומת בינלאומית ל-0 ומגביל ל-10 ספרות
function normalizePhone(value) {
  return value
    .replace(/\D/g, '')
    .replace(/^972/, '0')
    .replace(/^([1-9])/, '0$1')   // הודבק בלי האפס המוביל
    .slice(0, 10);
}

// אותיות עבריות, רווח, גרש ומקף בלבד
function normalizeHebrew(value) {
  return value
    .replace(/[^֐-׿ '\-]/g, '')
    .replace(/ {2,}/g, ' ');
}

function normalizeId(value) {
  return value.replace(/\D/g, '').slice(0, 9);
}

function normalizePlate(value) {
  return value.replace(/\D/g, '').slice(0, 8);
}

// מה מסננים מכל שדה, ומה הבועה אומרת כשתו נחסם
const filters = {
  phone:  { clean: normalizePhone,  message: 'אפשר להקליד ספרות בלבד', tooLong: 'מספר נייד מכיל 10 ספרות' },
  id:     { clean: normalizeId,     message: 'אפשר להקליד ספרות בלבד', tooLong: 'תעודת זהות מכילה 9 ספרות' },
  plate:  { clean: normalizePlate,  message: 'אפשר להקליד ספרות בלבד', tooLong: 'מספר רכב מכיל עד 8 ספרות' },
  hebrew: { clean: normalizeHebrew, message: 'אפשר להקליד אותיות בעברית בלבד' }
};

/* ---------- ולידציה ---------- */

const validators = {
  name(value) {
    const clean = value.trim();
    if (!clean)                  return 'שדה חובה – נא למלא שם מלא';
    if (clean.length < 2)        return 'השם קצר מדי';
    if (!/[֐-׿]/.test(clean)) return 'נא לרשום את השם באותיות עבריות';
    return null;
  },

  phone(value) {
    const digits = normalizePhone(value);
    if (!digits)                    return 'שדה חובה – נא למלא מספר נייד';
    if (!digits.startsWith('05'))   return 'מספר נייד בישראל מתחיל ב-05';
    if (digits.length < 10)         return `חסרות ${10 - digits.length} ספרות – מספר נייד מכיל 10 ספרות`;
    if (digits.length > 10)         return 'מספר נייד מכיל 10 ספרות בדיוק';
    return null;
  },

  id(value) {
    /* בודקים אורך בלבד ולא ספרת ביקורת.
       בדיקה מחמירה מדי חוסמת גם לקוחות אמיתיים שטעו בספרה,
       והם פשוט נוטשים במקום לתקן. */
    const digits = normalizeId(value);

    if (!digits)           return 'שדה חובה – נא למלא מספר תעודת זהות';
    if (digits.length < 7) return 'מספר תעודת הזהות אינו תקין – נא לבדוק שוב';
    return null;
  },

  plate(value) {
    const digits = normalizePlate(value);
    if (!digits)                    return 'שדה חובה – נא למלא מספר רכב';
    if (digits.length < 7)          return 'מספר רכב מכיל 7 או 8 ספרות';
    return null;
  }
};

// מה שנשמר בפועל אחרי שהשדה עבר ולידציה
const finalize = {
  phone: value => normalizePhone(value),
  id:    value => normalizeId(value).padStart(9, '0'),
  plate: value => normalizePlate(value),
  name:  value => value.trim()
};

/* ---------- בחירת תאריך ---------- */

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function optionList(values, labels, selected) {
  return values.map((v, i) =>
    `<option value="${v}"${String(v) === String(selected) ? ' selected' : ''}>${labels ? labels[i] : v}</option>`
  ).join('');
}

/* ---------- בניית שקופית ---------- */

function buildSlide(step) {
  const node = document.createElement('section');
  node.className = 'slide';
  node.dataset.id = step.id;

  const paragraphs = (step.body || []).map(t => `<p>${t}</p>`).join('');
  // כל השאלות הן שדה חובה
  const req = '<span class="req" aria-label="שדה חובה">*</span>';

  if (step.type === 'intro') {
    const bullets = (step.bullets || [])
      .map(t => `<li>${svgTick}<span>${t}</span></li>`).join('');

    // רצועת בועות שמסירה התנגדויות עוד לפני שנשאלו
    const trust = (step.trust || []).map(t => `<span>${t}</span>`).join('');

    // המספר שנושא את ההבטחה, בקופסה משלו כדי שלא יתחרה בכותרת
    const stat = step.stat
      ? `<div class="stat"><b>${step.stat.value}</b><i>${step.stat.label}</i></div>`
      : '';

    node.innerHTML = `
      ${trust ? `<div class="trust">${trust}</div>` : ''}
      ${step.eyebrow ? `<span class="eyebrow">${step.eyebrow}</span>` : ''}
      <h1>${step.title}</h1>
      ${step.lead ? `<p class="lead">${step.lead}</p>` : ''}
      ${paragraphs}
      ${stat}
      ${bullets ? `<ul class="perks">${bullets}</ul>` : ''}
      <button type="button" class="btn btn--cta" data-action="next">${step.cta}</button>
      ${step.note ? `<p class="note">${step.note}</p>` : ''}`;

  } else if (step.type === 'done') {
    // דף שהגדיר מד יכול להציג את הציון הסופי כשהוא רץ מאפס
    const withScore = step.showScore && FORM.meter;
    const value = withScore ? meterScore() : 0;
    const band  = withScore ? meterBand(value) : null;

    const score = withScore
      ? `<p class="score" style="color:${band.color}">0%</p>
         <p class="score__note" style="color:${band.color}">${band.note}</p>`
      : '';

    node.innerHTML = `
      <div class="done">
        <div class="done__icon done__icon--ok">${svgCheck}</div>
        <h2>${step.title}</h2>
        ${score}
        ${paragraphs}
      </div>
      ${buildActions(step.actions)}`;

    if (withScore) setTimeout(() => countUp(node.querySelector('.score'), value), 450);

  } else if (step.type === 'blocked') {
    node.innerHTML = `
      <div class="done done--stop">
        <div class="done__icon">${svgClock}</div>
        <h2>${step.title}</h2>
        ${paragraphs}
      </div>
      ${buildActions(step.actions)}`;

  } else if (step.type === 'deadEnd') {
    // הנוסח נלקח מהשאלה שפסלה, אם היא הגדירה נוסח משלה
    const source = STEPS[disqualifiedFrom] || {};
    const title = source.disqualifyTitle || step.title;
    const text = (source.disqualifyText || step.body).map(t => `<p>${t}</p>`).join('');

    // מי שלחץ בטעות יכול לחזור לשאלה שפסלה אותו, בלי להתחיל מהתחלה
    const retry = source.retry
      ? `<button type="button" class="btn btn--retry" data-action="back">${source.retry}</button>`
      : '';

    node.innerHTML = `
      <div class="done done--stop">
        <div class="done__icon" style="background:#fef2f2;color:#dc2626">${svgX}</div>
        <h2>${title}</h2>
        ${text}
      </div>
      ${retry}
      ${buildActions(step.actions)}
      ${backRow(step.ctaHref
        ? `<a class="btn btn--muted" href="${step.ctaHref}">${step.cta}</a>`
        : `<button type="button" class="btn btn--muted" data-action="home">${step.cta}</button>`)}`;

  } else if (step.type === 'choice') {
    const options = step.options.map(opt => `
      <button type="button" class="option${answers[step.id] === opt ? ' is-selected' : ''}" data-value="${opt}">
        <bdi>${opt}</bdi>
        <span class="option__mark"></span>
      </button>`).join('');

    node.innerHTML = `
      <h2>${step.title}${req}</h2>
      ${step.hint ? `<span class="hint hint--question">${step.hint}</span>` : ''}
      <div class="options">${options}</div>
      ${backRow('')}`;

  } else if (step.type === 'date') {
    // שלוש בחירות במקום הקלדה – מהיר יותר בנייד ולא מאפשר תאריך שגוי
    const saved = (answers[step.id] || '').split('/');
    const years = [];
    for (let y = step.years.to; y >= step.years.from; y--) years.push(y);

    const days = [];
    for (let d = 1; d <= 31; d++) days.push(d);

    node.innerHTML = `
      <h2>${step.title}${req}</h2>
      <div class="field">
        <div class="date-grid">
          <label><span>יום</span>
            <select data-part="day">
              <option value="">–</option>
              ${optionList(days, null, Number(saved[0]) || '')}
            </select></label>
          <label><span>חודש</span>
            <select data-part="month">
              <option value="">–</option>
              ${optionList(days.slice(0, 12), MONTHS, Number(saved[1]) || '')}
            </select></label>
          <label><span>שנה</span>
            <select data-part="year">
              ${optionList(years, null, Number(saved[2]) || step.years.default)}
            </select></label>
        </div>
        ${step.hint ? `<span class="hint">${step.hint}</span>` : ''}
        <span class="error"></span>
      </div>
      ${skipRow(step)}
      ${backRow(`<button type="button" class="btn" data-action="next">${step.cta}</button>`)}`;

  } else {
    const value = answers[step.id] || '';
    const maxLength = { tel: 10, id: 9, plate: 8 }[step.type];
    const numeric = maxLength !== undefined;

    node.innerHTML = `
      <h2>${step.title}${req}</h2>
      <div class="field">
        <div class="field__box">
          ${step.filter ? '<span class="bubble" role="status"></span>' : ''}
          <input type="${step.type === 'tel' ? 'tel' : 'text'}"
                 inputmode="${numeric ? 'numeric' : 'text'}"
                 ${numeric ? `maxlength="${maxLength}" pattern="[0-9]*"` : ''}
                 ${step.filter ? `data-filter="${step.filter}"` : ''}
                 ${numeric ? 'data-ltr' : ''}
                 autocomplete="${step.autocomplete || 'off'}"
                 placeholder="${step.placeholder || ''}"
                 value="${value.replace(/"/g, '&quot;')}">
        </div>
        ${step.hint ? `<span class="hint">${step.hint}</span>` : ''}
        <span class="error"></span>
      </div>
      ${skipRow(step)}
      ${backRow(`<button type="button" class="btn" data-action="next">${step.cta}</button>`)}`;
  }

  return node;
}

// כפתור "אין עליי כעת" – מדלג על השאלה בלי לפסול ובלי ולידציה
function skipRow(step) {
  if (!step.skip) return '';
  return `<button type="button" class="btn btn--skip" data-action="skip">${step.skip}</button>`;
}

function backRow(inner) {
  const back = `<button type="button" class="back" data-action="back" aria-label="חזרה">${svgArrow}</button>`;
  return `<div class="actions">${back}${inner}</div>`;
}

// כפתורי ההמשך שמופיעים במסך התודה
function buildActions(actions) {
  if (!actions || !actions.length) return '';

  const buttons = actions.map(a => {
    const cls = ['btn'];

    cls.push(a.style === 'pulse' ? 'btn--cta btn--pulse' : 'btn--muted');
    if (a.color) cls.push(`btn--${a.color}`);
    if (a.sub)   cls.push('btn--stack');

    const inner = a.sub
      ? `<span>${a.label}</span><span class="btn__sub">${a.sub}</span>`
      : a.label;

    return `<a class="${cls.join(' ')}" href="${a.href}">${inner}</a>`;
  }).join('');

  return `<div class="done-actions">${buttons}</div>`;
}

/* ---------- מעבר בין שקופיות ---------- */

function render(newIndex, direction) {
  if (animating) return;

  const step = STEPS[newIndex];
  const outgoing = active;
  const incoming = buildSlide(step);

  index = newIndex;
  active = incoming;

  const sign = ENTER_FROM === 'left' ? -1 : 1;
  const from = direction === 'back' ? -sign : sign;

  if (outgoing) {
    animating = true;
    // אף שקופית לא מקבלת קליקים תוך כדי המעבר. בלי זה לחיצה מהירה
    // נרשמת כתשובה אבל נחסמת ע"י שומר האנימציה, והמסך "נתקע".
    outgoing.style.pointerEvents = 'none';
    incoming.style.pointerEvents = 'none';
    incoming.style.transition = 'none';
    incoming.style.transform = `translateX(${from * 100}%)`;
    incoming.style.opacity = '0';
  }

  el.slides.appendChild(incoming);

  // תקלה בעדכון פס ההתקדמות או המד לא תשאיר את המעבר תקוע.
  // בלי זה, שגיאה אחת מקפיאה את כל השאלון לצמיתות.
  try {
    updateProgress();
    updateTopNote();
    updateScene();
    updateMeter();
  } catch (err) {
    console.error(err);
  }

  el.slides.style.height = incoming.offsetHeight + 'px';

  if (!outgoing) {
    focusFirst(incoming);
    animating = false;
    return;
  }

  void incoming.offsetWidth;   // reflow – שהמצב ההתחלתי ייתפס לפני המעבר

  const move = 'transform var(--slide-ms) var(--ease), opacity var(--slide-ms) var(--ease)';

  incoming.style.transition = move;
  incoming.style.transform = 'translateX(0)';
  incoming.style.opacity = '1';

  outgoing.style.transition = move;
  outgoing.style.transform = `translateX(${-from * 100}%)`;
  outgoing.style.opacity = '0';

  setTimeout(() => {
    outgoing.remove();
    incoming.style.transition = '';
    incoming.style.transform = '';
    incoming.style.pointerEvents = '';
    animating = false;
    focusFirst(incoming);
  }, 380);
}

/* בועת הסבר מתחת לשדה – נעלמת אחרי 3 שניות */
let bubbleTimer = null;

function showBubble(input, text) {
  const field = input.closest('.field');
  const bubble = field?.querySelector('.bubble');
  if (!bubble) return;

  bubble.textContent = text;
  bubble.classList.add('is-on');
  field.classList.add('is-bubbling');

  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    bubble.classList.remove('is-on');
    field.classList.remove('is-bubbling');
  }, 3000);
}

function focusFirst(slide) {
  const input = slide.querySelector('input');
  // מיקוד אוטומטי רק במסך רחב – במובייל זה קופץ את המקלדת ומקפיץ את העמוד
  if (input && window.matchMedia('(min-width:768px)').matches) input.focus();
}

/* ---------- מד זכאות (אופציונלי – רק אם הדף הגדיר FORM.meter) ---------- */

// נקודת הבסיס נצברת בהדרגה לפי כמה שאלות נענו,
// כדי שהמד יטפס באמת לאורך השאלון במקום לקפוץ מיד לסוף.
function meterScore() {
  const m = FORM.meter;
  let total = 0, answered = 0;

  for (const step of STEPS) {
    if (!step.points) continue;
    const chosen = answers[step.id];
    if (chosen === undefined) continue;
    if (step.disqualifyIf && step.disqualifyIf(chosen)) return 0;

    total += step.points[chosen] || 0;
    answered++;
  }

  if (!answered) return 0;

  const scored = STEPS.filter(s => s.points).length;
  return Math.max(0, Math.min(m.cap, Math.round(total + m.base * answered / scored)));
}

function meterBand(value) {
  return FORM.meter.bands.find(b => value <= b.upTo) || FORM.meter.bands[FORM.meter.bands.length - 1];
}

let meterShown = 0;

// ריצת המספר במסך הסיום, מאפס עד הציון. הטיימר מבטיח
// שהערך הסופי ייכתב גם אם ההנפשה נעצרת באמצע.
function countUp(node, target) {
  if (!node) return;

  const span = 1700;
  const start = performance.now();
  let frame;

  (function tick(now) {
    const p = Math.min(1, (now - start) / span);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(target * eased) + '%';
    if (p < 1) frame = requestAnimationFrame(tick);
  })(start);

  setTimeout(() => {
    cancelAnimationFrame(frame);
    node.textContent = target + '%';
  }, span + 100);
}

function updateMeter() {
  if (!FORM.meter || !el.meter) return;

  // חסר משמעות לפני שענו על משהו
  const hide = ['intro', 'done', 'blocked', 'deadEnd'];
  el.meter.style.display = hide.includes(STEPS[index].type) ? 'none' : '';

  const target = meterScore();
  const band = meterBand(target);

  el.meterFill.style.width = target + '%';
  el.meterFill.style.background = band.color;
  el.meterVal.style.color = band.color;
  el.meterNote.style.color = band.color;
  el.meterNote.textContent = band.note;
  el.meterVal.textContent = target + '%';

  const from = meterShown;
  const start = performance.now();
  const span = 550;

  cancelAnimationFrame(updateMeter.frame);
  clearTimeout(updateMeter.settle);

  (function tick(now) {
    const p = Math.min(1, (now - start) / span);
    const eased = 1 - Math.pow(1 - p, 3);
    el.meterVal.textContent = Math.round(from + (target - from) * eased) + '%';
    if (p < 1) updateMeter.frame = requestAnimationFrame(tick);
  })(start);

  // אם ההנפשה נעצרת באמצע, המספר היה קופא על ערך שגוי
  updateMeter.settle = setTimeout(() => {
    cancelAnimationFrame(updateMeter.frame);
    el.meterVal.textContent = target + '%';
  }, 620);

  meterShown = target;
  el.meterVal.classList.remove('is-bump');
  void el.meterVal.offsetWidth;
  el.meterVal.classList.add('is-bump');
}

// הסצנה יושבת מחוץ לכרטיס, על הרקע הכהה. נבנית פעם אחת בלבד,
// כך שההנפשה לא מתחילה מחדש בכל מעבר בין שקופיות.
/* השוליים הריקים בתוך מסגרת הרכב, כשבר מרוחבה.
   נשמרים כיחס ולא בפיקסלים, כי במסכים נמוכים ה-CSS מקטין את הרכב. */
const RIG_LEFT_RATIO  = 4 / 250;    // עד בועת הדיבור
const RIG_RIGHT_RATIO = 8 / 250;    // מקצה השלט בשיא הנדנוד
let lastSceneType = null;
let leftIntro = false;
let sceneBubbleTimer = null;
let sceneBubbleAt = null;

function updateScene() {
  if (!el.scene || !FORM.scene) return;

  // בונים פעם אחת. הרכב לא נולד מחדש בכל מעבר בין שאלות.
  if (el.scene.dataset.built !== FORM.scene) {
    el.scene.innerHTML = scenes[FORM.scene] || '';
    el.scene.dataset.built = FORM.scene;
  }

  const rig = el.scene.querySelector('.scene__rig');
  if (!rig) return;

  const type = STEPS[index].type;
  el.scene.classList.toggle('is-hidden', type === 'blocked');

  const carWidth = rig.offsetWidth || 250;
  const half = el.scene.clientWidth / 2;
  const away = half + carWidth + 60;

  const wasIntro  = lastSceneType === 'intro';
  const firstMove = wasIntro && type !== 'intro' && !updateScene.lapped;
  const leaving   = type === 'deadEnd';
  const returning = lastSceneType === 'deadEnd' && !leaving;
  lastSceneType = type;

  /* גבולות הנסיעה נקבעים כך ששום דבר לא נחתך: לא הרכב, לא השלט
     שמעליו ולא בועת הדיבור. RIG_* הם השוליים הריקים בתוך המסגרת. */
  const startX = half - carWidth * (0.5 - RIG_RIGHT_RATIO);
  const endX   = -half + carWidth * (0.5 - RIG_LEFT_RATIO);

  /* מסך הסיום: הקפה שלמה, נחיתה במרכז, חגיגה, ואז יציאה מהתמונה.
     מטופל בנפרד כי הוא רצף מתוזמן ולא מעבר בודד. */
  if (type === 'done') {
    if (!updateScene.finished) {
      updateScene.finished = true;
      runFinish(rig, away);
    }
    return;
  }

  let target;
  if (type === 'intro')  target = 0;                          // חונה במרכז, גלוי במלואו
  else if (leaving)      target = -away;                      // נוסע לו מכאן
  else                   target = startX + (endX - startX) * progressRatio();

  // יציאה וחזרה הן נסיעות ארוכות, ולכן איטיות יותר
  rig.style.transitionDelay    = leaving ? '5s' : '0s';
  rig.style.transitionDuration = (leaving || returning) ? '2.6s' : '.85s';

  const driveMs = leaving ? 7800 : returning ? 2700 : firstMove ? 2000 : 900;

  /* המעבר הראשון מקבל הקפה שלמה: הרכב יוצא משמאל, נכנס שוב מימין
     ונוחת על 0%. בלי זה הצעד הראשון קטן מדי כדי שישימו לב אליו. */
  if (firstMove) {
    updateScene.lapped = true;

    rig.style.setProperty('--from', '0px');
    rig.style.setProperty('--edge', away + 'px');
    rig.style.setProperty('--to', target + 'px');
    rig.classList.add('is-lap');

    setTimeout(() => {
      rig.classList.remove('is-lap');
      rig.style.transform = `translateX(${target}px)`;
    }, 2000);

  } else {
    rig.style.transform = `translateX(${target}px)`;
  }

  // הגלגלים מסתובבים רק בזמן הנסיעה בפועל
  el.scene.classList.add('is-driving');
  clearTimeout(updateScene.stop);
  updateScene.stop = setTimeout(() => el.scene.classList.remove('is-driving'), driveMs);

  const steps = visibleSteps();
  const position = steps.findIndex(s => s.id === STEPS[index].id);

  if (leaving) {
    showSceneLine('deadEnd', (FORM.sceneLines || {}).deadEnd, 5400);
    return;
  }

  const key = 'at-' + position;
  const text = sceneLine(position, steps.length - 1);

  // בהקפה הפותחת מחכים שהרכב ינחת, אחרת הבועה נוסעת איתו מחוץ למסך
  if (firstMove) {
    clearTimeout(showSceneLine.wait);
    showSceneLine.wait = setTimeout(() => showSceneLine(key, text, 4500), 1500);
  } else {
    showSceneLine(key, text, 4500);
  }
}

/* רצף הסיום: הקפה שלמה, נחיתה במרכז עם מטח שטרות ובועה,
   ואחרי שלוש שניות הוא נוסע לו מהתמונה כדי לבנות את ההצעה. */
function runFinish(rig, away) {
  const current = new DOMMatrix(getComputedStyle(rig).transform).m41;

  rig.style.setProperty('--from', current + 'px');
  rig.style.setProperty('--edge', away + 'px');
  rig.style.setProperty('--to', '0px');
  rig.classList.add('is-lap');

  el.scene.classList.add('is-driving');

  setTimeout(() => {
    rig.classList.remove('is-lap');
    rig.style.transitionDuration = '0s';
    rig.style.transform = 'translateX(0px)';

    // עכשיו הוא במרכז, וכאן מתחילה החגיגה
    el.scene.classList.add('is-finish');
    showSceneLine('finish', (FORM.sceneLines || {}).finish, 3000);

    setTimeout(() => {
      rig.style.transitionDuration = '1.8s';
      rig.style.transform = `translateX(${-away}px)`;

      setTimeout(() => el.scene.classList.remove('is-driving'), 1800);
    }, 3000);

  }, 2000);
}

/* בועת הדיבור מעל הנהג.
   יש רגעים קבועים – יציאה לדרך, ברכה אישית, ארבע שאלות לסיום, וסיום –
   ובאמצע משפט מכירתי אחת לכמה שאלות. */
function sceneLine(position, last) {
  const cfg = FORM.sceneLines;
  if (!cfg) return null;

  if (position >= last)  return cfg.finish || null;
  if (position === 1)    return cfg.start  || null;

  // ברכה אישית במסך שאחרי שאלת השם. גוברת על כל השאר.
  if (cfg.personal) {
    const value = String(answers[cfg.personal.field || 'name'] || '').trim();
    const after = visibleSteps().findIndex(s => s.id === cfg.personal.after);

    if (value && after !== -1 && position === after + 1) {
      return cfg.personal.text
        .replace('{name}', value.split(/\s+/)[0])
        .replace('{left}', last - position);
    }
  }

  const left = last - position;           // כמה שאלות נותרו, כולל הנוכחית
  if (cfg.nearEnd && left === cfg.nearEnd.left) return cfg.nearEnd.text;

  const middle = cfg.middle || [];
  const every = cfg.every || 3;

  if (middle.length && position > 0 && position % every === 0) {
    return middle[(Math.floor(position / every) - 1) % middle.length];
  }
  return null;
}

function showSceneLine(key, text, hold) {
  const bubble = el.scene.querySelector('.scene__bubble');

  if (!bubble || !text) return;

  // לא מציגים את אותו משפט פעמיים ברצף, למשל בחזרה אחורה
  if (sceneBubbleAt === key) return;
  sceneBubbleAt = key;

  // מותר <br> בנוסחים, כדי לשלוט איפה המשפט נשבר לשתי שורות
  bubble.querySelector('span').innerHTML = text;
  clearTimeout(sceneBubbleTimer);

  bubble.classList.add('is-on');
  sceneBubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), hold);
}

// שורת העידוד שמעל השאלות – מוסתרת במסכי הסיום, שם היא כבר לא רלוונטית
function updateTopNote() {
  if (!el.topnote) return;
  el.topnote.classList.toggle('is-hidden', ['intro', 'done', 'deadEnd', 'blocked'].includes(STEPS[index].type));
}

// כמה מהשאלון כבר נענה, בין 0 ל-1.
// נמדד לפי שאלות שנענו ולא לפי המיקום, כדי שהשאלה הראשונה תציג 0%.
function progressRatio() {
  const steps = visibleSteps();
  const position = Math.max(0, steps.findIndex(s => s.id === STEPS[index].id));
  const questions = steps.length - 2;              // בלי מסך הפתיחה ובלי מסך הסיום

  if (questions < 1) return 0;
  return Math.min(1, Math.max(0, (position - 1) / questions));
}

function updateProgress() {
  if (!el.progress) return;   // דף שלא מציג פס התקדמות

  const percent = Math.round(progressRatio() * 100);

  el.progressFill.style.width = percent + '%';
  el.progressLabel.textContent = percent + '%';
  el.progress.classList.toggle('is-hidden', ['done', 'deadEnd', 'blocked'].includes(STEPS[index].type));
}

/* ---------- ניווט ---------- */

function nextIndex(from) {
  for (let i = from + 1; i < STEPS.length; i++) {
    const step = STEPS[i];
    if (!step.showIf || step.showIf(answers)) return i;
  }
  return -1;
}

function prevIndex(from) {
  for (let i = from - 1; i >= 0; i--) {
    const step = STEPS[i];
    if (!step.showIf || step.showIf(answers)) return i;
  }
  return -1;
}

function goNext() {
  const step = STEPS[index];

  // שלב תאריך – שלוש הבחירות חייבות להרכיב תאריך אמיתי
  if (step.type === 'date') {
    const field = active.querySelector('.field');
    const pick = part => active.querySelector(`[data-part="${part}"]`).value;
    const day = Number(pick('day'));
    const month = Number(pick('month'));
    const year = Number(pick('year'));

    const problem = (!day || !month)
      ? 'נא לבחור יום וחודש'
      : (day > daysInMonth(month, year) ? 'התאריך שנבחר אינו קיים' : null);

    if (problem) {
      field.classList.add('has-error');
      field.querySelector('.error').textContent = problem;
      return;
    }

    field.classList.remove('has-error');
    answers[step.id] = String(day).padStart(2, '0') + '/' +
                       String(month).padStart(2, '0') + '/' + year;
    saveAnswers();
  }

  // שלבי טקסט – ולידציה לפני מעבר
  if (step.validate) {
    const field = active.querySelector('.field');
    const input = active.querySelector('input');
    const error = validators[step.validate](input.value);

    if (error) {
      field.classList.add('has-error');
      field.querySelector('.error').textContent = error;
      input.focus();
      return;
    }

    field.classList.remove('has-error');
    const clean = finalize[step.validate];
    answers[step.id] = clean ? clean(input.value) : input.value.trim();
    saveAnswers();
  }

  // תשובה פוסלת – עוצרים כאן, הליד לא נשלח בכלל
  if (step.disqualifyIf && step.disqualifyIf(answers[step.id])) {
    disqualifiedFrom = index;
    render(byId('disqualified'), 'next');
    return;
  }

  advance();
}

// "אין עליי כעת" – רושמים את הערך שהוגדר וממשיכים, בלי ולידציה
function goSkip() {
  const step = STEPS[index];

  answers[step.id] = step.skipValue || 'לא צוין';
  saveAnswers();
  advance();
}

function advance() {
  const next = nextIndex(index);
  if (next === -1) return;

  // השלב האחרון לפני מסך התודה – בודקים כפילות ואז שולחים
  if (STEPS[next].type === 'done') {
    if (answers.phone && sentRecently(answers.phone)) {
      render(byId('blocked'), 'next');
      return;
    }

    submit();
    return;
  }

  render(next, 'next');
}

function goBack() {
  // ממסך אי-ההתאמה חוזרים לשאלה שפסלה, לא למסך שלפניה ברצף
  if (STEPS[index].type === 'deadEnd') {
    render(disqualifiedFrom, 'back');
    return;
  }

  const prev = prevIndex(index);
  if (prev !== -1) render(prev, 'back');
}

// חזרה לדף הראשי – או התחלה מחדש של השאלון אם לא הוגדרה כתובת
function goHome() {
  if (HOME_URL) {
    location.href = HOME_URL;
    return;
  }

  answers = {};
  saveAnswers();
  render(0, 'back');
}

/* ---------- שליחה ---------- */

async function submit() {
  const slide = active;

  // השלב האחרון יכול להיות גם שאלת בחירה, שאין לה כפתור שליחה
  const button = slide.querySelector('[data-action="next"]');
  const original = button ? button.innerHTML : '';

  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> שולח...';
  }

  const payload = { form: FORM.name };

  STEPS.forEach(s => {
    if (['intro', 'done', 'deadEnd', 'blocked'].includes(s.type)) return;
    // שלב שהוסתר בגלל תשובה קודמת נשלח ריק, גם אם נענה קודם ואז שונתה התשובה
    payload[s.id] = (!s.showIf || s.showIf(answers)) ? (answers[s.id] || '') : '';
  });

  payload.page = location.href;
  payload.ip = clientIp;
  payload.userAgent = navigator.userAgent;

  try {
    let result = { status: 'pending' };

    if (ENDPOINT) {
      // בלי כותרות מותאמות – כך הדפדפן לא שולח preflight ל-Apps Script.
      // keepalive מבטיח שהבקשה תושלם גם אם הלקוח סוגר את הדף מיד.
      const request = fetch(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true
      })
        .then(response => response.json())
        .catch(() => ({ status: 'neterror' }));

      // לא מחזיקים את הלקוח. 700ms מספיקות כדי לתפוס כשל רשת
      // (שנכשל מיידית), והבקשה עצמה ממשיכה ברקע בזכות keepalive.
      result = await Promise.race([
        request,
        new Promise(resolve => setTimeout(() => resolve({ status: 'pending' }), 700))
      ]);
    } else {
      console.warn('ENDPOINT ריק – הליד לא נשלח.', payload);
    }

    // כשל רשת אמיתי נכשל מהר – מבקשים מהלקוח לנסות שוב
    if (result.status === 'neterror') throw new Error('network');

    markSent(payload.phone);
    localStorage.removeItem(STORAGE_KEY);

    // השרת זיהה שהמספר כבר נרשם ב-24 השעות האחרונות
    if (result.status === 'duplicate') {
      render(byId('blocked'), 'next');
      return;
    }

    render(byId('done'), 'next');

  } catch (err) {
    console.error(err);

    if (button) {
      button.disabled = false;
      button.innerHTML = original;
    }

    // הודעת השגיאה נכנסת לשדה אם יש כזה. בשאלת בחירה אין,
    // ואז מציגים אותה מתחת לאפשרויות במקום להתעלם מהתקלה.
    const field = slide.querySelector('.field');

    if (field) {
      field.classList.add('has-error');
      field.querySelector('.error').textContent = 'אירעה תקלה בשליחה. נסו שוב.';
    } else {
      let note = slide.querySelector('.send-error');
      if (!note) {
        note = document.createElement('p');
        note.className = 'send-error';
        slide.querySelector('.options').after(note);
      }
      note.textContent = 'אירעה תקלה בשליחה. בחרו שוב.';
      el.slides.style.height = slide.offsetHeight + 'px';
    }
  }
}

/* ---------- אירועים ---------- */

el.slides.addEventListener('click', event => {
  const option = event.target.closest('.option');
  if (option) {
    answers[STEPS[index].id] = option.dataset.value;
    saveAnswers();

    option.parentElement.querySelectorAll('.option').forEach(o => o.classList.remove('is-selected'));
    option.classList.add('is-selected');

    updateMeter();
    setTimeout(goNext, 180);   // רגע של חיווי לפני המעבר
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'next') goNext();
  if (action === 'skip') goSkip();
  if (action === 'back') goBack();
  if (action === 'home') goHome();
});

// שינוי חודש או שנה יכול להפוך את היום שנבחר ללא קיים
el.slides.addEventListener('change', event => {
  if (!event.target.matches('[data-part]')) return;
  event.target.closest('.field')?.classList.remove('has-error');
});

el.slides.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
    event.preventDefault();
    goNext();
  }
});

el.slides.addEventListener('input', event => {
  const input = event.target;

  // סינון תווים חיים – עובד גם בהדבקה
  const filter = filters[input.dataset.filter];

  if (filter) {
    const raw = input.value;
    const clean = filter.clean(raw);

    if (clean !== raw) {
      const pos = input.selectionStart;
      const delta = clean.length - raw.length;
      input.value = clean;
      const next = Math.max(0, Math.min(clean.length, pos + delta));
      input.setSelectionRange(next, next);

      // מסבירים למה התו לא נכנס
      const onlyTooLong = filter.tooLong && !/\D/.test(raw);
      showBubble(input, onlyTooLong ? filter.tooLong : filter.message);
    }
  }

  input.closest('.field')?.classList.remove('has-error');
});

window.addEventListener('resize', () => {
  if (active && !animating) el.slides.style.height = active.offsetHeight + 'px';
});

/* ---------- הפעלה ---------- */

render(0);