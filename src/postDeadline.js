const boardDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function boardDateKey(now = new Date()) {
  return boardDate.format(now);
}

export function isPostOverdue(post, today) {
  return Boolean(post.date && post.date < today && post.status < 4);
}
