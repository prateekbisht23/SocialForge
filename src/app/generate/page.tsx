'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Platform, PlatformPost } from '@/types'
import GenerateForm, { GenerateFormData } from '@/components/GenerateForm'
import PlatformPostCard from '@/components/PlatformPostCard'
import ScheduleModal from '@/components/ScheduleModal'
import ViewPostModal from '@/components/ViewPostModal'
import EditPostModal from '@/components/EditPostModal'
import { ArrowLeft, Save, Sparkles, X as XIcon } from 'lucide-react'

/**
 * Upload a file to the server-side /api/upload-image route.
 * Returns the permanent public URL.
 */
async function uploadFile(file: File, bucket: string, path: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', bucket)
  formData.append('path', path)

  const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Upload failed')
  }
  const { url } = await res.json()
  return url
}

export default function GeneratePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [generatedPosts, setGeneratedPosts] = useState<PlatformPost[]>([])
  const [error, setError] = useState<string | null>(null)

  // AI-generated image previews (multiple)
  const [aiImageUrls, setAiImageUrls] = useState<string[]>([])
  const [selectedAiImages, setSelectedAiImages] = useState<Set<number>>(new Set())

  // Modal state
  const [schedulePost, setSchedulePost] = useState<PlatformPost | null>(null)
  const [viewPost, setViewPost] = useState<PlatformPost | null>(null)
  const [editPost, setEditPost] = useState<PlatformPost | null>(null)

  const handleGenerate = async (data: GenerateFormData) => {
    setLoading(true)
    setError(null)
    setGeneratedPosts([])
    setAiImageUrls([])
    setSelectedAiImages(new Set())

    try {
      const postId = crypto.randomUUID()

      // 1. Upload post image(s) via server-side route
      let permanentImageUrl: string | null = null
      let allImageUrls: string[] = []

      if (data.imageFiles && data.imageFiles.length > 0) {
        setLoadingStatus('Uploading images...')
        const mainFile = data.imageFiles[0]
        const ext = mainFile.name.split('.').pop()
        permanentImageUrl = await uploadFile(mainFile, 'post-images', `${postId}.${ext}`)
        allImageUrls.push(permanentImageUrl)

        for (let i = 1; i < data.imageFiles.length; i++) {
          const f = data.imageFiles[i]
          const fExt = f.name.split('.').pop()
          const url = await uploadFile(f, 'post-images', `${postId}-${i}.${fExt}`)
          allImageUrls.push(url)
        }
      } else if (data.imageDescription && data.imageDescription.trim()) {
        // AI image generation
        const imgCount = data.imageCount || 1
        setLoadingStatus(`Generating ${imgCount > 1 ? `${imgCount} images` : 'image'} with AI...`)
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: data.imageDescription.trim(),
            postId,
            imageCount: imgCount,
          }),
        })
        if (imgRes.ok) {
          const imgData = await imgRes.json()
          const urls: string[] = imgData.image_urls || (imgData.image_url ? [imgData.image_url] : [])
          allImageUrls = urls
          permanentImageUrl = urls[0] || null

          // Show AI images for preview/selection
          if (urls.length > 1) {
            setAiImageUrls(urls)
            setSelectedAiImages(new Set(urls.map((_, i) => i)))
          }
        } else {
          const imgErr = await imgRes.json()
          console.warn('AI image generation failed:', imgErr.error)
        }
      }

      // 2. Upload brand reference images
      let brandReferenceUrls: string[] = []
      if (data.brandRefFiles && data.brandRefFiles.length > 0) {
        setLoadingStatus('Uploading brand assets...')
        for (let i = 0; i < data.brandRefFiles.length; i++) {
          const f = data.brandRefFiles[i]
          const fExt = f.name.split('.').pop()
          const url = await uploadFile(f, 'brand-assets', `brand-assets/${postId}/${i}.${fExt}`)
          brandReferenceUrls.push(url)
        }
      }

      // 3. Status messages
      for (const platform of data.platforms) {
        setLoadingStatus(
          `AI is generating your ${platform.charAt(0).toUpperCase() + platform.slice(1)} ${data.content_type}...`
        )
        await new Promise((r) => setTimeout(r, 800))
      }

      setLoadingStatus('Saving to queue...')

      // 4. Send to generate API
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content_type: data.content_type,
          topic: data.topic,
          tone: data.tone,
          custom_tone: data.custom_tone || null,
          brand_voice_text: data.brand_voice_text || null,
          platforms: data.platforms,
          brand_context: data.brand_context,
          image_url: permanentImageUrl,
          image_urls: allImageUrls.length > 0 ? allImageUrls : null,
          brand_reference_images: brandReferenceUrls.length > 0 ? brandReferenceUrls : null,
          creativity: data.creativity ?? 0.5,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Generation failed')
      }

      const result = await res.json()
      setGeneratedPosts(result.platform_posts || [])

      for (const platform of data.platforms) {
        setLoadingStatus(
          `✓ ${platform.charAt(0).toUpperCase() + platform.slice(1)} ${data.content_type} created`
        )
        await new Promise((r) => setTimeout(r, 400))
      }

      setLoadingStatus(`All ${data.content_type}s generated ✓`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setTimeout(() => setLoadingStatus(''), 2000)
    }
  }

  // Post actions
  const handleApprove = async (id: string) => {
    const res = await fetch('/api/posts/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: id }),
    })
    if (res.ok) {
      setGeneratedPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'approved' as const } : p))
      )
    }
  }

  const handleReject = async (id: string) => {
    const res = await fetch('/api/posts/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: id }),
    })
    if (res.ok) {
      setGeneratedPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'rejected' as const } : p))
      )
    }
  }

  const handleSchedule = (id: string) => {
    const post = generatedPosts.find((p) => p.id === id)
    if (post) setSchedulePost(post)
  }

  const handleConfirmSchedule = async (postId: string, fireAt: string) => {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_post_id: postId, fire_at: fireAt }),
    })
    if (res.ok) {
      setGeneratedPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, status: 'scheduled' as const, fire_at: fireAt }
            : p
        )
      )
    }
  }

  const handleView = (post: PlatformPost) => {
    setViewPost(post)
  }

  const handleEdit = (post: PlatformPost) => {
    setEditPost(post)
  }

  const handleSaveEdit = async (id: string, updates: Partial<PlatformPost>) => {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Save failed')
    }
    const updated = await res.json()
    setGeneratedPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    )
  }

  const toggleAiImage = (index: number) => {
    setSelectedAiImages((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-lg font-bold tracking-tight">
              Social<span className="text-accent">Forge</span>
            </span>
          </Link>
          <span className="font-mono text-[10px] text-muted tracking-wider uppercase px-2 py-0.5 border border-border">
            Generate
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/5 border border-accent/10 mb-4">
            <Sparkles size={14} className="text-accent" />
            <span className="font-mono text-[11px] text-accent tracking-wider uppercase">
              AI Content Generation
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Create New Content
          </h1>
          <p className="text-muted mt-2 max-w-md mx-auto">
            Describe your topic and our AI agent will generate platform-optimized posts.
          </p>
        </div>

        {/* Form */}
        <GenerateForm
          onGenerate={handleGenerate}
          loading={loading}
          loadingStatus={loadingStatus}
        />

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mt-6 px-4 py-3 border border-danger/30 bg-danger/5 text-danger text-sm font-mono">
            {error}
          </div>
        )}

        {/* AI Generated Image Thumbnails */}
        {aiImageUrls.length > 1 && (
          <div className="max-w-2xl mx-auto mt-6">
            <label className="font-label text-muted text-[11px] block mb-2">
              AI Generated Images — click to deselect
            </label>
            <div className="flex gap-2 flex-wrap">
              {aiImageUrls.map((url, i) => (
                <div
                  key={i}
                  className={`relative w-20 h-20 border bg-surface overflow-hidden group cursor-pointer transition-all duration-200 ${
                    selectedAiImages.has(i)
                      ? 'border-accent/50'
                      : 'border-border opacity-40'
                  }`}
                  onClick={() => toggleAiImage(i)}
                >
                  <img src={url} alt={`AI generated ${i + 1}`} className="w-full h-full object-cover" />
                  {selectedAiImages.has(i) && (
                    <button
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleAiImage(i)
                      }}
                    >
                      <XIcon size={10} className="text-danger" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated posts preview */}
        {generatedPosts.length > 0 && (
          <div className="max-w-4xl mx-auto mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Generated Posts</h2>
              <span className="font-mono text-[11px] text-muted tracking-wider uppercase">
                {generatedPosts.length} posts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
              {generatedPosts.map((post) => (
                <PlatformPostCard
                  key={post.id}
                  post={post}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onSchedule={handleSchedule}
                  onView={handleView}
                  onEdit={handleEdit}
                />
              ))}
            </div>

            <div className="flex items-center justify-center mt-8">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-press inline-flex items-center gap-2 px-8 py-3 bg-accent text-background font-mono text-sm tracking-wider uppercase border border-accent hover:bg-accent-dim transition-colors cursor-pointer"
              >
                <Save size={14} />
                Go to Dashboard →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Schedule Modal */}
      {schedulePost && (
        <ScheduleModal
          post={schedulePost}
          onClose={() => setSchedulePost(null)}
          onConfirm={handleConfirmSchedule}
        />
      )}

      {/* View Modal */}
      {viewPost && (
        <ViewPostModal
          post={viewPost}
          onClose={() => setViewPost(null)}
          onEdit={(p) => {
            setViewPost(null)
            setEditPost(p)
          }}
        />
      )}

      {/* Edit Modal */}
      {editPost && (
        <EditPostModal
          post={editPost}
          onClose={() => setEditPost(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
