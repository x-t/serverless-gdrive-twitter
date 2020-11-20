export const _debug = {
  enabled: false,
  print: (p: any) => {if (_debug.enabled) console.log("[LOG] "+p)},
}