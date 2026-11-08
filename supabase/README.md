# إعداد المزامنة السحابية للسبورة

هذه الخطوات تفعّل مخطط قوائم الطلاب والحضور المشترك. لا تعمل المزامنة بمجرد إضافة الملفات إلى GitHub؛ يجب تطبيق SQL في مشروع Supabase المملوك لك ثم ضبط مفاتيح الاتصال العامة.

## 1) تطبيق قاعدة البيانات
1. افتح مشروع Supabase الصحيح.
2. افتح SQL Editor.
3. انسخ محتوى `migrations/202611080001_classroom_roster_attendance.sql` وشغّله.
4. تأكد من وجود الجدولين `classroom_roster` و`classroom_attendance`.

يتطلب هذا الترحيل وجود جدول `public.classrooms` المستخدم بالفعل في `supabase-client.js`، وأن يحتوي على `id` و`teacher_id`. سياسات RLS تسمح للمعلم المسجل بإدارة سجلات فصوله فقط.

## 2) إعداد الاتصال
في ملف `supabase-config.js` ضع:
- Project URL في `SMARTBOARD_SUPABASE_URL`.
- Publishable key أو legacy anon key في `SMARTBOARD_SUPABASE_ANON_KEY`.

لا تضع أبدًا `service_role` أو أي مفتاح سري في ملفات المتصفح أو GitHub.

## 3) وظائف المزامنة المتاحة
بعد إعداد الاتصال وتسجيل دخول المعلم:
- `SmartboardCloud.listClassroomRoster(classroomId)`
- `SmartboardCloud.saveClassroomRoster(classroomId, students)`
- `SmartboardCloud.saveClassroomAttendance(classroomId, date, records)`
- `SmartboardCloud.listClassroomAttendance(classroomId, filters)`

تظل البيانات المحلية الحالية محفوظة ولا تُحذف عند إضافة هذه الطبقة. لا تُعتبر البيانات المحلية متزامنة تلقائيًا قبل تنفيذ استيراد صريح إلى فصل سحابي.

## 4) ملاحظة التحقق
لم يتم تشغيل ترحيل SQL على قاعدة فعلية؛ يلزم تطبيقه في مشروع Supabase والتحقق من صلاحيات RLS قبل استخدامه مع بيانات تلاميذ حقيقية.
