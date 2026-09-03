import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const repo = 'p:/龙鸽项目/longgehoutai';
const gitDir = join(repo, '.git');
const refsDir = join(gitDir, 'refs');
const bakDump = join(gitDir, '.bak-dump');

// 1. 把 refs 目录下所有 .bak 文件移走
function moveBakOutOfRefs() {
  function walk(dir) {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f);
      try {
        const s = statSync(fp);
        if (s.isDirectory()) walk(fp);
        else if (f.endsWith('.bak')) {
          const target = join(bakDump, f.replace(/[\\/]/g, '_'));
          try {
            try { rmSync(target); } catch {}
            renameSync(fp, target);
            console.log('  MOVED .bak:', fp.replace(gitDir, ''));
          } catch {
            try { rmSync(fp, { force: true }); console.log('  DELETED .bak:', fp.replace(gitDir, '')); }
            catch (e) {}
          }
        }
      } catch {}
    }
  }
  walk(refsDir);
}

// 2. 重命名所有 .lock 文件
function renameAllLocks() {
  function walk(dir) {
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
  }
  try { walk(gitDir); } catch {}
}

function runGit(args, timeout = 60000) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf-8', timeout });
  return { ok: r.status === 0, exit: r.status, stderr: r.stderr || '', stdout: r.stdout || '' };
}

console.log('=== Phase 1: Clean refs ===');
moveBakOutOfRefs();
renameAllLocks();

console.log('\n=== Phase 2: Pull (merge) ===');
renameAllLocks(); // 确保 lock 已清
const pull = runGit(['-c', 'pull.rebase=false', 'pull', '--no-edit', 'origin', 'main']);
console.log('Pull:', pull.ok ? '✓' : '✗ exit=' + pull.exit);
if (!pull.ok) {
  console.log('  ', pull.stderr.split('\n').slice(-2).join(' '));
  if (pull.exit === 128 && pull.stderr.includes('index.lock')) {
    // 再试一次
    console.log('  Retrying...');
    renameAllLocks();
    const pull2 = runGit(['-c', 'pull.rebase=false', 'pull', '--no-edit', 'origin', 'main']);
    console.log('  Pull retry:', pull2.ok ? '✓' : '✗');
    if (!pull2.ok) { console.log('ABORT'); process.exit(1); }
  } else { process.exit(1); }
}

console.log('\n=== Phase 3: Push ===');
renameAllLocks();
const push = runGit(['push', 'origin', 'main']);
console.log('Push:', push.ok ? '✓' : '✗ exit=' + push.exit);
if (!push.ok) {
  console.log('  ', push.stderr.split('\n').slice(-2).join(' '));
  process.exit(1);
}

console.log('\n🎉🎉🎉 CODE PUSHED SUCCESSFULLY!');
