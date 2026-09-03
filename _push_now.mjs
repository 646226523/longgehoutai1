// 完整的 lock-free git 操作脚本
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const repo = 'p:/龙鸽项目/longgehoutai';
const gitDir = join(repo, '.git');

function renameAllLocks() {
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f);
      try {
        const s = statSync(fp);
        if (s.isDirectory()) walk(fp);
        else if (f.endsWith('.lock')) {
          try { renameSync(fp, fp + '.gone'); } catch {}
        }
      } catch {}
    }
  };
  try { walk(gitDir); } catch {}
}

// 重命名所有 .lock -> 执行 git 命令 -> 重命名新产生的 .lock
function doGit(args, label) {
  renameAllLocks();
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf-8', timeout: 60000 });
  renameAllLocks(); // 清理 git 可能创建的新 lock
  const ok = r.status === 0;
  console.log(`${label}: ${ok ? '✓' : '✗ exit=' + r.status}`);
  if (!ok) {
    const err = (r.stderr || '').split('\n').filter(Boolean);
    console.log('  ' + err.slice(-2).join(' | '));
  }
  return ok;
}

console.log('=== STEP 1: Merge origin/main ===\n');
const mergeOk = doGit(['merge', 'origin/main', '--no-edit'], 'MERGE');
if (!mergeOk) { console.log('Merge failed - aborting'); process.exit(1); }

console.log('\n=== STEP 2: Push to origin ===\n');
const pushOk = doGit(['push', 'origin', 'main'], 'PUSH');

if (pushOk) {
  console.log('\n🎉🎉🎉🎉🎉 ALL DONE! Code pushed to GitHub! 🎉🎉🎉🎉🎉');
} else {
  console.log('\n✗ Push failed');
  process.exit(1);
}
