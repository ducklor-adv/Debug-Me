#!/bin/bash
exec > /root/deploy.log 2>&1

echo "=== 1/6 Kill old locks ==="
killall -9 dnf 2>/dev/null || true
killall -9 rpm 2>/dev/null || true
rm -f /var/run/yum.pid /var/run/dnf.pid
sleep 2

echo "=== 2/6 Install Node.js ==="
dnf install -y nodejs
node -v
npm -v

echo "=== 3/6 Install Nginx ==="
dnf install -y nginx
systemctl enable nginx

echo "=== 4/6 Clone & Build ==="
rm -rf /var/www/debug-me
git clone https://github.com/ducklor-adv/Debug-Me.git /var/www/debug-me
cd /var/www/debug-me
npm install
npm run build

echo "=== 5/6 Configure Nginx ==="
cat > /etc/nginx/conf.d/debug-me.conf << 'NGINX'
server {
    listen 80;
    server_name 45.77.168.37;
    root /var/www/debug-me/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

nginx -t
systemctl restart nginx

echo "=== 6/6 Open Firewall ==="
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo "=== DEPLOY_COMPLETE ==="
echo "App is live at http://45.77.168.37"
