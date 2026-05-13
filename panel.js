let isListening = false;
let capturedData = [];
let urlRegex = null;
let dataPath = '';

const urlPatternInput = document.getElementById('urlPattern');
const dataPathInput = document.getElementById('dataPath');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const exportBtn = document.getElementById('exportBtn');
const statusEl = document.getElementById('status');
const matchCountEl = document.getElementById('matchCount');
const dataListEl = document.getElementById('dataList');

startBtn.addEventListener('click', startListening);
stopBtn.addEventListener('click', stopListening);
clearBtn.addEventListener('click', clearData);
selectAllBtn.addEventListener('click', toggleSelectAll);
exportBtn.addEventListener('click', exportData);

function startListening() {
  const urlPattern = urlPatternInput.value.trim();
  dataPath = dataPathInput.value.trim();

  if (!urlPattern) {
    alert('请输入URL正则表达式');
    return;
  }

  try {
    urlRegex = new RegExp(urlPattern, 'i');
  } catch (e) {
    alert('正则表达式格式错误: ' + e.message);
    return;
  }

  isListening = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  urlPatternInput.disabled = true;
  dataPathInput.disabled = true;

  statusEl.textContent = '状态: 监听中...';
  statusEl.classList.add('listening');

  chrome.devtools.network.onRequestFinished.addListener(handleRequest);
}

function stopListening() {
  isListening = false;
  urlRegex = null;

  chrome.devtools.network.onRequestFinished.removeListener(handleRequest);

  startBtn.disabled = false;
  stopBtn.disabled = true;
  urlPatternInput.disabled = false;
  dataPathInput.disabled = false;

  statusEl.textContent = '状态: 已停止';
  statusEl.classList.remove('listening');
}

function handleRequest(request) {
  if (!urlRegex || !urlRegex.test(request.request.url)) {
    return;
  }

  const contentType = request.response.headers.find(h =>
    h.name.toLowerCase() === 'content-type'
  );

  if (contentType && !contentType.value.includes('application/json')) {
    return;
  }

  request.getContent((content, encoding) => {
    if (!content) return;

    try {
      const data = JSON.parse(content);
      const extractedValue = extractValue(data, dataPath);

      if (extractedValue !== undefined && extractedValue !== null) {
        const values = Array.isArray(extractedValue) ? extractedValue : [extractedValue];

        values.forEach(value => {
          capturedData.push({
            url: request.request.url,
            value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
            time: new Date().toLocaleTimeString()
          });
        });

        renderDataList();
        updateMatchCount();
        updateExportButton();
      }
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  });
}

function clearData() {
  capturedData = [];
  renderDataList();
  updateMatchCount();
  updateExportButton();
}

function toggleSelectAll() {
  const checkboxes = dataListEl.querySelectorAll('.data-item-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });

  updateExportButton();
}

function exportData() {
  const checkboxes = dataListEl.querySelectorAll('.data-item-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('请选择要导出的数据');
    return;
  }

  const selectedData = Array.from(checkboxes).map(cb => {
    const index = parseInt(cb.dataset.index);
    return capturedData[index].value;
  });

  const content = selectedData.join('\n\n---\n\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const filename = `extracted_data_${timestamp}.txt`;

  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
}

function renderDataList() {
  if (capturedData.length === 0) {
    dataListEl.innerHTML = '<div class="empty-hint">暂无数据，请配置后开始监听</div>';
    return;
  }

  dataListEl.innerHTML = capturedData.map((item, index) => `
    <div class="data-item">
      <input type="checkbox" class="data-item-checkbox" data-index="${index}" />
      <div class="data-item-content">
        <div class="data-item-url">${item.url}</div>
        <div class="data-item-value">${escapeHtml(item.value)}</div>
        <div class="data-item-time">${item.time}</div>
      </div>
    </div>
  `).join('');

  dataListEl.querySelectorAll('.data-item-checkbox').forEach(cb => {
    cb.addEventListener('change', updateExportButton);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateMatchCount() {
  matchCountEl.textContent = `匹配数: ${capturedData.length}`;
}

function updateExportButton() {
  const checkboxes = dataListEl.querySelectorAll('.data-item-checkbox:checked');
  exportBtn.disabled = checkboxes.length === 0;
}

function extractValue(data, path) {
  if (!path || path.trim() === '') {
    return data;
  }

  const parts = path.split('.').filter(p => p.trim() !== '');
  let current = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    const arrayMatch = part.match(/^(\w+)\[\*\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      if (!Array.isArray(current[key])) {
        return undefined;
      }

      const remainingPath = parts.slice(parts.indexOf(part) + 1).join('.');
      return current[key].map(item => extractValue(item, remainingPath)).filter(v => v !== undefined);
    }

    const indexMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (indexMatch) {
      const key = indexMatch[1];
      const index = parseInt(indexMatch[2]);
      if (!Array.isArray(current[key]) || current[key].length <= index) {
        return undefined;
      }
      current = current[key][index];
      continue;
    }

    if (typeof current !== 'object' || !(part in current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}
