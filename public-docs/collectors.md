# 采集器贡献说明

PriceAI 的采集目标是从公开或已授权来源读取商品标题、价格、库存状态和购买链接，并写入统一数据结构，再由系统进行标准商品归类和前台展示。

## 采集方式

| 方式 | 适用场景 |
| --- | --- |
| 公开结构化数据 | 用户自有或已获授权的公开 JSON |
| 原站接口 | Shop API、独角数卡类接口、可公开读取的商品接口 |
| HTML 解析 | 商品列表直接渲染在页面中的卡网站点 |
| 本机浏览器采集 | 动态页面、分类切换、需要人工通过轻量验证的页面 |
| 采集器待办 | 真实渠道但当前解析器不支持，需要后续新增适配 |

## 常用命令

查看可识别渠道：

```bash
npm run collect:prices -- --list
```

采集全部支持渠道并写入：

```bash
npm run collect:prices -- --all --post
```

采集单个来源并写入：

```bash
npm run collect:prices -- --source source-id --post
```

浏览器兜底采集：

```bash
npm run collect:browser -- --url https://example.com/ --password your-admin-password --post
```

## 输出要求

新增或修复采集器时，至少应输出：

- `sourceTitle`：原始商品标题。
- `price`：用户实际看到的价格，能合并手续费时应合并。
- `status`：库存状态，只用于明确的有货或缺货判断。
- `url`：原站购买或详情链接。
- 可选 `stockCount`、`listedPrice`、`feeAmount`、`priceBasis`，用于后台追踪。

## 安全边界

- 不绕过验证码、登录墙、WAF 或平台风控。
- 不采集需要未授权访问的数据。
- 不把销量、库存、规格编号、套餐倍数误判为价格。
- 采集失败不等于缺货，不能因为一次失败批量下架旧报价。
- 修改采集器时，请在 PR 中说明测试过的来源 URL、命令和输出摘要。
