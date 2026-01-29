# AGENTS.md

pondorasti owns this.

## Agent Protocol

- Contact: Alexandru Turcanu, @pondorsti, [pondorasti@gmail.com](mailto:pondorasti@gmail.com)
- Work style: telegraph; noun-phrases ok; drop grammar; min tokens.
- Commits: Conventional Commits (`feat`, `fix`, `refactor`, `build`, `ci`, `chore`, `docs`, `style`, `perf`, `test`).
- Use the system command `trash` for deletes
- Remove human from the loop and prefer end-to-end verify; if blocked, say what’s missing.
- Keep files <~500 LOC; split/refactor as needed.

## Git

- Safe by default: `git status/diff/log`.
- Push only when the user asks.
- Branch changes require user consent.
- Don’t delete/rename unexpected stuff; stop + ask.
- Destructive ops forbidden unless explicit (`reset --hard`, `clean`, `restore`, `rm`, `amend` etc).
- If user types a command (“pull and push”), that’s consent for that command.

## **macOS Permissions / Signing (TCC)**

- Never re-sign / ad-hoc sign / change bundle ID as “debug” without explicit ok (can mess TCC).

## **Critical Thinking**

- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

## Tools

Leverage the help menu of each tool to learn how to use it.

### gh

GitHub CLI for PRs, CI, Releases.

When someone shares a GitHub URL, use `gh` to read it:

```jsx
gh issue view <url> --comments
gh pr view <url> --comments --files
gh run list / gh run view <id>
```

### pd

Personal CLI for pondorasti

When you need to clone a repo, use `pd clone` to automatically clone the repo in the correct directory.

### trash

Move files to trash using the system command.
