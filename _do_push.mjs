// 完整的 git 清理 + fetch + pull + push 流程
// 所有操作在同一进程中，避免 PowerShell 进程间延迟
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const repo = 'p:/龙鸽项目/longgehoutai';
const gitDir = join(repo, '.git');
const refsOriginDir = join(gitDir, 'refs', 'remotes', 'origin');

console.log('=== Step 1: Remove known bad .bak files ===');
const badFiles = [
  join(refsOriginDir, 'HEAD.lock.bak'),
  join(refsOriginDir, 'main.lock.bak'),
];
for (const f of badFiles) {
  if (existsSync(f)) {
    try { rmSync(f, { force: true }); console.log('  DELETED:', f); }
    catch (e) { console.log('  FAIL:', f, e.message); }
  } else {
    console.log('  (not present)', f);
  }
}

console.log('\n=== Step 2: Remove any lock files anywhere ===');
function walkRemoveLocks(dir) {
  for (const f of readdirSync(dir)) {
    const fp = join(dir, f);
    try {
      const s = statSync(fp);
      if (s.isDirectory()) walkRemoveLocks(fp);
      else if (f.endsWith('.lock')) {
        try { rmSync(fp, { force: true }); console.log('  RM:', fp.replace(gitDir, '')); } catch {}
      }
    } catch {}
  }
}
walkRemoveLocks(gitDir);

console.log('\n=== Step 3: Fetch ===');
const fetchResult = spawnSync('git', ['fetch', 'origin', 'main'], { cwd: repo, encoding: 'utf-8', timeout: 60000 });
console.log('Fetch exit:', fetchResult.status);
if (fetchResult.status !== 0) {
  console.log('STDERR:', (fetchResult.stderr || '').split('\n').slice(-3).join('\n'));
  console.log('ABORTED - fetch failed');
  process.exit(1);
}

console.log('\n=== Step 4: Pull (merge) ===');
const pullResult = spawnSync('git', ['-c', 'pull.rebase=false', 'pull', '--no-edit', 'origin', 'main'], { cwd: repo, encoding: 'utf-8', timeout: 60000 });
console.log('Pull exit:', pullResult.status);
if (pullResult.status !== 0) {
  console.log('STDERR:', (pullResult.stderr || '').split('\n').slice(-3).join('\n'));
  console.log('ABORTED - pull failed');
  process.exit(1);
}

console.log('\n=== Step 5: Push ===');
const pushResult = spawnSync('git', ['push', 'origin', 'main'], { cwd: repo, encoding: 'utf-8', timeout: 60000 });
console.log('Push exit:', pushResult.status);
if (pushResult.status === 0) {
  console.log('\n🎉🎉🎉 SUCCESS! Code pushed to GitHub!');
} else {
  console.log('STDERR:', (pushResult.stderr || '').split('\n').slice(-3).join('\n'));
  console.log('\n✗ Push failed');
  process.exit(1);
}
