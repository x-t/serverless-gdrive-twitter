import https from "https";

interface SlackHookAuth {
  api: string;
  username: string;
}

interface SlackBlock {
  type: string;
  text?: SlackBlockText;
  elements?: SlackBlockContextElement[];
}

interface SlackBlockText {
  type: string;
  text: string;
  emoji?: boolean;
}

interface SlackBlockContextElement {
  type: string;
  text: string;
  emoji: boolean;
}

export function slack_template(header: string, section: string): SlackBlock[] {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: header,
        emoji: true,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: section,
      },
    },
  ];
}

export function send_failure_message(text: string) {
  send_slack(slack_template("🛑 Error", text));
}

export function send_successful_message(text: string) {
  send_slack(slack_template("✅ Success", text));
}

function send_slack(content: SlackBlock[]) {
  const slackAuth: SlackHookAuth = {
    api: process.env.SLACK_HOOK_ENDPOINT!,
    username: process.env.SLACK_USERNAME!,
  };

  if (slackAuth.api === "") {
    return;
  }

  const data = JSON.stringify(
    slackAuth.username
      ? {
          username: slackAuth.username,
          blocks: content,
        }
      : {
          blocks: content,
        }
  );

  const options = {
    hostname: "hooks.slack.com",
    port: 443,
    path: slackAuth.api,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const req = https.request(options);
  req.on("error", (error) => {
    // Last resort, really.
    console.error(error);
  });
  req.write(data);
  req.end();
}
