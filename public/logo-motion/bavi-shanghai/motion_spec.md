# MagicJ × 巴威：Motion Spec

## Brief

- Personality: 冷静、精准、警觉。
- Context: 8 秒信息型 Logo sting；无旁白，最终回到静态品牌标识。
- Source: `source-logo.png`，由网站实际使用的 `public/favicon.svg` 以 512×512 渲染。
- Data timestamp: 中央气象台 2026-07-11 01:00 快讯；动画是信息快照，不是实时路径服务。

## Geometry

- Complexity: primitives + few-curve analytic paths；保留圆角矩形、J 字轮廓、两颗圆点和连接线。
- Actors: `#container`, `#shine`, `#letter-j`, `#accent`, `#storm-path`, `#storm-core`, `#shanghai-pulse`。
- Smoothness: 所有曲线为圆角矩形、圆、直线或少量贝塞尔段；拒绝像素轮廓追踪。

## Timeline

| Beat | Time | Action | Principles |
|---|---:|---|---|
| Anticipation | 0–1.6s | 空场、风场与标识轻微收缩聚合 | Anticipation, Staging |
| Action | 1.6–5.6s | J 标识组装；台风核沿金色路径向浙闽推进 | Timing, Arcs, Slow In/Out |
| Follow-through | 5.6–8.0s | 上海外围风雨脉冲；天气层退场，Logo 精确落定 | Follow Through, Appeal |

## Easing and QA

- Enter: `cubic-bezier(0.16, 1, 0.3, 1)`；narrative path: `cubic-bezier(0.34, 0, 0.14, 1)`。
- Keyframes use literal cubic-bezier values to avoid Chromium silently falling back to linear.
- Final Frame Contract: `?static=1` and `?t=8000` must be pixel-identical in the same browser pipeline.
- Atomic studies: wind hover, alert pulse, path orbit.

## Source facts shown

- 巴威（2609）在 2026-07-11 01:00 为强台风级，14 级、42 m/s，位于 23.5°N / 125.5°E，以 15–20 km/h 向西北移动。
- 上海主要受外围环流影响；当前主要情景为阵雨、东南大风、阵风约 8–9 级，局部大雨到暴雨。路径北调时风险更高。
