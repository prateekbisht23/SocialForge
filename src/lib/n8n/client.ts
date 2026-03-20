/**
 * Utility functions for interacting with N8N workflows
 */

export interface AIContentRequest {
  topic: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
}

export interface N8NWebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const triggerN8NWorkflow = async (
  webhookUrl: string, 
  payload: any
): Promise<N8NWebhookResponse> => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error triggering N8N workflow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

/**
 * Triggers the AI Content creation workflow via N8N
 * This workflow should be set up to use the Claude API
 */
export const generateAIContent = async (request: AIContentRequest) => {
  const webhookUrl = process.env.N8N_AI_CONTENT_WORKFLOW_URL;
  
  if (!webhookUrl) {
    throw new Error('N8N_AI_CONTENT_WORKFLOW_URL is not defined in environment variables');
  }

  return triggerN8NWorkflow(webhookUrl, request);
};
