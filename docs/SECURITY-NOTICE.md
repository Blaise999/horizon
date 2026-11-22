# Suspicious code in the supplied archives

While consolidating the projects, multiple files contained unexpected, highly obfuscated JavaScript. Some sections attempted remote HTTP(S) communication and execution of downloaded code using `eval`, child processes, and Node.js startup hooks. This is **not** required by Next.js or Express and presents a critical supply-chain/remote-code-execution risk.

Examples identified:

- Frontend: `init`, `next.config.js`, `postcss.config.js`, `postcss.config.mjs`, `eslint.config.mjs`, `.vscode/eslint`
- Backend: `init`, `.vscode/eslint`, `src/server.js`, `src/routes/admin.routes.js`

This clean project was based on the frontend's application components and assets, with **all affected config/startup files removed and regenerated from scratch**. The standalone backend was not copied over. No original `init` or backend executable scripts were run to perform the migration.

## Required response if the original project was executed

1. Stop and isolate affected deployments or development machines until inspected.
2. Rotate any keys and secrets exposed to the application, notably MongoDB/database credentials, deployment tokens, SMTP credentials, Resend keys, JWT secrets, Supabase keys, and cloud-provider credentials.
3. Review provider access logs, outbound network connections, scheduled tasks, and unexpected processes.
4. Deploy only from independently reviewed clean sources, and avoid copying previous environment files or startup scripts into this project.
5. Treat the hard-coded MongoDB connection string in the original backend `.env.example` as exposed and rotate its password.

An automated source scan cannot guarantee the absence of every security issue. Further professional review is recommended before connecting real customer data.
