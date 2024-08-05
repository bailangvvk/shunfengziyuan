export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request);
  }
};

async function handleRequest(request) {
  const query = '顺丰资源';
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  
  // 发起搜索请求
  const searchResponse = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!searchResponse.ok) {
    return new Response('Failed to fetch YouTube results.', { status: searchResponse.status });
  }
  
  // 提取搜索结果页面的文本内容
  const searchText = await searchResponse.text();
  
  // 使用正则表达式匹配 videoId 和 title
  const videoIdMatch = searchText.match(/"videoId":"([a-zA-Z0-9_-]{11})".*?"title":{"runs":\[{"text":"([^"]+)"/);
  
  if (!videoIdMatch || videoIdMatch.length < 3) {
    return new Response('No video data found.', { status: 404 });
  }
  
  const videoId = videoIdMatch[1];
  const videoTitle = videoIdMatch[2];
  const videoLink = `视频标题: \n${videoTitle}\n视频链接: \nhttps://www.youtube.com/watch?v=${videoId}`;
  
  // 请求视频详情页面
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const videoResponse = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!videoResponse.ok) {
    return new Response(`Failed to fetch video details for ${videoId}.`, { status: videoResponse.status });
  }
  
  // 提取视频详情页面的文本内容
  const videoText = await videoResponse.text();
  
  // 使用正则表达式提取“本期免费节点获取：”后的URL
  const nodeUrlMatch = videoText.match(/本期免费节点获取：\s*(https?:\/\/[^\s"]+)/);
  
  if (!nodeUrlMatch || nodeUrlMatch.length < 2) {
    return new Response('No "本期免费节点获取：" URL found.', { status: 404 });
  }
  
  const nodeUrl = nodeUrlMatch[1];
  
  // 请求节点获取页面
  const nodeResponse = await fetch(nodeUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!nodeResponse.ok) {
    return new Response(`Failed to fetch node URL ${nodeUrl}.`, { status: nodeResponse.status });
  }
  
  // 提取节点获取页面的文本内容
  const nodeText = await nodeResponse.text();
  
  // 使用正则表达式匹配所有 https://drive.google.com/uc?export=download&id= 链接
  const driveLinks = nodeText.match(/https:\/\/drive\.google\.com\/uc\?export=download&id=[a-zA-Z0-9_-]+/g);
  
  if (!driveLinks || driveLinks.length < 3) {
    return new Response('No sufficient links found.', { status: 404 });
  }
  
  // 根据用户代理设置重定向 URL
  const userAgent = request.headers.get('User-Agent');
  
  // 从请求 URL 查询参数中提取要查找的字符串
  const urlParams = new URL(request.url).searchParams;
  const searchParam = urlParams.get('type') || '';
  
  let redirectUrl = '';
  
  if (searchParam.toLowerCase() === 'meta') {
    redirectUrl = driveLinks[0]; // 第一个链接
  } else if (searchParam.toLowerCase() === 'clash') {
    redirectUrl = driveLinks[1]; // 第二个链接
  } else if (searchParam.toLowerCase() === 'v2ray') {
    redirectUrl = driveLinks[2]; // 第三个链接
  } else {
    return new Response('No matching type found in URL parameters.', { status: 400 });
  }

  if (userAgent.toLowerCase().includes('meta')) {
	  redirectUrl = driveLinks[0]; // 第一个链接
	} else if (userAgent.toLowerCase().includes('clash')) {
	  redirectUrl = driveLinks[1]; // 第二个链接
	} else if (userAgent.toLowerCase().includes('v2ray')) {
	  redirectUrl = driveLinks[2]; // 第三个链接
	} else {
	  return new Response('No matching user agent found.', { status: 400 });
	}
  
  return Response.redirect(redirectUrl, 302);
}
