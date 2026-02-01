# Open source pre-launch checklist (Echo)

From [Open Source Guide: Starting a Project](https://opensource.guide/starting-a-project/). Go through each item and confirm before you commit and publish.

---

## Documentation

| Item | Status | Notes |
|------|--------|--------|
| Project has a **LICENSE** file with an open source license | Done | `LICENSE` (MIT) at repo root. Update "Echo contributors" to your name or entity if you want. |
| Project has basic documentation: **README**, **CONTRIBUTING**, **CODE_OF_CONDUCT** | Done | Root: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`. App README links to them. |
| Name is easy to remember, suggests what the project does, and does not conflict with existing projects or trademarks | Your call | "Echo" is short and memorable. You should: (1) Search for other "Echo" projects in the same space. (2) If you care about trademarks, check [WIPO Global Brand Database](https://www.wipo.int/branddb/en/) or ask a lawyer. |
| Issue queue is up to date, with issues clearly organized and labeled | Your call | After publishing, create a few labels (e.g. bug, enhancement, documentation, question) and keep issues tidy. Optional before first publish. |

---

## Code

| Item | Status | Notes |
|------|--------|--------|
| Project uses consistent code conventions and clear function/method/variable names | Done | TypeScript, ESLint, existing structure. No change made. |
| Code is clearly commented where it helps (intent and edge cases) | Done | Existing level. No audit done. |
| No sensitive materials in revision history, issues, or pull requests (e.g. passwords, API keys) | Verified | No hardcoded API keys or secrets in current code. `.gitignore` excludes `.env`. CHANGELOG notes prior removal of debug endpoints. If you ever committed secrets in the past, rewrite history (e.g. `git filter-repo`) or ensure they are revoked. |

---

## People

| Item | Status | Notes |
|------|--------|--------|
| **(Individual)** You have talked to legal / understand your employer’s IP and open source policy (if you are employed) | N/A | Passion project; not employed on this. |
| **(Organization)** Legal is aligned; plan for announcing; someone for community; at least two admins | N/A | Passion project; not a company project. |

---

## Summary of what was added (no commit yet)

- **LICENSE** – MIT, copyright "Echo contributors" (edit if you want a specific holder).
- **README.md** (root) – Short project intro and links to app README and other docs.
- **CONTRIBUTING.md** – How to report bugs, suggest features, and send PRs.
- **CODE_OF_CONDUCT.md** – Contributor Covenant 2.1; enforcement via "open an issue" (or maintainer contact if you add it).
- **app/README.md** – Added a line linking to CONTRIBUTING and CODE_OF_CONDUCT.

Checklist confirmed. You can delete this file before or after your first public publish if you no longer need it.
