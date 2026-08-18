// A simple test script using built-in fetch (Node 18+)
async function main() {
  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginRes = await fetch('http://127.0.0.1:3014/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    console.log('Login status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login data:', JSON.stringify(loginData).substring(0, 500));

    const token = loginData?.data?.access_token || loginData?.data?.accessToken;
    if (!token) {
      console.log('No token found! Full response:', JSON.stringify(loginData));
      return;
    }
    console.log('Token:', token.substring(0, 30) + '...');

    // Step 2: Get verify list
    console.log('\nStep 2: Getting verify list...');
    const verifyRes = await fetch('http://127.0.0.1:3014/api/competition/verify-list?page=1&pageSize=10', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('Verify list status:', verifyRes.status);
    const verifyData = await verifyRes.json();
    console.log('Verify list:', JSON.stringify(verifyData).substring(0, 1000));

    if (verifyData.data && verifyData.data.list && verifyData.data.list.length > 0) {
      const firstItem = verifyData.data.list[0];
      console.log('\nFirst item details:');
      console.log(`  id: ${firstItem.id}`);
      console.log(`  name: ${firstItem.name}`);
      console.log(`  participant_total: ${firstItem.participant_total}`);
      console.log(`  verify_status: ${firstItem.verify_status}`);
      console.log(`  verify_progress: ${firstItem.verify_progress}`);

      // Step 3: Test batch verify
      if (firstItem.participant_total > 0) {
        console.log('\nStep 3: Testing batch verify...');
        const batchRes = await fetch('http://127.0.0.1:3014/api/competition/batch-verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ competition_ids: [firstItem.id] }),
        });
        console.log('Batch verify status:', batchRes.status);
        const batchData = await batchRes.json();
        console.log('Batch verify result:', JSON.stringify(batchData).substring(0, 500));
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
