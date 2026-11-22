# OrientaT

- The repository root contains the browser extension. The React/Vite website is in `web/` and has its own `package.json` and lockfile.
- For website work, run `npm --prefix web ci` and `npm --prefix web run dev`. Check changes with `npm --prefix web run build` and `npm --prefix web run lint`.
- For extension work, use the root commands `npm run typecheck`, `npm test`, and `npm run build` as appropriate.
- The assistant provides guidance and may navigate. The person enters their own data and confirms any submission, signature, or payment.
- For voice work, consult the [voice guidance](.agents/skills/asistente-tramites-voz/SKILL.md). Keep credentials in `web/.env.local` or server environment variables, never in Git.
