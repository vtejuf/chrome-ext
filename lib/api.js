const API_BASE = 'https://api.bilibili.com/x/web-interface/wbi/search/type';
const REQUEST_INTERVAL = 2000;

function extractKeywordFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const keyword = urlObj.searchParams.get('keyword');
    return keyword ? decodeURIComponent(keyword) : null;
  } catch {
    return null;
  }
}

function buildSearchUrl(keyword, page = 1, pageSize = 42) {
  const params = new URLSearchParams({
    search_type: 'video',
    keyword: encodeURIComponent(keyword),
    page: page.toString(),
    page_size: pageSize.toString()
  });
  return `${API_BASE}?${params.toString()}`;
}

async function fetchSearchResults(keyword, page = 1, pageSize = 42) {
  const url = buildSearchUrl(keyword, page, pageSize);

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://search.bilibili.com/'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`API error: ${data.message}`);
  }

  return {
    videos: extractVideos(data.data.result || []),
    pageInfo: {
      page: data.data.page,
      pageSize: data.data.pagesize,
      numResults: data.data.numResults,
      numPages: data.data.numPages
    }
  };
}

function extractVideos(results) {
  return results
    .filter(item => item.type === 'video' && !item.biz_data)
    .map(item => ({
      id: item.id,
      bvid: item.bvid,
      aid: item.aid,
      title: cleanTitle(item.title),
      description: item.description || '',
      author: item.author,
      mid: item.mid,
      play: item.play || 0,
      like: item.like || 0,
      review: item.review || 0,
      danmaku: item.danmaku || 0,
      favorites: item.favorites || 0,
      duration: item.duration,
      pubdate: item.pubdate,
      tag: item.tag || '',
      typename: item.typename,
      typeid: item.typeid,
      pic: item.pic,
      arcurl: item.arcurl
    }));
}

function cleanTitle(title) {
  return title
    .replace(/<em class="keyword">/g, '')
    .replace(/<\/em>/g, '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMultiplePages(keyword, options = {}) {
  const {
    startPage = 1,
    endPage = null,
    pageSize = 42,
    onProgress = null,
    signal = null
  } = options;

  const allVideos = [];
  let currentPage = startPage;
  let totalPages = 0;
  let totalResults = 0;

  const firstPage = await fetchSearchResults(keyword, startPage, pageSize);
  allVideos.push(...firstPage.videos);
  totalPages = firstPage.pageInfo.numPages;
  totalResults = firstPage.pageInfo.numResults;

  if (onProgress) {
    onProgress({
      currentPage: startPage,
      totalPages,
      videosCount: allVideos.length,
      totalResults,
      status: 'fetching'
    });
  }

  const targetEndPage = endPage || totalPages;

  for (let page = startPage + 1; page <= targetEndPage; page++) {
    if (signal && signal.aborted) {
      break;
    }

    await sleep(REQUEST_INTERVAL);

    try {
      const pageData = await fetchSearchResults(keyword, page, pageSize);
      allVideos.push(...pageData.videos);

      if (onProgress) {
        onProgress({
          currentPage: page,
          totalPages,
          videosCount: allVideos.length,
          totalResults,
          status: 'fetching'
        });
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      if (onProgress) {
        onProgress({
          currentPage: page,
          totalPages,
          videosCount: allVideos.length,
          totalResults,
          status: 'error',
          error: error.message
        });
      }
      break;
    }
  }

  return {
    videos: allVideos,
    pageInfo: {
      totalPages,
      totalResults,
      fetchedPages: Math.min(targetEndPage, totalPages)
    }
  };
}

async function fetchRandomSample(keyword, samplePages = 5, pageSize = 42, onProgress = null) {
  const firstPage = await fetchSearchResults(keyword, 1, pageSize);
  const totalPages = firstPage.pageInfo.numPages;

  if (totalPages <= 1) {
    return {
      videos: firstPage.videos,
      pageInfo: {
        totalPages,
        totalResults: firstPage.pageInfo.numResults,
        fetchedPages: 1
      }
    };
  }

  const allVideos = [...firstPage.videos];
  const pagesToFetch = [];

  const step = Math.max(1, Math.floor(totalPages / samplePages));
  for (let i = 2; i <= totalPages && pagesToFetch.length < samplePages - 1; i += step) {
    pagesToFetch.push(i);
  }

  for (let i = 0; i < pagesToFetch.length; i++) {
    const page = pagesToFetch[i];
    await sleep(REQUEST_INTERVAL);

    try {
      const pageData = await fetchSearchResults(keyword, page, pageSize);
      allVideos.push(...pageData.videos);

      if (onProgress) {
        onProgress({
          currentPage: i + 2,
          totalPages: pagesToFetch.length + 1,
          videosCount: allVideos.length,
          totalResults: firstPage.pageInfo.numResults,
          status: 'fetching'
        });
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
    }
  }

  return {
    videos: allVideos,
    pageInfo: {
      totalPages,
      totalResults: firstPage.pageInfo.numResults,
      fetchedPages: pagesToFetch.length + 1
    }
  };
}

export {
  extractKeywordFromUrl,
  fetchSearchResults,
  fetchMultiplePages,
  fetchRandomSample,
  buildSearchUrl,
  REQUEST_INTERVAL
};
