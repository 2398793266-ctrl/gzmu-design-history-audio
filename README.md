# 贵州民族大学设计考研 · 世界现代设计史

Cloudflare Workers + D1 的登录保护版本。网页、PDF、150 条晓伊音频均先由 Worker 检查登录状态，不能只把 根目录单独发布到静态站点。

- `index.html`：原文学习页，带睡眠定时（15/30/45/60/90 分钟、自定义 1–480 分钟）、退出登录和播放位置保存。
- `worker.mjs`：账号密码校验、一次性首次设置、7 天登录状态、退出撤销、登录尝试限制。
- `schema.sql`：账号、会话、登录尝试数据库表。
- `wrangler.jsonc`：必须保持 `assets.run_worker_first: true`，并绑定 D1 为 `DB`。

安装依赖后，使用 Cloudflare 官方 Wrangler 登录、执行数据库结构，再部署；首次设置密钥 `SETUP_KEY` 必须使用 Wrangler secret 配置，不写入仓库、HTML 或普通变量。通过 `/setup#密钥` 由所有者本人设置学习账号和至少 12 位密码。设置完成后该入口失效。访客从 `/login` 登录。

账号为此站点共用学习账号。学习标记和播放记录保存在当前浏览器；共享账号不会同步各访客的学习记录。已登录用户仍能保存其可访问的内容，本系统控制访问资格，不提供防复制能力。

定时以现实时间计算，暂停时继续计时；刷新页面保留截止时间。到点暂停、关闭连播和单条循环。设备彻底休眠或浏览器冻结时，页面不能执行 JavaScript；恢复执行后会立即检查并停止。

更新部署后，先验证登录保护和播放功能，再关闭旧 GitHub Pages 并将旧资料仓库设为私有，避免公开地址绕过新站登录。

当前线上地址：https://gzmu-design-history.private-design-history.workers.dev/

GitHub Pages 已关闭。此仓库仅用于私有源码与资料备份，实际网站由 Cloudflare Workers 运行。
