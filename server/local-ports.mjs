// Keep the dev server, auth proxy and multiplayer client on the same port set.
export function localPorts(env) {
  return {
    web: Number(env.WEB_PORT || 5273),
    auth: Number(env.AUTH_PORT || 5274),
    game: Number(env.GAME_PORT || 5275),
  };
}

export function localWebOrigins(port) {
  return [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
}
