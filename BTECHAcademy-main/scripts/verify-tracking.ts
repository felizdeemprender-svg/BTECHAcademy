async function runTest() {
  const PAGE_ID = 'u2qsr9do20o';
  const trackUrl = `http://localhost:9005/api/track?pageId=${PAGE_ID}&v=0&source=manual-test&channel=direct-hit`;
  
  console.log(`Step 1: Simulating click via URL: ${trackUrl}`);
  
  try {
    const response = await fetch(trackUrl, { redirect: 'manual' });
    console.log(`Step 1 Result: API responded with status ${response.status}`);
    if (response.status === 302 || response.status === 307) {
      console.log('SUCCESS: API redirected as expected.');
      console.log('Location:', response.headers.get('location'));
    } else {
      console.warn('WARNING: API did not redirect (Expected 302).');
    }
  } catch (e: any) {
    console.error('Step 1 Failed:', e.message);
  }
}

runTest().catch(console.error);
