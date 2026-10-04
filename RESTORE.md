# שחזור אפליקציית טריאתלון יקנעם — מדריך גיבוי ושחזור

מסמך זה מסביר איך לשחזר את האפליקציה במלואה (למשל לשנה הבאה), גם אם
סביבת הפיתוח או האחסון ייחסמו מחוסר שימוש.

## מה מגובה ואיפה

1. **כל קוד האפליקציה** — שמור ב-GitHub:
   `https://github.com/tamarih/triathlon-timing` (ענף `main`).
   GitHub לא נמחק מחוסר שימוש — זה הגיבוי העיקרי.
2. **קובץ ZIP** של כל הפרויקט (כולל היסטוריית הגרסאות `.git`) — נשלח אלייך
   בצ'אט כקובץ להורדה ולשמירה מקומית.
3. **מסד הנתונים (Supabase)** — מבנה הטבלאות וההרשאות שמורים בקבצים:
   - `supabase_schema.sql` — המבנה הבסיסי (טבלאות, אינדקסים, הרשאות RLS, טריגרים).
   - `supabase_migrations_2026.sql` — השינויים שנוספו בעונת 2026 (שלשות מרובות תפקידים, צ'ק-אין, הרשאות מספרי רזרבה).

> הערה: **נתוני** המשתתפים והתוצאות של 2026 נמצאים בפרויקט ה-Supabase עצמו.
> אם רוצים לשמור אותם — ראו "גיבוי נתונים" בהמשך. לשנה הבאה בדרך כלל מתחילים
> אירוע חדש עם רשימת נרשמים חדשה, כך שאין צורך בנתונים הישנים.

## פרטי החיבור (Supabase / Vercel)

- **Supabase URL:** `https://udpnkudycpdrhyjnwwhy.supabase.co`
- **Supabase anon key:** נמצא בקובץ `.env` שבפרויקט (המשתנה `VITE_SUPABASE_ANON_KEY`).
  (זהו מפתח ציבורי שממילא נכלל בקוד הצד-לקוח — אין בעיה לשמור אותו בגיבוי.)
- הפרויקט פרוס ב-**Vercel** (מחובר ל-GitHub; כל דחיפה ל-`main` מתפרסמת אוטומטית).

## שחזור מלא — שלב אחר שלב

### א. הקוד
```bash
git clone https://github.com/tamarih/triathlon-timing.git
cd triathlon-timing
npm install
```
להרצה מקומית: `npm run dev` · לבנייה: `npm run build`

### ב. מסד הנתונים (רק אם פרויקט ה-Supabase נמחק/נחסם)
1. צרו פרויקט Supabase חדש.
2. ב-**SQL Editor** הריצו לפי הסדר:
   - את כל התוכן של `supabase_schema.sql`
   - ואז את כל התוכן של `supabase_migrations_2026.sql`
3. עדכנו בקובץ `.env` את `VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY`
   לערכים של הפרויקט החדש (נמצאים ב-Supabase → Settings → API).
4. צרו משתמש אדמין ראשון (Supabase → Authentication → Users → Add user),
   ואז הוסיפו לו שורה בטבלה `app_users` עם `role = 'admin'` ואותו `id`.

### ג. פרסום (Vercel)
1. חברו את מאגר ה-GitHub ל-Vercel (Import Project).
2. הגדירו משתני סביבה: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Deploy. כל דחיפה ל-`main` תתפרסם אוטומטית.

## תפקידי משתמשים (role בטבלה app_users)
- `admin` — גישה מלאה.
- `registration` — עמוד משתתפים: רישום ידני, עריכה, צ'ק-אין (למשל rishom1).
- `volunteer` — תחנות שיפוט/תזמון ושיפוט בריכה.
- `viewer` — רשימת נרשמים + תוצאות בלבד (למשל עירן דרסלר).

## גיבוי נתונים (אופציונלי — לשמירת תוצאות 2026)
- במסך **תוצאות** יש כפתור **"📊 ייצוא תוצאות (Excel)"** — שומר את כל התוצאות
  לפי מקצה ומגדר.
- במסך **משתתפים** יש **"ייצוא"** לרשימת הנרשמים המלאה.
- לגיבוי מלא של המסד: Supabase → Table editor → לכל טבלה "Export to CSV",
  או Supabase → Database → Backups.

## מבנה האפליקציה (תזכורת)
- React + TypeScript + Vite, Supabase (Postgres + Auth + RLS + Realtime), Vercel.
- נכסים חשובים ב-`public/`: `cert-logo.jpg` (לוגו), `cert-medal.png` (מדליה),
  `event/` (מפות מסלול).
- מבנה התזמון: תחנה 1 שחייה · 2 אופניים · 3 סיום · 4 הסתובבות;
  זמנים מחושבים מול `races.started_at` (שעת ההזנקה האמיתית).
