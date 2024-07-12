addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const searchTerm = url.searchParams.get('query')

  if (!searchTerm) {
    return new Response('Please provide a search term using the "query" parameter.', { status: 400 })
  }

  // 构建YouTube搜索URL
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`

  try {
    // 获取搜索结果页面
    const searchResponse = await fetch(searchUrl)
    const searchHtml = await searchResponse.text()

    // 提取第一个视频的videoId
    const videoIdMatch = searchHtml.match(/"videoId":"([^"]+)"/)
    if (!videoIdMatch) {
      return new Response('No video found.', { status: 404 })
    }

    const videoId = videoIdMatch[1]
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // 获取视频页面内容
    const videoResponse = await fetch(videoUrl)
    const videoHtml = await videoResponse.text()

    // 提取第一个视频的HTML元素
    const videoElementMatch = videoHtml.match(/<video[^>]*>(.*?)<\/video>/i)
    if (!videoElementMatch) {
      return new Response('No video HTML element found.', { status: 404 })
    }

    const videoElement = videoElementMatch[0]
    return new Response(videoElement, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    return new Response('Error fetching or parsing video data: ' + error.message, { status: 500 })
  }
}
