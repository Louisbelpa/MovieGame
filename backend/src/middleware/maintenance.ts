import { Request, Response, NextFunction } from 'express';

const MAINTENANCE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Maintenance — GuessToday</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0b0b0c;
    color: #e9e3d4;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%;
    max-width: 520px;
    text-align: center;
    border: 1px solid #2a2925;
    background: #131211;
    border-radius: 16px;
    padding: 40px 28px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  }
  .logo {
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #d4af37;
    font-size: 14px;
    margin-bottom: 18px;
    text-transform: uppercase;
  }
  h1 {
    font-size: 26px;
    line-height: 1.25;
    margin: 0 0 12px;
    color: #f5efdf;
  }
  p {
    margin: 0;
    color: #b8b1a0;
    font-size: 15px;
    line-height: 1.55;
  }
  .pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #d4af37;
    margin-right: 8px;
    vertical-align: middle;
    animation: pulse 1.6s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.35; transform: scale(0.9); }
    50% { opacity: 1; transform: scale(1.1); }
  }
  .footer {
    margin-top: 24px;
    font-size: 12px;
    color: #6e6757;
  }
</style>
</head>
<body>
  <main class="card" role="main">
    <div class="logo"><span class="pulse"></span>GuessToday</div>
    <h1>Site en maintenance</h1>
    <p>On peaufine quelques détails. Le jeu sera de retour très bientôt — merci pour votre patience.</p>
    <div class="footer">Revenez dans quelques jours.</div>
  </main>
</body>
</html>`;

const ALLOWED_PREFIXES = ['/api/admin', '/admin', '/assets', '/uploads', '/health'];

function isMaintenanceEnabled(): boolean {
  const v = (process.env.MAINTENANCE_MODE ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function isAllowed(pathname: string): boolean {
  for (const prefix of ALLOWED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

export function maintenanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isMaintenanceEnabled()) {
    next();
    return;
  }
  if (isAllowed(req.path)) {
    next();
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Retry-After', '600');
  if (req.path.startsWith('/api/')) {
    res.status(503).json({ error: 'Service en maintenance' });
    return;
  }
  res.status(503).type('html').send(MAINTENANCE_HTML);
}
