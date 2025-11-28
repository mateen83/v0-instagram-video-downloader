import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate that it's an Instagram CDN URL
    if (!url.includes("instagram") && !url.includes("cdninstagram") && !url.includes("fbcdn")) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 })
    }

    // Fetch the video through our proxy
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.instagram.com/",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch video" }, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || "video/mp4"
    const contentLength = response.headers.get("content-length")

    // Stream the response
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="instagram-video-${Date.now()}.mp4"`,
    })

    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("[v0] Proxy download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
