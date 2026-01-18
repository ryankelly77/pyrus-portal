## Security Remediation Checklist

Follow these steps to address P0 security issues found in the audit.

1) Rotate all credentials
   - Supabase: Dashboard > Settings > API > Regenerate keys
   - Database: reset password via provider
   - Any other tokens: rotate in provider consoles

2) Remove secrets from git history
   - Add `.env` to `.gitignore` (already present)
   - Remove files from index: `git rm --cached .env .env.local`
   - Use BFG or git-filter-repo to purge history:
     - `bfg --delete-files .env`
     - `git reflog expire --expire=now --all && git gc --prune=now --aggressive`

3) Confirm `.env` is not tracked
   - `git ls-files --error-unmatch .env` should return non-zero exit

4) Dependency remediation (manual step)
   - Run locally: `npm install && npm audit fix` and review recommended upgrades
   - If upgrades include Prisma, test locally and update `package.json` accordingly

5) Secrets handling going forward
   - Use deployment platform environment variables (Vercel, Supabase, etc.)
   - Add `SECURITY.md` and notify team to rotate keys after changes

If you want, I can prepare a PR that adds CI checks for `npm audit` and a script to assist with upgrading Prisma.
