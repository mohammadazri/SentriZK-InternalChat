module.exports = [
"[project]/node_modules/snarkjs/main.js [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_275968b1._.js",
  "server/chunks/ssr/node_modules_wasmcurves_a7258cba._.js",
  "server/chunks/ssr/node_modules_snarkjs_c6f143e1._.js",
  "server/chunks/ssr/node_modules_3df3d05d._.js",
  "server/chunks/ssr/[root-of-the-server]__731c93ff._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/snarkjs/main.js [app-ssr] (ecmascript)");
    });
});
}),
"[project]/src/auth/api.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/src/auth/api.ts [app-ssr] (ecmascript)");
    });
});
}),
];