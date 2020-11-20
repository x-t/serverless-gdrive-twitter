export const _debug = {
  enabled: true,
  print: (p: any) => {if (_debug.enabled) console.log("[LOG] "+p)},
}