import test from 'node:test';
import assert from 'node:assert/strict';
import {loginEmail,displayLogin} from '../src/loginIdentity.js';
test('username maps consistently to an internal Supabase identity',()=>{
  assert.equal(loginEmail(' Marina.Silva '),'marina.silva@usuarios.cavc.invalid');
  assert.equal(loginEmail('ana_2026-cavc'),'ana_2026-cavc@usuarios.cavc.invalid');
});
test('existing email accounts retain access',()=>{
  assert.equal(loginEmail(' Ana@Exemplo.com '),'ana@exemplo.com');
});
test('invalid usernames are rejected before attempting authentication',()=>{
  for(const value of ['', 'ab','José','ana silva','.ana','a'.repeat(41),'ana@'])assert.throws(()=>loginEmail(value));
});
test('session displays username without internal domain',()=>{
  assert.equal(displayLogin({email:'ana.silva@usuarios.cavc.invalid'}),'ana.silva');
  assert.equal(displayLogin({email:'ana@example.com',user_metadata:{display_name:'Ana'}}),'Ana');
  assert.equal(displayLogin({email:'ana@example.com'}),'ana@example.com');
});

test('registration requires a username rather than a legacy email',async()=>{
  const {registrationEmail}=await import('../src/loginIdentity.js');
  assert.equal(registrationEmail(' Marina.Silva '),'marina.silva@usuarios.cavc.invalid');
  assert.throws(()=>registrationEmail('ana@example.com'));
});
test('registration validates password length and confirmation',async()=>{
  const {validateRegistration}=await import('../src/loginIdentity.js');
  assert.throws(()=>validateRegistration('marina','1234567','1234567'),/8 caracteres/);
  assert.throws(()=>validateRegistration('marina','strong-password','different-password'),/coincidem/);
  assert.equal(validateRegistration('marina','strong-password','strong-password'),'marina@usuarios.cavc.invalid');
});
