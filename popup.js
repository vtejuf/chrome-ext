document.addEventListener('DOMContentLoaded', async () => {
  const clearCacheBtn = document.getElementById('clear-cache');
  const saveAiConfigBtn = document.getElementById('save-ai-config');
  const aiEndpoint = document.getElementById('ai-endpoint');
  const aiKey = document.getElementById('ai-key');
  const aiModel = document.getElementById('ai-model');

  const configResponse = await chrome.runtime.sendMessage({ action: 'getAiConfig' });
  if (configResponse.success && configResponse.config) {
    const cfg = configResponse.config;
    aiEndpoint.value = cfg.endpoint || cfg.base_url || '';
    aiKey.value = cfg.apiKey || cfg.api_key || '';
    aiModel.value = cfg.model || 'deepseek-chat';
  }

  clearCacheBtn.addEventListener('click', async () => {
    if (confirm('确定要清除所有缓存数据吗？')) {
      const response = await chrome.runtime.sendMessage({ action: 'clearData' });
      if (response.success) {
        alert('缓存已清除');
      } else {
        alert('清除失败：' + response.error);
      }
    }
  });

  saveAiConfigBtn.addEventListener('click', async () => {
    let endpoint = aiEndpoint.value.trim();
    const apiKey = aiKey.value.trim();
    const model = aiModel.value.trim() || 'deepseek-chat';

    if (!endpoint || !apiKey) {
      alert('请填写 API 端点和 API Key');
      return;
    }

    if (!endpoint.includes('/v1/') && !endpoint.includes('/chat/completions')) {
      endpoint = endpoint.replace(/\/$/, '') + '/v1/chat/completions';
    }

    const config = {
      endpoint,
      apiKey,
      model
    };

    const response = await chrome.runtime.sendMessage({
      action: 'saveAiConfig',
      config
    });

    if (response.success) {
      saveAiConfigBtn.textContent = '✅ 已保存';
      setTimeout(() => { saveAiConfigBtn.textContent = '保存配置'; }, 2000);
    } else {
      alert('保存失败：' + response.error);
    }
  });
});
