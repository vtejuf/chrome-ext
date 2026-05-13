# B站话题分析器 - Chrome 扩展

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

### 核心设计思路

**不依赖 API Key，零门槛使用。**

用户采集完数据后，插件生成一份"分析指令"，包含分析模板 + 用户的分析要求 + 全部原始数据。用户一键复制，粘贴到任意网页 AI 使用（豆包 / DeepSeek / ChatGPT / Claude / 通义千问等），再把 AI 的回复粘贴回来，插件展示分析结果。

```
采集数据 → 写分析要求 → 复制分析指令
                           ↓
                    粘贴到网页 AI（豆包/DeepSeek/...）
                           ↓
                    AI 回复 JSON 结果
                           ↓
                    粘贴回插件 → 展示分析结果
```

### 用户操作流程

1. 在 B 站搜索关键词
2. 点击 📊 按钮，选择采集范围，开始采集
3. 在「AI 分析」区域的文本框里写自己的分析要求
   - 示例：*"帮我挑出真正教交易技术的视频，按干货程度排名，别推讲心态鸡汤的"*
   - 示例：*"找适合初学者的量化教程，教学结构清晰、有代码实操的优先"*
4. 点击「复制分析指令」
5. 打开豆包 / DeepSeek 等网页 AI，粘贴发送
6. AI 回复 JSON 结果，复制
7. 回到插件粘贴，点击「导入 AI 回复」
8. 查看分析结果

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

```json
{
  "summary": "整体分析摘要",
  "totalVideos": 42,
  "filteredVideos": 10,
  "rankings": [
    {
      "rank": 1,
      "bvid": "BVxxx",
      "title": "视频标题",
      "author": "UP主",
      "score": 95,
      "strengths": ["优势1"],
      "weaknesses": ["不足1"],
      "comment": "犀利评语",
      "upLevel": "夯"
    }
  ],
  "topicInsights": "内容方向洞察",
  "upLevelSummary": {
    "夯": "该级别UP主特征",
    "顶级": "该级别UP主特征",
    "人上人": "该级别UP主特征",
    "NPC": "该级别UP主特征",
    "拉完了": "该级别UP主特征"
  }
}
```

### 后期规划

- AI API 直连模式（配置 Key / 端点 / 模型，省去手动复制步骤）
- AI 结果可视化展示（排名列表、评级标签）
- Markdown 摘要复制

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
