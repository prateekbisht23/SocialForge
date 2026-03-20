import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime"
import { Platform } from '@/types'

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
}

interface PlatformContent {
  caption: string
  hashtags: string[]
  image_prompt: string
}

export type GenerateContentResult = Record<string, PlatformContent>

/**
 * Extracts JSON from a string that may contain conversational text around it.
 * Handles nested braces correctly by counting open/close braces.
 */
function extractJSON(text: string): string | null {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  
  const start = stripped.indexOf('{')
  if (start === -1) return null
  
  let depth = 0
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++
    if (stripped[i] === '}') depth--
    if (depth === 0) {
      return stripped.substring(start, i + 1)
    }
  }
  return null
}

export async function generateWithClaude(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) are not set in environment variables.')
  }

  if (!process.env.BEDROCK_AGENT_ID) {
    throw new Error('BEDROCK_AGENT_ID is not set in environment variables.')
  }

  const client = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })

  const platformExamples = input.platforms.map(p => {
    return `"${p}": { "caption": "Your ${p} caption here", "hashtags": ["example"], "image_prompt": "A visual description" }`
  }).join(',\n    ')

  // Build tone instruction
  let toneInstruction = `- Tone: ${input.tone}`
  if (input.tone === 'custom' && input.custom_tone) {
    toneInstruction = `- Tone guidelines: ${input.custom_tone}`
  }

  // Build content type instruction
  let contentTypeInstruction = ''
  if (input.content_type === 'ad') {
    contentTypeInstruction = `\n\nIMPORTANT: This is a paid advertisement. Write short punchy copy with a clear CTA. Keep captions under 100 words per platform.`
  }

  // Build brand voice section
  let brandVoiceSection = ''
  if (input.brand_voice_text) {
    brandVoiceSection = `\n\nBrand voice document:\n${input.brand_voice_text}`
  }

  // Build brand reference images section
  let brandRefImagesSection = ''
  if (input.brand_reference_images && input.brand_reference_images.length > 0) {
    brandRefImagesSection = `\n\nBrand reference images for visual style: ${input.brand_reference_images.join(', ')}`
  }

  const userPrompt = `IMPORTANT: You must respond with ONLY a JSON object. No other text before or after.

Generate social media ${input.content_type === 'ad' ? 'ad copy' : 'posts'} for:
- Topic: ${input.topic}
${toneInstruction}
${input.brand_context ? `- Brand context: ${input.brand_context}` : ''}
- Platforms: ${input.platforms.join(', ')}${contentTypeInstruction}${brandVoiceSection}${brandRefImagesSection}

Platform rules:
- LinkedIn: professional, ${input.content_type === 'ad' ? '50-100 words' : '150-300 words'}, 3-5 hashtags
- Twitter: punchy, under 280 chars, 2-3 hashtags
- Instagram: visual-first, emoji-friendly, 5-10 hashtags
- Facebook: conversational, community-oriented, 2-4 hashtags

Respond with EXACTLY this JSON structure (no other text):
{
    ${platformExamples}
}`

  // Attempt up to 2 tries in case the agent returns conversational text
  for (let attempt = 0; attempt < 2; attempt++) {
    const command = new InvokeAgentCommand({
      agentId: process.env.BEDROCK_AGENT_ID,
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID',
      sessionId: `sf-${Date.now()}-${attempt}`,
      inputText: attempt === 0 
        ? userPrompt 
        : `Return ONLY a raw JSON object with no other text. ${userPrompt}`,
    })

    try {
      const response = await client.send(command)
      
      let text = ''
      
      if (response.completion) {
        for await (const chunk of response.completion) {
          if (chunk.chunk?.bytes) {
            text += new TextDecoder('utf-8').decode(chunk.chunk.bytes)
          }
        }
      }

      if (!text) {
        console.warn(`Attempt ${attempt + 1}: No content returned from agent`)
        continue
      }

      console.log(`Attempt ${attempt + 1} raw agent response (first 500 chars):`, text.substring(0, 500))

      const jsonStr = extractJSON(text)
      
      if (!jsonStr) {
        console.warn(`Attempt ${attempt + 1}: No JSON object found in agent response`)
        continue
      }

      const parsed = JSON.parse(jsonStr) as GenerateContentResult
      
      const hasValidKeys = input.platforms.some(p => parsed[p] && parsed[p].caption)
      if (!hasValidKeys) {
        console.warn(`Attempt ${attempt + 1}: JSON parsed but missing expected platform keys`)
        continue
      }
      
      return parsed
    } catch (error) {
      console.error(`Attempt ${attempt + 1} error:`, error)
      if (attempt === 1) {
        if (error instanceof Error) {
          throw new Error(`Bedrock API error: ${error.message}`)
        }
        throw error
      }
    }
  }

  throw new Error('Bedrock Agent did not return valid JSON after 2 attempts. Please try again.')
}
