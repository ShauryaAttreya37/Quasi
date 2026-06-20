# Quasi Discord Bot Design

## Goal

Build Quasi as a Node.js Discord chatbot backed by OpenRouter. Version 1 responds only when directly mentioned or when a user replies to one of Quasi's messages. The bot is also aware of a dedicated channel ID so future channel-specific behavior can be enabled without redesigning the core message pipeline.

## Personality

Quasi is modeled as highly intelligent, kind underneath, but not performatively nice. He should be direct, occasionally dry or punny, and unusually strong in physics, machine learning, computation, and mathematical reasoning. Responses should feel precise and alive rather than generic or sycophantic.

## Model

Normal conversation uses OpenRouter model `google/gemma-4-31b-it:free` by default. The model ID is configurable through environment variables so it can be changed without code edits.

## Discord Behavior

Quasi ignores bot messages, system messages, and empty messages. He responds when:

- A user mentions Quasi.
- A user replies to one of Quasi's messages.

He does not respond to ordinary channel chatter in v1, including the dedicated channel. The dedicated channel is configured now so future ambient mode can be scoped safely to that channel.

## Architecture

- `src/config.js`: validates required environment variables and exposes typed config.
- `src/persona.js`: contains the system prompt and Discord markdown formatting rules.
- `src/openrouterClient.js`: calls OpenRouter's chat completions API.
- `src/messagePolicy.js`: decides whether Quasi should respond to a Discord message.
- `src/discordFormat.js`: keeps replies within Discord's 2000-character limit.
- `src/bot.js`: wires Discord events to the policy, prompt, OpenRouter client, and reply handling.
- `index.js`: starts the bot.

## Error Handling

Configuration errors fail fast at startup. OpenRouter failures are logged and produce a short user-facing fallback reply. Discord reply failures are logged without crashing the process. Long model responses are split into safe Discord-sized chunks.

## Testing

Use Node's built-in test runner for pure logic:

- Configuration validation behavior.
- Message response policy.
- Discord reply splitting.

Integration with Discord and OpenRouter is left to manual runtime verification because it requires real credentials.

