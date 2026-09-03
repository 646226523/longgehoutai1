import { spawnSync, execSync } from 'node:child_process';
import { readdirSync, statSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = 'p:/龙鸽项目/longgehoutai';
const indexLock = join(repo, '.git', 'index.lock');
const autoMerge = join(repo, '.git', 'AUTO_MERGE.lock');

// 清理锁文件
function cleanAllLocks() {
  const gitDir = join(repo, '.git');
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f);
      try {
        const s = statSync(fp);
        if (s.isDirectory()) walk(fp);
        else if (f.endsWith('.lock')) {
          try { rmSync(fp); } catch {}
        }
      } catch {}
    }
  };
  try { walk(gitDir); } catch {}
}

// 第0步: 看看 git status 本身能不能跑（先清理锁再跑）
console.log('=== Diagnostic Run ===');
cleanAllLocks();
console.log(`After clean - index.lock exists: ${existsSync(indexLock)}`);
console.log(`After clean - AUTO_MERGE.lock exists: ${existsSync(autoMerge)}`);

// 跑 git status
const r1 = spawnSync('git', ['status', '--porcelain'], {
  cwd: repo, encoding: 'utf-8', timeout: 5000,
});
console.log(`git status exit=${r1.status} error=${r1.error?.message ?? 'none'}`);
if (existsSync(indexLock)) console.log('  >>> index.lock CREATED BY GIT STATUS!');
if (existsSync(autoMerge)) console.log('  >>> AUTO_MERGE.lock EXISTS!');

// 再跑一次
cleanAllLocks();
console.log(`\nClean again. Lock exists: ${existsSync(indexLock)}`);

const r2 = spawnSync('git', ['add', '--help'], {
  cwd: repo, encoding: 'utf-8', timeout: 5000,
});
console.log(`git add --help exit=${r2.status}`);
console.log(`After help - index.lock exists: ${existsSync(indexLock)}`);

// 试试直接创建 index.lock，看谁会改它
cleanAllLocks();
try { writeFileSync(indexLock, 'test'); } catch {}
console.log(`\nCreated test lock. Size: ${statSync(indexLock).size}`);
try { rmSync(indexLock); } catch {}
console.log('Removed test lock');
