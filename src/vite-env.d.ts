/// <reference types="vite/client" />

/**
 * `import.meta.env` typing for this package's own typecheck.
 *
 * auth.ts reads build-time VITE_ variables. Consumers get these types from their own
 * `vite/client` reference; this package needs its own so `npx svelte-check` here does
 * not report `Property 'env' does not exist on type 'ImportMeta'` — which it did, nine
 * times, while every consumer compiled clean. A package whose own typecheck is broken
 * is a package whose typecheck nobody trusts.
 */
interface ImportMetaEnv {
  readonly VITE_FABRIC_FIREBASE_CONFIG: string;
  readonly VITE_FIREBASE_CONFIG?: string;
  readonly VITE_AUTH_SAME_ORIGIN?: string;
  readonly VITE_AUTH_HOSTS_READY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
