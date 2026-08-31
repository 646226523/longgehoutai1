const https = require('https');
const fs = require('fs');

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OWNER = '646226523';
const REPO = 'longgehoutai1';
const BRANCH = 'main';
const BASE_COMMIT = 'a34746e894ac44e6dc70859339ec6ee24d547819';

function readJSON(path) {
  const content = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

const batchedFiles = readJSON('_batch1.json')
  .concat(readJSON('_batch2.json'))
  .concat(readJSON('_batch3.json'))
  .concat(readJSON('_batch4.json'));

console.log(`Total files to push: ${batchedFiles.length}`);

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Node.js Script',
        'Content-Type': 'application/json',
        'Content-Length': postData ? Buffer.byteLength(postData) : 0
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  // Step 1: Get the current tree SHA from the base commit
  console.log('\n1. Getting base commit info...');
  const commitRes = await githubRequest('GET', `/repos/${OWNER}/${REPO}/git/commits/${BASE_COMMIT}`);
  if (commitRes.status !== 200) {
    console.error('Failed to get base commit:', commitRes.body);
    process.exit(1);
  }
  const baseTreeSha = commitRes.body.tree.sha;
  console.log(`   Base tree SHA: ${baseTreeSha}`);

  // Step 2: Create a new tree with all file changes
  console.log('\n2. Creating new tree...');
  
  // First get the base tree to understand the structure
  const baseTreeRes = await githubRequest('GET', 
    `/repos/${OWNER}/${REPO}/git/trees/${baseTreeSha}?recursive=1`);
  
  const treeEntries = [];
  
  // Add all the files we want to update
  for (const file of batchedFiles) {
    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      content: Buffer.from(file.content, 'base64').toString('utf8')
    });
  }

  const treeRes = await githubRequest('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeEntries
  });

  if (treeRes.status !== 201) {
    console.error('Failed to create tree:', treeRes.body);
    process.exit(1);
  }
  const newTreeSha = treeRes.body.sha;
  console.log(`   New tree SHA: ${newTreeSha}`);

  // Step 3: Create a new commit
  console.log('\n3. Creating new commit...');
  const commitMessage = 'fix: 修复资讯管理路由顺序/富文本编辑器/系统模块空值处理等BUG';
  
  const newCommitRes = await githubRequest('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: commitMessage,
    tree: newTreeSha,
    parents: [BASE_COMMIT]
  });

  if (newCommitRes.status !== 201) {
    console.error('Failed to create commit:', newCommitRes.body);
    process.exit(1);
  }
  const newCommitSha = newCommitRes.body.sha;
  console.log(`   New commit SHA: ${newCommitSha}`);

  // Step 4: Update the branch reference
  console.log('\n4. Updating branch reference...');
  const refRes = await githubRequest('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    sha: newCommitSha,
    force: false
  });

  if (refRes.status !== 200) {
    console.error('Failed to update ref:', refRes.body);
    process.exit(1);
  }

  console.log(`\n✅ SUCCESS! Pushed ${batchedFiles.length} files.`);
  console.log(`   Commit SHA: ${newCommitSha}`);
  console.log(`   URL: https://github.com/${OWNER}/${REPO}/commit/${newCommitSha}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
