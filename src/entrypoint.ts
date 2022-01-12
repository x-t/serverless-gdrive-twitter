import { main } from "./index";
import retry from "async-retry";
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

export const brute_force = async function () {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 0.1,
  });

  let x = await retry(
    async (bail) => {
      try {
        await main();
      } catch (e) {
        Sentry.captureException(e);
        throw e;
      }
    },
    {
      retries: 3,
    }
  );
  return x;
};

brute_force();
