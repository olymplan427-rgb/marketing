import OpenAI from 'openai';
import type { BlogGenerationParams, FieldSuggestions, BlogPostResult } from '../types';

let openai: OpenAI | null = null;
let currentApiKey: string | null = null;
let currentModel: string = 'gpt-4o'; // 기본 모델

export function setApiKey(apiKey: string) {
  const sanitizedKey = apiKey?.trim().replace(/[^\x00-\x7F]/g, '') || '';

  if (sanitizedKey && sanitizedKey !== currentApiKey) {
    try {
      openai = new OpenAI({
        apiKey: sanitizedKey,
        dangerouslyAllowBrowser: true // 클라이언트 사이드에서 사용
      });
      currentApiKey = sanitizedKey;
    } catch (error) {
      console.error("Failed to initialize OpenAI with the new API key:", error);
      openai = null;
      currentApiKey = null;
      throw new Error("API 키 초기화에 실패했습니다. 유효한 키인지 확인해주세요.");
    }
  } else if (!sanitizedKey) {
    openai = null;
    currentApiKey = null;
  }
}

export function setModel(model: string) {
  // UI에서 표시되는 모델명을 실제 OpenAI API 모델명으로 매핑
  const modelMapping: Record<string, string> = {
    'gpt-5': 'gpt-4o',  // GPT-5는 현재 gpt-4o로 매핑
    'gpt-5-mini': 'gpt-4o-mini',  // GPT-5-mini는 gpt-4o-mini로 매핑
    'gpt-4.1': 'gpt-4o',
    'gpt-4.1-mini': 'gpt-4o-mini',
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4-turbo',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
  };

  currentModel = modelMapping[model] || model;
}

const getOpenAIInstance = (): OpenAI => {
  if (!openai) {
    const savedApiKeys = localStorage.getItem('ai_api_keys');
    let storedApiKey = '';
    if (savedApiKeys) {
      try {
        const parsedKeys = JSON.parse(savedApiKeys);
        storedApiKey = (parsedKeys.openai || '').trim();
      } catch (e) {
        console.error('API 키 파싱 오류:', e);
      }
    }
    if (storedApiKey) {
      setApiKey(storedApiKey);
      if (openai) return openai;
    }
    throw new Error(
      "OpenAI API 키가 설정되지 않았습니다.\n\n" +
      "상단 메뉴에서 'AI 설정'으로 이동하여 API 키를 입력해주세요.\n" +
      "API 키는 OpenAI Platform(https://platform.openai.com/api-keys)에서 발급받을 수 있습니다."
    );
  }
  return openai;
};

// Helper function to generate user-friendly error message
const getUserFriendlyErrorMessage = (error: any): string => {
  const errorMessage = error?.message || String(error);

  if (errorMessage.includes('API key')) {
    return 'API 키가 유효하지 않습니다. AI 설정에서 API 키를 확인해주세요.';
  }

  if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
    return 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
  }

  if (errorMessage.includes('quota')) {
    return 'API 할당량을 초과했습니다. OpenAI 계정에서 사용량을 확인해주세요.';
  }

  return errorMessage || '알 수 없는 오류가 발생했습니다.';
};

// Call OpenAI with retry logic for rate limits
const callOpenAIWithRetry = async (
  messages: any[],
  jsonMode: boolean = false,
  maxRetries: number = 2
): Promise<string> => {
  const client = getOpenAIInstance();
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const requestParams: any = {
        model: currentModel,
        messages,
        temperature: 0.7,
      };

      if (jsonMode) {
        requestParams.response_format = { type: "json_object" };
      }

      const response = await client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI로부터 응답을 받지 못했습니다.');
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
        await new Promise(resolve => setTimeout(resolve, retryDelay));
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

    const messages = [
      {
        role: "system",
        content: "당신은 SEO 전문가입니다. 주어진 요청에 따라 블로그 주제를 JSON 형식으로 생성합니다."
      },
      {
        role: "user",
        content: `${prompt}\n\n응답은 다음 JSON 형식으로만 제공하세요:\n{"topics": ["주제1", "주제2", "주제3", "주제4", "주제5"]}`
      }
    ];

    const response = await callOpenAIWithRetry(messages, true);
    const result = JSON.parse(response);

    return result.topics || [];
  } catch (error) {
    console.error("OpenAI 주제 생성 오류:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
};

export const generateFieldSuggestions = async (prompt: string): Promise<FieldSuggestions> => {
  try {
    if (!prompt) {
      throw new Error("필드 추천을 위한 프롬프트가 비어있습니다.");
    }

    const messages = [
      {
        role: "system",
        content: "당신은 블로그 콘텐츠 전문가입니다. 주어진 주제에 대한 키워드, 타겟 독자, 인사이트를 JSON 형식으로 생성합니다."
      },
      {
        role: "user",
        content: `${prompt}\n\n응답은 다음 JSON 형식으로만 제공하세요:\n{"keywords": ["키워드1", "키워드2", ...], "targetAudience": ["독자1", "독자2", "독자3"], "writerInsight": "인사이트 내용..."}`
      }
    ];

    const response = await callOpenAIWithRetry(messages, true);
    const result = JSON.parse(response);

    return {
      keywords: result.keywords || [],
      targetAudience: result.targetAudience || [],
      writerInsight: result.writerInsight || ''
    };
  } catch (error) {
    console.error("OpenAI 필드 추천 생성 오류:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
};

export const generateBlogPost = async (prompt: string, useSearch: boolean = false): Promise<BlogPostResult> => {
  try {
    if (!prompt) {
      throw new Error("글 생성을 위한 프롬프트가 비어있습니다.");
    }

    const messages = [
      {
        role: "system",
        content: "당신은 전문 블로그 작가입니다. SEO 최적화된 고품질 블로그 포스트를 작성합니다."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // useSearch가 true인 경우에도 일단 기본 생성 (OpenAI는 web search 기능이 제한적)
    // 나중에 필요하면 web search API를 별도로 통합 가능
    const text = await callOpenAIWithRetry(messages, false);

    return {
      text,
      sources: [] // OpenAI는 기본적으로 source tracking이 없음
    };
  } catch (error) {
    console.error("OpenAI 블로그 포스트 생성 오류:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
};

// 이미지 프롬프트 생성 (Midjourney/Imagen용)
export const generateImagePrompt = async (koreanPrompt: string, customPromptTemplate?: string): Promise<string> => {
  console.log('Generating image prompt with OpenAI for:', koreanPrompt);

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
    const messages = [
      {
        role: "system",
        content: "당신은 이미지 생성 프롬프트 전문가입니다. 한국어 설명을 영문 이미지 프롬프트로 변환합니다."
      },
      {
        role: "user",
        content: enhancePrompt
      }
    ];

    const enhancedPrompt = await callOpenAIWithRetry(messages, false);
    console.log('Generated image prompt with OpenAI:', enhancedPrompt);
    return enhancedPrompt.trim();

  } catch (error: any) {
    console.error("OpenAI 이미지 프롬프트 생성 실패:", error.message);

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
