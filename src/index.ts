import * as TwitterWorker from "./TwitterWorker";
import Twitter from "twitter";
import {google} from "googleapis";
import * as DriveWorker from "./DriveWorker";
import {_debug} from "./_debug";
import { DiscordHookAuth, sendDiscord, Messages } from "./DiscordWorker";
import "./env";
import { AzureFunction, Context } from "@azure/functions"
import retry from "async-retry";

async function main() {
  var timeStamp = new Date().toISOString();

  const client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY!,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY!,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
  });
  _debug.print("Authenticated to Twitter");
  
  const authClient = new google.auth.JWT(
    process.env.GOOGLE_EMAIL!,
    undefined,
    process.env.GOOGLE_KEY!,
    "https://www.googleapis.com/auth/drive"
  );
  
  const discordAuth: DiscordHookAuth = {
    api: process.env.DISCORD_HOOK_ENDPOINT!,
    username: process.env.DISCORD_USERNAME!
  }
  DriveWorker.setDiscordAuth(discordAuth);
  TwitterWorker.setDiscordAuth(discordAuth);
  
  authClient.authorize((err, tokens) => {
    if (err) {
      sendDiscord(discordAuth, Messages.fail(JSON.stringify(err)));
      throw new Error("Drive API error");
    } else {
      authClient.setCredentials(tokens!);
      _debug.print("Authenticated to Google")
    }
  });

  var x = await DriveWorker.getRandomBuffer(process.env.DRIVE_FOLDER!, authClient)
  TwitterWorker.passFilename(x.filename);
  var y = TwitterWorker.postMedia(client,
                              x.buffer!, x.size,
                              x.mimeType, `${x.filename}`);
  return y;
};

const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
  let x = await retry(async bail => {
    await main();
  }, {
    retries: 3
  });
  return x;
}

// -- UNCOMMENT BELOW TO RUN LOCALLY --
// main();
export default timerTrigger;