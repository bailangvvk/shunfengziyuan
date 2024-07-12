addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    try {
        const query = '顺丰资源';
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

        const searchResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!searchResponse.ok) {
            return new Response('Failed to fetch YouTube results.', { status: searchResponse.status });
        }

        const searchText = await searchResponse.text();
        const videoIdMatch = searchText.match(/"videoId":"([a-zA-Z0-9_-]{11})".*?"title":{"runs":\[{"text":"([^"]+)"/);

        if (!videoIdMatch || videoIdMatch.length < 3) {
            return new Response('No video data found.', { status: 404 });
        }

        const videoId = videoIdMatch[1];
        const videoTitle = videoIdMatch[2];
        const videoLink = `视频标题: \n${videoTitle}\n视频链接: \nhttps://www.youtube.com/watch?v=${videoId}`;

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const videoResponse = await fetch(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!videoResponse.ok) {
            return new Response(`Failed to fetch video details for ${videoId}.`, { status: videoResponse.status });
        }

        const videoText = await videoResponse.text();
        const nodeUrlMatch = videoText.match(/本期免费节点获取：\s*(https?:\/\/[^\s"]+)/);

        if (!nodeUrlMatch || nodeUrlMatch.length < 2) {
            return new Response('No "本期免费节点获取：" URL found.', { status: 404 });
        }

        const nodeUrl = nodeUrlMatch[1];
        const nodeResponse = await fetch(nodeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!nodeResponse.ok) {
            return new Response(`Failed to fetch node URL ${nodeUrl}.`, { status: nodeResponse.status });
        }

        const nodeText = await nodeResponse.text();
        const driveLinks = nodeText.match(/https:\/\/drive\.google\.com\/uc\?export=download&id=[a-zA-Z0-9_-]+/g);

        if (!driveLinks || driveLinks.length < 3) {
            return new Response('No sufficient links found.', { status: 404 });
        }

        const userAgent = request.headers.get('User-Agent').toLowerCase();
        let redirectUrl = '';

        if (userAgent.includes('clash.meta')) {
            redirectUrl = driveLinks[1];
        } else if (userAgent.includes('clash')) {
            redirectUrl = driveLinks[2];
        } else if (userAgent.includes('v2ray')) {
            redirectUrl = driveLinks[3];
        } else {
            return new Response('Not Found', { status: 404 });
        }

        return Response.redirect(redirectUrl, 302);

    } catch (error) {
        return new Response('Internal Server Error', { status: 500 });
    }
}
