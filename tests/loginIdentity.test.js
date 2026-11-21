import test from 'node:test';
import assert from 'node:assert/strict';
import {loginEmail,displayLogin,validateRegistration} from '../src/loginIdentity.js';

test('existing internal usernames and real emails retain login',()=>{
  assert.equal(loginEmail(' Marina.Silva '),'marina.silva@usuarios.cavc.invalid');
  assert.equal(loginEmail(' Ana@Exemplo.com '),'ana@exemplo.com');
  assert.throws(()=>loginEmail('ana@'));
});

test('profile uses approved membership name rather than mutable Auth metadata',()=>{
  assert.equal(displayLogin({email:'ana@example.com',user_metadata:{username:'fake'}},{username:'ana'}),'ana');
  assert.equal(displayLogin({email:'ana.silva@usuarios.cavc.invalid'}),'ana.silva');
});

test('registration normalizes real email and requests a role without granting it',()=>{
  assert.deepEqual(validateRegistration(' Ana@Exemplo.com ',' Marina.Silva ','secretario','abcdefgh','abcdefgh'),{
    email:'ana@exemplo.com',
    data:{username:'marina.silva',requested_role:'secretario'},
  });
  assert.throws(()=>validateRegistration('ana@usuarios.cavc.invalid','ana','bixo','abcdefgh','abcdefgh'),/e-mail/);
  assert.throws(()=>validateRegistration('ana@example.com','a','bixo','abcdefgh','abcdefgh'),/caracteres/);
  assert.throws(()=>validateRegistration('ana@example.com','ana','toString','abcdefgh','abcdefgh'),/cargo/);
});

test('registration validates password length and confirmation',()=>{
  assert.throws(()=>validateRegistration('ana@example.com','ana','bixo','1234567','1234567'),/8 caracteres/);
  assert.throws(()=>validateRegistration('ana@example.com','ana','bixo','strong-password','different-password'),/coincidem/);
});
