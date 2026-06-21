import Anthropic from '@anthropic-ai/sdk';
import type { BlogGenerationParams, FieldSuggestions, BlogPostResult } from '../types';

let anthropic: Anthropic | null = null;
let currentApiKey: string | null = null;
let currentModel: string = 'claude-sonnet-4-6'; // 기본 모델

export function setApiKey(apiKey: string) {
  const sanitizedKey = apiKey?.trim().replace(/[^\x00-\x7F]/g, '') || '';

  if (sanitizedKey && sanitizedKey !== currentApiKey) {
    try {
      anthropic = new Anthropic({
        apiKey: sanitizedKey,
        dangerouslyAllowBrowser: true // 클라이언트 사이드에서 사용
      });
      currentApiKey = sanitizedKey;
    } catch (error) {
      console.error("Failed to initialize Anthropic with the new API key:", error);
      anthropic = null;
      currentApiKey = null;
      throw new Error("API 키 초기화에 실패했습니다. 유효한 키인지 확인해주세요.");
    }
  } else if (!sanitizedKey) {
    anthropic = null;
    currentApiKey = null;
  }
}

const VALID_MODELS = new Set(['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']);
// 구버전 ID → 최신 ID 매핑 (저장된 옛 값 방어)
const LEGACY_MODELS: Record<string, string> = {
  'claude-3.5-sonnet': 'claude-sonnet-4-6',
  'claude-3-5-sonnet': 'claude-sonnet-4-6',
  'claude-3-opus': 'claude-opus-4-8',
  'claude-3-haiku': 'claude-haiku-4-5',
};

export function setModel(model: string) {
  // 최신 모델 ID만 허용. 구버전/미지원 값은 매핑하거나 기본값으로 보정.
  if (VALID_MODELS.has(model)) currentModel = model;
  else currentModel = LEGACY_MODELS[model] || 'claude-sonnet-4-6';
}

const getAnthropicInstance = (): Anthropic => {
  if (!anthropic) {
    const savedApiKeys = localStorage.getItem('ai_api_keys');
    let storedApiKey = '';
    if (savedApiKeys) {
      try {
        const parsedKeys = JSON.parse(savedApiKeys);
        storedApiKey = (parsedKeys.anthropic || '').trim();
      } catch (e) {
        console.error('API 키 파싱 오류:', e);
      }
    }
    if (storedApiKey) {
      setApiKey(storedApiKey);
      if (anthropic) return anthropic;
    }
    throw new Error(
      "Anthropic(Claude) API 키가 설정되지 않았습니다.\n\n" +
      "상단 메뉴에서 'AI 설정'으로 이동하여 API 키를 입력해주세요.\n" +
      "API 키는 Anthropic Console(https://console.anthropic.com/settings/keys)에서 발급받을 수 있습니다."
    );
  }
  return anthropic;
};

// Helper function to generate user-friendly error message
const getUserFriendlyErrorMessage = (error: any): string => {
  const errorMessage = error?.message || String(error);

  if (error?.status === 401 || errorMessage.includes('authentication') || errorMessage.includes('API key')) {
    return 'API 키가 유효하지 않습니다. AI 설정에서 API 키를 확인해주세요.';
  }

  if (error?.status === 429 || errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
    return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
  }

  if (errorMessage.includes('credit') || errorMessage.includes('billing')) {
    return 'API 크레딧이 부족합니다. Anthropic 계정에서 사용량/결제를 확인해주세요.';
  }

  return errorMessage || '알 수 없는 오류가 발생했습니다.';
};

// 마크다운 코드 펜스(```json ... ```)를 제거하고 JSON 본문만 추출
const extractJson = (text: string): string => {
  let cleaned = text.trim();
  // ```json ... ``` 또는 ``` ... ``` 펜스 제거
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  // 앞뒤 잡텍스트가 있을 경우 첫 { 또는 [ 부터 마지막 } 또는 ] 까지 추출
  const firstBrace = cleaned.search(/[{[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

// 응답에서 텍스트 블록만 합쳐 반환
const getResponseText = (response: Anthropic.Message): string => {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
};

// Call Anthropic with retry logic for rate limits
const callAnthropicWithRetry = async (
  system: string,
  userContent: string,
  maxTokens: number,
  maxRetries: number = 2
): Promise<string> => {
  const client = getAnthropicInstance();
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 주의: Opus 4.8 / Sonnet 4.6 등 최신 모델은 temperature 등 sampling 파라미터를 보내면 400 에러가 발생하므로 전송하지 않는다.
      const response = await client.messages.create({
        model: currentModel,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userContent }],
      });

      const content = getResponseText(response);
      if (!content) {
        throw new Error('Claude로부터 응답을 받지 못했습니다.');
      }
      return content;
    } catch (error: any) {
      lastError = error;

      const isRateLimit = error?.status === 429 ||
                          error?.message?.includes('rate_limit') ||
                          error?.message?.includes('429');

      if (isRateLimit && attempt < maxRetries) {
        const retryDelay = 3000 * (attempt + 1); // 3초, 6초, 9초...
        console.log(`${currentModel} rate limit exceeded. Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

export const generateSeoTopics = async (prompt: string): Promise<string[]> => {
  try {
    if (!prompt) throw new Error("주제 생성을 위한 프롬프트가 비어있습니다.");

    const system = "당신은 SEO 전문가입니다. 주어진 요청에 따라 블로그 주제를 JSON 형식으로 생성합니다.";
    const userContent = `${prompt}\n\n응답은 다음 JSON 형식으로만 제공하세요. 다른 설명이나 마크다운 코드블록 없이 순수 JSON만 출력하세요:\n{"topics": ["주제1", "주제2", "주제3", "주제4", "주제5"]}`;

    const response = await callAnthropicWithRetry(system, userContent, 2048);
    const result = JSON.parse(extractJson(response));

    return result.topics || [];
  } catch (error) {
    console.error("Claude 주제 생성 오류:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
};

export const generateFieldSuggestions = async (prompt: string): Promise<FieldSuggestions> => {
  try {
    if (!prompt) {
      throw new Error("필드 추천을 위한 프롬프트가 비어있습니다.");
    }

    const system = "당신은 블로그 콘텐츠 전문가입니다. 주어진 주제에 대한 키워드, 타겟 독자, 인사이트를 JSON 형식으로 생성합니다.";
    const userContent = `${prompt}\n\n응답은 다음 JSON 형식으로만 제공하세요. 다른 설명이나 마크다운 코드블록 없이 순수 JSON만 출력하세요:\n{"keywords": ["키워드1", "키워드2"], "targetAudience": ["독자1", "독자2", "독자3"], "writerInsight": "인사이트 내용..."}`;

    const response = await callAnthropicWithRetry(system, userContent, 2048);
    const result = JSON.parse(extractJson(response));

    return {
      keywords: result.keywords || [],
      targetAudience: result.targetAudience || [],
      writerInsight: result.writerInsight || ''
    };
  } catch (error) {
    console.error("Claude 필드 추천 생성 오류:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
};

export const generateBlogPost = async (prompt: string, _useSearch: boolean = false): Promise<BlogPostResult> => {
  try {
    if (!prompt) {
      throw new Error("글 생성을 위한 프롬프트가 비어있습니다.");
    }

    const system = "당신은 전문 블로그 작가입니다. SEO 최적화된 고품질 블로그 포스트를 작성합니다.";

    // 브라우저에서 Anthropic으로 직접 호출 (서버리스 경유 없음 → 시간 제한 없음).
    // Claude는 기본 제공 웹 검색을 사용하지 않으므로 sources는 비워둔다.
    const text = await callAnthropicWithRetry(system, prompt, 16000);

    return {
      text,
      sources: []
    };
  } catch (error) {
    console.error("Claude 블로그 포스트 생성 오류:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
};

// 이미지 프롬프트 생성 (Midjourney/Imagen용)
export const generateImagePrompt = async (koreanPrompt: string, customPromptTemplate?: string): Promise<string> => {
  console.log('Generating image prompt with Claude for:', koreanPrompt);

  const defaultTemplate = `다음 한국어 이미지 설명을 이미지 생성 AI에 최적화된 영문 프롬프트로 변환해주세요.

한국어 설명: "\${koreanPrompt}"

변환 규칙:
1. 구체적이고 시각적인 디테일 포함
2. 카메라 앵글, 조명, 스타일 추가
3. 간결하고 명확한 영문 설명 작성
4. 한국적 특성이 있다면 "Korean", "Seoul", "K-style" 등의 키워드 포함
5. 사진 스타일인 경우: "photorealistic, high quality, professional photography" 추가

출력 형식: 영문 프롬프트만 출력하고 다른 설명은 하지 마세요.`;

  const template = customPromptTemplate || defaultTemplate;
  const enhancePrompt = template.replace(/\$\{koreanPrompt\}/g, koreanPrompt);

  try {
    const system = "당신은 이미지 생성 프롬프트 전문가입니다. 한국어 설명을 영문 이미지 프롬프트로 변환합니다.";
    const enhancedPrompt = await callAnthropicWithRetry(system, enhancePrompt, 2048);
    console.log('Generated image prompt with Claude:', enhancedPrompt);
    return enhancedPrompt.trim();
  } catch (error: any) {
    console.error("Claude 이미지 프롬프트 생성 실패:", error.message);

    // 실패 시 기본 번역 폴백
    const basicPrompt = koreanPrompt
      .replace(/한국인/g, 'Korean person')
      .replace(/한국적/g, 'Korean style')
      .replace(/블로그/g, 'blog')
      .replace(/컴퓨터/g, 'computer')
      .replace(/스마트폰/g, 'smartphone')
      .replace(/사무실/g, 'office')
      .replace(/카페/g, 'cafe');

    return `${basicPrompt}, photorealistic, high quality, professional photography, clean composition`;
  }
};
