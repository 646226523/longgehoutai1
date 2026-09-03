import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, rmSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const repo = 'p:/龙鸽项目/longgehoutai';
const gitDir = join(repo, '.git');

// 策略：
// 1. refs/ 目录下的 .bak / .bak2 / .lock 文件直接删除（git 会把它们当成 ref）
// 2. 其他目录的 .lock 文件重命名为 .gitlock.tmp（不影响 git 对 ref 的解析）

function cleanAllLockArtifacts() {
  const walk = (dir, isRefs = false) => {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f);
      try {
        const s = statSync(fp);
        if (s.isDirectory()) {
          walk(fp, isRefs || dir.endsWith('refs'));
          continue;
        }
        // 在 refs 目录下，删除所有 .bak / .bak2 / .lock 文件
        if (isRefs && (f.endsWith('.bak') || f.endsWith('.bak2') || f.endsWith('.bak3') || f.endsWith('.lock'))) {
          try { rmSync(fp); } catch {}
        } else if (!isRefs && f.endsWith('.bak')) {
          // 非 refs 目录下的 .bak 也删掉
          try { rmSync(fp); } catch {}
        } else if (!isRefs && f.endsWith('.lock')) {
          // 非 refs 目录下的 .lock 重命名
          try { renameSync(fp, fp + '.gitlock.tmp'); } catch {}
        }
      } catch {}
    }
  };
  try { walk(gitDir, false); } catch {}
}

function runGit(args, timeout = 30000) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf-8', timeout });
  return { ok: r.status === 0, stdout: r.stdout?.trim() || '', stderr: r.stderr?.trim() || '', exit: r.status };
}

console.log('=== Cleanup Phase ===');
cleanAllLockArtifacts();

// 再清一遍，确保 refs 目录干净
const refsOrigin = join(gitDir, 'refs', 'remotes', 'origin');
try {
  for (const f of readdirSync(refsOrigin)) {
    if (f.includes('.bak') || f.includes('.lock')) {
      rmSync(join(refsOrigin, f), { force: true });
    }
  }
} catch {}

console.log('Cleaned. Starting git operations...\n');

// 1. Fetch
console.log('>>> git fetch origin main');
const f1 = runGit(['fetch', 'origin', 'main'], 60000);
console.log(`  exit=${f1.exit} ${f1.ok ? '✓' : '✗ ' + f1.stderr?.split('\n').slice(-2).join(' ')}`);

if (f1.ok) {
  // 2. Pull (merge, not rebase)
  console.log('\n>>> git pull origin main (merge)');
  const f2 = runGit(['-c', 'pull.rebase=false', 'pull', '--no-edit', 'origin', 'main'], 60000);
  console.log(`  exit=${f2.exit} ${f2.ok ? '✓' : '✗ ' + f2.stderr?.split('\n').slice(-2).join(' ')}`);

  // 3. Push
  if (f2.ok) {
    console.log('\n>>> git push origin main');
    const f3 = runGit(['push', 'origin', 'main'], 60000);
    console.log(`  exit=${f3.exit} ${f3.ok ? '✓' : '✗ ' + f3.stderr?.split('\n').slice(-2).join(' ')}`);
    if (f3.ok) console.log('\n🎉 SUCCESS!');
  }
}
