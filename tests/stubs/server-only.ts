// Vitest stand-in for the `server-only` package, which throws when imported
// outside a React Server Components build. The real guard still applies in
// Next.js builds; tests exercise the pure logic directly.
export {};
