import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Cron Job for Automatic Instagram Post Generation
 *
 * Scheduled to run daily at 9:00 AM
 *
 * Workflow:
 * 1. Get random unused text from text pool
 * 2. Generate Instagram post content (question + caption + hashtags) with AI
 * 3. Get random background image from Supabase Storage
 * 4. Save to Supabase (without final composed image - see note below)
 * 5. Mark text as used
 * 6. Optional: Post to Instagram via Graph API (if configured)
 *
 * Note on Image Generation:
 * The final composed image (background + text overlay) is not generated here because:
 * - Server-side image rendering requires additional infrastructure (Puppeteer/node-canvas)
 * - Current implementation uses html-to-image in browser context
 * - Posts are saved as 'scheduled' status for later processing
 *
 * Options for future implementation:
 * 1. Add Puppeteer to render InstagramPostPreview component server-side
 * 2. Use node-canvas to programmatically draw the composition
 * 3. Call external image generation service (e.g., imgix, cloudinary)
 * 4. Keep current approach: frontend generates images for scheduled posts on-demand
 */

// Import required services
// Note: These imports work in Node.js context, but some browser-specific code
// (like localStorage) will be skipped or handled with environment variables

// Supabase setup for Node.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client for server-side
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper: Get random unused text from pool
async function getRandomUnusedText(userId: string): Promise<any> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('instagram_text_pool')
    .select('*')
    .eq('user_id', userId)
    .eq('is_used', false);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Random selection
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

// Helper: Get random background from Supabase Storage
async function getRandomBackground(): Promise<string | null> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase.storage
      .from('instagram-backgrounds')
      .list();

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Random selection
    const randomIndex = Math.floor(Math.random() * data.length);
    const fileName = data[randomIndex].name;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('instagram-backgrounds')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to get random background:', error);
    return null;
  }
}

// Helper: Generate content with Gemini API
async function generateContent(): Promise<{ question: string; caption: string; hashtags: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  // Use Google GenAI SDK
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  // memory-drawer prompt
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
{"question": "[생성된 질문]", "caption": "[감성 캡션 + 고정멘트 + 해시태그]"}

**캡션 구성:**
1. **감성 캡션**: 질문을 자연스럽게 풀어쓴 2-3줄 (줄바꿈 포함)
2. **고정 멘트**: "그 소중한 이야기들, 기억의 서랍에 차곡차곡 담아보세요 📖"
3. **해시태그**: "#기억의서랍 #오늘의서랍 #[상황관련태그]"

**상황별 해시태그 예시:**
- 가사활동: #일상, #엄마손맛, #집안일, #추억
- 소통관계: #대화, #소통, #마음, #사랑
- 여가휴식: #휴식, #평화, #편안함, #행복
- 외출활동: #외출, #함께, #활동, #건강
- 건강케어: #건강, #걱정, #돌봄, #효도
- 기념일: #기념일, #축하, #특별함, #감사

**제약사항:**
- 매번 다른 세부 상황 선택 (52가지 활용)
- 상황과 완전히 일치하는 조합만 생성
- 부자연스러운 연결 절대 금지
- 맥락적 일관성 100% 보장
- **캡션은 반드시 \\n을 사용하여 줄바꿈 명시**
- **최종 캡션 형태**: "감성캡션1줄\\n감성캡션2줄\\n\\n그 소중한 이야기들, 기억의 서랍에 차곡차곡 담아보세요 📖\\n\\n#기억의서랍 #오늘의서랍 #[상황관련태그]"

JSON 형식으로만 응답하세요.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "30-50대 자녀의 개인적 감정과 경험을 묻는 '오늘의 질문'"
      },
      caption: {
        type: Type.STRING,
        description: "감성 캡션(2-3줄) + 고정멘트 + 해시태그로 구성된 완전한 인스타그램 캡션"
      }
    },
    required: ["question", "caption"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(response.text);

  // Extract hashtags from caption
  const hashtags = parsed.caption
    .split('\n')
    .flatMap((line: string) => line.match(/#[\w가-힣]+/g) || [])
    .slice(0, 10);

  return {
    question: parsed.question,
    caption: parsed.caption,
    hashtags
  };
}

// Helper: Mark text as used
async function markTextAsUsed(textId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  await supabase
    .from('instagram_text_pool')
    .update({
      is_used: true,
      used_at: new Date().toISOString()
    })
    .eq('id', textId);
}

// Helper: Save post to Supabase
async function savePost(data: any, userId: string): Promise<any> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: result, error } = await supabase
    .from('instagram_posts')
    .insert({
      user_id: userId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🚀 Starting Instagram auto-post cron job...');

    // Get user ID from environment (set in Vercel)
    const userId = process.env.AUTO_POST_USER_ID || 'browser_default';

    // Step 1: Get random unused text from text pool
    console.log('📝 Getting random unused text...');
    const textPoolItem = await getRandomUnusedText(userId);

    if (!textPoolItem) {
      console.log('⚠️ No unused texts available in pool');
      return res.status(200).json({
        success: true,
        message: 'No unused texts available',
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Found text:', textPoolItem.text);

    // Step 2: Generate AI content (question + caption + hashtags)
    console.log('🤖 Generating AI content...');
    const aiContent = await generateContent();
    console.log('✅ Generated question:', aiContent.question);

    // Step 3: Get random background image
    console.log('🖼️ Getting random background...');
    const backgroundUrl = await getRandomBackground();
    console.log('✅ Background URL:', backgroundUrl);

    // Step 4: Save to Supabase
    console.log('💾 Saving post to Supabase...');
    const savedPost = await savePost({
      question_text: aiContent.question,
      caption: aiContent.caption,
      hashtags: aiContent.hashtags,
      background_url: backgroundUrl,
      publish_status: 'scheduled',
      source: 'auto_generated',
      scheduled_time: new Date().toISOString()
      // Note: image_url is null - final composed image needs to be generated separately
    }, userId);

    console.log('✅ Post saved:', savedPost.id);

    // Step 5: Mark text as used
    console.log('✔️ Marking text as used...');
    await markTextAsUsed(textPoolItem.id);

    // Step 6: (Optional) Post to Instagram via Graph API
    // TODO: Implement Instagram Graph API posting
    // - Requires: Instagram Business Account, Facebook App, Access Token
    // - Generate final composed image (see note at top of file)
    // - Upload to Instagram via Graph API
    // - Update post status to 'published'

    const result = {
      success: true,
      message: 'Instagram auto-post created successfully',
      timestamp: new Date().toISOString(),
      post: {
        id: savedPost.id,
        question: aiContent.question,
        hashtags: aiContent.hashtags.slice(0, 3), // Show first 3
        backgroundUrl: backgroundUrl,
        status: 'scheduled'
      }
    };

    console.log('✅ Instagram auto-post completed:', result);
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Instagram auto-post cron job failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Instagram auto-post failed',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
