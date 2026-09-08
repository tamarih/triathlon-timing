import { Link } from 'react-router-dom';

// Public event-info page ("היכרות טריאתלון יקנעם") — general info, course
// descriptions, maps, relay rules and safety highlights. Content mirrors the
// organizers' info document. Linked from the registration success screen.

const S = {
  page: { minHeight: '100vh', background: '#f3f4f6', direction: 'rtl' as const, fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 50 },
  header: { background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', padding: '22px 20px', textAlign: 'center' as const },
  hTitle: { fontSize: 22, fontWeight: 800 },
  hSub: { fontSize: 14, color: '#dbeafe', marginTop: 4 },
  inner: { maxWidth: 760, margin: '0 auto', padding: '18px 14px' },
  card: { background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '18px 18px', marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 },
  p: { fontSize: 15, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
  li: { fontSize: 15, color: '#374151', lineHeight: 1.7, marginBottom: 6 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13.5 },
  th: { textAlign: 'right' as const, padding: '8px 10px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, borderBottom: '1.5px solid #dbeafe', whiteSpace: 'nowrap' as const },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151', verticalAlign: 'top' as const },
  mapCap: { fontSize: 14, fontWeight: 700, color: '#111827', margin: '14px 0 6px' },
  mapImg: { width: '100%', borderRadius: 12, border: '1px solid #e5e7eb', display: 'block' },
  backBtn: { display: 'inline-block', background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', color: 'white', borderRadius: 12, padding: '12px 24px', fontWeight: 700, textDecoration: 'none', fontSize: 15 },
};

const courseRows: [string, string, string, string][] = [
  ['ילדים', '3 בריכות (75 מ׳)', '3 ק"מ — עד גשר פארק הדיג וחזרה', "600 מ׳ — מסביב לשדרה"],
  ['נוער', '5 בריכות (125 מ׳)', '4 ק"מ — עד צומת הדקל וחזרה', "1,200 מ׳ — כולל רח׳ הגיא"],
  ['קלאסי', '15 בריכות (375 מ׳)', '10 ק"מ — עד הקישון ושמאלה', "2,000 מ׳ — עד גשר השופט"],
  ['ספרינטון', '21 בריכות (525 מ׳)', '10 ק"מ — עד הקישון ושמאלה', "4,000 מ׳ — אחרי גשר השופט"],
];

const schedule: { time: string; label: string; start?: boolean }[] = [
  { time: '14:45', label: 'התכנסות' },
  { time: '15:20', label: 'תדרוך' },
  { time: '15:30', label: 'זינוק ספרינטון', start: true },
  { time: '15:30', label: 'התכנסות נוער וילדים' },
  { time: '15:55', label: 'זינוק קלאסי', start: true },
  { time: '16:15', label: 'תדרוך נוער וילדים' },
  { time: '16:25', label: 'זינוק נוער', start: true },
  { time: '16:35', label: 'זינוק ילדים', start: true },
  { time: '17:15', label: 'טקס סיום' },
];

const maps: [string, string][] = [
  ['/event/map1.jpg', 'מסלול 1 — ילדים, אופניים, 3 ק"מ'],
  ['/event/map2.jpg', 'מסלול 2 — נוער, אופניים, 4 ק"מ'],
  ['/event/map3.jpg', 'מסלול 3 — קלאסי / ספרינטון, אופניים, 10 ק"מ'],
  ['/event/map4.jpg', 'מסלול 4 — ריצה, ילדים, 600 מ׳'],
  ['/event/map5.jpg', 'מסלול 5 — ריצה, נוער, 1.2 ק"מ'],
  ['/event/map6.jpg', 'מסלול 6 — ריצה, קלאסי, 2 ק"מ'],
  ['/event/map7.jpg', 'מסלול 7 — ריצה, ספרינטון, 4 ק"מ'],
];

export default function EventInfo() {
  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.hTitle}>🏁 היכרות — טריאתלון יקנעם</div>
        <div style={S.hSub}>יום שישי · 18/09/2026 · בריכת יקנעם מושבה</div>
      </div>

      <div style={S.inner}>
        <div style={S.card}>
          <div style={S.h2}>📍 כללי</div>
          <p style={S.p}>האירוע יתקיים ביום שישי, <strong>18/09/2026</strong>. נקודת הכינוס: <strong>בריכת יקנעם מושבה</strong>.</p>
          <ul style={{ paddingRight: 18, margin: 0 }}>
            <li style={S.li}>חניה (בוויז): <strong>"LUNA בוטיק יד שנייה"</strong> — משם להגיע רגלית עם האופניים לצומת הגנים–כליל החורש (ליד הבריכה). יהיה שלט ברור לחניית האופניים.</li>
            <li style={S.li}>השגחה בחניית האופניים תתקיים כחצי שעה לפני ההתכנסות.</li>
            <li style={S.li}>חולצות יחולקו לפי כל הקודם זוכה, מלאי מוגבל.</li>
            <li style={S.li}>כל משתתף יקבל מספר לחיבור לחולצה באמצעות 4 סיכות ביטחון (יינתנו במעמד חלוקת החולצה).</li>
          </ul>
        </div>

        <div style={S.card}>
          <div style={S.h2}>🕒 לוח זמנים</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {schedule.map((row, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10,
                background: row.start ? 'var(--pool-soft)' : 'var(--soft)',
                border: row.start ? '1px solid #bfe3f6' : '1px solid var(--line)',
              }}>
                <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 17,
                  color: row.start ? 'var(--pool-deep)' : 'var(--ink)', minWidth: 52, textAlign: 'center' }}>{row.time}</span>
                <span style={{ fontSize: 16, fontWeight: row.start ? 700 : 500, color: 'var(--ink)' }}>
                  {row.start ? '🏁 ' : ''}{row.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <div style={S.h2}>👥 גילאים</div>
          <ul style={{ paddingRight: 18, margin: 0 }}>
            <li style={S.li}><strong>ילדים א׳</strong> — עד גיל 8 כולל.</li>
            <li style={S.li}><strong>ילדים ב׳</strong> — עד גיל 10 כולל.</li>
            <li style={S.li}><strong>נוער</strong> — גילאי 11–14 כולל.</li>
            <li style={S.li}><strong>בוגרים</strong> — מעל גיל 15.</li>
          </ul>
          <p style={{ ...S.p, marginTop: 10, marginBottom: 0, fontSize: 13.5, color: '#6b7280' }}>
            הקטגוריות (קלאסי / ספרינטון) מחולקות לפי גיל ומגדר. מקצי קלאסי, ספרינטון ושלשות פתוחים לכל הגילאים.
          </p>
        </div>

        <div style={S.card}>
          <div style={S.h2}>🗺️ תיאור המסלולים</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>מקצה</th>
                  <th style={S.th}>🏊 שחייה</th>
                  <th style={S.th}>🚴 אופניים</th>
                  <th style={S.th}>🏃 ריצה</th>
                </tr>
              </thead>
              <tbody>
                {courseRows.map(r => (
                  <tr key={r[0]}>
                    <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>{r[0]}</td>
                    <td style={S.td}>{r[1]}</td>
                    <td style={S.td}>{r[2]}</td>
                    <td style={S.td}>{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.h2}>🗺️ מפות המסלולים</div>
          {maps.map(([src, cap]) => (
            <div key={src}>
              <div style={S.mapCap}>{cap}</div>
              <img src={src} alt={cap} style={S.mapImg} loading="lazy" />
            </div>
          ))}
        </div>

        <div style={{ ...S.card, background: '#fffbeb', border: '1.5px solid #fde68a' }}>
          <div style={{ ...S.h2, color: '#b45309' }}>⚠️ דגשים חשובים</div>
          <ul style={{ paddingRight: 18, margin: 0 }}>
            <li style={S.li}>חובה להישמע להוראות הסדרנים והשופטים לאורך כל המסלול.</li>
            <li style={S.li}>חבישת קסדה לפני העלייה על האופניים.</li>
            <li style={S.li}>מספר החזה מוצמד היטב עם הסיכות.</li>
            <li style={S.li}>שמירה על הרוכבים — אין חיתוכים!</li>
            <li style={S.li}>בשלשות — חובה לבצע את העברת הצמיד באזורי ההחלפה בלבד.</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center', margin: '8px 0 20px', fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>מחכים לכם! 😊</div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/" style={S.backBtn}>חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  );
}
