// Vercel serverless function: 把互动课件截图保存为仓库文件（GitHub Contents API）
// Path: /api/upload-img
// POST JSON body: { filename: 'cw3171_probimg', content: '<base64 无 data: 前缀>', ext: 'png' }
// Returns: { ok: true, url: 'https://mcjc4.github.io/trae-memory-card/homework_crops_cw/<filename>.png' }
// 需要 Vercel 环境变量 GITHUB_TOKEN（GitHub PAT，repo/contents 写权限）。
// 可选 UPLOAD_KEY：设置后前端需带 X-Upload-Key 请求头，防止公共端点被滥用。

const OWNER = 'mcjc4';
const REPO = 'trae-memory-card';
const BRANCH = 'main';
const DIR = 'homework_crops_cw';
const GH = 'https://api.github.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Upload-Key');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN 未配置' });

  const key = process.env.UPLOAD_KEY;
  if (key && req.headers['x-upload-key'] !== key) return res.status(403).json({ error: '密钥错误' });

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : (req.body ? JSON.parse(req.body) : {});
    let filename = String(body.filename || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    const content = String(body.content || '');
    if (!filename) return res.status(400).json({ error: '缺少 filename' });
    if (!content) return res.status(400).json({ error: '缺少 content' });
    const ext = (String(body.ext || 'png')).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
    const base64 = content.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '');
    const path = `${DIR}/${filename}.${ext}`;
    const encoded = path.split('/').map(encodeURIComponent).join('/');

    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'trae-memory-card' };

    // 若同名文件已存在，取 sha 以便覆盖更新，避免仓库里堆积重复文件
    let sha = null;
    try {
      const g = await fetch(`${GH}/repos/${OWNER}/${REPO}/contents/${encoded}?ref=${BRANCH}`, { headers });
      if (g.ok) { const j = await g.json(); sha = j.sha; }
    } catch (_) { /* 首次上传时文件不存在属正常 */ }

    const putBody = { message: `[cw] update ${filename}.${ext}`, content: base64, branch: BRANCH };
    if (sha) putBody.sha = sha;

    const resp = await fetch(`${GH}/repos/${OWNER}/${REPO}/contents/${encoded}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: 'GitHub 写入失败: ' + (data.message || resp.statusText) });

    return res.status(200).json({ ok: true, url: `https://${OWNER}.github.io/${REPO}/${DIR}/${filename}.${ext}` });
  } catch (e) {
    return res.status(500).json({ error: '上传失败: ' + e.message });
  }
}