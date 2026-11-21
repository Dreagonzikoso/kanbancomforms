import {roleLabels} from './teamRoles.js';

const legacyDomain = 'usuarios.cavc.invalid';
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function loginEmail(value) {
  const login = value.trim().toLowerCase();
  if (emailPattern.test(login)) return login;
  if (usernamePattern.test(login)) return `${login}@${legacyDomain}`;
  throw new Error('Informe o e-mail da conta ou o nome de usuário do cadastro antigo.');
}

export function displayLogin(user, member) {
  if (member?.username) return member.username;
  const email = user.email || '';
  return email.endsWith(`@${legacyDomain}`) ? email.split('@')[0] : email;
}

export function validateRegistration(email, username, requestedRole, password, confirmation) {
  email = email.trim().toLowerCase();
  username = username.trim().toLowerCase();
  if (!emailPattern.test(email) || /\.(invalid|test|example|localhost)$/.test(email)) {
    throw new Error('Informe um e-mail válido que você possa confirmar.');
  }
  if (!usernamePattern.test(username)) {
    throw new Error('Use de 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.');
  }
  if (!Object.hasOwn(roleLabels, requestedRole)) throw new Error('Selecione o cargo solicitado.');
  if (password.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
  if (password !== confirmation) throw new Error('As senhas não coincidem.');
  return {email, data: {username, requested_role: requestedRole}};
}
