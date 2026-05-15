// src/tinro.d.ts
// This overrides the outdated Svelte 4 types so VS Code stops panicking in Svelte 5.
declare module 'tinro' {
  export const Route: any;
  export const router: any;
  export const active: any;
}