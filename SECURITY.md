# 安全策略

## 支持范围

当前主要维护 `main` 分支。项目仍处于早期阶段，安全策略会随着公开发布和部署方式继续完善。

## 报告安全问题

如果你发现安全问题，请不要在公开 Issue 中贴出敏感细节、密钥、后台地址、可利用步骤或用户数据。

推荐方式：

1. 使用 GitHub Security Advisories 或私有漏洞报告功能。
2. 如果该功能暂不可用，可以创建一个不包含敏感细节的 Issue，说明“存在安全问题需要私下沟通”。

## 敏感信息

请不要提交或公开：

- `.env.local`
- Supabase service role key
- `ADMIN_PASSWORD`
- `CRON_SECRET`
- Vercel token
- Google Analytics 或 Google Cloud 凭据
- 任何真实用户隐私数据

## 采集边界

PriceAI 不绕过验证码、登录墙、WAF 或平台风控。不接受以绕过访问限制为目的的采集实现。
