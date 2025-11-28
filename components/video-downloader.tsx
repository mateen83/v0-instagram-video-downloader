"use client"

import type React from "react"

import { useState } from "react"
import { Download, Instagram, AlertCircle, CheckCircle2, Loader2, Video, FileVideo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { VideoResult } from "@/components/video-result"

interface VideoData {
  success: boolean
  thumbnail?: string
  video_url?: string
  quality?: string
  duration?: string
  error?: string
}

export function VideoDownloader() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoData, setVideoData] = useState<VideoData | null>(null)

  const validateInstagramUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/,
      /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+\/?/,
      /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+\/?/,
      /^https?:\/\/(www\.)?instagram\.com\/reels\/[\w-]+\/?/,
    ]
    return patterns.some((pattern) => pattern.test(url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setVideoData(null)

    if (!url.trim()) {
      setError("Please enter an Instagram URL")
      return
    }

    if (!validateInstagramUrl(url)) {
      setError("Invalid Instagram URL. Please enter a valid video, reel, or IGTV link.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Failed to fetch video. Please try again.")
        return
      }

      setVideoData(data)
    } catch {
      setError("Unable to connect to server. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && validateInstagramUrl(text)) {
        setUrl(text)
        setError(null)
      }
    } catch {
      // Clipboard access denied
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Instagram className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
          Instagram Video Downloader
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
          Download videos, reels, and IGTV content from Instagram instantly
        </p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-xl bg-card border-border shadow-xl">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium text-foreground">
                Instagram URL
              </label>
              <div className="relative">
                <Input
                  id="url"
                  type="text"
                  placeholder="https://www.instagram.com/reel/..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setError(null)
                  }}
                  onPaste={handlePaste}
                  className="h-12 pl-4 pr-20 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/80 px-2 py-1 rounded transition-colors"
                >
                  Paste
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Video
                </>
              )}
            </Button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {videoData && videoData.success && <VideoResult data={videoData} />}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        <FeatureCard
          icon={<Video className="w-5 h-5" />}
          title="Multiple Formats"
          description="Support for Reels, Feed Videos, and IGTV"
        />
        <FeatureCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          title="High Quality"
          description="Download videos in original quality"
        />
        <FeatureCard
          icon={<FileVideo className="w-5 h-5" />}
          title="Fast & Secure"
          description="No data stored, instant downloads"
        />
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>Only public Instagram videos can be downloaded</p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-xl bg-card/50 border border-border/50">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
