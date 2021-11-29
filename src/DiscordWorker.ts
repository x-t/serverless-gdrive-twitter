import https from "https";

interface DiscordHookAuth {
  api: string;
  username: string;
}

export function send_successful_message(text: string) {
  sendDiscord({
    embeds: [
      {
        title: "Success",
        description: text,
        color: 1879160,
      },
    ],
  });
}

export function send_failure_message(text: string) {
  sendDiscord({
    embeds: [
      {
        title: "Error",
        description: text,
        color: 15299665,
      },
    ],
  });
}

function sendDiscord(content: any) {
  const discordAuth: DiscordHookAuth = {
    api: process.env.DISCORD_HOOK_ENDPOINT!,
    username: process.env.DISCORD_USERNAME!,
  };

  if (discordAuth.api === "" || discordAuth.username === "") {
    return;
  }

  var data = JSON.stringify({
    username: discordAuth.username,
    embeds: content.embeds,
  });

  const options = {
    hostname: "discord.com",
    port: 443,
    path: discordAuth.api,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
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
