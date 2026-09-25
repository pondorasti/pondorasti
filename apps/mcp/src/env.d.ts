import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider"

/** Injected by OAuthProvider into every handler's env. */
interface OAuthBindings {
  OAUTH_PROVIDER: OAuthHelpers
}

declare global {
  interface Env extends OAuthBindings {}
  namespace Cloudflare {
    interface Env extends OAuthBindings {}
  }
}

export {}
