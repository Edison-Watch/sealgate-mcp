/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: "no-circular",
            comment:
                "Circular dependencies make code hard to reason about and can cause runtime issues.",
            severity: "error",
            from: {},
            to: { circular: true },
        },
        {
            name: "no-src-to-tests",
            comment: "Production code should never depend on test files.",
            severity: "error",
            from: { path: "^src/" },
            to: { path: "^tests/" },
        },
        {
            name: "no-dev-deps-in-src",
            comment: "Production code should not use devDependencies.",
            severity: "error",
            from: { path: "^src/" },
            to: { dependencyTypes: ["npm-dev"] },
        },
        {
            name: "no-orphans",
            comment: "Modules that are not imported by anything are dead code.",
            severity: "warn",
            from: {
                orphan: true,
                pathNot: [
                    "(^|/)\\.[^/]+",
                    "\\.d\\.ts$",
                    "(^|/)tsconfig\\.json$",
                    "^src/index\\.ts$",
                ],
            },
            to: {},
        },
    ],
    options: {
        tsConfig: {
            fileName: "tsconfig.json",
        },
        tsPreCompilationDeps: true,
        includeOnly: ["^src/", "^tests/"],
        enhancedResolveOptions: {
            exportsFields: ["exports"],
            conditionNames: ["import", "require", "node", "default", "types"],
            mainFields: ["module", "main", "types", "typings"],
        },
    },
};
