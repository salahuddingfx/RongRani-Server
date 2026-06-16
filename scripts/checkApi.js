const axios = require('axios');

const BASE_URL = process.env.CHECK_API_BASE_URL || 'http://localhost:5000';

const run = async () => {
  try {
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('health:', health.status, health.data?.status, health.data?.db?.state);
  } catch (error) {
    console.error('health: failed', error.response?.status || error.message);
  }

  try {
    await axios.post(`${BASE_URL}/api/admin/orders/test/send-to-courier`);
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      console.log('courier route: ok (auth required)', status);
    } else if (status === 404) {
      console.error('courier route: missing (404)');
      process.exitCode = 1;
    } else {
      console.error('courier route: unexpected', status || error.message);
      process.exitCode = 1;
    }
  }
};

run();
