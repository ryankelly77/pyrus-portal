# Claude Code Guidelines for Pyrus Portal

## Pre-commit Rules

BEFORE committing or pushing any code, you MUST:
1. Run `npm run build` and verify it completes with zero errors
2. If the build fails, fix ALL errors before committing
3. Never commit code that doesn't pass a clean build

Do not skip this step. Do not assume it will build. Actually run it and verify.
