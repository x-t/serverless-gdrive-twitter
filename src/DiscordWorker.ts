import https from "https";

export interface DiscordHookAuth {
  api: string,
  username: string
}

export let Messages: any = {};

Messages.test = () => {
  return {
    "embeds": [{
      "title": "Discord webhook test",
      "description": "This is a standard test.",
      "color": 43127
    }]
  };
}

Messages.success = (filename: string) => {
  return {
    "embeds": [{
      "title": "Success",
      "description": `Successfully uploaded ${filename}`,
      "color": 1879160
    }]
  }
}

Messages.fail = (error: string) => {
  return {
    "embeds": [{
      "title": "Error",
      "description": `An error prevented function.\n${error}`,
      "color": 15299665
    }]
  }
}

Messages.debug = (text: any) => {
  return {
    "embeds": [{
      "title": "Debug",
      "description": `${text}`,
      "color": 15299665
    }]
  }
}

export function sendDiscord(auth: DiscordHookAuth, content: any) {
  var data = JSON.stringify({
    username: auth.username,
    embeds: content.embeds
  });

  const options = {
    hostname: 'discord.com',
    port: 443,
    path: auth.api,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options);
  req.on('error', error => {
    console.error(error)
  });
  req.write(data);
  req.end();
}
