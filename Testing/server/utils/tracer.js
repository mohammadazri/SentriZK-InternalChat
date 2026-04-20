const axios = require('axios');

/**
 * Creates a high-fidelity HTTP tracer for the security console.
 * Automatically emits raw network traffic logs to the terminal stream.
 */
function createTracer(emit) {
  return async (reqConfig) => {
    // 1. Log Request
    const method = (reqConfig.method || 'GET').toUpperCase();
    // Use the base URL if it's an relative path (optional, usually axios handles it)
    emit({ type: 'TRACE', msg: `>> ${method} ${reqConfig.url}` });
    
    if (reqConfig.data) {
      const bodyStr = typeof reqConfig.data === 'string' ? reqConfig.data : JSON.stringify(reqConfig.data);
      // Truncate ultra-long bodies (like ZKP proofs) for UI readability
      emit({ type: 'TRACE', msg: `   DATA: ${bodyStr.substring(0, 100)}${bodyStr.length > 100 ? '...' : ''}` });
    }

    const start = Date.now();
    try {
      // 2. Perform actual HTTP Call
      // Ensure we don't throw on 4xx/5xx so we can log the response body normally
      const finalConfig = { ...reqConfig, validateStatus: () => true };
      const res = await axios(finalConfig);
      const duration = Date.now() - start;

      // 3. Log Response
      emit({ type: 'TRACE', msg: `<< HTTP ${res.status} (${duration}ms)` });
      const resBody = JSON.stringify(res.data);
      emit({ type: 'TRACE', msg: `   BODY: ${resBody.substring(0, 160)}${resBody.length > 160 ? '...' : ''}` });
      
      return res;
    } catch (err) {
      const duration = Date.now() - start;
      emit({ type: 'TRACE', msg: `!! Connection Error: ${err.message} (${duration}ms)` });
      throw err;
    }
  };
}

module.exports = { createTracer };
