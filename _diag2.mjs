import { watch, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = 'p:/龙鸽项目/longgehoutai';
const gitDir = join(repo, '.git');
const indexLock = join(gitDir, 'index.lock');

// 先看看现在有哪些 lock
console.log('Before any action:');
function listLocks() {
  try {
    for (const f of readdirSync(gitDir)) {
      const fp = join(gitDir, f);
      try {
        const s = statSync(fp);
        if (f.endsWith('.lock')) console.log(`  LOCK: ${f} size=${s.size} mtime=${s.mtimeMs}`);
      } catch {}
    }
  } catch {}
}
listLocks();

// 1. 手动删除所有 lock
console.log('\nManual cleanup...');
for (const f of readdirSync(gitDir)) {
  if (f.endsWith('.lock')) {
    try { rmSync(join(gitDir, f)); console.log(`  Deleted ${f}`); } catch {}
  }
}

// 2. 监控 100ms 内的事件
console.log('\nWatch for 500ms...');
let events = [];
const watcher = watch(gitDir, { persistent: true }, (eventType, filename) => {
  if (filename) events.push(`${eventType}: ${filename}`);
});

// 等 200ms
await new Promise(r => setTimeout(r, 200));

// 检查 lock 是否又出现了
console.log('\nAfter 200ms wait:');
listLocks();
console.log('Events captured:', events.slice(0, 10));

// 3. 现在尝试 git status（只读，应该不会创建 lock）
console.log('\nRun git status...');
const s1 = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf-8', timeout: 5000 });
console.log(`Status exit=${s1.status}`);
console.log('After git status:');
listLocks();

// 4. 清理一下再试 git add
console.log('\nClean again...');
for (const f of readdirSync(gitDir)) {
  if (f.endsWith('.lock')) {
    try { rmSync(join(gitDir, f)); } catch {}
  }
}
await new Promise(r => setTimeout(r, 50));
console.log('Now run git add...');
const s2 = spawnSync('git', ['add', '-A', '--verbose'], { cwd: repo, encoding: 'utf-8', timeout: 15000 });
console.log(`ADD exit=${s2.status}`);
console.log('stdout:', s2.stdout?.split('\n').slice(-5).join('\n'));
console.log('stderr:', s2.stderr?.split('\n').slice(-5).join('\n'));

watcher.close();
