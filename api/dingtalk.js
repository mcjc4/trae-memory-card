// Vercel serverless function: proxy DingTalk webhook with CORS headers
// Path: /api/dingtalk
// Usage: POST /api/dingtalk?access_token=xxx&msgtype=text&content=xxx

const DINGTALK_BASE = 'https://oapi.dingtalk.com/robot/send';

export default async function handler(req, res) {
  // Set CORS headers
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
    const token = req.query.access_token || '';
    if (!token) {
      return res.status(400).json({ errcode: -1, errmsg: '缺少 access_token' });
    }

    const targetUrl = `${DINGTALK_BASE}?access_token=${encodeURIComponent(token)}`;

    // Forward to DingTalk
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: req.body ? JSON.stringify(req.body) : '{}',
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ errcode: -1, errmsg: '代理请求失败: ' + e.message });
  }
}
