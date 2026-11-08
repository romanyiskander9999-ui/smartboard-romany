/* Smartboard Supabase adapter.
 * Load supabase-js v2 before this file. Configure URL + publishable/anon key.
 * Never put service_role or secret keys in browser code.
 */
(function(w){
 'use strict';
 let client=null;
 function configured(){return !!(w.supabase&&w.SMARTBOARD_SUPABASE_URL&&w.SMARTBOARD_SUPABASE_ANON_KEY)}
 function init(){
  if(!configured()) throw new Error('Supabase is not configured yet. Add project URL and publishable/anon key.');
  if(!client) client=w.supabase.createClient(w.SMARTBOARD_SUPABASE_URL,w.SMARTBOARD_SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
 }
 async function signUp(email,password,displayName){
  const c=init();const {data,error}=await c.auth.signUp({email,password,options:{data:{display_name:displayName||''}}});
  if(error)throw error;return data;
 }
 async function signIn(email,password){const {data,error}=await init().auth.signInWithPassword({email,password});if(error)throw error;return data}
 async function signOut(){const {error}=await init().auth.signOut();if(error)throw error}
 async function currentUser(){const {data,error}=await init().auth.getUser();if(error)throw error;return data.user}
 async function createClassroom({name,grade}){
  const c=init(),user=await currentUser();
  const {data,error}=await c.from('classrooms').insert({teacher_id:user.id,name,grade:grade||''}).select().single();
  if(error)throw error;return data;
 }
 async function joinClass(code){const {data,error}=await init().rpc('join_class_by_code',{code});if(error)throw error;return data}
 async function listMyClasses(){
  const c=init(),user=await currentUser();
  const [{data:owned,error:e1},{data:joined,error:e2}]=await Promise.all([
   c.from('classrooms').select('*').eq('teacher_id',user.id).order('created_at',{ascending:false}),
   c.from('classroom_members').select('classroom:classrooms(*)').eq('student_id',user.id)
  ]);
  if(e1)throw e1;if(e2)throw e2;return {owned:owned||[],joined:(joined||[]).map(x=>x.classroom).filter(Boolean)};
 }
 async function listClassroomRoster(classroomId,{includeInactive=false}={}){
  let q=init().from('classroom_roster').select('id,classroom_id,student_name,grade,section,active,created_at').eq('classroom_id',classroomId).order('student_name');
  if(!includeInactive)q=q.eq('active',true);
  const {data,error}=await q;if(error)throw error;return data||[];
 }
 async function saveClassroomRoster(classroomId,students){
  if(!Array.isArray(students))throw new Error('قائمة الطلاب غير صالحة');
  const rows=students.map(x=>({classroom_id:classroomId,student_name:String(x.name||'').trim(),grade:String(x.grade||''),section:String(x.section||''),active:x.active!==false})).filter(x=>x.student_name);
  if(!rows.length)return [];
  const {data,error}=await init().from('classroom_roster').upsert(rows,{onConflict:'classroom_id,student_name'}).select();
  if(error)throw error;return data||[];
 }
 async function saveClassroomAttendance(classroomId,attendanceDate,records){
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(attendanceDate))throw new Error('تاريخ الحضور غير صالح');
  const allowed=new Set(['present','absent','late','excused']);
  const rows=(records||[]).filter(x=>allowed.has(x.status)).map(x=>({classroom_id:classroomId,roster_id:x.roster_id,attendance_date:attendanceDate,status:x.status,note:String(x.note||'')}));
  if(!rows.length)return [];
  const {data,error}=await init().from('classroom_attendance').upsert(rows,{onConflict:'roster_id,attendance_date'}).select();
  if(error)throw error;return data||[];
 }
 async function listClassroomAttendance(classroomId,{fromDate,toDate}={}){
  let q=init().from('classroom_attendance').select('id,classroom_id,roster_id,attendance_date,status,note,student:classroom_roster(student_name,grade,section)').eq('classroom_id',classroomId).order('attendance_date',{ascending:false});
  if(fromDate)q=q.gte('attendance_date',fromDate);
  if(toDate)q=q.lte('attendance_date',toDate);
  const {data,error}=await q;if(error)throw error;return data||[];
 }
 async function createLesson(input){
  const c=init();
  const {data,error}=await c.from('lessons').insert({
   classroom_id:input.classroom_id,teacher_id:(await currentUser()).id,
   title:input.title,subject:input.subject||'',grade:input.grade||'',
   introduction:input.introduction||'',content:input.content||'',is_published:false
  }).select().single();
  if(error)throw error;return data;
 }
 async function addQuestion(lessonId,{prompt,options,correctOption,position=0}){
  const c=init(),{data:q,error}=await c.from('questions').insert({lesson_id:lessonId,prompt,options,position}).select().single();
  if(error)throw error;
  const {error:keyError}=await c.from('question_keys').insert({question_id:q.id,correct_option:correctOption});
  if(keyError){await c.from('questions').delete().eq('id',q.id);throw keyError}
  return q;
 }
 async function publishLesson(lessonId){
  const {data,error}=await init().from('lessons').update({is_published:true,updated_at:new Date().toISOString()}).eq('id',lessonId).select().single();
  if(error)throw error;return data;
 }
 async function listLessons(classroomId){
  const {data,error}=await init().from('lessons').select('id,title,subject,grade,introduction,content,is_published,created_at,questions(id,prompt,options,position)').eq('classroom_id',classroomId).order('created_at',{ascending:false});
  if(error)throw error;return data||[];
 }
 async function submitAnswers(lessonId,answers){
  const {data,error}=await init().rpc('submit_lesson_answers',{target_lesson:lessonId,submitted_answers:answers});
  if(error)throw error;return data;
 }
 async function listResults(lessonId){
  const {data,error}=await init().from('submissions').select('student_id,score,total,submitted_at,student:profiles(display_name)').eq('lesson_id',lessonId).order('submitted_at',{ascending:false});
  if(error)throw error;return data||[];
 }
 w.SmartboardCloud={configured,init,signUp,signIn,signOut,currentUser,createClassroom,joinClass,listMyClasses,listClassroomRoster,saveClassroomRoster,saveClassroomAttendance,listClassroomAttendance,createLesson,addQuestion,publishLesson,listLessons,submitAnswers,listResults};
})(window);
