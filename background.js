import {
  fetchSearchResults,
  fetchMultiplePages,
  fetchRandomSample
} from './lib/api.js';

import {
  initDB,
  saveVideos,
  getVideosByKeyword,
  clearVideosByKeyword,
  saveCache,
  getCache,
  isCacheValid,
  clearAllData
} from './lib/db.js';

import { AI_SYSTEM_PROMPT } from './lib/ai-template.js';

const CACHE_DURATION_MS = 10 * 60 * 1000;

let fetchController = null;
let currentFetchKeyword = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.action) {
      case 'fetchSinglePage':
        await handleFetchSinglePage(message, sendResponse);
        break;
      case 'fetchMultiplePages':
        await handleFetchMultiplePages(message, sendResponse);
        break;
      case 'fetchRandomSample':
        await handleFetchRandomSample(message, sendResponse);
        break;
      case 'stopFetch':
        handleStopFetch(sendResponse);
        break;
      case 'getVideos':
        await handleGetVideos(message, sendResponse);
        break;
      case 'getCache':
        await handleGetCache(message, sendResponse);
        break;
      case 'clearData':
        await handleClearData(message, sendResponse);
        break;
      case 'exportCSV':
        await handleExportCSV(message, sendResponse);
        break;
      case 'getAiConfig':
        await handleGetAiConfig(sendResponse);
        break;
      case 'saveAiConfig':
        await handleSaveAiConfig(message, sendResponse);
        break;
      case 'callAiApi':
        await handleCallAiApi(message, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleFetchSinglePage(message, sendResponse) {
  const { keyword, page = 1 } = message;

  try {
    const cacheValid = await isCacheValid(keyword, CACHE_DURATION_MS);
    if (cacheValid) {
      const cachedVideos = await getVideosByKeyword(keyword);
      if (cachedVideos.length > 0) {
        sendResponse({
          success: true,
          videos: cachedVideos,
          fromCache: true
        });
        return;
      }
    }

    const result = await fetchSearchResults(keyword, page);

    await clearVideosByKeyword(keyword);
    await saveVideos(result.videos, keyword);
    await saveCache(keyword, result.pageInfo.numPages, result.videos.length);

    sendResponse({
      success: true,
      videos: result.videos,
      pageInfo: result.pageInfo,
      fromCache: false
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleFetchMultiplePages(message, sendResponse) {
  const { keyword, startPage = 1, endPage = null } = message;

  fetchController = new AbortController();
  currentFetchKeyword = keyword;

  try {
    const cacheValid = await isCacheValid(keyword, CACHE_DURATION_MS);
    if (cacheValid) {
      const cachedVideos = await getVideosByKeyword(keyword);
      if (cachedVideos.length > 0) {
        sendResponse({
          success: true,
          videos: cachedVideos,
          fromCache: true
        });
        return;
      }
    }

    await clearVideosByKeyword(keyword);

    const result = await fetchMultiplePages(keyword, {
      startPage,
      endPage,
      onProgress: (progress) => {
        chrome.runtime.sendMessage({
          action: 'fetchProgress',
          progress
        });
      },
      signal: fetchController.signal
    });

    await saveVideos(result.videos, keyword);
    await saveCache(keyword, result.pageInfo.totalPages, result.videos.length);

    sendResponse({
      success: true,
      videos: result.videos,
      pageInfo: result.pageInfo,
      fromCache: false
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  } finally {
    fetchController = null;
    currentFetchKeyword = null;
  }
}

async function handleFetchRandomSample(message, sendResponse) {
  const { keyword, samplePages = 5 } = message;

  fetchController = new AbortController();
  currentFetchKeyword = keyword;

  try {
    const cacheValid = await isCacheValid(keyword, CACHE_DURATION_MS);
    if (cacheValid) {
      const cachedVideos = await getVideosByKeyword(keyword);
      if (cachedVideos.length > 0) {
        sendResponse({
          success: true,
          videos: cachedVideos,
          fromCache: true
        });
        return;
      }
    }

    await clearVideosByKeyword(keyword);

    const result = await fetchRandomSample(keyword, samplePages, 42, (progress) => {
      chrome.runtime.sendMessage({
        action: 'fetchProgress',
        progress
      });
    });

    await saveVideos(result.videos, keyword);
    await saveCache(keyword, result.pageInfo.totalPages, result.videos.length);

    sendResponse({
      success: true,
      videos: result.videos,
      pageInfo: result.pageInfo,
      fromCache: false
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  } finally {
    fetchController = null;
    currentFetchKeyword = null;
  }
}

function handleStopFetch(sendResponse) {
  if (fetchController) {
    fetchController.abort();
    sendResponse({ success: true, message: 'Fetch stopped' });
  } else {
    sendResponse({ success: false, message: 'No active fetch' });
  }
}

async function handleGetVideos(message, sendResponse) {
  const { keyword } = message;
  const videos = await getVideosByKeyword(keyword);
  sendResponse({ success: true, videos });
}

async function handleGetCache(message, sendResponse) {
  const { keyword } = message;
  const cache = await getCache(keyword);
  const valid = await isCacheValid(keyword, CACHE_DURATION_MS);
  sendResponse({ success: true, cache, isValid: valid });
}

async function handleClearData(message, sendResponse) {
  const { keyword } = message;
  if (keyword) {
    await clearVideosByKeyword(keyword);
  } else {
    await clearAllData();
  }
  sendResponse({ success: true });
}

async function handleExportCSV(message, sendResponse) {
  const { keyword } = message;
  const videos = await getVideosByKeyword(keyword);

  if (videos.length === 0) {
    sendResponse({ success: false, error: 'No data to export' });
    return;
  }

  const headers = [
    'BV号', '标题', '作者', 'UP主ID', '播放量', '点赞', '评论',
    '弹幕', '收藏', '时长', '发布时间', '标签', '分区', '简介'
  ];

  const rows = videos.map(v => [
    v.bvid,
    `"${(v.title || '').replace(/"/g, '""')}"`,
    v.author,
    v.mid,
    v.play,
    v.like,
    v.review,
    v.danmaku,
    v.favorites,
    v.duration,
    new Date(v.pubdate * 1000).toLocaleString('zh-CN'),
    `"${(v.tag || '').replace(/"/g, '""')}"`,
    v.typename,
    `"${(v.description || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const bom = '\uFEFF';
  const csvContent = bom + csv;

  sendResponse({
    success: true,
    csv: csvContent,
    filename: `bilibili_${keyword}_${Date.now()}.csv`
  });
}

async function handleGetAiConfig(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['aiConfig']);
    sendResponse({ success: true, config: result.aiConfig || {} });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveAiConfig(message, sendResponse) {
  const { config } = message;
  try {
    await chrome.storage.local.set({ aiConfig: config });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCallAiApi(message, sendResponse) {
  const { prompt } = message;

  try {
    const result = await chrome.storage.local.get(['aiConfig']);
    const rawConfig = result.aiConfig || {};

    const apiKey = rawConfig.apiKey || rawConfig.api_key;
    let endpoint = rawConfig.endpoint || rawConfig.base_url;
    const model = rawConfig.model || 'deepseek-chat';

    if (!apiKey || !endpoint) {
      sendResponse({ success: false, error: '请先配置 API' });
      return;
    }

    if (!endpoint.includes('/v1/') && !endpoint.includes('/chat/completions')) {
      endpoint = endpoint.replace(/\/$/, '') + '/v1/chat/completions';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      sendResponse({ success: false, error: `API 错误: ${response.status} - ${errorText}` });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      sendResponse({ success: false, error: 'API 返回内容为空' });
      return;
    }

    sendResponse({ success: true, content });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

initDB().catch(console.error);
