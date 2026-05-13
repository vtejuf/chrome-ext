document.addEventListener('DOMContentLoaded', async () => {
  const clearCacheBtn = document.getElementById('clear-cache');
  const saveAiConfigBtn = document.getElementById('save-ai-config');
  const aiEndpoint = document.getElementById('ai-endpoint');
  const aiKey = document.getElementById('ai-key');
  const aiModel = document.getElementById('ai-model');

  const configResponse = await chrome.runtime.sendMessage({ action: 'getAiConfig' });
  if (configResponse.success && configResponse.config) {
    aiEndpoint.value = configResponse.config.endpoint || '';
    aiKey.value = configResponse.config.apiKey || '';
    aiModel.value = configResponse.config.model || 'gpt-3.5-turbo';
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
    const config = {
      endpoint: aiEndpoint.value.trim(),
      apiKey: aiKey.value.trim(),
      model: aiModel.value.trim() || 'gpt-3.5-turbo'
    };

    if (!config.endpoint || !config.apiKey) {
      alert('请填写 API 端点和 API Key');
      return;
    }

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
