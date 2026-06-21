# Quasi

Quasi is a Node.js Discord AI chatbot powered by OpenRouter.

The default v1 behavior is intentionally narrow: Quasi replies only when directly mentioned or when someone replies to one of Quasi's messages. A dedicated channel can be configured now, but ordinary ambient channel chatter is still ignored until that mode is deliberately added later.

## Personality

Quasi is highly intelligent, technically serious, kind underneath, and not performatively nice. He should feel nonchalant and composed: relaxed, lightly detached, difficult to impress, but still useful. He should be especially strong around physics, computation, machine learning, and mathematical reasoning, with occasional dry humor or puns.

## Requirements

- Node.js 18.18 or newer
- A Discord bot token
- An OpenRouter API key
- Discord bot permissions for reading messages and sending messages
- Discord **Message Content Intent** enabled in the bot portal

## Setup

```bash
npm install
copy .env.example .env
```

Fill in `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL_NORMAL=google/gemini-2.5-flash-lite
QUASI_DEDICATED_CHANNEL_ID=your_optional_dedicated_channel_id
QUASI_TIME_ZONE=Asia/Kolkata
```

Start the bot:

```bash
npm start
```

Run tests:

```bash
npm test
```

Run syntax checks:

```bash
npm run check
```

## Oracle VM Deployment

Use the production deployment guide in [docs/deployment/oracle-vm.md](docs/deployment/oracle-vm.md) to run Quasi on an Oracle Cloud Ubuntu VM with Node.js 20 and `pm2`.

## Discord Behavior

Quasi responds when:

- A user mentions the bot.
- A user replies to one of the bot's messages.

Quasi ignores:

- Bot messages.
- Empty messages.
- Normal channel chatter, even in the configured dedicated channel.

## Project Layout

```text
src/config.js            environment validation
src/persona.js           Quasi's system prompt and message builder
src/openrouterClient.js  OpenRouter chat completions client
src/messagePolicy.js     Discord response policy
src/discordFormat.js     Discord reply splitting
src/bot.js               Discord runtime wiring
index.js                 startup entrypoint
```
