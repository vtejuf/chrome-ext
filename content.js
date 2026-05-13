(function() {
  'use strict';

  const PANEL_ID = 'bili-analyzer-panel';
  const TOGGLE_BTN_ID = 'bili-analyzer-toggle';

  let isPanelVisible = false;

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
      <div style="padding: 16px; background: linear-gradient(135deg, #00a1d6, #00b5e2); color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 16px;">📊 B站话题分析器</h3>
          <button id="bili-analyzer-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
        </div>
        <p id="bili-keyword-display" style="margin: 8px 0 0; font-size: 13px; opacity: 0.9;">当前关键词：-</p>
      </div>
      
      <div style="padding: 16px;">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; color: #666;">采集范围</label>
          <select id="bili-fetch-range" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
            <option value="single">当前页（第1页）</option>
            <option value="range">指定页数范围</option>
            <option value="all">所有页</option>
            <option value="sample">随机采样（5页）</option>
          </select>
        </div>
        
        <div id="bili-page-range-input" style="margin-bottom: 16px; display: none;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="number" id="bili-start-page" value="1" min="1" style="width: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
            <span>至</span>
            <input type="number" id="bili-end-page" value="5" min="1" style="width: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
            <span>页</span>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <button id="bili-start-fetch" style="width: 100%; padding: 12px; background: #00a1d6; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; transition: background 0.2s;">
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
        
        <div id="bili-result-summary" style="display: none; padding: 12px; background: #f8f9fa; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 13px; color: #666;">采集结果</span>
            <span id="bili-cache-status" style="font-size: 12px; color: #999;"></span>
          </div>
          <div id="bili-stats" style="font-size: 14px; color: #333;"></div>
        </div>
        
        <div id="bili-actions" style="display: none; margin-top: 12px;">
          <button id="bili-export-csv" style="width: 100%; padding: 10px; background: #f8f9fa; color: #333; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; cursor: pointer;">
            📥 导出 CSV
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    bindPanelEvents();
  }

  function bindPanelEvents() {
    const closeBtn = document.getElementById('bili-analyzer-close');
    const fetchRange = document.getElementById('bili-fetch-range');
    const pageRangeInput = document.getElementById('bili-page-range-input');
    const startBtn = document.getElementById('bili-start-fetch');
    const exportBtn = document.getElementById('bili-export-csv');

    closeBtn.addEventListener('click', () => {
      hidePanel();
    });

    fetchRange.addEventListener('change', () => {
      pageRangeInput.style.display = fetchRange.value === 'range' ? 'block' : 'none';
    });

    startBtn.addEventListener('click', startFetch);
    exportBtn.addEventListener('click', exportCSV);
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
    const progressContainer = document.getElementById('bili-progress-container');

    progressContainer.style.display = 'none';
    resultSummary.style.display = 'block';
    actions.style.display = 'block';

    const videos = response.videos || [];
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
