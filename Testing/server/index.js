// ─────────────────────────────────────────────────────────────────────────────
// SentriZK Security Test Runner — Express + SSE Server
// Streams live test output to the React dashboard via Server-Sent Events.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const axios   = require('axios');
const config  = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

/** 
 * Ensure the default test identity exists on the backend.
 * If not, perform a real ZKP registration automatically.
 */
async function ensureTestUserReady() {
  const snarkjs = require('snarkjs');
  
  console.log(`🔍 [setup] Checking if test user "${config.TEST_USER}" exists...`);
  
  try {
    const { data: check } = await axios.get(`${config.BACKEND_URL}/check-username/${config.TEST_USER}`, { timeout: 5000 });
    
    if (check.available === true) {
      console.log(`➕ [setup] Test user not found. Registering automatically...`);
      
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { secret: config.TEST_SECRET, salt: config.TEST_SALT, unameHash: config.TEST_UNAME_HASH },
        config.REG_WASM,
        config.REG_ZKEY
      );
      
      await axios.post(`${config.BACKEND_URL}/register`, {
        username: config.TEST_USER,
        proof,
        publicSignals
      });
      
      console.log(`✅ [setup] Test user "${config.TEST_USER}" registered successfully.`);
    } else {
      console.log(`✅ [setup] Test user "${config.TEST_USER}" is ready.`);
    }
  } catch (err) {
    console.warn(`⚠️ [setup] Warning: Could not verify/register test user: ${err.message}`);
    console.warn(`   Identity-dependent tests might fail if backend is unreachable.`);
  }
}

// ── Load all test modules ─────────────────────────────────────────────────────
const allTests = require('./tests');
const testList = Object.values(allTests);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Write an SSE event to the response stream */
function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify({ ...data, timestamp: Date.now() })}\n\n`);
}

/** Open an SSE connection and return the emit helper */
function openSSE(res) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx proxy buffering
  res.flushHeaders();
  return (data) => sendEvent(res, data);
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** Health check + test registry */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    backend: config.BACKEND_URL,
    testsLoaded: testList.length,
    tests: testList.map((t) => ({ id: t.id, name: t.name, category: t.category })),
  });
});

/** Return the full test catalog (used by the React client on startup) */
app.get('/api/tests', (_req, res) => {
  res.json(
    testList.map((t) => ({
      id:          t.id,
      name:        t.name,
      category:    t.category,
      description: t.description,
    }))
  );
});

/** Run a single test and stream output via SSE */
app.get('/api/stream/:testId', (req, res) => {
  const test = allTests[req.params.testId];

  if (!test) {
    return res.status(404).json({ error: `Unknown test: ${req.params.testId}` });
  }

  const emit = openSSE(res);

  test
    .run(emit)
    .then((result) => {
      const passedVal = result && result.passed !== undefined ? result.passed : false;
      emit({ type: 'DONE', passed: passedVal, testId: test.id });
      res.end();
    })
    .catch((err) => {
      console.error(`[${test.id}] Crash:`, err);
      emit({ type: 'ERROR', msg: `Test crashed: ${err.message}` });
      emit({ type: 'DONE', passed: false, testId: test.id });
      res.end();
    });

  req.on('close', () => res.end());
});

/** Run ALL tests sequentially and stream combined output via SSE */
app.get('/api/run-all', async (req, res) => {
  const emit = openSSE(res);
  let passed = 0;
  let failed = 0;

  emit({ type: 'INFO', msg: `▶  Starting full test suite — ${testList.length} tests` });

  for (const test of testList) {
    emit({ type: 'START_TEST', testId: test.id, msg: `▶  ${test.name}` });

    try {
      const result = await test.run((data) =>
        emit({ ...data, testId: test.id })
      );
      const passedVal = result && result.passed !== undefined ? result.passed : false;
      passedVal === true ? passed++ : (passedVal === false ? failed++ : null);
      emit({ type: 'DONE', passed: passedVal, testId: test.id });
    } catch (err) {
      console.error(`[${test.id}] Crash:`, err);
      emit({ type: 'ERROR', msg: `Crashed: ${err.message}`, testId: test.id });
      emit({ type: 'DONE', passed: false, testId: test.id });
      failed++;
    }

    // Brief pause keeps the SSE stream visible between tests
    await new Promise((r) => setTimeout(r, 600));
  }

  emit({
    type:   'SUMMARY',
    passed,
    failed,
    total:  testList.length,
    msg:    `✅ ${passed} passed   ❌ ${failed} failed   out of ${testList.length} total`,
  });

  res.end();
});

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  // Ensure identity is ready before accepting requests
  await ensureTestUserReady();

  app.listen(config.PORT, () => {
    console.log('');
    console.log('  🛡️  SentriZK Adversarial Test Runner');
    console.log(`  📡  http://localhost:${config.PORT}`);
    console.log(`  🎯  Backend: ${config.BACKEND_URL}`);
    console.log(`  📋  ${testList.length} tests loaded`);
    console.log('');
    testList.forEach((t) =>
      console.log(`      [${t.category.padEnd(16)}] ${t.id.padEnd(6)} ${t.name}`)
    );
    console.log('');
  });
};

start();
