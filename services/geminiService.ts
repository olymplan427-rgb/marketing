import { GoogleGenAI, Type, GenerateContentResponse, PersonGeneration } from "@google/genai";
import type { BlogGenerationParams, FieldSuggestions, BlogPostResult } from '../types';

let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

export function setApiKey(apiKey: string) {
  // Sanitize API key: trim whitespace and remove any non-ASCII characters that could cause header issues
  const sanitizedKey = apiKey?.trim().replace(/[^\x00-\x7F]/g, '') || '';

  if (sanitizedKey && sanitizedKey !== currentApiKey) {
    try {
      ai = new GoogleGenAI({ apiKey: sanitizedKey });
      currentApiKey = sanitizedKey;
    } catch (error) {
      console.error("Failed to initialize GoogleGenAI with the new API key:", error);
      ai = null;
      currentApiKey = null;
      throw new Error("API 키 초기화에 실패했습니다. 유효한 키인지 확인해주세요.");
    }
  } else if (!sanitizedKey) {
    ai = null;
    currentApiKey = null;
  }
}

const getAiInstance = (): GoogleGenAI => {
    if (!ai) {
        // localStorage에서 API 키 확인
        const savedApiKeys = localStorage.getItem('ai_api_keys');
        let storedApiKey = '';

        if (savedApiKeys) {
            try {
                const parsedKeys = JSON.parse(savedApiKeys);
                storedApiKey = (parsedKeys.gemini || '').trim();
            } catch (e) {
                console.error('API 키 파싱 오류:', e);
            }
        }

        if (storedApiKey) {
            setApiKey(storedApiKey);
            if(ai) return ai;
        }

        // API 키가 없으면 명확한 에러 메시지 표시
        throw new Error(
            "Gemini API 키가 설정되지 않았습니다.\n\n" +
            "상단 메뉴에서 'AI 설정'으로 이동하여 API 키를 입력해주세요.\n" +
            "API 키는 Google AI Studio(https://aistudio.google.com/app/apikey)에서 발급받을 수 있습니다."
        );
    }
    return ai;
}


// Helper function to extract retry delay from error
const getRetryDelay = (error: any): number | null => {
  try {
    const errorStr = JSON.stringify(error);
    const retryMatch = errorStr.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
    if (retryMatch) {
      return Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500; // Add 500ms buffer
    }
  } catch (e) {
    // Parsing failed, return null
  }
  return null;
};

// Helper function to check if error is 429 (quota exceeded)
const is429Error = (error: any): boolean => {
  const errorStr = JSON.stringify(error);
  return errorStr.includes('"code":429') || errorStr.includes('RESOURCE_EXHAUSTED');
};

// Helper function to generate user-friendly error message
const getUserFriendlyErrorMessage = (error: any, modelName: string): string => {
  const errorStr = JSON.stringify(error);

  if (is429Error(error)) {
    const retryDelay = getRetryDelay(error);
    const waitTime = retryDelay ? Math.ceil(retryDelay / 1000) : 15;
    return `Gemini API ${modelName} 모델의 무료 할당량을 초과했습니다.\n\n${waitTime}초 후에 다시 시도하거나, 잠시 후 다시 이용해주세요.\n\n할당량 확인: https://ai.dev/usage?tab=rate-limit`;
  }

  if (errorStr.includes('API_KEY_INVALID')) {
    return 'API 키가 유효하지 않습니다. AI 설정에서 API 키를 확인해주세요.';
  }

  return error.message || '알 수 없는 오류가 발생했습니다.';
};

// Call Gemini with retry logic for 429 errors
const callModelWithRetry = async (
  aiInstance: GoogleGenAI,
  model: string,
  contents: string,
  schema: any,
  maxRetries: number = 2
): Promise<any> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await aiInstance.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const jsonText = response.text || "{}";
      return JSON.parse(jsonText);

    } catch (error: any) {
      lastError = error;

      // Check if it's a 429 error and we have retries left
      if (is429Error(error) && attempt < maxRetries) {
        const retryDelay = getRetryDelay(error) || 3000;
        console.log(`${model} rate limit exceeded. Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Not a 429 error or out of retries, throw the error
      throw error;
    }
  }

  throw lastError;
};

const callGeminiWithSchema = async (contents: string, schema: any) => {
  const aiInstance = getAiInstance();

  // Flash 모델을 먼저 시도 (Pro는 free tier quota가 0)
  try {
    console.log("Trying Flash model first...");
    return await callModelWithRetry(aiInstance, "gemini-2.5-flash", contents, schema);
  } catch (flashError: any) {
    console.warn("Flash model failed:", flashError.message);

    // Flash 실패 시 Pro 시도 (혹시 Pro quota가 있을 수 있음)
    try {
      console.log("Flash failed, trying Pro model...");
      return await callModelWithRetry(aiInstance, "gemini-2.5-pro", contents, schema);
    } catch (proError: any) {
      console.error("Both Flash and Pro models failed");

      // 더 유용한 에러 메시지 제공
      const flashErrorMsg = getUserFriendlyErrorMessage(flashError, 'Flash');
      const proErrorMsg = getUserFriendlyErrorMessage(proError, 'Pro');

      throw new Error(
        `AI 모델 호출에 실패했습니다.\n\nFlash: ${flashErrorMsg}\n\nPro: ${proErrorMsg}`
      );
    }
  }
};

export const generateSeoTopics = async (prompt: string): Promise<string[]> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "SEO-optimized blog topics for the given category and region"
      }
    }
  };

  try {
    if (!prompt) throw new Error("주제 생성을 위한 프롬프트가 비어있습니다.");
    const result = await callGeminiWithSchema(prompt, schema);
    return result.topics || [];
  } catch (error) {
    throw new Error("주제를 생성하는 데 실패했습니다.");
  }
};

export const generateFieldSuggestions = async (prompt: string): Promise<FieldSuggestions> => {
  if (!prompt) {
    throw new Error("필드 추천을 위한 프롬프트가 비어있습니다.");
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "5개 이상의 관련 SEO 키워드 및 태그 목록. 예: ['#키워드1', '#키워드2']"
      },
      targetAudience: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "이 주제에 관심을 가질 만한 3개의 구체적인 타겟 독자층 목록. 예: ['20대 대학생', '마케팅 초보자']"
      },
      writerInsight: {
        type: Type.STRING,
        description: "이 주제에 대해 작가가 제시할 수 있는 독특하고 흥미로운 1~2문단의 인사이트 또는 경험담."
      }
    },
    required: ["keywords", "targetAudience", "writerInsight"]
  };
  
  try {
    const result = await callGeminiWithSchema(prompt, schema);
    return result as FieldSuggestions;
  } catch (error) {
    console.error("Error generating field suggestions:", error);
    throw new Error("필드 추천 값을 생성하는 데 실패했습니다.");
  }
};

// Helper function to process blog post response
const processBlogPostResponse = (response: GenerateContentResponse, useSearch: boolean, modelName: string): BlogPostResult => {
  const text = response.text || "";
  let sources = useSearch
      ? (response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((chunk: any) => chunk.web)
          .filter(Boolean) as { uri: string; title: string }[]) || []
      : [];

  // AI 응답에서 참고자료 제목을 추출하여 sources에 매핑
  if (useSearch && sources.length > 0) {
    const referencesMatch = text.match(/참고(?:\s*자료|문헌|출처)?:\s*(.+?)(?=\n\n|$)/s);
    if (referencesMatch) {
      const referencesText = referencesMatch[1].trim();
      const referenceLines = referencesText.split('\n')
        .map(line => line.trim())
        .filter(line => line.match(/^[-•\d.]\s*.+/))
        .map(line => line.replace(/^[-•\d.]\s*/, '').trim())
        .map(line => line.replace(/^["']|["']$/g, '').trim())
        .map(line => line.split(/\s*-\s*(?:URL:|http)/)[0].trim())
        .filter(line => line.length > 5);

      // AI가 제공한 제목을 sources에 매핑
      sources = sources.map((source, idx) => {
        if (idx < referenceLines.length && referenceLines[idx]) {
          return { ...source, title: referenceLines[idx] };
        }
        // 제목을 찾지 못한 경우 도메인 이름 정리
        const domainTitle = source.title.replace(/\.com$|\.co\.kr$|\.kr$|\.net$/i, '');
        return { ...source, title: `${domainTitle} 기사` };
      });

      console.log(`🎯 Blog post sources with titles (${modelName}):`, JSON.stringify(sources, null, 2));
    }
  }

  return { text, sources };
};

// Call blog post generation with retry logic
const callBlogPostWithRetry = async (
  aiInstance: GoogleGenAI,
  model: string,
  prompt: string,
  config: any,
  useSearch: boolean,
  maxRetries: number = 2
): Promise<BlogPostResult> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      return processBlogPostResponse(response, useSearch, model);

    } catch (error: any) {
      lastError = error;

      // Check if it's a 429 error and we have retries left
      if (is429Error(error) && attempt < maxRetries) {
        const retryDelay = getRetryDelay(error) || 3000;
        console.log(`${model} rate limit exceeded. Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Not a 429 error or out of retries, throw the error
      throw error;
    }
  }

  throw lastError;
};

export const generateBlogPost = async (prompt: string, useSearch: boolean = false): Promise<BlogPostResult> => {
  if (!prompt) {
      throw new Error("글 생성을 위한 프롬프트가 비어있습니다.");
  }

  const aiInstance = getAiInstance();
  const config: any = {};
  if (useSearch) {
    config.tools = [{googleSearch: {}}];
  }

  // 1순위: gemini-3.1-pro-preview
  try {
    console.log("Trying gemini-3.1-pro-preview for blog post...");
    return await callBlogPostWithRetry(aiInstance, "gemini-3.1-pro-preview", prompt, config, useSearch);
  } catch (proError: any) {
    console.warn("gemini-3.1-pro-preview failed, trying gemini-3.1-flash-lite-preview:", proError.message);

    // 2순위: gemini-3.1-flash-lite-preview
    try {
      console.log("Trying gemini-3.1-flash-lite-preview for blog post...");
      return await callBlogPostWithRetry(aiInstance, "gemini-3.1-flash-lite-preview", prompt, config, useSearch);
    } catch (flashError: any) {
      console.warn("gemini-3.1-flash-lite-preview failed, trying gemini-2.5-pro:", flashError.message);

      // 폴백: gemini-2.5-pro
      try {
        console.log("Trying gemini-2.5-pro for blog post...");
        return await callBlogPostWithRetry(aiInstance, "gemini-2.5-pro", prompt, config, useSearch);
      } catch (fallbackError: any) {
        console.error("All models failed for blog post");
        throw new Error(
          `블로그 글 생성에 실패했습니다.\n\n` +
          `3.1-pro-preview: ${getUserFriendlyErrorMessage(proError, '3.1-pro-preview')}\n\n` +
          `3.1-flash-lite-preview: ${getUserFriendlyErrorMessage(flashError, '3.1-flash-lite-preview')}\n\n` +
          `2.5-pro: ${getUserFriendlyErrorMessage(fallbackError, '2.5-pro')}`
        );
      }
    }
  }
};

// Call text generation with retry logic
const callTextGenerationWithRetry = async (
  aiInstance: GoogleGenAI,
  model: string,
  prompt: string,
  maxRetries: number = 2
): Promise<string> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await aiInstance.models.generateContent({
        model,
        contents: prompt,
      });

      return (response.text || "").trim();

    } catch (error: any) {
      lastError = error;

      // Check if it's a 429 error and we have retries left
      if (is429Error(error) && attempt < maxRetries) {
        const retryDelay = getRetryDelay(error) || 3000;
        console.log(`${model} rate limit exceeded. Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Not a 429 error or out of retries, throw the error
      throw error;
    }
  }

  throw lastError;
};

// Midjourney용 프롬프트 생성 (--ar, --style 등 파라미터 포함)
export const generateMidjourneyPrompt = async (koreanPrompt: string, customPromptTemplate?: string): Promise<string> => {
  console.log('Generating Midjourney prompt for:', koreanPrompt);

  const defaultTemplate = `다음 한국어 이미지 설명을 Midjourney에 최적화된 영문 프롬프트로 변환해주세요.

한국어 설명: "\${koreanPrompt}"

변환 규칙:
1. 구체적이고 시각적인 디테일 포함
2. 카메라 앵글, 조명, 스타일 추가
3. Midjourney에서 좋은 결과를 내는 키워드 사용
4. 적절한 화질 및 스타일 파라미터 추가 (--ar 16:9, --style raw, --v 6 등)
5. 한국적 특성이 있다면 "Korean", "Seoul", "K-style" 등의 키워드 포함

출력 형식: 영문 프롬프트만 출력하고 다른 설명은 하지 마세요.`;

  const template = customPromptTemplate || defaultTemplate;
  const enhancePrompt = template.replace(/\$\{koreanPrompt\}/g, koreanPrompt);

  const aiInstance = getAiInstance();

  // Flash 모델 직접 사용 (Pro 할당량 절약)
  try {
    const enhancedPrompt = await callTextGenerationWithRetry(aiInstance, "gemini-2.5-flash", enhancePrompt);
    console.log('Generated Midjourney prompt with Flash:', enhancedPrompt);
    return enhancedPrompt;

  } catch (error: any) {
    console.error("Flash model failed for Midjourney prompt:", error.message);

    // Flash 실패 시 기본 번역 폴백
    const basicPrompt = koreanPrompt
      .replace(/한국인/g, 'Korean person')
      .replace(/한국적/g, 'Korean style')
      .replace(/블로그/g, 'blog')
      .replace(/컴퓨터/g, 'computer')
      .replace(/스마트폰/g, 'smartphone')
      .replace(/사무실/g, 'office')
      .replace(/카페/g, 'cafe');

    return `${basicPrompt}, photorealistic, high quality, professional photography, clean composition --ar 16:9 --style raw --v 6`;
  }
};

// Imagen AI용 프롬프트 생성 (파라미터 없음, 순수 설명문)
export const generateImagenPrompt = async (koreanPrompt: string, customPromptTemplate?: string): Promise<string> => {
  console.log('Generating Imagen prompt for:', koreanPrompt);

  const defaultTemplate = `다음 한국어 이미지 설명을 Imagen AI에 최적화된 영문 프롬프트로 변환해주세요.

한국어 설명: "\${koreanPrompt}"

변환 규칙:
1. 구체적이고 시각적인 디테일 포함
2. 카메라 앵글, 조명, 스타일 추가
3. 간결하고 명확한 영문 설명 작성
4. 한국적 특성이 있다면 "Korean", "Seoul", "K-style" 등의 키워드 포함
5. 사진 스타일인 경우: "photorealistic, high quality, professional photography" 추가
6. Midjourney 스타일 파라미터(--ar, --style, --v 등)는 절대 포함하지 말 것

출력 형식: 영문 프롬프트만 출력하고 다른 설명은 하지 마세요.`;

  const template = customPromptTemplate || defaultTemplate;
  const enhancePrompt = template.replace(/\$\{koreanPrompt\}/g, koreanPrompt);

  const aiInstance = getAiInstance();

  // Flash 모델 직접 사용 (Pro 할당량 절약)
  try {
    const enhancedPrompt = await callTextGenerationWithRetry(aiInstance, "gemini-2.5-flash", enhancePrompt);
    console.log('Generated Imagen prompt with Flash:', enhancedPrompt);
    return enhancedPrompt;

  } catch (error: any) {
    console.error("Flash model failed for Imagen prompt:", error.message);

    // Flash 실패 시 기본 번역 폴백
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

// 나노바나나 이미지 생성 시 시도할 모델 목록 (우선순위 순)
const NANO_BANANA_MODELS = [
  'gemini-3.1-flash-image-preview',   // 1순위: 나노바나나 2 (최신, 2026.02)
  'gemini-2.5-flash-image',           // 2순위: 나노바나나 (안정)
  'gemini-2.0-flash-exp-image-generation', // 폴백: 실험적 버전
];

const tryGenerateImageWithModel = async (
  aiInstance: GoogleGenAI,
  model: string,
  prompt: string
): Promise<{ imageUrl: string }> => {
  console.log(`나노바나나 모델 시도: ${model}`);

  const response = await aiInstance.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    } as any,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts as any[]) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType ?? 'image/png';
      const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
      console.log(`나노바나나 이미지 생성 성공 (모델: ${model})`);
      return { imageUrl };
    }
  }

  throw new Error('이미지 데이터를 찾을 수 없습니다.');
};

export const generateImageWithNanoBanana = async (prompt: string, retryCount = 0): Promise<{ imageUrl: string }> => {
  const maxRetries = 3;

  try {
    console.log('나노바나나로 이미지 생성 중:', prompt);

    const aiInstance = getAiInstance();

    // 모델 목록을 순서대로 시도
    let lastModelError: any = null;
    for (const model of NANO_BANANA_MODELS) {
      try {
        return await tryGenerateImageWithModel(aiInstance, model, prompt);
      } catch (modelError: any) {
        const errorStr = JSON.stringify(modelError);
        // 404(모델 없음)이나 405(지원 안 함)면 다음 모델 시도
        if (errorStr.includes('"code":404') || errorStr.includes('"code":405') || errorStr.includes('NOT_FOUND')) {
          console.warn(`모델 ${model} 사용 불가, 다음 모델 시도...`);
          lastModelError = modelError;
          continue;
        }
        // 다른 에러(429 등)는 바로 throw
        throw modelError;
      }
    }

    // 모든 모델 실패
    throw lastModelError || new Error('사용 가능한 나노바나나 모델을 찾을 수 없습니다.');

  } catch (error: any) {
    console.error('나노바나나 이미지 생성 오류:', error);

    const errorStr = JSON.stringify(error);
    const is429 = errorStr.includes('"code":429') || errorStr.includes('RESOURCE_EXHAUSTED');

    if (is429 && retryCount < maxRetries) {
      let retryDelay = 3000;
      try {
        const retryMatch = errorStr.match(/"retryDelay":"(\d+)s"/);
        if (retryMatch) retryDelay = parseInt(retryMatch[1]) * 1000 + 500;
      } catch (e) { /* 파싱 실패 시 기본값 사용 */ }

      console.log(`Rate limit 초과. ${retryDelay}ms 후 재시도... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return generateImageWithNanoBanana(prompt, retryCount + 1);
    }

    let errorMessage = error.message || JSON.stringify(error);
    if (is429) {
      errorMessage = '무료 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else if (errorStr.includes('INVALID_ARGUMENT')) {
      errorMessage = '유효하지 않은 요청입니다. 프롬프트를 확인해주세요.';
    } else if (errorStr.includes('billed users') || errorStr.includes('API_KEY_INVALID')) {
      errorMessage = 'API 키를 확인해주세요. AI 설정에서 유효한 Gemini API 키를 입력해주세요.';
    }

    throw new Error(errorMessage);
  }
};

export const generateImageWithGemini = async (prompt: string, retryCount = 0): Promise<{ imageUrl: string }> => {
  const maxRetries = 3;

  try {
    console.log('Generating image with Imagen 4.0 for:', prompt);

    const aiInstance = getAiInstance();

    // Imagen 4.0 모델 사용 (generateImages API)
    const response = await aiInstance.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
      },
    });

    // 생성된 이미지 데이터 추출
    const generatedImages = response.generatedImages;
    if (!generatedImages || generatedImages.length === 0) {
      throw new Error('이미지가 생성되지 않았습니다.');
    }

    // Base64 이미지 바이트 가져오기
    const base64ImageBytes = generatedImages[0].image?.imageBytes;
    if (!base64ImageBytes) {
      throw new Error('이미지 데이터를 찾을 수 없습니다.');
    }

    // Base64 이미지를 Data URL로 변환
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

    console.log('Successfully generated image with Imagen 4.0');
    return { imageUrl };

  } catch (error: any) {
    console.error("Error generating image with Gemini:", error);

    // 429 에러 (할당량 초과) 처리
    const errorStr = JSON.stringify(error);
    const is429Error = errorStr.includes('"code":429') || errorStr.includes('RESOURCE_EXHAUSTED');

    if (is429Error && retryCount < maxRetries) {
      // RetryInfo에서 대기 시간 추출 (기본 3초)
      let retryDelay = 3000;
      try {
        const retryMatch = errorStr.match(/"retryDelay":"(\d+)s"/);
        if (retryMatch) {
          retryDelay = parseInt(retryMatch[1]) * 1000 + 500; // 여유 시간 추가
        }
      } catch (e) {
        // 파싱 실패 시 기본값 사용
      }

      console.log(`Rate limit exceeded. Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

      // 지정된 시간 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return generateImageWithGemini(prompt, retryCount + 1);
    }

    // 사용자 친화적 에러 메시지
    let errorMessage = error.message || JSON.stringify(error);

    if (is429Error) {
      errorMessage = '무료 할당량을 초과했습니다. 잠시 후 다시 시도하거나, Midjourney 프롬프트를 사용해 수동으로 이미지를 생성하세요.';
    } else if (errorStr.includes('INVALID_ARGUMENT')) {
      errorMessage = '유효하지 않은 요청입니다. 프롬프트를 확인해주세요.';
    } else if (errorStr.includes('billed users')) {
      errorMessage = 'Imagen API는 유료 사용자만 사용 가능합니다. Midjourney 프롬프트를 사용해 수동으로 이미지를 생성하세요.';
    }

    throw new Error(errorMessage);
  }
};

/**
 * Instagram 캡션 생성
 * @param imageDescription - 이미지 설명 또는 주제
 * @param tone - 톤앤매너 (예: 'casual', 'professional', 'friendly')
 * @returns 생성된 캡션
 */
export const generateInstagramCaption = async (
  imageDescription: string,
  tone: string = 'friendly'
): Promise<string> => {
  try {
    const aiInstance = getAiInstance();

    const prompt = `당신은 Instagram 캡션을 작성하는 전문가입니다.

다음 이미지에 대한 매력적인 Instagram 캡션을 작성해주세요:

이미지 설명: ${imageDescription}
톤앤매너: ${tone}

요구사항:
- 2-3문장으로 간결하게 작성
- 이모지를 적절히 활용 (과하지 않게)
- 사용자의 참여를 유도하는 문구 포함
- 한국어로 작성
- 해시태그는 포함하지 말 것 (별도로 생성됨)

캡션만 출력하세요:`;

    const caption = await callTextGenerationWithRetry(aiInstance, "gemini-2.5-flash", prompt);
    return caption.trim();

  } catch (error: any) {
    console.error("Instagram 캡션 생성 실패:", error);
    throw new Error(`캡션 생성 실패: ${error.message}`);
  }
};

/**
 * Instagram 해시태그 생성
 * @param imageDescription - 이미지 설명 또는 주제
 * @param caption - 생성된 캡션 (선택)
 * @param maxHashtags - 최대 해시태그 개수 (기본값: 10)
 * @returns 생성된 해시태그 배열
 */
export const generateInstagramHashtags = async (
  imageDescription: string,
  caption?: string,
  maxHashtags: number = 10
): Promise<string[]> => {
  try {
    const aiInstance = getAiInstance();

    const prompt = `당신은 Instagram 해시태그를 추천하는 전문가입니다.

다음 정보를 바탕으로 효과적인 Instagram 해시태그를 추천해주세요:

이미지 설명: ${imageDescription}
${caption ? `캡션: ${caption}` : ''}

요구사항:
- ${maxHashtags}개 이하의 해시태그 추천
- 한국어와 영어 해시태그를 적절히 섞어서 사용
- 인기 해시태그와 틈새 해시태그를 균형있게 조합
- '#' 기호 포함
- 각 해시태그는 새 줄에 작성

해시태그 목록 (한 줄에 하나씩):`;

    const response = await callTextGenerationWithRetry(aiInstance, "gemini-2.5-flash", prompt);

    // 응답을 줄 단위로 분리하고, '#'으로 시작하는 것만 필터링
    const hashtags = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('#'))
      .slice(0, maxHashtags);

    return hashtags;

  } catch (error: any) {
    console.error("Instagram 해시태그 생성 실패:", error);
    throw new Error(`해시태그 생성 실패: ${error.message}`);
  }
};

/**
 * Instagram 포스트 전체 생성 (캡션 + 해시태그)
 * memory-drawer 스타일의 프롬프트와 논리를 완벽하게 복제
 * @returns 질문과 캡션(해시태그 포함)
 */
export const generateInstagramPost = async (): Promise<{ question: string; caption: string }> => {
  try {
    const aiInstance = getAiInstance();

    const prompt = `
# 기억의 서랍 확장형 맥락 일치 질문 생성 시스템

## STEP 1: 동적 맥락 매트릭스 생성 (Tree of Thoughts 적용)

다음 **확장된 상황-감각-감정 매트릭스**에서 자연스럽게 조합되는 요소들을 선택하세요:

### 🎯 상황별 자연스러운 조합 매트릭스

**가사활동 관련 (8가지)**
- 요리하실때 → [냄새, 콧노래, 손짓, 등] → [편안함, 따뜻함, 그리움, 만족감]
- 청소하실때 → [뒷모습, 손짓, 습관, 숨소리] → [뿌듯함, 안쓰러움, 감사, 애틋함]
- 빨래하실때 → [손길, 표정, 습관, 어깨] → [편안함, 그리움, 따뜻함, 고마움]
- 정리하실때 → [뒷모습, 표정, 손짓, 걸음걸이] → [자랑스러움, 뿌듯함, 감사, 든든함]

**소통/관계 관련 (10가지)**
- 전화통화중 → [목소리, 말투, 웃음소리, 한숨] → [뭉클함, 보고싶음, 걱정, 사랑스러움]
- 대화하실때 → [눈빛, 표정, 목소리, 말투] → [감사, 든든함, 애틋함, 따뜻함]
- 조언하실때 → [목소리, 눈빛, 표정, 손길] → [감사, 든든함, 안쓰러움, 고마움]
- 걱정하실때 → [표정, 목소리, 눈빛, 한숨] → [미안함, 애틋함, 고마움, 서글픔]
- 자랑하실때 → [목소리, 웃음소리, 표정, 눈빛] → [자랑스러움, 뿌듯함, 행복함, 기쁨]

**여가/휴식 관련 (8가지)**
- TV시청중 → [웃음소리, 표정, 말투, 뒷모습] → [평화로움, 편안함, 행복함, 만족감]
- 독서하실때 → [표정, 뒷모습, 숨소리, 습관] → [평화로움, 편안함, 자랑스러움, 존경]
- 휴식하실때 → [숨소리, 표정, 뒷모습, 어깨] → [걱정, 애틋함, 평화로움, 안쓰러움]
- 낮잠주무실때 → [숨소리, 표정, 뒷모습] → [평화로움, 걱정, 애틋함, 따뜻함]

**외출/활동 관련 (12가지)**
- 외출준비할때 → [뒷모습, 걸음걸이, 표정, 습관] → [자랑스러움, 애틋함, 설렘, 사랑스러움]
- 산책하실때 → [걸음걸이, 뒷모습, 웃음소리, 표정] → [행복함, 평화로움, 건강함, 즐거움]
- 장보실때 → [걸음걸이, 목소리, 표정, 뒷모습] → [뿌듯함, 따뜻함, 애틋함, 고마움]
- 운동하실때 → [숨소리, 표정, 뒷모습, 걸음걸이] → [자랑스러움, 걱정, 뿌듯함, 응원]
- 병원가실때 → [표정, 걸음걸이, 뒷모습, 손길] → [걱정, 애틋함, 안쓰러움, 사랑]
- 친구만나실때 → [웃음소리, 표정, 목소리, 걸음걸이] → [행복함, 사랑스러움, 뿌듯함, 기쁨]

**건강/케어 관련 (6가지)**
- 약드실때 → [표정, 손길, 뒷모습] → [걱정, 애틋함, 안쓰러움, 사랑]
- 아프실때 → [표정, 목소리, 숨소리, 눈빛] → [걱정, 안쓰러움, 애틋함, 서글픔]
- 회복하실때 → [표정, 웃음소리, 목소리, 눈빛] → [다행스러움, 안도감, 고마움, 행복함]

**기념일/특별한날 관련 (8가지)**
- 생일날 → [웃음소리, 표정, 목소리, 눈빛] → [행복함, 기쁨, 감사, 사랑스러움]
- 명절날 → [웃음소리, 손짓, 뒷모습, 콧노래] → [따뜻함, 행복함, 그리움, 만족감]
- 기념일에 → [표정, 웃음소리, 목소리, 눈빛] → [감사, 뿌듯함, 행복함, 사랑]

## STEP 2: 자연스러운 조합 선택 과정

1. **상황 선택**: 위 52가지 세부 상황 중 하나 선택
2. **적합성 확인**: 선택된 상황에 맞는 감각요소만 사용
3. **감정 연결**: 상황과 감각요소에 자연스럽게 연결되는 감정 선택
4. **현실성 검증**: 30-50대가 실제로 경험할 법한 상황인지 확인

## STEP 3: 다양한 질문 구조 패턴

### 패턴 A: 순간 포착형
- "[시점] [대상]이 [상황]하실 때 [감각요소]에서 [감정]을 느낀 순간은?"
- "[상황] 중 [대상]의 [감각요소] 때문에 마음이 [감정]해진 기억은?"

### 패턴 B: 감정 발견형
- "[대상]의 [감각요소]를 [상황]에서 느낄 때 어떤 마음이 드나요?"
- "[시점] [상황] 중 [대상]에게서 [감정]을 발견한 순간이 있나요?"

### 패턴 C: 기억 소환형
- "[대상]과 함께 [상황]하며 [감정]했던 가장 기억에 남는 순간은?"
- "[상황]에서 [대상]의 [감각요소]가 특별히 마음에 남는 이유는?"

### 패턴 D: 변화 인식형
- "[시점] [상황]에서 [대상]의 [감각요소]가 달라 보인다고 느낀 적은?"
- "[대상]이 [상황]하시는 모습에서 [감정]을 새롭게 느끼게 된 계기는?"

### 패턴 E: 감사/애정형
- "[상황]하시는 [대상]을 보며 [감정]이 커진 순간이 있나요?"
- "[대상]의 [감각요소] 덕분에 [상황]이 더 [감정]해지는 이유는?"

## STEP 4: 시점과 대상 다양화

**[TIME_MARKER]**: [지금|요즘|최근에|어제|어느날|가끔|언젠가|순간적으로|갑자기|오늘|아침에|저녁에]

**[FAMILY_TARGET]**: [아버지|어머니|부모님]

## STEP 5: 품질 보장 체크리스트

✅ 52가지 세부 상황 중 하나 활용
✅ 상황-감각-감정 자연스러운 연결
✅ 실제 경험 가능한 현실적 내용
✅ 15-30자 내외 길이
✅ 개인적 기억 유도하는 구조
✅ "뒷모습+세월" 완전 회피
✅ "문득" 시작 완전 회피

## 최종 실행

위의 확장된 매트릭스에서 **자연스럽게 조합되는** 요소들로 질문과 캡션을 생성하세요.

**출력 형식:**
질문: [생성된 질문]
캡션: [감성 캡션 2-3줄 + 고정멘트 + 해시태그]

**캡션 구성:**
1. **감성 캡션**: 질문을 자연스럽게 풀어쓴 2-3줄 (줄바꿈 포함)
2. **고정 멘트**: "그 소중한 이야기들, 기억의 서랍에 차곡차곡 담아보세요 📖"
3. **해시태그**: "#기억의서랍 #오늘의서랍 #[상황관련태그]"

**제약사항:**
- 매번 다른 세부 상황 선택 (52가지 활용)
- 상황과 완전히 일치하는 조합만 생성
- 부자연스러운 연결 절대 금지
- 맥락적 일관성 100% 보장
- **캡션은 반드시 \\n과 \\n\\n을 사용하여 줄바꿈과 빈 줄 구분 명시**
- **최종 캡션 형태**: "감성캡션1줄\\n감성캡션2줄\\n\\n그 소중한 이야기들, 기억의 서랍에 차곡차곡 담아보세요. \\n\\n#기억의서랍 #오늘의서랍 #[상황관련태그]
JSON 형식으로 응답하세요.
`;

    const questionSchema = {
      type: Type.OBJECT,
      properties: {
        question: {
          type: Type.STRING,
          description: "30-50대 자녀의 개인적 감정과 경험을 묻는 '오늘의 질문'"
        },
        caption: {
          type: Type.STRING,
          description: "감성 캡션(2-3줄) + 고정멘트 + 해시태그 3개로 구성된 완전한 인스타그램 캡션"
        }
      },
      required: ["question", "caption"],
    };

    // Use gemini-2.5-flash as default, fallback to Pro
    const result = await callGeminiWithSchema(prompt, questionSchema);

    if (result && typeof result.question === 'string' && typeof result.caption === 'string') {
      return {
        question: result.question,
        caption: result.caption
      };
    } else {
      throw new Error("Invalid response format from API.");
    }

  } catch (error: any) {
    console.error("Instagram 포스트 생성 실패:", error);
    throw new Error(`Instagram 포스트 생성 실패: ${error.message}`);
  }
};

/**
 * memory-drawer 스타일의 컨텐츠 생성 (질문 + 완전한 캡션)
 * 소스 프로젝트와 로직을 완벽하게 일치시킴
 * @returns 질문과 완전한 캡션 (해시태그 포함)
 */
export const generateMemoryDrawerContent = async (): Promise<{ question: string; caption: string }> => {
  return await generateInstagramPost();
};
