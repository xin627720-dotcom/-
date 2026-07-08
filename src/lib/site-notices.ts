export type SiteNoticeSurface = "modal";

export type SiteNoticeRouteRule = {
  include?: string[];
  exclude?: string[];
};

export type SiteNoticeConfig = {
  id: string;
  surface: SiteNoticeSurface;
  startsAt: string;
  endsAt: string;
  delayMs?: number;
  routeRule?: SiteNoticeRouteRule;
  eyebrow?: string;
  title: string;
  body: string;
  highlights?: {
    label: string;
    text: string;
  }[];
  note?: string;
  footnote?: string;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryActionLabel: string;
};

export const siteNotices: SiteNoticeConfig[] = [
  {
    id: "api-transit-survey-202606",
    surface: "modal",
    startsAt: "2026-06-12T00:00:00+08:00",
    endsAt: "2026-06-15T00:00:00+08:00",
    delayMs: 0,
    routeRule: {
      exclude: ["/admin"],
    },
    eyebrow: "API 中转站调研",
    title: "帮 PriceAI 判断要不要做 API 中转站评选",
    body: "我们正在评估是否增加 API 中转站模块：把价格倍率、可用性、延迟、检测结果、供货渠道和入驻规则尽量摆到台面上。想用一份 2 分钟问卷，先收集普通用户、中转站站长和上游渠道的真实需求。",
    highlights: [
      {
        label: "普通用户",
        text: "你最在意价格倍率、稳定性、真模型、售后，还是二手/三手渠道透明度？",
      },
      {
        label: "商家/站长",
        text: "你愿意公开哪些渠道信息，能接受哪些检测、准入标准和入驻方式？",
      },
      {
        label: "上游渠道",
        text: "你更适合面向中转站批发，还是也希望触达散户 API 用户？",
      },
    ],
    note: "问卷不会要求 API Key、账号密码或任何敏感密钥；结果会用来决定这个模块做不做、先做哪些数据和规则。",
    footnote: "今天只会提示一次，填写后本次调研期内不再自动弹出。",
    primaryAction: {
      label: "填写 2 分钟问卷",
      href: "https://docs.google.com/forms/d/e/1FAIpQLSdkGTBfuK6aJc1KJ0GqD7ZAIdne9gW-YlC64esg25XfJy6dJg/viewform",
    },
    secondaryActionLabel: "今天不再提示",
  },
];
