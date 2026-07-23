# Quasi

Quasi is a Node.js Discord AI chatbot powered by an OpenAI-compatible chat provider. The default local configuration uses NVIDIA NIM.

The default v1 behavior is intentionally narrow: Quasi replies only when directly mentioned or when someone replies to one of Quasi's messages. A dedicated channel can be configured now, but ordinary ambient channel chatter is still ignored until that mode is deliberately added later.

## Personality

Quasi is highly intelligent, technically serious, kind underneath, and not performatively nice. He should feel nonchalant and composed: relaxed, lightly detached, difficult to impress, but still useful. He should be especially strong around physics, computation, machine learning, and mathematical reasoning, with occasional dry humor or puns.

## Requirements

- Node.js 18.18 or newer
- A Discord bot token
- An NVIDIA API key, or an OpenRouter API key when `QUASI_AI_PROVIDER=openrouter`
- Discord bot permissions for reading messages and sending messages
- Discord **Message Content Intent** enabled in the bot portal
- **Python 3** with `numpy` and `matplotlib` (only for the `/plot3d` command)

LaTeX rendering (`/latex`) is pure JavaScript (MathJax + resvg) and needs **no** system
LaTeX/TeXLive install. 3D plotting (`/plot3d`) shells out to Python.

## Setup

```bash
npm install
copy .env.example .env

# Python deps for /plot3d (Linux VM):
python3 -m pip install numpy matplotlib
```

Fill in `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_GUILD_ID=your_test_guild_id_optional
QUASI_AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_MODEL_NORMAL=moonshotai/kimi-k2.6
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_OCR_API_KEY=your_nvidia_ocr_api_key
NVIDIA_OCR_ENDPOINT=https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2
QUASI_OCR_ENABLED=true
QUASI_OCR_MERGE_LEVEL=paragraph
QUASI_DEDICATED_CHANNEL_ID=your_optional_dedicated_channel_id
QUASI_TIME_ZONE=America/Los_Angeles
QUASI_WEB_SEARCH_ENABLED=true
QUASI_WEB_SEARCH_MAX_RESULTS=3
QUASI_RATE_LIMIT_REQUESTS_PER_HOUR=12
QUASI_MAX_IMAGES_PER_REQUEST=3
QUASI_PYTHON_BIN=python3
QUASI_PLOT_TIMEOUT_MS=15000
```

Web search uses OpenRouter's `web` plugin and can add provider/search costs. Set `QUASI_WEB_SEARCH_ENABLED=false` to disable it.
Quasi limits each user to 12 AI replies per rolling hour by default. Mention the bot with up to three PNG, JPEG, WebP, or GIF attachments to include them as vision input. When OCR is enabled, PNG and JPEG attachments are also sent through OCR and the extracted text is added to the image prompt.
Both limits are configurable with the environment variables above.


`QUASI_PYTHON_BIN` is the Python interpreter used for `/plot3d`. On Windows this is
often the full path to `python.exe`; on the Oracle VM `python3` is usually correct.

### Register slash commands

Slash commands must be registered once (and again whenever their definitions change):

```bash
npm run register
```

With `DISCORD_GUILD_ID` set this registers to that guild instantly (best for testing).
Without it (or with `npm run register -- --global`) it registers globally, which can take
up to an hour to propagate.

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

## Slash Commands

Because Discord does not render LaTeX in bot messages, Quasi renders math and plots to
images and posts them as embeds.

### `/latex`

Render a LaTeX expression to a PNG.

- `expression` (required) â€” LaTeX without surrounding `$`, e.g. `\frac{-b\pm\sqrt{b^2-4ac}}{2a}`
- `inline` (optional) â€” render in inline (text-size) mode instead of display mode

### `/plot3d surface`

Plot a surface `z = f(x, y)`.

- `expression` (required) â€” e.g. `sin(sqrt(x**2 + y**2))`
- `xmin` / `xmax` / `ymin` / `ymax` (optional) â€” domain, default `-5..5`
- `colormap` (optional) â€” `viridis` (default), `plasma`, `inferno`, `magma`, `cividis`, `turbo`, `coolwarm`

### `/plot3d curve`

Plot a parametric curve `(x(t), y(t), z(t))`.

- `x`, `y`, `z` (required) â€” expressions in `t`, e.g. `cos(t)`, `sin(t)`, `t/3`
- `tmin` / `tmax` (optional) â€” parameter range, default `0..2Ï€`

Expressions allow numpy math functions (`sin`, `cos`, `exp`, `sqrt`, `log`, â€¦) and the
constants `pi`, `e`, `tau`. They are evaluated through a locked-down AST whitelist â€” no
builtins, imports, or attribute access â€” so user input cannot execute arbitrary code.

## Discord Behavior

Quasi responds when:

- A user mentions the bot with supported image attachments for visual analysis.
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
src/openrouterClient.js  OpenAI-compatible chat completions client
src/ocrClient.js         NVIDIA OCR client for image text extraction
src/messagePolicy.js     Discord response policy
src/discordFormat.js     Discord reply splitting
src/latexRender.js       LaTeX -> PNG via MathJax + resvg
src/plot3d.js            spawns the Python 3D plot worker
src/python/plot3d.py     matplotlib 3D plotter with safe expression eval
src/commands/            slash command definitions (latex, plot3d)
src/bot.js               Discord runtime wiring
scripts/register-commands.js  registers slash commands with Discord
index.js                 startup entrypoint
```



