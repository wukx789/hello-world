# 句窝 Mini Program

微信小程序客户端（瘦客户端）。内容与积分权威在 `../server`。

## 本地预览

1. 启动后端：`cd ../server && npm start`（默认 `http://127.0.0.1:8787`）
2. 用**微信开发者工具**打开本目录 `miniprogram/`
3. AppID 可用测试号 / `touristappid`；`project.config.json` 已关 `urlCheck` 以便本地 HTTP
4. 真机调试时把 `app.js` 里 `apiBase` 改成电脑局域网 IP

云端 VM **无法**替代微信开发者工具预览（见根目录 `PLAN.md`）。可用 `http://127.0.0.1:8787/dev` 做 API 竖切验证。
