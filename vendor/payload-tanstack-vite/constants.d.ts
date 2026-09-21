/**
 * Vite-level configuration constants used by `payloadPlugin`. Kept separate so
 * `plugin.ts` stays focused on wiring.
 */
/**
 * Server-only packages (Node-only or only ever used by the server bundle).
 * These are the Vite equivalent of Next.js's `serverExternalPackages`.
 */
export declare const ssrExternalPackages: string[];
/**
 * Payload packages whose source must be processed by Vite even on the server
 * (because they are workspace `.ts` files in dev). Server-only adapters
 * (`@payloadcms/db-*`, `@payloadcms/email-*`, `@payloadcms/next`, etc.) are
 * intentionally not included — those should stay external on the SSR side.
 */
export declare const payloadNoExternalPatterns: Array<RegExp | string>;
/**
 * The subset of `payloadNoExternalPatterns` that needs to participate in the
 * RSC environment. The RSC graph is narrower — plugins and storage adapters
 * don't run in RSC, only the admin UI surface does.
 */
export declare const payloadRscNoExternalPatterns: Array<RegExp | string>;
/**
 * Packages we know contain Node-only code or top-level side effects requiring
 * Node APIs. Excluding them from the client optimizer prevents Vite from
 * walking into their main entries and trying to bundle server-only imports
 * for the browser.
 */
export declare const optimizeDepsExcludeDefaults: string[];
/**
 * Transitive dependencies of `@payloadcms/ui` and `payload` that need to be
 * pre-bundled for the client. Vite's auto-discovery doesn't reliably pick
 * these up because their parent packages are in `optimizeDeps.exclude`, so we
 * list them explicitly using the `parent > child` syntax.
 */
export declare const optimizeDepsIncludeDefaults: string[];
//# sourceMappingURL=constants.d.ts.map