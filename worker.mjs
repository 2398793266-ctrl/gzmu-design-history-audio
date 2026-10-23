const enc = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));
async function hashPassword(password,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256));
}
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0};
const cookieName='__Host-study_session';
const cookie=(token,maxAge)=>`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const headers={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json;charset=utf-8',...extra}})}
function page(setup=false){return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${setup?'首次设置':'登录'} · 世界现代设计史</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f4f0;color:#262b27;font:15px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:100%;max-width:420px;background:#fffefa;border:1px solid #e1e3da;border-radius:18px;padding:36px}small{color:#73796f}h1{font:600 29px 'Songti SC',serif;margin:16px 0 10px}p{line-height:1.8;color:#73796f;font-size:13px}label{display:block;margin:20px 0 8px;font-size:13px}input{width:100%;padding:13px;border:1px solid #d4d9cf;border-radius:8px;font:inherit;background:#fff}button{margin-top:24px;width:100%;padding:13px;background:#355c49;border:0;color:#fff;border-radius:8px;font:inherit;cursor:pointer}button:disabled{opacity:.5}.error{color:#a13d30;min-height:24px}a{color:#355c49}</style><main class="card"><small>贵州民族大学 · 设计考研</small><h1>世界现代设计史</h1><p>${setup?'首次设置：创建这份学习资料专用的账号和密码。设置完成后，仅凭此账号密码进入。':'登录后继续原文带背。<br>晓伊女声 · 150 个知识条目'}</p><form id="form"><label for="username">学习账号</label><input id="username" name="username" autocomplete="username" required maxlength="64"><label for="password">密码${setup?'（至少 12 位）':''}</label><input id="password" name="password" type="password" autocomplete="${setup?'new-password':'current-password'}" required ${setup?'minlength="12"':''} maxlength="128">${setup?'<label for="confirm">再次输入密码</label><input id="confirm" type="password" autocomplete="new-password" required minlength="12" maxlength="128">':''}<button id="submit">${setup?'创建学习账号':'登录学习'}</button><p class="error" id="message" role="alert"></p></form></main><script>
const setup=${setup},form=document.getElementById('form'),message=document.getElementById('message'),submit=document.getElementById('submit');
const setupKey=location.hash.slice(1);if(setup&&setupKey)history.replaceState(null,'',location.pathname);
form.onsubmit=async e=>{e.preventDefault();message.textContent='';if(setup&&form.password.value!==document.getElementById('confirm').value){message.textContent='两次密码不一致';return}submit.disabled=true;try{const r=await fetch(setup?'/api/setup':'/api/login',{method:'POST',headers:{'Content-Type':'application/json',...(setup?{'X-Setup-Key':setupKey}:{})},body:JSON.stringify({username:form.username.value.trim(),password:form.password.value})});const j=await r.json();if(!r.ok)throw Error(j.error||'操作失败，请重试');location.replace('/')}catch(e){message.textContent=e.message}finally{submit.disabled=false}};
</script></html>`,{headers:{...headers,'Content-Type':'text/html;charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}})}
async function session(request,env){const token=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const tokenHash=await digest(token);return await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?').bind(tokenHash,Date.now()).first();}
async function newSession(env){const token=random();await env.DB.prepare('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)').bind(await digest(token),Date.now()+7*86400000).run();return token}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url),path=url.pathname;
 try{
 if(!env.DB||!env.SETUP_KEY)return new Response('服务尚未配置完成',{status:503,headers});
 if(request.method==='POST'){
  if(request.headers.get('Origin')!==url.origin)return json({error:'请从本站页面提交'},403);
  if(!['/api/setup','/api/login','/api/logout'].includes(path))return json({error:'页面不存在'},404);
  if(path==='/api/logout'){const s=await session(request,env);if(s)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(s.token_hash).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)})}
  if(Number(request.headers.get('Content-Length')||0)>4096)return json({error:'输入过长'},413);
  const body=await request.text();if(body.length>4096)return json({error:'输入过长'},413);
  let input;try{input=JSON.parse(body)}catch{return json({error:'请求格式错误'},400)}
  const {username,password}=input;
  if(typeof username!=='string'||typeof password!=='string'||!username.trim()||username.length>64||password.length>128)return json({error:'账号或密码格式错误'},400);
  if(path==='/api/setup'){
   if(!equal(request.headers.get('X-Setup-Key'),env.SETUP_KEY))return json({error:'首次设置链接无效'},403);
   if(await env.DB.prepare('SELECT id FROM accounts WHERE id=1').first())return json({error:'已完成设置，请前往登录页'},409);
   if(password.length<12)return json({error:'请使用至少 12 位的专用密码'},400);
   const salt=random(),hashed=await hashPassword(password,salt);
   const result=await env.DB.prepare('INSERT OR IGNORE INTO accounts(id,username,salt,password_hash) VALUES(1,?,?,?)').bind(username.trim(),salt,hashed).run();
   if(!result.meta.changes)return json({error:'已完成设置，请前往登录页'},409);
  }else{
   const ip=request.headers.get('CF-Connecting-IP')||'local';
   const key=await digest(env.SETUP_KEY+ip),now=Date.now();
   const attempt=await env.DB.prepare('INSERT INTO login_attempts(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count').bind(key,now+900000,now,now).first();
   if(attempt.count>10)return json({error:'尝试次数过多，请 15 分钟后重试'},429);
   const account=await env.DB.prepare('SELECT * FROM accounts WHERE id=1').first();
   const hashed=await hashPassword(password,account?.salt||'unconfigured');
   if(!account||!equal(username.trim(),account.username)||!equal(hashed,account.password_hash))return json({error:'账号或密码不正确'},401);
   await env.DB.prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();
  }
  const token=await newSession(env);
  ctx.waitUntil(env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),env.DB.prepare('DELETE FROM login_attempts WHERE reset_at<?').bind(Date.now())]));
  return json({ok:true},200,{'Set-Cookie':cookie(token,604800)});
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
 if(path==='/setup'){
  if(await env.DB.prepare('SELECT id FROM accounts WHERE id=1').first())return Response.redirect(url.origin+'/login',303);
  return page(true);
 }
 const loggedIn=await session(request,env);
 if(path==='/login')return loggedIn?Response.redirect(url.origin+'/',303):page(false);
 if(!loggedIn){if(path==='/'||path==='/index.html')return Response.redirect(url.origin+'/login',303);return new Response('请先登录',{status:401,headers})}
 const result=await env.ASSETS.fetch(request);const protectedResponse=new Response(result.body,result);for(const [key,value]of Object.entries(headers))protectedResponse.headers.set(key,value);protectedResponse.headers.set('Vary','Cookie');return protectedResponse;
 }catch{return new Response('暂时无法访问，请稍后重试',{status:503,headers})}
}};
