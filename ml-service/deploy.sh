#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MillionFlats ML Sidecar — VPS Deployment Script
# Run this once on the VPS (Ubuntu 22.04 recommended, 4GB+ RAM)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

echo "🚀 MillionFlats ML Sidecar — VPS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── System Dependencies ───────────────────────────────────────────────────────
apt-get update -qq
apt-get install -y python3.11 python3.11-venv python3-pip nginx certbot python3-certbot-nginx -qq

# ── Python Environment ────────────────────────────────────────────────────────
cd /opt/millionflats-ml
python3.11 -m venv venv
source venv/bin/activate

pip install --upgrade pip wheel
pip install -r requirements.txt

# ── ML Libraries (CPU-only build for cost efficiency) ────────────────────────
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install transformers sentence-transformers scikit-learn xgboost lightgbm shap joblib

# ── Pre-download CLIP model ───────────────────────────────────────────────────
python3 -c "
from transformers import CLIPProcessor, CLIPModel
print('Downloading CLIP model...')
CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
print('✅ CLIP model cached')
"

python3 -c "
from sentence_transformers import SentenceTransformer
print('Downloading sentence-transformer...')
SentenceTransformer('all-MiniLM-L6-v2')
print('✅ Sentence transformer cached')
"

# ── Systemd Service ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/ml-sidecar.service << 'EOF'
[Unit]
Description=MillionFlats ML Sidecar
After=network.target

[Service]
Type=exec
User=ubuntu
WorkingDirectory=/opt/millionflats-ml
EnvironmentFile=/opt/millionflats-ml/.env
ExecStart=/opt/millionflats-ml/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ml-sidecar
systemctl start ml-sidecar

echo "✅ ML Sidecar deployed at http://localhost:8001"
echo "   Set ML_VPS_ENDPOINT=http://YOUR_VPS_IP:8001 in Next.js .env"
echo "   Set ML_VPS_SECRET=<shared-secret> in both .env files"
