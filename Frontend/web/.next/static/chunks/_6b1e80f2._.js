(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/node_modules/snarkjs/build/browser.esm.js [app-client] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "static/chunks/node_modules_f24b55aa._.js",
  "static/chunks/node_modules_snarkjs_build_browser_esm_fb24a46c.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/snarkjs/build/browser.esm.js [app-client] (ecmascript)");
    });
});
}),
"[project]/src/auth/api.ts [app-client] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/src/auth/api.ts [app-client] (ecmascript)");
    });
});
}),
]);