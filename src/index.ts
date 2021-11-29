import * as TwitterWorker from "./TwitterWorker";
import Twitter from "twitter";
import { google } from "googleapis";
import * as DriveWorker from "./DriveWorker";
import { send_failure_message } from "./DiscordWorker";
import "./env";
import { AzureFunction, Context } from "@azure/functions";
import retry from "async-retry";

export async function main() {
  var timeStamp = new Date().toISOString();

  if (
    !process.env.TWITTER_CONSUMER_KEY ||
    !process.env.TWITTER_CONSUMER_SECRET ||
    !process.env.TWITTER_ACCESS_TOKEN_KEY ||
    !process.env.TWITTER_ACCESS_TOKEN_SECRET ||
    !process.env.GOOGLE_EMAIL ||
    !process.env.GOOGLE_KEY ||
    !process.env.DRIVE_FOLDER
  ) {
    send_failure_message("Missing environment variables");
    throw new Error("Missing environment variables");
  }

  const client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY!,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY!,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  });

  const googleKey = process.env.GOOGLE_KEY!.replace(/\\n/g, "\n");

  const authClient = new google.auth.JWT(
    process.env.GOOGLE_EMAIL!,
    undefined,
    googleKey,
    "https://www.googleapis.com/auth/drive"
  );

  authClient.authorize((err, tokens) => {
    if (err) {
      send_failure_message(JSON.stringify(err));
      throw new Error("Drive API error");
    } else {
      authClient.setCredentials(tokens!);
    }
  });

  var x = await DriveWorker.getRandomBuffer(
    process.env.DRIVE_FOLDER!,
    authClient
  );
  var y = TwitterWorker.postMedia(
    client,
    x.buffer!,
    x.size,
    x.mimeType,
    x.filename,
    `${x.filename}`
  );
  return y;
}

const timerTrigger: AzureFunction = async function (
  context: Context,
  myTimer: any
): Promise<void> {
  let x = await retry(
    async (bail) => {
      await main();
    },
    {
      retries: 3,
    }
  );
  return x;
};

export default timerTrigger;
