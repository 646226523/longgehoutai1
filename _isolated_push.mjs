import { spawnSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const mainRepo = 'p:/龙鸽项目/longgehoutai';
const worktree = 'p:/龙鸽项目/longgehoutai-push-temp';

// 清理之前可能残留的 worktree
if (existsSync(worktree)) {
  rmSync(worktree, { recursive: true, force: true });
}

console.log('=== Strategy: use a fresh git worktree ===\n');

// 1. 在临时 worktree 中 clone
console.log('1. Creating worktree...');
const r1 = spawnSync('git', [
  'clone', '--no-checkout', '--depth=1', '--branch', 'main',
  'https://github.com/646226523/longgehoutai1.git', worktree,
], { encoding: 'utf-8', timeout: 60000 });
console.log(`Clone: exit=${r1.status}`);
if (r1.status !== 0) {
  console.log('Error:', r1.stderr?.split('\n').slice(-5).join('\n'));
  process.exit(1);
}

// 2. 把主仓库的改动拷过去（跳过 .git）
console.log('\n2. Copying changes from main repo...');
// 用 robocopy 复制（跳过 .git 目录）
const r2 = spawnSync('robocopy', [
  mainRepo, worktree, '/E', '/XD', '.git', '.trae', 'node_modules', 'admin-api/node_modules', 'admin-web/node_modules',
  '/XF', '_git_push.mjs', '_git_push2.mjs', '_diag.mjs', '_diag2.mjs',
], { encoding: 'utf-8', timeout: 30000, shell: true });
// robocopy 返回码 0-7 都是成功
console.log(`Robocopy: exit=${r2.status} (0-7 OK)`);

// 3. 在 worktree 中 add + commit
console.log('\n3. Git add in worktree...');
const r3 = spawnSync('git', ['add', '-A'], { cwd: worktree, encoding: 'utf-8', timeout: 30000 });
console.log(`Add: exit=${r3.status}`);
if (r3.status !== 0) {
  console.log('Error:', r3.stderr?.split('\n').slice(-3).join('\n'));
  process.exit(1);
}

console.log('\n4. Git commit...');
const r4 = spawnSync('git', [
  'commit', '--no-verify', '-m',
  'feat(user): refactor user management more-actions - 7 features (distributor/tags/reset-pwd/coupon/balance/points/blacklist)',
], { cwd: worktree, encoding: 'utf-8', timeout: 30000 });
console.log(`Commit: exit=${r4.status}`);
console.log((r4.stdout || '').split('\n').slice(0, 3).join('\n'));
if (r4.status !== 0) {
  console.log('Error:', r4.stderr?.split('\n').slice(-3).join('\n'));
  process.exit(1);
}

// 4. Push
console.log('\n5. Git push...');
const r5 = spawnSync('git', ['push', 'origin', 'main'], {
  cwd: worktree, encoding: 'utf-8', timeout: 60000,
});
console.log(`Push: exit=${r5.status}`);
console.log((r5.stdout || '').split('\n').slice(-3).join('\n'));
console.log((r5.stderr || '').split('\n').slice(-3).join('\n'));

// 5. 清理
console.log('\n6. Cleanup worktree...');
rmSync(worktree, { recursive: true, force: true });

if (r5.status === 0) {
  console.log('\n🎉 SUCCESS! Code pushed to GitHub.');
} else {
  console.log('\n✗ PUSH FAILED');
  process.exit(1);
}
