'use client'

import { useRef } from 'react'
import { Upload, ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void
  onDescriptionChange: (description: string) => void
  imageDescription: string
  previewUrl: string | null
}

export default function ImageUpload({
  onFileSelect,
  onDescriptionChange,
  imageDescription,
  previewUrl,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onFileSelect(file)
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Compact upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-border text-muted hover:text-foreground hover:border-border-hover transition-colors text-[11px] font-mono tracking-wider uppercase cursor-pointer"
      >
        <Upload size={12} />
        Add Image
      </button>

      {/* AI Description input */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon size={12} className="text-muted" />
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
            Or describe for AI generation
          </span>
        </div>
        <input
          id="image-description"
          type="text"
          value={imageDescription}
          onChange={(e) => {
            e.stopPropagation()
            onDescriptionChange(e.target.value)
          }}
          onKeyDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="e.g. A modern tech team collaborating in a bright office"
          className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:border-accent/50 focus:outline-none transition-colors"
          style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
        />
      </div>
    </div>
  )
}
