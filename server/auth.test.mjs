import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthApp } from './auth-app.mjs';

const CLIENT='test-client.apps.googleusercontent.com';
const ORIGIN='http://localhost:5173';
const cookieHeader=response=>response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function setup(t,options={}) {
  let time=Date.now();
  const tokens=new Map();
  const app=createAuthApp({clientId:CLIENT,origins:[ORIGIN],now:()=>time,
    verifyToken:async token=>{if(!tokens.has(token)) throw new Error('Invalid signature');return tokens.get(token);},
    ...options});
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port;
  const post=(path,body={},cookie='',origin=ORIGIN)=>fetch(url+'/api/auth/'+path,{
    method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify(body)});
  const get=(path,cookie='')=>fetch(url+'/api/auth/'+path,{headers:{Cookie:cookie}});
  async function prepare(overrides={}) {
    const response=await post('challenge');
    const {nonce}=await response.json();
    const token='verified-test-token-'+tokens.size;
    tokens.set(token,{sub:'stable-google-sub',name:'Player <safe>',aud:CLIENT,iss:'https://accounts.google.com',
      exp:Math.floor(time/1000)+3600,email_verified:true,nonce,...overrides});
    return {token,cookie:cookieHeader(response)};
  }
  return {post,get,prepare,advance:ms=>{time+=ms;}};
}
test('unconfigured server cannot authenticate',async t=>{
  const api=await setup(t,{clientId:''});
  assert.equal((await (await api.get('config')).json()).enabled,false);
  assert.equal((await api.post('challenge')).status,503);
  assert.equal((await api.post('google',{credential:'anything'})).status,503);
});
test('trusted identity creates HttpOnly session, restores, revokes and blocks replay',async t=>{
  const api=await setup(t);
  const {token,cookie}=await api.prepare();
  const response=await api.post('google',{credential:token},cookie);
  assert.equal(response.status,200);
  const {user}=await response.json();
  assert.deepEqual(user,{id:'google:stable-google-sub',username:'Player <safe>',kind:'google'});
  const sessionCookie=cookieHeader(response);
  assert.match(response.headers.get('set-cookie'),/HttpOnly/);
  assert.match(response.headers.get('set-cookie'),/SameSite=Lax/);
  assert.deepEqual((await (await api.get('session',sessionCookie)).json()).user,user);
  assert.equal((await api.post('google',{credential:token},cookie)).status,401);
  assert.equal((await api.post('logout',{},sessionCookie)).status,204);
  assert.equal((await (await api.get('session',sessionCookie)).json()).user,null);
});
test('rejects foreign origins, missing browser binding and forged credentials',async t=>{
  const api=await setup(t);
  assert.equal((await api.post('challenge',{},'','https://attacker.example')).status,403);
  assert.equal((await api.post('challenge',{},'','')).status,403);
  const {token,cookie}=await api.prepare();
  assert.equal((await api.post('google',{credential:token})).status,401);
  assert.equal((await api.post('google',{credential:'forged-token'},cookie)).status,401);
  assert.equal((await api.post('google',{},cookie)).status,400);
  assert.equal((await api.post('google',{credential:'x'.repeat(12001)},cookie)).status,400);
});
for(const [label,claims] of [
  ['wrong audience',{aud:'another-client'}],
  ['wrong issuer',{iss:'https://attacker.example'}],
  ['expired token',{exp:1}],
  ['missing subject',{sub:''}],
  ['unverified email',{email_verified:false}],
  ['wrong nonce',{nonce:'not-issued-by-server'}],
]) {
  test('rejects '+label,async t=>{
    const api=await setup(t);
    const {token,cookie}=await api.prepare(claims);
    assert.equal((await api.post('google',{credential:token},cookie)).status,401);
    assert.equal((await (await api.get('session')).json()).user,null);
  });
}
test('expires challenges and sessions on server time',async t=>{
  const api=await setup(t);
  const expired=await api.prepare();
  api.advance(16*60*1000);
  assert.equal((await api.post('google',{credential:expired.token},expired.cookie)).status,401);
  const current=await api.prepare();
  const login=await api.post('google',{credential:current.token},current.cookie);
  assert.equal(login.status,200);
  api.advance(9*60*60*1000);
  assert.equal((await (await api.get('session',cookieHeader(login))).json()).user,null);
});
test('rotates an existing session and maintains stable subject',async t=>{
  const api=await setup(t);
  const first=await api.prepare();
  const one=await api.post('google',{credential:first.token},first.cookie);
  const firstCookie=cookieHeader(one);
  const second=await api.prepare({name:'New display name'});
  const two=await api.post('google',{credential:second.token},second.cookie+'; '+firstCookie);
  assert.equal(two.status,200);
  assert.equal((await two.json()).user.id,'google:stable-google-sub');
  assert.notEqual(cookieHeader(two),firstCookie);
  assert.equal((await (await api.get('session',firstCookie)).json()).user,null);
});
