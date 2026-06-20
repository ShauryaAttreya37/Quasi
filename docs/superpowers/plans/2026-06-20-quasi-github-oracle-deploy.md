# Quasi GitHub Remote and Oracle VM Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Quasi to a private GitHub repository and document deploy/update commands for an Oracle Cloud Ubuntu VM.

**Architecture:** Keep the existing local Node.js bot as the source tree, add a private `origin` remote named `Quasi`, and push the current branch after committing project files. Deployment is documented as VM shell commands using Node.js 20, `npm ci --omit=dev`, and `pm2` process management.

**Tech Stack:** Git, GitHub CLI, Node.js ESM, npm, Oracle Cloud Ubuntu VM, pm2.

## Global Constraints

- GitHub repository visibility: private.
- Repository name: `Quasi`.
- Local project path: `C:\Discord Bots\Quasi`.
- Runtime secrets must stay out of Git; `.env` is ignored and `.env.example` contains placeholders only.
- Deployment target: Oracle Cloud Ubuntu VM.
- Production process manager: `pm2`.
- Code should be production ready: verification commands must pass before the branch is pushed.

---

### Task 1: Deployment Documentation and Environment Sample

**Files:**
- Create: `.env.example`
- Create: `docs/deployment/oracle-vm.md`
- Modify: `README.md`

**Interfaces:**
- Produces: a documented set of required environment keys.
- Produces: first-deploy and update commands for an Oracle VM.

- [ ] Add `.env.example` with placeholder values for `DISCORD_TOKEN`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_NORMAL`, `OPENROUTER_BASE_URL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`, `QUASI_DEDICATED_CHANNEL_ID`, and `LOG_LEVEL`.
- [ ] Add `docs/deployment/oracle-vm.md` with Ubuntu package setup, Node.js 20 installation, clone, install, `.env`, `npm run check`, `npm test`, `pm2 start`, `pm2 save`, `pm2 startup systemd`, update, and logging commands.
- [ ] Link the deployment guide from `README.md`.

### Task 2: Verify and Commit Local Repository

**Files:**
- Verify: all tracked project files

**Interfaces:**
- Consumes: existing Node.js scripts `npm run check` and `npm test`.
- Produces: a local Git commit ready to push.

- [ ] Run `npm run check` from `C:\Discord Bots\Quasi` and confirm syntax checks pass.
- [ ] Run `npm test` from `C:\Discord Bots\Quasi` and confirm tests pass.
- [ ] Run `git status --short` and confirm `.env` is not staged.
- [ ] Commit the project with message `chore: prepare quasi for github deployment`.

### Task 3: Create GitHub Remote and Push

**Files:**
- Configure: `.git/config`

**Interfaces:**
- Consumes: authenticated GitHub CLI session.
- Produces: private GitHub repository `Quasi` configured as `origin`.

- [ ] Run `gh repo create Quasi --private --source . --remote origin`.
- [ ] Push the current `master` branch with `git push -u origin master`.
- [ ] Run `git remote -v` and confirm `origin` points to the new GitHub repository.
- [ ] Run `gh repo view --json name,visibility,url` and confirm the repository is private.
