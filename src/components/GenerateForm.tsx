'use client'

import { useState, useRef } from 'react'
import { Platform } from '@/types'
import {
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  X as XIcon,
  ImageIcon,
  Megaphone,
  PenTool,
  Sliders,
} from 'lucide-react'
import ImageUpload from './ImageUpload'

const platforms: { value: Platform; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { value: 'twitter', label: 'Twitter', icon: Twitter, color: '#F0EDE8' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
]

const presetTones = ['Professional', 'Casual', 'Witty', 'Bold']

function getCreativityLabel(val: number): string {
  if (val <= 0.2) return 'Consistent  — stays close to your brand guidelines'
  if (val <= 0.4) return 'Balanced    — reliable with subtle variation'
  if (val <= 0.6) return 'Creative    — fresh angles, some experimentation'
  if (val <= 0.8) return 'Adventurous — bold ideas, unexpected directions'
  return 'Experimental — maximum range and versatility'
}

export interface GenerateFormData {
  content_type: 'post' | 'ad'
  topic: string
  tone: string
  custom_tone?: string
  brand_voice_text?: string
  platforms: Platform[]
  brand_context?: string
  brand_reference_images?: string[]
  imageFiles?: File[]
  imageDescription?: string
  brandRefFiles?: File[]
  imageCount?: number
  creativity?: number
}

interface GenerateFormProps {
  onGenerate: (data: GenerateFormData) => Promise<void>
  loading: boolean
  loadingStatus?: string
}

export default function GenerateForm({
  onGenerate,
  loading,
  loadingStatus,
}: GenerateFormProps) {
  // Content type
  const [contentType, setContentType] = useState<'post' | 'ad'>('post')

  // Core fields
  const [topic, setTopic] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [tone, setTone] = useState('Professional')

  // Custom tone
  const [customToneText, setCustomToneText] = useState('')
  const [brandVoiceText, setBrandVoiceText] = useState('')
  const [brandVoiceFileName, setBrandVoiceFileName] = useState('')
  const brandVoiceRef = useRef<HTMLInputElement>(null)

  // Brand context
  const [brandContext, setBrandContext] = useState('')
  const [showBrandContext, setShowBrandContext] = useState(false)
  const [brandRefImages, setBrandRefImages] = useState<{ file: File; preview: string }[]>([])
  const brandRefInputRef = useRef<HTMLInputElement>(null)

  // Post image(s)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageDescription, setImageDescription] = useState('')
  const [imageCount, setImageCount] = useState(1)

  // Creativity
  const [creativity, setCreativity] = useState(0.5)

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  // Handle post image(s) selection
  const handleImageFilesSelect = (file: File | null) => {
    if (!file) return
    if (contentType === 'ad') {
      setImageFiles([file])
      setImagePreviews([URL.createObjectURL(file)])
    } else {
      if (imageFiles.length >= 10) return
      setImageFiles((prev) => [...prev, file])
      setImagePreviews((prev) => [...prev, URL.createObjectURL(file)])
    }
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // Handle brand voice doc upload
  const handleBrandVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBrandVoiceFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setBrandVoiceText((ev.target?.result as string) || '')
    }
    reader.readAsText(file)
  }

  // Handle brand reference images
  const handleBrandRefImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 4 - brandRefImages.length
    const toAdd = files.slice(0, remaining)
    const newItems = toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
    setBrandRefImages((prev) => [...prev, ...newItems])
    if (brandRefInputRef.current) brandRefInputRef.current.value = ''
  }

  const removeBrandRefImage = (index: number) => {
    setBrandRefImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Determine if we're in AI description mode (post type, no files uploaded, description filled)
  const showImageCountPicker =
    contentType === 'post' &&
    imageFiles.length === 0 &&
    imageDescription.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim() || selectedPlatforms.length === 0) return
    await onGenerate({
      content_type: contentType,
      topic: topic.trim(),
      tone: tone === 'Custom' ? 'custom' : tone,
      custom_tone: tone === 'Custom' ? customToneText.trim() || undefined : undefined,
      brand_voice_text: tone === 'Custom' ? brandVoiceText.trim() || undefined : undefined,
      platforms: selectedPlatforms,
      brand_context: brandContext.trim() || undefined,
      imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
      imageDescription: imageDescription.trim() || undefined,
      brandRefFiles: brandRefImages.length > 0 ? brandRefImages.map(i => i.file) : undefined,
      imageCount: showImageCountPicker ? imageCount : 1,
      creativity,
    })
  }

  const isReady = topic.trim().length > 0 && selectedPlatforms.length > 0

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6">
      {/* Content Type Toggle */}
      <div>
        <label className="font-label text-muted block mb-2">Content Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            id="content-type-post"
            onClick={() => {
              setContentType('post')
            }}
            className={`btn-press flex-1 flex items-center justify-center gap-2 px-4 py-3 border font-mono text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              contentType === 'post'
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'border-border text-muted hover:text-foreground hover:border-border-hover'
            }`}
          >
            <PenTool size={14} />
            Post
          </button>
          <button
            type="button"
            id="content-type-ad"
            onClick={() => {
              setContentType('ad')
              setImageCount(1)
              if (imageFiles.length > 1) {
                setImageFiles([imageFiles[0]])
                setImagePreviews([imagePreviews[0]])
              }
            }}
            className={`btn-press flex-1 flex items-center justify-center gap-2 px-4 py-3 border font-mono text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              contentType === 'ad'
                ? 'bg-amber/10 border-amber/30 text-amber'
                : 'border-border text-muted hover:text-foreground hover:border-border-hover'
            }`}
          >
            <Megaphone size={14} />
            Ad
          </button>
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="font-label text-muted block mb-2">Topic</label>
        <textarea
          id="topic-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={
            contentType === 'ad'
              ? 'Describe the product or service you want to advertise...'
              : 'What do you want to post about? e.g. We just launched a new feature'
          }
          rows={4}
          className="w-full px-4 py-3 bg-background border border-border text-foreground text-base placeholder:text-muted/40 focus:border-accent/50 focus:outline-none transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Platform selection */}
      <div>
        <label className="font-label text-muted block mb-2">Platforms</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {platforms.map((p) => {
            const Icon = p.icon
            const isSelected = selectedPlatforms.includes(p.value)
            return (
              <button
                key={p.value}
                type="button"
                id={`platform-toggle-${p.value}`}
                onClick={() => togglePlatform(p.value)}
                className={`btn-press flex items-center justify-center gap-2 px-4 py-3 border font-mono text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-current bg-current/10'
                    : 'border-border text-muted hover:text-foreground hover:border-border-hover'
                }`}
                style={isSelected ? { color: p.color, borderColor: `${p.color}44` } : {}}
              >
                <Icon size={14} />
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tone selector with Custom */}
      <div>
        <label className="font-label text-muted block mb-2">Tone</label>
        <div className="flex flex-wrap gap-2">
          {[...presetTones, 'Custom'].map((t) => (
            <button
              key={t}
              type="button"
              id={`tone-${t.toLowerCase()}`}
              onClick={() => setTone(t)}
              className={`btn-press px-4 py-2 border font-mono text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                tone === t
                  ? t === 'Custom'
                    ? 'bg-purple/10 border-purple/30 text-purple'
                    : 'bg-foreground/10 border-foreground/30 text-foreground'
                  : 'border-border text-muted hover:text-foreground hover:border-border-hover'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Custom tone expanded section */}
        {tone === 'Custom' && (
          <div className="mt-3 p-4 border border-purple/20 bg-purple/5 space-y-4" style={{ animation: 'slide-up 0.2s ease-out' }}>
            <div>
              <label className="font-label text-muted block mb-1.5 text-[11px]">
                Describe Your Tone
              </label>
              <textarea
                id="custom-tone-input"
                value={customToneText}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setCustomToneText(e.target.value)
                }}
                placeholder="Describe your brand's tone... e.g. 'Speak like a friendly CFO — confident but approachable, always end with a question to drive engagement'"
                rows={3}
                className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm placeholder:text-muted/40 focus:border-purple/50 focus:outline-none transition-colors resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] font-mono tracking-wider ${customToneText.length > 450 ? 'text-amber' : 'text-muted/50'}`}>
                  {customToneText.length}/500
                </span>
              </div>
            </div>

            <div>
              <label className="font-label text-muted block mb-1.5 text-[11px]">
                Or Upload Brand Voice Doc
              </label>
              <input
                ref={brandVoiceRef}
                type="file"
                accept=".md,.txt"
                onChange={handleBrandVoiceUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => brandVoiceRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-border text-muted hover:text-foreground hover:border-border-hover transition-colors text-[11px] font-mono tracking-wider uppercase cursor-pointer"
              >
                <Upload size={12} />
                {brandVoiceFileName || 'Upload .md or .txt'}
              </button>
              {brandVoiceText && (
                <div className="mt-2 flex items-center gap-2">
                  <FileText size={12} className="text-purple" />
                  <span className="text-[10px] font-mono text-purple truncate max-w-[200px]">
                    {brandVoiceFileName}
                  </span>
                  <span className="text-[10px] font-mono text-muted">
                    ({brandVoiceText.length} chars)
                  </span>
                  <button
                    type="button"
                    onClick={() => { setBrandVoiceText(''); setBrandVoiceFileName('') }}
                    className="text-muted hover:text-danger transition-colors cursor-pointer"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CHANGE 3: Creative Range slider */}
      <div>
        <label className="font-label text-muted block mb-2">
          <span className="flex items-center gap-2">
            <Sliders size={12} />
            Creative Range
          </span>
        </label>
        <div className="p-4 border border-border bg-surface/30 space-y-3">
          <input
            id="creativity-slider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={creativity}
            onChange={(e) => setCreativity(parseFloat(e.target.value))}
            className="w-full h-1.5 appearance-none cursor-pointer bg-border rounded-none outline-none"
            style={{
              accentColor: 'var(--color-accent, #00FF85)',
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-foreground/70 leading-tight">
              {getCreativityLabel(creativity)}
            </span>
            <span className="text-[11px] font-mono text-accent font-semibold ml-2 shrink-0">
              ({creativity.toFixed(1)})
            </span>
          </div>
        </div>
      </div>

      {/* Brand context (collapsible) with reference images */}
      <div>
        <button
          type="button"
          onClick={() => setShowBrandContext(!showBrandContext)}
          className="flex items-center gap-2 font-label text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          {showBrandContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Brand Context (Optional)
        </button>
        {showBrandContext && (
          <div className="mt-2 space-y-4">
            <textarea
              id="brand-context"
              value={brandContext}
              onChange={(e) => setBrandContext(e.target.value)}
              placeholder="Tell the AI about your brand for better results..."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm placeholder:text-muted/40 focus:border-accent/50 focus:outline-none transition-colors resize-none"
            />

            <div>
              <label className="font-label text-muted block mb-1 text-[11px]">
                Brand Reference Images (Optional)
              </label>
              <p className="text-[10px] text-muted/60 mb-2">
                Upload examples of your brand&apos;s existing content to guide the visual style
              </p>

              {brandRefImages.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {brandRefImages.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 border border-border bg-surface overflow-hidden group">
                      <img src={img.preview} alt={`Brand ref ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeBrandRefImage(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <XIcon size={10} className="text-danger" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {brandRefImages.length < 4 && (
                <>
                  <input
                    ref={brandRefInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBrandRefImageAdd}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => brandRefInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-border text-muted hover:text-foreground hover:border-border-hover transition-colors text-[11px] font-mono tracking-wider uppercase cursor-pointer"
                  >
                    <ImageIcon size={12} />
                    Add Images ({brandRefImages.length}/4)
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image upload — post image(s) */}
      <div>
        <label className="font-label text-muted block mb-2">
          {contentType === 'ad' ? 'Ad Creative' : 'Post Image(s)'}
          {contentType === 'post' && (
            <span className="text-[10px] text-muted/50 ml-2">Up to 10</span>
          )}
        </label>

        {/* Image previews strip */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {imagePreviews.map((url, i) => (
              <div key={i} className="relative w-20 h-20 border border-border bg-surface overflow-hidden group">
                <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <XIcon size={12} className="text-danger" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(contentType === 'ad' ? imageFiles.length < 1 : imageFiles.length < 10) && (
          <ImageUpload
            onFileSelect={handleImageFilesSelect}
            onDescriptionChange={setImageDescription}
            imageDescription={imageDescription}
            previewUrl={null}
          />
        )}

        {/* CHANGE 2: Number of AI Image Variations picker */}
        {showImageCountPicker && (
          <div className="mt-3 p-3 border border-accent/15 bg-accent/5">
            <label className="font-label text-muted block mb-2 text-[11px]">
              Number of Image Variations
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setImageCount(n)}
                  className={`btn-press flex-1 py-2 border font-mono text-xs tracking-wider transition-all duration-200 cursor-pointer ${
                    imageCount === n
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'border-border text-muted hover:text-foreground hover:border-border-hover'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        id="generate-button"
        type="submit"
        disabled={!isReady || loading}
        className={`btn-press w-full py-4 border font-mono text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
          loading
            ? 'bg-accent/20 border-accent/30 text-accent animate-pulse'
            : isReady
            ? contentType === 'ad'
              ? 'bg-amber text-background border-amber hover:brightness-90'
              : 'bg-accent text-background border-accent hover:bg-accent-dim'
            : 'bg-surface border-border text-muted'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="w-4 h-4 border-2 border-accent/30 border-t-accent"
              style={{ animation: 'spin 0.8s linear infinite', borderRadius: '0' }}
            />
            {loadingStatus || 'Generating...'}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {contentType === 'ad' ? <Megaphone size={16} /> : <Sparkles size={16} />}
            {contentType === 'ad' ? 'Generate Ad →' : 'Generate Content →'}
          </span>
        )}
      </button>
    </form>
  )
}
