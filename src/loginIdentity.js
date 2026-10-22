// Reserved domain: internal Auth identifiers, never a destination for email.
export const USERNAME_DOMAIN = 'usuarios.cavc.invalid';
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,39}$/;
export function loginEmail(value) {
  const login = value.trim().toLowerCase();
  // Existing accounts retain email login during the transition.
  if (login.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) throw new Error('Informe um nome de usuário válido ou o e-mail da conta existente.');
    return login;
  }
  if (!usernamePattern.test(login)) throw new Error('Use um nome de usuário de 3 a 40 caracteres, com letras sem acento, números, ponto, hífen ou sublinhado.');
  return `${login}@${USERNAME_DOMAIN}`;
}
export function displayLogin(user) {
  const email = user.email || '';
  if (email.endsWith(`@${USERNAME_DOMAIN}`)) return email.slice(0,-USERNAME_DOMAIN.length-1);
  return user.user_metadata?.display_name || email;
}
export function registrationEmail(value) {
  const username=value.trim().toLowerCase();
  if (!usernamePattern.test(username)) throw new Error('Use um nome de usuário de 3 a 40 caracteres, com letras sem acento, números, ponto, hífen ou sublinhado.');
  return `${username}@${USERNAME_DOMAIN}`;
}
export function validateRegistration(username,password,confirmation) {
  const email=registrationEmail(username);
  if(password.length<8)throw new Error('A senha deve ter pelo menos 8 caracteres.');
  if(password!==confirmation)throw new Error('As senhas não coincidem.');
  return email;
}
