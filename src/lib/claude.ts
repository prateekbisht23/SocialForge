import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime'
import { Platform } from '@/types'
import {
  buildPreprocessingPrompt,
  buildMainPrompt,
  buildPostprocessingPrompt,
} from './prompts'

// ─── Types ─────────────────────────────────────────────────────────

interface GenerateContentInput {
  content_type: 'post' | 'ad'
  topic: string
  tone: string
  custom_tone?: string
  brand_voice_text?: string
  platforms: Platform[]
  brand_context?: string
  image_url?: string | null
  brand_reference_images?: string[]
  creativity?: number
}

interface PlatformContent {
  caption: string
  hashtags: string[]
  image_prompt: string
}

export type GenerateContentResult = Record<string, PlatformContent>

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Safely parse a string that should contain JSON.
 * Strips markdown fences, finds the outermost JSON object.
 */
function safeParseJSON(raw: string): Record<string, unknown> {
  try {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim()
    return JSON.parse(cleaned)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Failed to parse model response as JSON')
  }
}

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

/**
 * Invoke Bedrock Amazon Nova Pro directly.
 * We must use Nova instead of Claude because the AWS account lacks a verified payment method 
 * for Anthropic Marketplace subscriptions.
 */
async function invokeNovaModel(opts: {
  client: BedrockRuntimeClient
  prompt: string
  temperature: number
  max_tokens: number
}): Promise<string> {
  const { client, prompt, temperature, max_tokens } = opts

  const command = new InvokeModelCommand({
    modelId: 'us.amazon.nova-pro-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inferenceConfig: {
        max_new_tokens: max_tokens,
        temperature: temperature,
        top_p: 0.9,
      },
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
    }),
  })

  const response = await client.send(command)
  const body = JSON.parse(new TextDecoder().decode(response.body))
  
  const text = body?.output?.message?.content?.[0]?.text
  if (!text) {
    throw new Error('Empty response from Bedrock Nova Model')
  }

  return text
}

// ─── Main 3-stage pipeline ─────────────────────────────────────────

export async function generateWithClaude(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      'AWS credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) are not set in environment variables.'
    )
  }

  // Use BedrockRuntimeClient for direct model invocation
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })

  const creativity = input.creativity ?? 0.5

  // ── Stage 1: Preprocessing ──────────────────────────────────────
  console.log('[Pipeline] Stage 1: Preprocessing...')

  const preprocessingPrompt = buildPreprocessingPrompt(
    input.topic,
    input.platforms,
    input.tone === 'custom' && input.custom_tone ? input.custom_tone : input.tone,
    input.brand_context,
    creativity,
    input.content_type
  )

  const briefRaw = await invokeNovaModel({
    client,
    prompt: preprocessingPrompt,
    temperature: 0.3, // always low for preprocessing
    max_tokens: 500,
  })

  console.log('[Pipeline] Stage 1 raw (first 300):', briefRaw.substring(0, 300))

  let parsedBrief: Record<string, unknown>
  try {
    parsedBrief = safeParseJSON(briefRaw)
  } catch (err) {
    console.error('[Pipeline] Stage 1 JSON parse failed:', err)
    throw new Error('Preprocessing stage failed: could not parse creative brief')
  }

  // ── Stage 2: Main Generation ────────────────────────────────────
  console.log('[Pipeline] Stage 2: Main generation...')

  const mainPrompt = buildMainPrompt(
    parsedBrief,
    input.topic,
    input.platforms,
    input.tone === 'custom' && input.custom_tone ? input.custom_tone : input.tone,
    input.custom_tone,
    input.brand_voice_text,
    input.brand_context,
    creativity,
    input.content_type
  )

  let mainRaw: string
  let mainParsed: Record<string, unknown>

  // First attempt
  mainRaw = await invokeNovaModel({
    client,
    prompt: mainPrompt,
    temperature: creativity,
    max_tokens: 1500,
  })

  console.log('[Pipeline] Stage 2 raw (first 500):', mainRaw.substring(0, 500))

  try {
    mainParsed = safeParseJSON(mainRaw)
  } catch {
    console.warn('[Pipeline] Stage 2 parse failed — retrying with lower temperature')
    const retryTemp = Math.max(0, creativity - 0.2)
    const retryPrompt = `Return ONLY a raw JSON object with no conversational text or markdown. ${mainPrompt}`

    mainRaw = await invokeNovaModel({
      client,
      prompt: retryPrompt,
      temperature: retryTemp,
      max_tokens: 1500,
    })

    console.log('[Pipeline] Stage 2 retry raw (first 500):', mainRaw.substring(0, 500))

    try {
      mainParsed = safeParseJSON(mainRaw)
    } catch (err) {
      console.error('[Pipeline] Stage 2 retry also failed:', err)
      throw new Error(
        'Content generation failed: model did not return valid JSON after 2 attempts.'
      )
    }
  }

  // ── Stage 3: Postprocessing ─────────────────────────────────────
  console.log('[Pipeline] Stage 3: Postprocessing...')

  const postPrompt = buildPostprocessingPrompt(
    JSON.stringify(mainParsed, null, 2),
    input.platforms
  )

  const cleanedRaw = await invokeNovaModel({
    client,
    prompt: postPrompt,
    temperature: 0.1, // always near-zero for validation
    max_tokens: 1500,
  })

  console.log('[Pipeline] Stage 3 raw (first 500):', cleanedRaw.substring(0, 500))

  let finalResult: GenerateContentResult
  try {
    finalResult = safeParseJSON(cleanedRaw) as GenerateContentResult
  } catch (err) {
    console.error('[Pipeline] Stage 3 JSON parse failed:', err)
    console.warn('[Pipeline] Falling back to Stage 2 output')
    finalResult = mainParsed as GenerateContentResult
  }

  const hasValidKeys = input.platforms.some(
    (p) => finalResult[p] && finalResult[p].caption
  )
  if (!hasValidKeys) {
    throw new Error(
      'Generated content is missing expected platform keys. Please try again.'
    )
  }

  console.log('[Pipeline] All 3 stages complete. Platforms:', Object.keys(finalResult))

  return finalResult
}
