// Vercel serverless function: 统一推送代理（钉钉 + 微信 PushPlus）
// Path: /api/push
// Usage: POST /api/push?type=dingtalk&access_token=xxx
//        POST /api/push?type=pushplus

const DINGTALK_BASE = 'https://oapi.dingtalk.com/robot/send';
const PUSHPLUS_BASE = 'https://www.pushplus.plus/send';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const type = req.query.type || 'dingtalk';

    if (type === 'pushplus') {
      // PushPlus (微信)
      const body = req.body && typeof req.body === 'object' ? req.body : (req.body ? JSON.parse(req.body) : {});
      const targetUrl = PUSHPLUS_BASE;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.status(200).json(data);
    } else {
      // DingTalk (default)
      const token = req.query.access_token || '';
      if (!token) {
        return res.status(400).json({ errcode: -1, errmsg: '缺少 access_token' });
      }
      const targetUrl = `${DINGTALK_BASE}?access_token=${encodeURIComponent(token)}`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: req.body ? JSON.stringify(req.body) : '{}',
      });
      const data = await response.json();
      return res.status(200).json(data);
    }
  } catch (e) {
    return res.status(500).json({ errcode: -1, errmsg: '代理请求失败: ' + e.message });
  }
}
