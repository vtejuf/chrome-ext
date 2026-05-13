document.addEventListener('DOMContentLoaded', () => {
  const clearCacheBtn = document.getElementById('clear-cache');

  clearCacheBtn.addEventListener('click', async () => {
    if (confirm('确定要清除所有缓存数据吗？')) {
      const response = await chrome.runtime.sendMessage({
        action: 'clearData'
      });

      if (response.success) {
        alert('缓存已清除');
      } else {
        alert('清除失败：' + response.error);
      }
    }
  });
});
