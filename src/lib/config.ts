// Self-host configuration flags.

// Whether public sign-up is allowed. Set ALLOW_REGISTRATION="false" to lock the
// instance down to existing accounts only (useful for single-user deployments).
export function registrationEnabled(): boolean {
  return process.env.ALLOW_REGISTRATION !== "false";
}
