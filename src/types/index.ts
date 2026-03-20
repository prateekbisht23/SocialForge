export type Platform = 'linkedin' | 'twitter' | 'instagram' | 'facebook'
export type PostStatus = 'draft' | 'partial' | 'approved' | 'posted'
export type PlatformPostStatus =
  'pending' | 'approved' | 'rejected' | 'scheduled' | 'posted'
export type ScheduleStatus = 'pending' | 'triggered' | 'failed'

export interface Post {
  id: string
  user_id: string
  topic: string
  tone: string
  image_url: string | null
  platforms: Platform[]
  status: PostStatus
  created_at: string
  updated_at: string
}

export interface PlatformPost {
  id: string
  post_id: string
  platform: Platform
  caption: string
  hashtags: string[]
  image_url: string | null
  image_prompt: string | null
  status: PlatformPostStatus
  fire_at: string | null
  posted_at: string | null
  created_at: string
  updated_at: string
  posts?: Post
}

export interface Schedule {
  id: string
  platform_post_id: string
  fire_at: string
  status: ScheduleStatus
  triggered_at: string | null
  created_at: string
}

export interface GenerationLog {
  id: string
  post_id: string
  prompt: string
  response: object
  latency_ms: number
  status: 'success' | 'failed'
  created_at: string
}

export type User = {
  id: string
  email: string
  role: string
}
