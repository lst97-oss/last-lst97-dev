const STYLE_EXTENSION_RE = /\.(?:s?css|less)$/i;
/**
 * Static `import './foo.css'` (or .scss/.less) — top-level only.
 * Captures the entire statement so we can replace it with an empty line.
 *
 * Matches:
 *   import './foo.css';
 *   import "../bar.scss"
 *   import   './baz.less' ;
 */ const STATIC_STYLE_IMPORT_RE = /^[ \t]*import\s+['"][^'"]+\.(?:s?css|less)['"]\s*(?:;[ \t]*)?$/gm;
/**
 * Monorepo Payload package source, e.g. `…/packages/ui/src/…`. In the
 * core-dev / test setup Payload packages resolve to their workspace `src`
 * (not a published `dist`), so the `dist/` rule below doesn't cover them and
 * their `.css` side-effect imports survive into the SSR/RSC graph.
 */ const PAYLOAD_PKG_SRC_RE = /\/packages\/[^/]+\/src\//;
/**
 * The version-diff component trees render some CSS-importing components through
 * synchronous `renderToStaticMarkup`. Keep stripping only those imports in the
 * RSC environment; the rest of Payload's server components must keep their CSS
 * imports so the default admin shell can collect them for the client.
 */ const DIFF_VIEW_COMPONENT_RE = /@payloadcms\/ui\/(?:dist|src)\/(?:icons|graphics|views\/Version|elements\/(?:HTMLDiff|FieldDiffContainer|FieldDiffLabel))\/|@payloadcms\/richtext-lexical\/(?:dist|src)\/field\/Diff\//;
/**
 * Stops Vite (and the underlying Node ESM loader) from trying to load
 * SCSS/CSS/LESS during SSR/RSC when the importer lives inside a built
 * `dist/` directory or when the specifier is a bare package name.
 *
 * We do this two ways, because either layer can fail:
 *
 * 1. `resolveId` redirects style specifiers to a virtual empty module —
 *    handles cases where Vite asks us to resolve them.
 * 2. `transform` strips top-level `import './x.css'` statements out of any
 *    JS/TS file living under `node_modules/.../dist/` for non-client envs.
 *    This is the bulletproof path for prod-packed `@payloadcms/ui` (and
 *    similar) dependencies that get pre-bundled by Vite's SSR/RSC dep
 *    optimizer (esbuild). Esbuild preserves `.css` import statements as-is,
 *    and Node's native ESM loader then crashes with
 *    `Unknown file extension ".css"`. Removing them at the source avoids
 *    that entirely.
 */ export function ssrStripDistStyleImports() {
    return {
        name: 'payload:ssr-strip-dist-style-imports',
        enforce: 'pre',
        load (id) {
            if (id === '\0ssr-empty-style') {
                return '';
            }
        },
        resolveId (id, importer, options) {
            const envName = this.environment?.name;
            const isServerEnv = options?.ssr || envName && envName !== 'client';
            if (!isServerEnv) {
                return;
            }
            // RSC CSS imports are collected into the client stylesheet graph. A
            // broad strip here leaves the Payload navigation and page shell plain.
            if (envName === 'rsc') {
                return;
            }
            if (!STYLE_EXTENSION_RE.test(id)) {
                return;
            }
            if (importer && (/\/dist\//.test(importer) || PAYLOAD_PKG_SRC_RE.test(importer))) {
                return '\0ssr-empty-style';
            }
            if (/^@?[a-z]/.test(id) && !id.startsWith('.') && !id.startsWith('/')) {
                return '\0ssr-empty-style';
            }
        },
        transform (code, id) {
            const envName = this.environment?.name;
            const isServerEnv = envName && envName !== 'client';
            if (!isServerEnv) {
                return;
            }
            // Keep admin RSC styles; only the synchronous version-diff tree needs
            // its imports removed to avoid suspending static markup rendering.
            if (envName === 'rsc' && !DIFF_VIEW_COMPONENT_RE.test(id)) {
                return;
            }
            // Only touch Payload dependency files: published `node_modules/.../dist/`
            // builds, or workspace `…/packages/<pkg>/src/…` sources in the core-dev /
            // test setup. Don't strip from the consumer's own app source — devs may
            // legitimately want SSR-rendered <link>s from their own CSS imports.
            const isPayloadDistFile = /\/node_modules\//.test(id) && /\/dist\//.test(id);
            const isPayloadSrcFile = PAYLOAD_PKG_SRC_RE.test(id);
            if (!isPayloadDistFile && !isPayloadSrcFile) {
                return;
            }
            if (!/\.[mc]?[jt]sx?(?:$|\?)/.test(id)) {
                return;
            }
            if (!STATIC_STYLE_IMPORT_RE.test(code)) {
                STATIC_STYLE_IMPORT_RE.lastIndex = 0;
                return;
            }
            STATIC_STYLE_IMPORT_RE.lastIndex = 0;
            const stripped = code.replace(STATIC_STYLE_IMPORT_RE, '');
            return {
                code: stripped,
                map: null
            };
        }
    };
}

//# sourceMappingURL=stripDistStyleImports.js.map
