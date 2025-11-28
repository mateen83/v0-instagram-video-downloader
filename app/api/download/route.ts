import { type NextRequest, NextResponse } from "next/server"

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT = 10 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

function extractShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([\w-]+)/,
    /instagram\.com\/reel\/([\w-]+)/,
    /instagram\.com\/reels\/([\w-]+)/,
    /instagram\.com\/tv\/([\w-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function fetchInstagramData(url: string) {
  const shortcode = extractShortcode(url)
  if (!shortcode) {
    throw new Error("Invalid Instagram URL")
  }

  // Try multiple approaches to get video data
  const approaches = [() => fetchViaGraphQL(shortcode), () => fetchViaOEmbed(url), () => fetchViaPageScrape(url)]

  for (const approach of approaches) {
    try {
      const result = await approach()
      if (result) return result
    } catch (e) {
      console.log("[v0] Approach failed, trying next:", e)
      continue
    }
  }

  throw new Error("Unable to fetch video. The post may be private or unavailable.")
}

async function fetchViaGraphQL(shortcode: string) {
  const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables=${encodeURIComponent(
    JSON.stringify({ shortcode }),
  )}`

  const response = await fetch(graphqlUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
  })

  if (!response.ok) return null

  const data = await response.json()
  const media = data?.data?.shortcode_media

  if (!media) return null

  const videoUrl = media.video_url
  const thumbnail = media.display_url || media.thumbnail_src
  const duration = media.video_duration

  if (!videoUrl) return null

  return {
    video_url: videoUrl,
    thumbnail: thumbnail,
    quality: "HD",
    duration: duration
      ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
      : undefined,
  }
}

async function fetchViaOEmbed(url: string) {
  const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`

  const response = await fetch(oembedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  })

  if (!response.ok) return null

  const data = await response.json()

  // oEmbed doesn't provide direct video URL, but we can get thumbnail
  return {
    thumbnail: data.thumbnail_url,
    // Note: oEmbed doesn't provide video URL directly
  }
}

async function fetchViaPageScrape(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  })

  if (!response.ok) return null

  const html = await response.text()

  // Try to find video URL in the page content
  const videoUrlMatch = html.match(/"video_url":"([^"]+)"/)
  const thumbnailMatch = html.match(/"display_url":"([^"]+)"/) || html.match(/"thumbnail_src":"([^"]+)"/)

  if (!videoUrlMatch) {
    // Try alternate patterns
    const altVideoMatch =
      html.match(/property="og:video"[^>]*content="([^"]+)"/) || html.match(/meta[^>]*content="([^"]+\.mp4[^"]*)"/)

    if (altVideoMatch) {
      return {
        video_url: altVideoMatch[1].replace(/\\u0026/g, "&"),
        thumbnail: thumbnailMatch ? thumbnailMatch[1].replace(/\\u0026/g, "&") : undefined,
        quality: "HD",
      }
    }
    return null
  }

  return {
    video_url: videoUrlMatch[1].replace(/\\u0026/g, "&"),
    thumbnail: thumbnailMatch ? thumbnailMatch[1].replace(/\\u0026/g, "&") : undefined,
    quality: "HD",
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment and try again." },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    const validPatterns = [
      /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/reels\/[\w-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+/,
    ]

    if (!validPatterns.some((p) => p.test(url))) {
      return NextResponse.json({ success: false, error: "Invalid Instagram URL format" }, { status: 400 })
    }

    const videoData = await fetchInstagramData(url)

    if (!videoData || !videoData.video_url) {
      return NextResponse.json(
        { success: false, error: "Unable to fetch video. The post may be private or unavailable." },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      ...videoData,
    })
  } catch (error) {
    console.error("[v0] Error processing request:", error)

    const message = error instanceof Error ? error.message : "An unexpected error occurred"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
