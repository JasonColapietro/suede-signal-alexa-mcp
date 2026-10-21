import { createLocalServer } from "./local.js";

const port = Number(process.env.PORT ?? 3333);
// Exact loopback origins only. Hosted requests still require ALLOWED_ORIGINS.
process.env.ALLOWED_ORIGINS ??= `http://localhost:${port},http://127.0.0.1:${port}`;
createLocalServer().listen(port, "127.0.0.1", () => {
  console.log(`Suede Signal demo: http://localhost:${port}/demo.html`);
});
