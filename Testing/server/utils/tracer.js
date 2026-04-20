const axios = require('axios');

/**
 * Creates a high-fidelity HTTP tracer for the security console.
 * Automatically emits raw network traffic logs to the terminal stream.
 * NO TRUNCATION: Displays full request/response bodies as requested for demonstrations.
 */
function createTracer(emit) {
  return async (reqConfig) => {
    // 1. Log Request
    const method = (reqConfig.method || 'GET').toUpperCase();
    emit({ type: 'TRACE', msg: `>> ${method} ${reqConfig.url}` });
    
    if (reqConfig.data) {
      const bodyStr = typeof reqConfig.data === 'string' ? reqConfig.data : JSON.stringify(reqConfig.data, null, 2);
      emit({ type: 'TRACE', msg: `   DATA: ${bodyStr}` });
    }

    const start = Date.now();
    try {
      // 2. Perform actual HTTP Call
      const finalConfig = { ...reqConfig, validateStatus: () => true };
      const res = await axios(finalConfig);
      const duration = Date.now() - start;

      // 3. Log Response
      emit({ type: 'TRACE', msg: `<< HTTP ${res.status} (${duration}ms)` });
      const resBody = JSON.stringify(res.data, null, 2);
      emit({ type: 'TRACE', msg: `   BODY: ${resBody}` });
      
      return res;
    } catch (err) {
      const duration = Date.now() - start;
      emit({ type: 'TRACE', msg: `!! Connection Error: ${err.message} (${duration}ms)` });
      throw err;
    }
  };
}

module.exports = { createTracer };
