import { STYLE, html } from "./login"

/** Linked from the Google OAuth consent screen (Cloud project alexandru-mcp). */
export function privacy() {
  return html(`<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy · mcp.alexandru.so</title>
${STYLE}
<h1>Privacy</h1>
<p>mcp.alexandru.so is a personal gateway run by Alexandru Ţurcanu for his own accounts. It
lets AI assistants he authorizes use his Gmail, Google Calendar and a few other services on
his behalf. It has no other users.</p>
<p>Google user data is read or written only when one of those assistants calls a tool on his
request. The gateway stores the OAuth tokens it needs to do that, and nothing else from Google:
no email or calendar content is kept, shared, sold, or used to train models. Use of data from
Google APIs follows the
<a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services
User Data Policy</a>, including the Limited Use requirements.</p>
<p>Access can be revoked at any time from
<a href="https://myaccount.google.com/permissions">Google Account permissions</a>.
Questions: <a href="mailto:pondorasti@gmail.com">pondorasti@gmail.com</a>.</p>
</html>`)
}
