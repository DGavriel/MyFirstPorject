/* ==========================================================================
   שער נייד
   מי שנכנס ממחשב רואה הודעה במקום השאלון.

   הזיהוי לא נשען על User-Agent: מאז iPadOS 15 ספארי באייפד מדווח על
   עצמו כ-Mac, וזיהוי כזה היה חוסם כל בעל אייפד. במקום זה בודקים את
   החומרה עצמה — מסך מגע, סוג המצביע ורוחב החלון.

   כלל הברזל: חוסמים רק כששלושת הסימנים מצביעים על מחשב. כל מקרה
   מסופק עובר, כי ליד אמיתי שנחסם עולה הרבה יותר מסקרן שנכנס.
   ========================================================================== */

(function () {
  var touch   = (navigator.maxTouchPoints || 0) > 0;
  var fine    = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var coarse  = window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches;
  var wide    = Math.min(window.innerWidth || 0, screen.width || 0) > 900;

  // מחשב = אין מגע בכלל, המצביע מדויק, והחלון רחב. כולם יחד.
  var isDesktop = !touch && !coarse && fine && wide;

  if (!isDesktop) return;

  // מוסיפים סימון מיד, עוד לפני ש-body נבנה, כדי שהשאלון לא יהבהב
  document.documentElement.className += ' is-desktop';

  var css = document.createElement('style');
  css.textContent =
    '.is-desktop main,.is-desktop .bg-glow{display:none!important}' +
    '.is-desktop body{margin:0;min-height:100vh;display:flex;align-items:center;' +
    'justify-content:center;background:#0b1220;padding:24px}' +
    '.mgate{max-width:420px;width:100%;background:#fff;border-radius:20px;' +
    'padding:40px 32px;text-align:center;font-family:Heebo,system-ui,sans-serif;' +
    'box-shadow:0 24px 60px rgba(0,0,0,.35)}' +
    '.mgate__icon{width:64px;height:64px;margin:0 auto 20px;border-radius:50%;' +
    'background:#ecfdf5;display:flex;align-items:center;justify-content:center}' +
    '.mgate h1{margin:0 0 12px;font-size:22px;font-weight:900;color:#0b1220}' +
    '.mgate p{margin:0;font-size:16px;line-height:1.6;color:#475569}' +
    '.mgate b{color:#0b1220}';

  document.head.appendChild(css);

  function paint() {
    var box = document.createElement('div');
    box.className = 'mgate';
    box.setAttribute('dir', 'rtl');
    box.innerHTML =
      '<div class="mgate__icon">' +
      '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#059669" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>' +
      '</div>' +
      '<h1>הבדיקה מותאמת לניידים</h1>' +
      '<p>כדי למלא את השאלון, <b>פתחו את הקישור מהטלפון</b>.<br>' +
      'הבדיקה אורכת פחות מדקה.</p>';

    document.body.appendChild(box);
  }

  if (document.body) paint();
  else document.addEventListener('DOMContentLoaded', paint);
})();
