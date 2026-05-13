(function () {
  'use strict';

  const PANEL_ID = 'bili-analyzer-panel';
  const TOGGLE_BTN_ID = 'bili-analyzer-toggle';

  let isPanelVisible = false;
  let collectedVideos = [];

  function createToggleButton() {
    if (document.getElementById(TOGGLE_BTN_ID)) return;

    const btn = document.createElement('div');
    btn.id = TOGGLE_BTN_ID;
    btn.innerHTML = '📊';
    btn.title = 'B站话题分析器';
    btn.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 80px;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #00a1d6, #00b5e2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 161, 214, 0.4);
      z-index: 9999;
      transition: transform 0.2s, box-shadow 0.2s;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.boxShadow = '0 6px 16px rgba(0, 161, 214, 0.5)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 12px rgba(0, 161, 214, 0.4)';
    });

    btn.addEventListener('click', togglePanel);

    document.body.appendChild(btn);
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 140px;
      width: 360px;
      max-height: 500px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 9998;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    panel.innerHTML = `
      <div style="display: flex; flex-direction: column; max-height: 520px;">
        <div style="padding: 16px; background: linear-gradient(135deg, #00a1d6, #00b5e2); color: white; flex-shrink: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 16px;">📊 B站话题分析器</h3>
            <button id="bili-analyzer-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
          </div>
          <p id="bili-keyword-display" style="margin: 8px 0 0; font-size: 13px; opacity: 0.9;">当前关键词：-</p>
        </div>
        
        <div style="padding: 16px; overflow-y: auto; flex: 1;">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-size: 13px; color: #666;">采集范围</label>
            <select id="bili-fetch-range" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
              <option value="single">当前页（第1页）</option>
              <option value="range">指定页数范围</option>
              <option value="all">所有页</option>
              <option value="sample">随机采样（5页）</option>
            </select>
          </div>
          
          <div id="bili-page-range-input" style="margin-bottom: 16px; display: none;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="bili-start-page" value="1" min="1" style="width: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
              <span>至</span>
              <input type="number" id="bili-end-page" value="5" min="1" style="width: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
              <span>页</span>
            </div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <button id="bili-start-fetch" style="width: 100%; padding: 12px; background: #00a1d6; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
              开始采集
            </button>
          </div>
          
          <div id="bili-progress-container" style="display: none; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span id="bili-progress-text" style="font-size: 13px; color: #666;">准备中...</span>
              <span id="bili-progress-count" style="font-size: 13px; color: #00a1d6;">0/0</span>
            </div>
            <div style="height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
              <div id="bili-progress-bar" style="height: 100%; background: linear-gradient(90deg, #00a1d6, #00b5e2); width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
          
          <div id="bili-result-summary" style="display: none; margin-bottom: 16px;">
            <div style="padding: 12px; background: #f8f9fa; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; color: #666;">采集结果</span>
                <span id="bili-cache-status" style="font-size: 12px; color: #999;"></span>
              </div>
              <div id="bili-stats" style="font-size: 14px; color: #333;"></div>
            </div>
          </div>
          
          <div id="bili-actions" style="display: none; margin-bottom: 16px;">
            <button id="bili-export-csv" style="width: 100%; padding: 10px; background: #f8f9fa; color: #333; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; cursor: pointer;">
              📥 导出 CSV
            </button>
          </div>

          <div id="bili-ai-section" style="display: none;">
            <div style="border-top: 1px solid #eee; margin-bottom: 16px;"></div>
            <label style="display: block; margin-bottom: 8px; font-size: 13px; color: #666;">🤖 AI 分析</label>
            <textarea id="bili-ai-requirement" placeholder="输入分析要求，比如：&#10;帮我挑出真正教交易技术的视频，按干货程度排名" rows="2" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; resize: vertical; box-sizing: border-box; font-family: inherit; margin-bottom: 8px;"></textarea>
            
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button id="bili-ai-analyze" style="flex: 1; padding: 10px; background: #00a1d6; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">
                🚀 开始分析
              </button>
              <button id="bili-copy-ai-prompt" style="flex: 1; padding: 10px; background: #f8f9fa; color: #333; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; cursor: pointer;">
                📋 复制指令
              </button>
            </div>
            
            <div id="bili-ai-api-status" style="display: none; padding: 8px; background: #fff3cd; border-radius: 6px; font-size: 12px; color: #856404; margin-bottom: 8px;"></div>
            
            <div id="bili-ai-paste-section" style="display: none; margin-bottom: 8px;">
              <textarea id="bili-ai-response" placeholder="粘贴 AI 回复的 JSON" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; resize: vertical; box-sizing: border-box; font-family: monospace;"></textarea>
              <button id="bili-import-ai-result" style="width: 100%; padding: 8px; background: #f8f9fa; color: #333; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; cursor: pointer; margin-top: 6px;">
                📥 导入结果
              </button>
            </div>
            
            <div id="bili-ai-result" style="display: none;"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    bindPanelEvents();
  }

  function bindPanelEvents() {
    document.getElementById('bili-analyzer-close').addEventListener('click', hidePanel);

    document.getElementById('bili-fetch-range').addEventListener('change', (e) => {
      document.getElementById('bili-page-range-input').style.display = e.target.value === 'range' ? 'block' : 'none';
    });

    document.getElementById('bili-start-fetch').addEventListener('click', startFetch);
    document.getElementById('bili-export-csv').addEventListener('click', exportCSV);
    document.getElementById('bili-ai-analyze').addEventListener('click', startAiAnalyze);
    document.getElementById('bili-copy-ai-prompt').addEventListener('click', copyAiPrompt);
    document.getElementById('bili-import-ai-result').addEventListener('click', importAiResult);
  }

  function togglePanel() {
    if (isPanelVisible) {
      hidePanel();
    } else {
      showPanel();
    }
  }

  function showPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.style.display = 'flex';
      isPanelVisible = true;
      updateKeywordDisplay();
    }
  }

  function hidePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.style.display = 'none';
      isPanelVisible = false;
    }
  }

  function getKeyword() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('keyword') || '';
  }

  function updateKeywordDisplay() {
    const keyword = getKeyword();
    const display = document.getElementById('bili-keyword-display');
    if (display) {
      display.textContent = `当前关键词：${keyword || '未检测到'}`;
    }
  }

  async function startFetch() {
    const keyword = getKeyword();
    if (!keyword) {
      alert('未检测到搜索关键词，请确保在B站搜索页面');
      return;
    }

    const fetchRange = document.getElementById('bili-fetch-range').value;
    const progressContainer = document.getElementById('bili-progress-container');
    const progressText = document.getElementById('bili-progress-text');
    const progressCount = document.getElementById('bili-progress-count');
    const progressBar = document.getElementById('bili-progress-bar');
    const startBtn = document.getElementById('bili-start-fetch');

    progressContainer.style.display = 'block';
    startBtn.disabled = true;
    startBtn.textContent = '采集中...';

    let response;

    try {
      if (fetchRange === 'single') {
        progressText.textContent = '正在采集第1页...';
        response = await chrome.runtime.sendMessage({
          action: 'fetchSinglePage',
          keyword,
          page: 1
        });
      } else if (fetchRange === 'range') {
        const startPage = parseInt(document.getElementById('bili-start-page').value) || 1;
        const endPage = parseInt(document.getElementById('bili-end-page').value) || 5;
        response = await chrome.runtime.sendMessage({
          action: 'fetchMultiplePages',
          keyword,
          startPage,
          endPage
        });
      } else if (fetchRange === 'all') {
        response = await chrome.runtime.sendMessage({
          action: 'fetchMultiplePages',
          keyword
        });
      } else if (fetchRange === 'sample') {
        response = await chrome.runtime.sendMessage({
          action: 'fetchRandomSample',
          keyword,
          samplePages: 5
        });
      }

      if (response.success) {
        showResult(response);
      } else {
        alert('采集失败：' + response.error);
      }
    } catch (error) {
      alert('采集出错：' + error.message);
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = '开始采集';
    }
  }

  function showResult(response) {
    const resultSummary = document.getElementById('bili-result-summary');
    const stats = document.getElementById('bili-stats');
    const cacheStatus = document.getElementById('bili-cache-status');
    const actions = document.getElementById('bili-actions');
    const aiSection = document.getElementById('bili-ai-section');
    const progressContainer = document.getElementById('bili-progress-container');

    progressContainer.style.display = 'none';
    resultSummary.style.display = 'block';
    actions.style.display = 'block';
    aiSection.style.display = 'block';

    const videos = response.videos || [];
    collectedVideos = videos;
    cacheStatus.textContent = response.fromCache ? '（来自缓存）' : '（新采集）';

    if (videos.length > 0) {
      const totalPlay = videos.reduce((sum, v) => sum + (v.play || 0), 0);
      const avgPlay = Math.round(totalPlay / videos.length);
      const uniqueAuthors = new Set(videos.map(v => v.author)).size;

      stats.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>📹 视频数：<strong>${videos.length}</strong></div>
          <div>👤 UP主数：<strong>${uniqueAuthors}</strong></div>
          <div>▶️ 总播放：<strong>${formatNumber(totalPlay)}</strong></div>
          <div>📊 平均播放：<strong>${formatNumber(avgPlay)}</strong></div>
        </div>
      `;
    } else {
      stats.textContent = '未采集到数据';
    }
  }

  function formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  }

  async function exportCSV() {
    const keyword = getKeyword();
    if (!keyword) return;

    const response = await chrome.runtime.sendMessage({
      action: 'exportCSV',
      keyword
    });

    if (response.success) {
      const blob = new Blob([response.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('导出失败：' + response.error);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchProgress') {
      updateProgress(message.progress);
    }
    return true;
  });

  function updateProgress(progress) {
    const progressText = document.getElementById('bili-progress-text');
    const progressCount = document.getElementById('bili-progress-count');
    const progressBar = document.getElementById('bili-progress-bar');

    if (progressText) {
      progressText.textContent = `正在采集第 ${progress.currentPage} 页...`;
    }
    if (progressCount) {
      progressCount.textContent = `${progress.videosCount} 条`;
    }
    if (progressBar && progress.totalPages > 0) {
      const percent = (progress.currentPage / progress.totalPages) * 100;
      progressBar.style.width = `${percent}%`;
    }
  }

  function buildAiPrompt() {
    const keyword = getKeyword();
    const requirement = document.getElementById('bili-ai-requirement').value.trim();
    if (!requirement) {
      alert('请先输入分析要求');
      return null;
    }
    if (collectedVideos.length === 0) {
      alert('请先采集数据');
      return null;
    }

    const videosData = collectedVideos.map(v => ({
      title: v.title,
      description: v.description,
      author: v.author,
      tag: v.tag,
      typename: v.typename,
      play: v.play,
      like: v.like,
      review: v.review,
      danmaku: v.danmaku,
      favorites: v.favorites,
      duration: v.duration,
      pubdate: v.pubdate,
      bvid: v.bvid
    }));

    return `## 用户分析要求
${requirement}

## 搜索关键词
${keyword}

## 原始数据（共 ${videosData.length} 条）
${JSON.stringify(videosData, null, 2)}`;
  }

  function copyAiPrompt() {
    const prompt = buildAiPrompt();
    if (!prompt) return;

    navigator.clipboard.writeText(prompt).then(() => {
      const btn = document.getElementById('bili-copy-ai-prompt');
      btn.textContent = '✅ 已复制';
      setTimeout(() => { btn.textContent = '📋 复制指令'; }, 2000);
    }).catch(() => {
      alert('复制失败');
    });
  }

  async function startAiAnalyze() {
    const prompt = buildAiPrompt();
    if (!prompt) return;

    const config = await chrome.runtime.sendMessage({ action: 'getAiConfig' });

    if (!config || !config.apiKey) {
      document.getElementById('bili-ai-paste-section').style.display = 'block';
      document.getElementById('bili-ai-api-status').style.display = 'block';
      document.getElementById('bili-ai-api-status').textContent = '⚠️ 未配置 API，请使用「复制指令」粘贴到网页 AI，或前往扩展设置配置 API';
      return;
    }

    const btn = document.getElementById('bili-ai-analyze');
    btn.disabled = true;
    btn.textContent = '分析中...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'callAiApi',
        prompt
      });

      if (response.success) {
        renderAiResult(response.data);
      } else {
        alert('AI 分析失败：' + response.error);
      }
    } catch (error) {
      alert('调用失败：' + error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🚀 开始分析';
    }
  }

  function importAiResult() {
    const textarea = document.getElementById('bili-ai-response');
    let data;
    try {
      data = JSON.parse(textarea.value.trim());
    } catch {
      alert('JSON 格式错误');
      return;
    }
    if (!data.rankings || !data.summary) {
      alert('JSON 缺少必要字段');
      return;
    }
    renderAiResult(data);
  }

  function renderAiResult(data) {
    const resultDiv = document.getElementById('bili-ai-result');
    resultDiv.style.display = 'block';

    const levelColors = {
      '夯': '#ff4757',
      '顶级': '#ff6b81',
      '人上人': '#ffa502',
      'NPC': '#747d8c',
      '拉完了': '#2f3542'
    };

    const rankingsHtml = (data.rankings || []).slice(0, 10).map(item => {
      const color = levelColors[item.upLevel] || '#747d8c';
      return `
        <div style="padding: 10px; margin-bottom: 8px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid ${color};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: bold; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">#${item.rank} ${item.title}</span>
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${color}; color: white; flex-shrink: 0; margin-left: 8px;">${item.upLevel}</span>
          </div>
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${item.author} · 评分 ${item.score}</div>
          <div style="font-size: 12px; color: #555;">${item.comment}</div>
        </div>
      `;
    }).join('');

    const levelBadges = Object.entries(data.upLevelSummary || {}).map(([level, desc]) => {
      const color = levelColors[level] || '#747d8c';
      return `<span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${color}; color: white; cursor: help;" title="${desc}">${level}</span>`;
    }).join(' ');

    resultDiv.innerHTML = `
      <div style="padding: 10px; background: #fff3cd; border-radius: 6px; font-size: 12px; color: #856404; margin-bottom: 10px;">
        ${data.summary}
      </div>
      ${data.topicInsights ? `
      <div style="padding: 10px; background: #d4edda; border-radius: 6px; font-size: 12px; color: #155724; margin-bottom: 10px;">
        💡 ${data.topicInsights}
      </div>
      ` : ''}
      <div style="margin-bottom: 8px; font-size: 12px; color: #666;">UP主评级：${levelBadges}</div>
      <div style="font-size: 12px; font-weight: bold; color: #666; margin-bottom: 8px;">Top 10</div>
      ${rankingsHtml}
    `;
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createToggleButton();
        createPanel();
      });
    } else {
      createToggleButton();
      createPanel();
    }
  }

  init();
})();
