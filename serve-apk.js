const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const APK_DIR = path.resolve(__dirname, 'android/app/build/outputs/apk/debug');
const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
  const url = req.url;

  // Serve index page
  if (url === '/') {
    const files = fs.readdirSync(APK_DIR).filter(f => f.endsWith('.apk'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>管账人 APK 下载</title>
      <style>body{font-family:-apple-system,sans-serif;max-width:600px;margin:40px auto;padding:0 16px}
      h1{font-size:24px;margin-bottom:8px}p{color:#666;margin-bottom:24px}
      a{display:block;padding:14px 20px;margin-bottom:12px;background:#4CAF50;color:#fff;
        text-decoration:none;border-radius:12px;font-size:16px;font-weight:600;text-align:center}
      a:hover{opacity:0.85}.info{font-size:13px;color:#999;margin-top:20px}</style></head><body>
      <h1>管账人</h1>
      <p>选择对应架构的 APK 下载安装：</p>
      ${files.map(f => {
        const size = (fs.statSync(path.join(APK_DIR, f)).size / 1024 / 1024).toFixed(1);
        const label = f.replace('app-', '').replace('-debug.apk', '').replace('armeabi-v7a', 'ARM32 (旧手机)').replace('arm64-v8a', 'ARM64 (推荐)').replace('x86_64', 'x86_64 (模拟器)').replace('x86', 'x86 (模拟器)').replace('universal', '通用 (包最大)');
        return `<a href="/download/${f}">${label} (${size}MB)</a>`;
      }).join('')}
      <div class="info">确保手机和此电脑在同一 WiFi 网络下</div>
      </body></html>
    `);
    return;
  }

  // Serve APK download
  const prefix = '/download/';
  if (url.startsWith(prefix)) {
    const filename = url.slice(prefix.length);
    const filepath = path.resolve(APK_DIR, filename);

    // Security check: ensure file is within APK_DIR
    if (!filepath.startsWith(APK_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filepath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const stat = fs.statSync(filepath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  const ifaces = require('os').networkInterfaces();
  let ip = 'localhost';
  Object.keys(ifaces).forEach((name) => {
    ifaces[name].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
      }
    });
  });
  console.log(`\n📱 APK 下载服务已启动！
  本机访问: http://localhost:${PORT}
  手机访问: http://${ip}:${PORT}
  按 Ctrl+C 停止服务\n`);
});
