# 轨迹 · 黑客松扫码 Demo

这是一个手机端优先的单页 MVP：用户输入一个小问题，选择“只听我说 / 帮我拆一步 / 帮我回看过去”，获得 3–5 轮体验中的一轮 AI 回应，并可把回声留在本机时间线。

## 本地运行

```bash
cd outputs/trajectory-demo
python3 -m http.server 8080
```

直接静态服务器只能体验本地兜底回复；要启用 AI，请用 Vercel 部署（`api/chat.js` 是 Vercel Function）。

## 部署（推荐 Vercel）

1. 将此目录上传到 GitHub，或在 Vercel 导入项目。
2. 在 Vercel Project Settings → Environment Variables 添加 `AI_API_KEY`。如果你的服务商是 OpenRouter，也可使用 `OPENROUTER_API_KEY`。
3. 默认使用 OpenRouter：`AI_BASE_URL=https://openrouter.ai/api/v1`、`AI_MODEL=openai/gpt-oss-20b:free`。如果你的个人 Key 来自其他“OpenAI 兼容”服务，填写对应的 `AI_BASE_URL` 和 `AI_MODEL` 即可。
4. 部署完成后得到 `https://xxx.vercel.app`。把这个 HTTPS 地址粘贴到页面右下角“现场扫码入口”，点击“生成二维码”，即可截图或打印。

二维码必须指向公网 HTTPS 地址；`localhost` 或局域网地址观众无法访问。

## 现场兜底

即使 API 超时、额度用尽或网络不稳定，页面会自动使用本地回应逻辑，不阻断“输入 → 回应 → 留存”闭环。API Key 只放在 Vercel 环境变量中，不写入前端。
