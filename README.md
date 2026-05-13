# url:
https://api.bilibili.com/x/web-interface/wbi/search/type?category_id=&search_type=video&ad_resource=5654&__refresh__=true&_extra=&context=&page=1&page_size=42&pubtime_begin_s=0&pubtime_end_s=0&from_source=&from_spmid=333.337&platform=pc&highlight=1&single_column=0&keyword=%E4%BA%A4%E6%98%93&qv_id=MdaysMlSPYPFDw0ZEcGQjkIVB8HdNDVN&source_tag=3&gaia_vtoken=&dynamic_offset=0&web_roll_page=1&web_location=1430654&w_rid=e8c303f398f87ec9ce47ab435d348ac9&wts=1778655865


# params:
./searchParams.json

# response:
./response.json



# 功能需求

## 一、数据采集
  □ 单关键词采集（当前页 / 指定页数范围 / 所有页 / 随机采样）
  □ 多关键词交叉采集（待定）
  □ 渐进式采集 + 实时进度展示。采集调接口，间隔2秒。
  □ 数据缓存（按关键词，10 分钟，IndexedDB 持久化）

## 二、数据分析面板
  □ 概览统计卡片
  □ 时长分布图
  □ 发布时间趋势图
  □ UP主排行分析
  □ 互动率散点图（爆款识别）
  □ 标签词云

## 三、导出
  □ CSV 导出
  □ Markdown 摘要复制（待定）

## 四、AI 语义化（后期）
  □ AI API 配置（Key / 端点 / 模型）
  □ 内容分类标签提取
  □ 智能洞察引擎
  □ 标题吸引力分析
  □ 内容缺口发现

## 五、打分模型（后期）
  □ 待定
