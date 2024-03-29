import * as Discord from "./DiscordWorker";
import * as Slack from "./SlackWorker";

type NotificationWorker = "discord" | "slack" | "console";

export function get_preferred_worker(): NotificationWorker {
  switch (process.env.NOTIFICATION_WORKER) {
    case "discord":
      return "discord";
    case "slack":
      return "slack";
    case "console":
    case "":
    case undefined:
      return "console";
    default:
      throw new Error(
        `Unknown notification worker: ${process.env.NOTIFICATION_WORKER}`
      );
  }
}

export function send_failure_message(text: string) {
  switch (get_preferred_worker()) {
    case "discord":
      Discord.send_failure_message(text);
      break;
    case "slack":
      Slack.send_failure_message(text);
      break;
    case "console":
      console.log(`❌ Error! - ${text}`);
      break;
  }
}

export function send_successful_message(text: string) {
  switch (get_preferred_worker()) {
    case "discord":
      Discord.send_successful_message(text);
      break;
    case "slack":
      Slack.send_successful_message(text);
      break;
    case "console":
      console.log(`✅ Success! - ${text}`);
      break;
  }
}
