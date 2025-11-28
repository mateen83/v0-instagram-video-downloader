"use client"

import { Download, ExternalLink, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface VideoResultProps {
  data: {
    thumbnail?: string
    video_url?: string
    quality?: string
    duration?: string
  }
}

export function VideoResult({ data }: VideoResultProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!data.video_url) return

    setDownloading(true)
    try {
      const response = await fetch("/api/proxy-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: data.video_url }),
      })

      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `instagram-video-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Thumbnail */}
        <div className="relative w-full sm:w-40 h-32 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {data.thumbnail ? (
            <>
              <img
                src={data.thumbnail || "/placeholder.svg"}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Video Ready</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {data.quality && (
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">{data.quality}</span>
              )}
              {data.duration && <span className="px-2 py-1 rounded bg-muted">{data.duration}</span>}
              <span className="px-2 py-1 rounded bg-muted">MP4</span>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleDownload}
              disabled={downloading || !data.video_url}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {downloading ? (
                "Downloading..."
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download MP4
                </>
              )}
            </Button>
            {data.video_url && (
              <Button variant="outline" size="icon" asChild className="border-border hover:bg-secondary bg-transparent">
                <a href={data.video_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
