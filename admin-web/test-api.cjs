const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Try to parse JSON, if fails return raw text
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  try {
    // Step 1: Login to get token
    console.log('Step 1: Logging in...');
    const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });
    const loginOptions = {
      hostname: '127.0.0.1',
      port: 3014,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData),
      },
    };

    const loginResult = await makeRequest(loginOptions, loginData);
    console.log('Login status:', loginResult.status);
    console.log('Login body:', typeof loginResult.body === 'string' ? loginResult.body.substring(0, 200) : JSON.stringify(loginResult.body).substring(0, 500));

    let token;
    if (typeof loginResult.body === 'object' && loginResult.body.data && loginResult.body.data.access_token) {
      token = loginResult.body.data.access_token;
    } else if (typeof loginResult.body === 'object' && loginResult.body.data && loginResult.body.data.accessToken) {
      token = loginResult.body.data.accessToken;
    }

    if (!token) {
      console.log('Login failed or token not found. Body:', JSON.stringify(loginResult.body).substring(0, 500));
      return;
    }
    console.log('Token obtained:', token.substring(0, 20) + '...');

    // Step 2: Call verify-list
    console.log('\nStep 2: Calling verify-list...');
    const verifyOptions = {
      hostname: '127.0.0.1',
      port: 3014,
      path: '/api/competition/verify-list?page=1&pageSize=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };

    const verifyResult = await makeRequest(verifyOptions);
    console.log('Verify list status:', verifyResult.status);
    
    const verifyBody = verifyResult.body;
    if (typeof verifyBody === 'object') {
      console.log('Verify list code:', verifyBody.code);
      console.log('Verify list message:', verifyBody.message);
      if (verifyBody.data) {
        console.log('Verify list total:', verifyBody.data.total);
        console.log('Verify list list length:', verifyBody.data.list ? verifyBody.data.list.length : 0);
        
        if (verifyBody.data.list && verifyBody.data.list.length > 0) {
          const firstItem = verifyBody.data.list[0];
          console.log('\nFirst item:');
          console.log('  id:', firstItem.id);
          console.log('  name:', firstItem.name);
          console.log('  participant_total:', firstItem.participant_total);
          console.log('  verified_count:', firstItem.verified_count);
          console.log('  pending_count:', firstItem.pending_count);
          console.log('  failed_count:', firstItem.failed_count);
          console.log('  verify_progress:', firstItem.verify_progress);
          console.log('  verify_status:', firstItem.verify_status);

          // Step 3: Test batch verify
          console.log('\nStep 3: Testing batch verify...');
          const batchData = JSON.stringify({ competition_ids: [firstItem.id] });
          const batchOptions = {
            hostname: '127.0.0.1',
            port: 3014,
            path: '/api/competition/batch-verify',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Content-Length': Buffer.byteLength(batchData),
            },
          };
          const batchResult = await makeRequest(batchOptions, batchData);
          console.log('Batch verify status:', batchResult.status);
          if (typeof batchResult.body === 'object') {
            console.log('Batch verify result:', JSON.stringify(batchResult.body, null, 2).substring(0, 500));
          }
        }
      }
    } else {
      console.log('Verify list raw:', String(verifyBody).substring(0, 500));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
