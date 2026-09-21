import type { PluginOption } from 'vite';
/**
 * Dev-time transforms:
 * - Replaces `process.cwd()` with `"/"` in client code (non-SSR, non-prebundled)
 * - Injects Vite HMR + React Refresh preamble into SSR-rendered HTML (dev only)
 */
export declare function payloadDevTransforms(): PluginOption;
//# sourceMappingURL=devTransforms.d.ts.map