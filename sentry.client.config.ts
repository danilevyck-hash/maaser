import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Medido el 23-sep-2026: cada apertura mandaba entre 3 y 7 envíos a Sentry.
  tracesSampleRate: 0.02,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
