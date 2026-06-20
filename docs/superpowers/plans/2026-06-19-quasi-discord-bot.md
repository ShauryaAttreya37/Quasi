# Quasi Discord Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Node.js Discord chatbot named Quasi using OpenRouter and `google/gemma-4-31b-it:free`.

**Architecture:** A small event-driven Discord bot routes incoming messages through a response policy, persona prompt builder, OpenRouter chat client, and Discord-safe markdown reply splitter. Dedicated-channel configuration is present in v1, but ambient responses remain disabled.

**Tech Stack:** Node.js ESM, `discord.js`, `dotenv`, built-in `fetch`, built-in `node:test`.

## Global Constraints

- Normal OpenRouter model: `google/gemma-4-31b-it:free`.
- Runtime: Node.js 18 or newer for built-in `fetch`.
- Discord behavior v1: respond only to direct mentions and replies to Quasi's own messages.
- Dedicated channel is configurable, but does not enable ambient channel chat in v1.
- Discord responses must be formatted in Markdown and split below Discord's 2000-character limit.
- Code should be production ready: validated config, clear errors, tests for pure logic, and maintainable module boundaries.

---

### Task 1: Project Skeleton and Config

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/config.js`
- Test: `test/config.test.js`

**Interfaces:**
- Produces: `loadConfig(env)` returns validated config.

- [ ] Create Node package metadata and scripts.
- [ ] Add environment example for Discord and OpenRouter.
- [ ] Add config validation and defaults.
- [ ] Test missing required secrets and model defaults.

### Task 2: Message Policy and Discord Formatting

**Files:**
- Create: `src/messagePolicy.js`
- Create: `src/discordFormat.js`
- Test: `test/messagePolicy.test.js`
- Test: `test/discordFormat.test.js`

**Interfaces:**
- Produces: `shouldRespondToMessage(message, clientUserId, config)`.
- Produces: `splitDiscordMessage(markdown, maxLength)`.

- [ ] Test direct mention response behavior.
- [ ] Test reply-to-Quasi response behavior.
- [ ] Test normal chatter is ignored, including the dedicated channel.
- [ ] Test message splitting preserves Discord limits.

### Task 3: OpenRouter Client and Persona

**Files:**
- Create: `src/persona.js`
- Create: `src/openrouterClient.js`
- Test: `test/openrouterClient.test.js`

**Interfaces:**
- Produces: `buildSystemPrompt()`.
- Produces: `createOpenRouterClient(config, fetchImpl)`.

- [ ] Add Quasi persona and Discord Markdown response rules.
- [ ] Add OpenRouter chat completion client with injectable fetch.
- [ ] Test request shape and error handling without real network calls.

### Task 4: Discord Runtime Wiring and Docs

**Files:**
- Create: `src/bot.js`
- Create: `index.js`
- Create: `README.md`

**Interfaces:**
- Consumes: all previous modules.
- Produces: runnable Discord bot via `npm start`.

- [ ] Wire Discord `messageCreate` events to policy and OpenRouter.
- [ ] Add fallback response on model failures.
- [ ] Add README setup and Discord intent notes.
- [ ] Run tests and syntax checks.

