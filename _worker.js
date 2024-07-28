export default {
  async fetch(request, env, ctx) {
    try {
      const result = await handleRequest(request);
      const resultText = await result.text(); // 将 Response 对象转换为字符串

      // 仅在环境变量存在时发送通知到 Telegram
      if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
        await notifyTelegram({
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
          title: '处理成功',
          message: formatMessage(resultText, request)
        });
      }

      return result;
    } catch (error) {
      // 处理错误并通知 Telegram，仅在环境变量存在时
      if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
        await notifyTelegram({
          botToken: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
          title: '处理失败',
          message: `Error: ${error.message}`
        });
      }
      return new Response('Internal Server Error', { status: 500 });
    }
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
  let redirectUrl = '';

  if (userAgent.includes('clash.meta')) {
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

async function notifyTelegram({ botToken, chatId, title, message }) {
  if (!botToken || !chatId) {
    console.warn('Telegram bot token or chat ID is not set. Skipping notification.');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to send message to Telegram:', error);
  }
}

function formatMessage(resultText, request) {
  console.log('Result Text:', resultText); // 调试输出 resultText
  const ip = extractInfo(resultText, 'IP');
  const country = extractInfo(resultText, '国家');
  const city = extractInfo(resultText, '城市');
  const organization = extractInfo(resultText, '组织');
  const asn = extractInfo(resultText, 'ASN');
  const isp = extractInfo(resultText, 'ISP');
  const region = extractInfo(resultText, '区域');
  const timezone = extractInfo(resultText, '时区');
  const postalCode = extractInfo(resultText, '邮编');
  const [latitude, longitude] = extractInfo(resultText, '经纬度').split(',') || ['undefined', 'undefined'];
  const hostname = extractInfo(resultText, '主机名');
  const ua = request.headers.get('User-Agent') || 'undefined';
  const domain = extractInfo(resultText, '域名');
  const entry = extractInfo(resultText, '入口');
  const statusCode = extractInfo(resultText, '状态码');

  return `# 获取订阅 edgetunnel\n\n` +
    `IP: ${ip}\n` +
    `国家: ${country}\n` +
    `城市: ${city}\n` +
    `组织: ${organization}\n` +
    `ASN: ${asn}\n` +
    `ISP: ${isp}\n` +
    `区域: ${region}\n` +
    `时区: ${timezone}\n` +
    `邮编: ${postalCode}\n` +
    `经纬度: ${latitude}, ${longitude}\n` +
    `主机名: ${hostname}\n` +
    `UA: ${ua}\n` +
    `域名: ${domain}\n` +
    `入口: ${entry}\n` +
    `状态码: ${statusCode}`;
}

function extractInfo(text, key) {
  const regex = new RegExp(`${key}:\\s*(.*)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : 'undefined';
}
