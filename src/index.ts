import * as TwitterWorker from "./TwitterWorker";
import Twitter from "twitter-api-v2";
import { auth } from "@googleapis/drive";
import * as DriveWorker from "./DriveWorker";
import { send_failure_message } from "./Notification";
import "./env";
import { AzureFunction, Context } from "@azure/functions";
import { deta_connect } from "./CacheWorker";
import { brute_force } from "./entrypoint";

export async function main() {
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
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });

  const googleKey = process.env.GOOGLE_KEY!.replace(/\\n/g, "\n");

  const authClient = new auth.JWT(
    process.env.GOOGLE_EMAIL,
    undefined,
    googleKey,
    "https://www.googleapis.com/auth/drive"
  );

  authClient.authorize((err, tokens) => {
    if (err) {
      send_failure_message(JSON.stringify(err));
      throw err;
    } else {
      authClient.setCredentials(tokens!);
    }
  });

  const deta = deta_connect();

  const x = await DriveWorker.getRandomBuffer(
    process.env.DRIVE_FOLDER,
    authClient,
    deta
  );
  const y = TwitterWorker.postMedia(
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
  brute_force();
};

export default timerTrigger;
