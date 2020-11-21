import { sendDiscord, Messages } from "./DiscordWorker"

export const _debug = {
  enabled: false,
  // print: (p: any) => {if (_debug.enabled) console.log("[LOG] "+p)},
  print: (p: any) => {if (_debug.enabled) sendDiscord({api: process.env.DISCORD_HOOK_ENDPOINT!, username: process.env.DISCORD_USERNAME!}, Messages.debug(p))}
}