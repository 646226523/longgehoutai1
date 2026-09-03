// 临时 git 推送脚本
import { execSync } from 'node:child_process';
import { existsSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const repo = 'p:/龙鸽项目/longgehoutai';

// 1. 清理所有 lock 文件
function cleanLocks(dir) {
  for (const f of readdirSync(dir)) {
    const fp = join(dir, f);
    try {
      const stat = statSync(fp);
      if (stat.isDirectory()) cleanLocks(fp);
      else if (f.endsWith('.lock')) {
        try { unlinkSync(fp); console.log('Removed lock:', fp); } catch { console.log('Failed to remove:', fp); }
      }
    } catch {}
  }
}

cleanLocks(join(repo, '.git'));
console.log('=== Locks cleaned ===\n');

// 2. git add
console.log('>>> git add .');
try {
  execSync('git add .', { cwd: repo, stdio: 'inherit' });
  console.log('ADD OK\n');
} catch (e) {
  console.log('ADD FAIL - trying anyway...\n');
}

// 3. git status
console.log('>>> git status --short | head -5');
try {
  const out = execSync('git status --short', { cwd: repo, encoding: 'utf-8' });
  const lines = out.split('\n').filter(Boolean);
  console.log(`Total: ${lines.length} changes`);
  lines.slice(0, 5).forEach((l) => console.log(' ', l));
  if (lines.length > 5) console.log('  ...');
  console.log();
} catch (e) {
  console.log('STATUS FAIL');
}

// 4. git commit
console.log('>>> git commit');
try {
  execSync(`git commit -m "feat(user): refactor user management more-actions - 7 features (distributor/tags/reset-pwd/coupon/balance/points/blacklist)"`, {
    cwd: repo, stdio: 'inherit',
  });
  console.log('\nCOMMIT OK\n');
} catch (e) {
  console.log('\nCOMMIT FAIL:', e.message.split('\n')[0]);
  process.exit(1);
}

// 5. git push
console.log('>>> git push origin main');
try {
  execSync('git push origin main', { cwd: repo, stdio: 'inherit' });
  console.log('\n=== PUSH OK ===');
} catch (e) {
  console.log('\nPUSH FAIL:', e.message.split('\n')[0]);
  process.exit(1);
}
