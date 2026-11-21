import test from 'node:test';
import assert from 'node:assert/strict';
import {boardDateKey,isPostOverdue} from '../src/postDeadline.js';

test('the deadline includes the whole day in São Paulo',()=>{
  const post={date:'2026-11-21',status:1};
  const beforeMidnight=boardDateKey(new Date('2026-11-22T02:59:59Z'));
  const afterMidnight=boardDateKey(new Date('2026-11-22T03:00:00Z'));
  assert.equal(beforeMidnight,'2026-11-21');
  assert.equal(isPostOverdue(post,beforeMidnight),false);
  assert.equal(isPostOverdue(post,afterMidnight),true);
});

test('posted items and items without a deadline do not show overdue',()=>{
  assert.equal(isPostOverdue({date:'2026-11-20',status:4},'2026-11-21'),false);
  assert.equal(isPostOverdue({date:'',status:1},'2026-11-21'),false);
  assert.equal(isPostOverdue({date:'2026-11-20',status:3},'2026-11-21'),true);
  assert.equal(isPostOverdue({date:'2026-11-22',status:0},'2026-11-21'),false);
});
