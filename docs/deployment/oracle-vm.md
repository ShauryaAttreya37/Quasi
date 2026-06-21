# Oracle VM Deployment

These commands deploy Quasi on an Oracle Cloud Ubuntu VM using Node.js 20 and `pm2`.

## 1. Prepare the VM

Run on the Oracle VM:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node --version
npm --version
pm2 --version
```

## 2. Clone the Private Repository

Replace `<github-user>` with the GitHub account or organization that owns the repo.

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/<github-user>/Quasi.git
cd Quasi
npm ci --omit=dev
```

For a private repo, authenticate with one of these production-safe options:

- SSH deploy key added to the GitHub repository.
- GitHub personal access token with read-only repo access.
- GitHub CLI authenticated on the VM with `gh auth login`.

## 3. Configure Secrets

Create the runtime environment file on the VM:

```bash
cp .env.example .env
nano .env
```

Set these values:

```env
DISCORD_TOKEN=your_discord_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL_NORMAL=google/gemini-2.5-flash-lite
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=
OPENROUTER_APP_NAME=Quasi
QUASI_DEDICATED_CHANNEL_ID=
QUASI_TIME_ZONE=America/Los_Angeles
LOG_LEVEL=info
```

Keep `.env` only on the VM. Do not commit it.

## 4. Start Quasi

```bash
npm run check
npm test
pm2 start index.js --name quasi
pm2 save
pm2 startup systemd
```

The `pm2 startup` command prints one more `sudo env ...` command. Copy and run that command exactly once, then run:

```bash
pm2 save
pm2 status
pm2 logs quasi
```

## 5. Update a Running Deployment

Run on the Oracle VM:

```bash
cd ~/apps/Quasi
git pull --ff-only
npm ci --omit=dev
npm run check
npm test
pm2 restart quasi --update-env
pm2 save
pm2 status
```

## 6. Operational Checks

Use these commands when debugging:

```bash
pm2 logs quasi --lines 100
pm2 describe quasi
pm2 restart quasi --update-env
pm2 stop quasi
pm2 start quasi
```

The Discord bot must have Message Content Intent enabled in the Discord Developer Portal, and the bot must have permission to read messages and send messages in the target server.
