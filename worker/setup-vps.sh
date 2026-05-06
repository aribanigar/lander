#!/bin/bash
# =============================================================================
# Landed — Browser Worker VPS Setup
# Tested on: Oracle Cloud Free Tier — Ampere A1 (ARM64), Ubuntu 22.04 / 24.04
# Run ONCE on a fresh instance: bash setup-vps.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "======================================================"
echo "  Landed Browser Apply Worker — VPS Setup"
echo "  Oracle Cloud Free Tier (Ampere ARM A1) / Ubuntu"
echo "======================================================"
echo ""

# ── 1. System update ─────────────────────────────────────────────────────────
info "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git unzip nano ufw

# ── 2. Node.js 20 LTS ────────────────────────────────────────────────────────
info "Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  warn "Node.js already installed: $(node -v)"
fi
info "Node: $(node -v)  NPM: $(npm -v)"

# ── 3. PM2 ───────────────────────────────────────────────────────────────────
info "Installing PM2..."
sudo npm install -g pm2
pm2 --version

# ── 4. Playwright system dependencies ────────────────────────────────────────
# Oracle Ampere ARM64 needs libgbm-dev (dev package has the .so)
info "Installing Playwright / Chromium system dependencies..."
sudo apt-get install -y \
  libglib2.0-0t64 \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0t64 \
  libatk-bridge2.0-0t64 \
  libcups2t64 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libgbm-dev \
  libasound2t64 \
  libx11-xcb1 \
  libxcb-dri3-0 \
  libxss1 \
  fonts-liberation \
  libappindicator3-1 \
  xdg-utils \
  ca-certificates \
  wget

# ── 5. Log directory ─────────────────────────────────────────────────────────
info "Creating log directory..."
sudo mkdir -p /var/log/landed-worker
sudo chown "$USER:$USER" /var/log/landed-worker

# ── 6. Firewall ───────────────────────────────────────────────────────────────
info "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3001/tcp comment "Worker health endpoint"
sudo ufw status

# ── 7. Clone repo ─────────────────────────────────────────────────────────────
echo ""
warn "Enter your GitHub repo URL (e.g. https://github.com/yourusername/Landed.git):"
read -r REPO_URL

if [ -d ~/landed ]; then
  warn "~/landed already exists. Pulling latest..."
  cd ~/landed && git pull
else
  info "Cloning repository..."
  git clone "$REPO_URL" ~/landed
fi

cd ~/landed/worker

# ── 8. Install npm deps ───────────────────────────────────────────────────────
info "Installing npm dependencies..."
npm install

# ── 9. Playwright Chromium binary ────────────────────────────────────────────
info "Installing Playwright Chromium browser..."
npx playwright install chromium

# ── 10. Build TypeScript ──────────────────────────────────────────────────────
info "Building TypeScript..."
npm run build

# ── 11. Create .env ───────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  info "Created .env from template"
fi

# ── 12. Setup SSH key for GitHub Actions auto-deploy ─────────────────────────
info "Setting up SSH key for GitHub Actions deploys..."
if [ ! -f ~/.ssh/github_actions ]; then
  ssh-keygen -t ed25519 -f ~/.ssh/github_actions -N "" -C "github-actions-deploy"
  cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  echo ""
  echo "======================================================"
  echo "  GitHub Actions SSH Setup"
  echo "======================================================"
  echo ""
  echo "Add these 3 secrets to your GitHub repo:"
  echo "  Settings → Secrets and variables → Actions"
  echo ""
  echo "  VPS_HOST    = $(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  echo "  VPS_USER    = $USER"
  echo "  VPS_SSH_KEY = (contents of the private key below)"
  echo ""
  echo "---------- PRIVATE KEY (copy ALL lines) ----------"
  cat ~/.ssh/github_actions
  echo "---------------------------------------------------"
  echo ""
else
  warn "SSH key ~/.ssh/github_actions already exists"
fi

# ── 13. Final instructions ────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  Almost done! Two manual steps remain:"
echo "======================================================"
echo ""
echo "1. Fill in your .env file:"
echo "   nano ~/landed/worker/.env"
echo ""
echo "   Required values:"
echo "   - MONGODB_URI         (same as your Next.js app)"
echo "   - ENCRYPTION_KEY      (same as your Next.js app)"
echo "   - ANTHROPIC_API_KEY   (from console.anthropic.com)"
echo ""
echo "2. Start the worker:"
echo "   cd ~/landed/worker"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup   ← run the command it prints to auto-start on reboot"
echo ""
echo "3. Verify it's running:"
echo "   pm2 logs landed-worker"
echo "   curl http://localhost:3001/health"
echo ""
echo "======================================================"
echo "  Setup complete!"
echo "======================================================"
