# B站金铲子 - Chrome 扩展

## API 参考

```
url:
https://api.bilibili.com/x/web-interface/wbi/search/type?category_id=&search_type=video&ad_resource=5654&__refresh__=true&_extra=&context=&page=1&page_size=42&pubtime_begin_s=0&pubtime_end_s=0&from_source=&from_spmid=333.337&platform=pc&highlight=1&single_column=0&keyword=%E4%BA%A4%E6%98%93&qv_id=MdaysMlSPYPFDw0ZEcGQjkIVB8HdNDVN&source_tag=3&gaia_vtoken=&dynamic_offset=0&web_roll_page=1&web_location=1430654&w_rid=e8c303f398f87ec9ce47ab435d348ac9&wts=1778655865

params:  ./searchParams.json
response: ./response.json
```

---

## 已完成功能

### 一、数据采集 ✅

- 单关键词采集（当前页 / 指定页数范围 / 所有页 / 随机采样）
- 多关键词交叉采集（待定）
- 渐进式采集 + 实时进度展示，接口间隔 2 秒
- 数据缓存（按关键词，10 分钟，IndexedDB 持久化）
- 广告过滤（`biz_data` 有内容视为广告，不参与统计）
- CSV 导出

---

## 二、AI 语义分析（进行中）

### 双模式设计

提供两种 AI 分析方式，用户可自由选择：

| 模式 | 适用场景 | 优势 |
|------|----------|------|
| **API 直连** | 有 AI API 的用户 | 一键分析，全自动 |
| **复制粘贴** | 用网页 AI（豆包/DeepSeek等） | 零配置，灵活自由 |

---

### 模式一：API 直连

用户配置 API Key + 端点 + 模型后，点击「开始分析」直接调用 AI，结果自动展示。

**配置项**：
- API Key
- API 端点（支持 OpenAI 兼容格式）
- 模型名称

**流程**：
```
采集数据 → 写分析要求 → 点击「开始分析」→ 自动调用 API → 展示结果
```

---

### 模式二：复制粘贴

无需配置，适合使用网页 AI 的用户。

**流程**：
```
采集数据 → 写分析要求 → 复制分析指令
                           ↓
                    粘贴到网页 AI（豆包/DeepSeek/...）
                           ↓
                    AI 回复 JSON 结果
                           ↓
                    粘贴回插件 → 展示分析结果
```

---

### AI System Prompt 模板

详见 [lib/ai-template.js](file:///c:/Projects/Trae/bili-golden-shovel/lib/ai-template.js)

核心要点：

- 定义 AI 为"B站内容分析专家"
- 说明数据字段含义（title / description / play / like / review / danmaku / favorites 等）
- 分析规则：忽略无关数据、综合文本+量化数据、互动率优先
- 输出格式：严格 JSON，含 `summary` / `rankings` / `topicInsights` / `upLevelSummary`
- rankings 按 score 降序，只输出 Top 20
- 评语风格：犀利有趣，带B站风格

### UP主五级评价体系

用户要求在分析结果中，对 UP 主按以下五级评价：

| 评级 | 含义 | 特征 |
|------|------|------|
| **夯** | 天花板级别 | 内容质量极高，数据表现优异，持续输出，值得关注 |
| **顶级** | 优秀 | 内容质量好，数据表现良好，有专业深度 |
| **人上人** | 还行 | 内容尚可，有一定数据，但缺乏亮点 |
| **NPC** | 路人 | 内容普通，数据一般，没有特别之处 |
| **拉完了** | 不行 | 内容质量差，数据惨淡，或明显标题党/蹭热点 |

### AI 分析输出结构

Markdown 格式，总分总结构：

```markdown
---

## 📊 整体分析

[整体情况概括，有效视频数、被过滤数、核心特征]

---

## 🔥 主题汇总

[重复出现的主题、关键词、技术点归纳总结]

---

## 🏆 排行榜

### Top 3 必看

| 排名 | 标题 | UP主 | 评分 | 评级 | 一句话评语 |
|------|------|------|------|------|------------|

### 完整排名（Top 10）

1. **[标题]** - [UP主] | 评分:[分数] | 评级:[评级]
   - ✅ 优势：...
   - ⚠️ 不足：...
   - 💬 评语：...

---

## 💡 内容洞察

[内容方向洞察、给观众的建议]

---

## 📋 UP主评级说明

| 评级 | 特征 |
|------|------|
| 🔴 夯 | ... |
| 🟠 顶级 | ... |
| 🟡 人上人 | ... |
| ⚪ NPC | ... |
| ⚫ 拉完了 | ... |
```

---

## 三、数据分析面板（规划中）

- 概览统计卡片
- 时长分布图
- 发布时间趋势图
- UP主排行分析
- 互动率散点图（爆款识别）
- 标签词云

---

## 四、打分模型（规划中）

传统公式打分作为兜底方案，与 AI 语义分析并存：

| 维度 | 权重 |
|------|------|
| 互动转化率 (like+review+danmaku)/play | 35% |
| 收藏价值率 favorites/play | 30% |
| 内容热度 log(play) | 20% |
| 讨论活跃度 (review+danmaku)/play | 15% |

加分项：优质时长（5-30min）+5、新内容（7天内）+3、高收藏点赞比 +5。
