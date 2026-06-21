import React, { useState, useEffect } from 'react';
import { generateBlogPost } from '../services/geminiService';
import { GoogleGenAI, Type } from "@google/genai";
import { historyService } from '../services/historyService';
import { isSupabaseConfigured } from '../lib/supabase';
import { threadsService, ThreadsUserProfile } from '../services/threadsService';

// 타입 정의
interface PersonaSettings {
  language: string;
  concept: string;
  target: string;
  writingPrompt: string;
  referenceStyles: ReferenceStyle[];
  uploadedFiles: UploadedFile[];
  snsChannels: SnsChannel[];
}

interface ReferenceStyle {
  id: string;
  content: string;
  addedDate: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
}

interface SnsChannel {
  id: string;
  platform: string;
  url: string;
  addedDate: string;
}

interface ContentMaterial {
  id: string;
  title: string;
  summary: string;
  category: string;
  sources?: { uri: string; title: string }[];
  status: 'pending' | 'draft-created' | 'published';
  createdAt: string;
  draftContent?: string;
  publishDate?: string;
  scheduledDate?: string;
  sourceType?: ContentSourceType; // 콘텐츠 소스 타입 저장
  threadParts?: string[]; // 분할된 스레드 포스트 배열
}

type ContentSourceType = 'search' | 'creative' | 'internal';
type PersonaTab = 'basic' | 'content' | 'automation';

const DEFAULT_WRITING_PROMPT = `당신은 기자의 사명 에이치텍크 전문가입니다.
MZ세대 언어로 시니어 테크를 설명하는 미션치 브랜치 역할을 합니다.

## 핵심 원칙 (스레드 2~3개 길이)

1. **첫 문장 = 3초 혹**: 충격/질문/감정으로 시작
   예: "70세 할머니가 AI에게 먼진 첫 질문이 우린 달을 줬었어요"

2. **짧고 리드미컬**: 1~2문장씩 끊기, 최대 280자

3. **데이터는 비유로**: "83조원 = 배만 매출의 10배"

4. **전문용어 즉시 번역**: "회석유먼 = 챗봇 아이기 나누기"

5. **질문으로 참여 유도**: "여러분 부모님은?" 중간중간 삽입

## 톤앤매너
- "우리 부모님 세대도" "솔직히 말하면도" "근데 반전이 있어요"
- 준중하나 친근하게, 전문가지만 수다치듯

## 이모지 활용
🔥트렌드 ✨팁 💡 데이터 😊 감성 🤔 AI 🧓 시니어 ⚡ 논챙

## 마무리
창작 CTA로 끝: 리포스트/댓글 요청 유도

## 금지사항
❌ "당신은" 같은 공식 톤
❌ "디지털 약자" 같은 불쌍한 표현
❌ 과도한 전문용어
❌ 한 스레드에 3문장 이상`;

/**
 * 콘텐츠를 Threads 스레드로 자동 분할
 * @param content - 전체 콘텐츠 텍스트
 * @returns 분할된 포스트 배열 (첫 번째 = 메인, 나머지 = Reply)
 */
function splitContentIntoParts(content: string): string[] {
  if (!content || content.trim() === '') {
    return [];
  }

  const MAX_LENGTH = 500; // Threads 최대 글자 수

  // 1. 빈 줄 2개 (\n\n) 기준으로 단락 분리
  let parts = content
    .split(/\n\n+/) // 빈 줄 2개 이상으로 분할
    .map(part => part.trim())
    .filter(part => part.length > 0);

  // 2. 500자 초과 단락은 추가 분할
  const finalParts: string[] = [];

  for (const part of parts) {
    if (part.length <= MAX_LENGTH) {
      finalParts.push(part);
    } else {
      // 500자 초과 시 문장 단위로 추가 분할
      const sentences = part.split(/(?<=[.!?])\s+/); // 문장 끝 기준 분할
      let currentPart = '';

      for (const sentence of sentences) {
        if ((currentPart + sentence).length <= MAX_LENGTH) {
          currentPart += (currentPart ? ' ' : '') + sentence;
        } else {
          if (currentPart) {
            finalParts.push(currentPart.trim());
          }
          // 문장 자체가 500자를 넘는 경우 강제 분할
          if (sentence.length > MAX_LENGTH) {
            for (let i = 0; i < sentence.length; i += MAX_LENGTH) {
              finalParts.push(sentence.substring(i, i + MAX_LENGTH).trim());
            }
            currentPart = '';
          } else {
            currentPart = sentence;
          }
        }
      }

      if (currentPart) {
        finalParts.push(currentPart.trim());
      }
    }
  }

  // 최소 1개는 있어야 함
  return finalParts.length > 0 ? finalParts : [content.substring(0, MAX_LENGTH)];
}

const ThreadsAutoPosting: React.FC = () => {
  // 상태 관리
  const [persona, setPersona] = useState<PersonaSettings>(() => {
    try {
      const saved = localStorage.getItem('threads_persona');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 기존 데이터에 새 필드 병합
        return {
          language: parsed.language || 'Korean',
          concept: parsed.concept || '',
          target: parsed.target || '',
          writingPrompt: parsed.writingPrompt || DEFAULT_WRITING_PROMPT,
          referenceStyles: parsed.referenceStyles || [],
          uploadedFiles: parsed.uploadedFiles || [],
          snsChannels: parsed.snsChannels || []
        };
      }
      return {
        language: 'Korean',
        concept: '',
        target: '',
        writingPrompt: DEFAULT_WRITING_PROMPT,
        referenceStyles: [],
        uploadedFiles: [],
        snsChannels: []
      };
    } catch {
      return {
        language: 'Korean',
        concept: '',
        target: '',
        writingPrompt: DEFAULT_WRITING_PROMPT,
        referenceStyles: [],
        uploadedFiles: [],
        snsChannels: []
      };
    }
  });

  const [personaId, setPersonaId] = useState<string | null>(null); // 페르소나 ID 추적
  const [isPersonaPanelOpen, setIsPersonaPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PersonaTab>('basic');
  const [editingPersona, setEditingPersona] = useState<PersonaSettings>(() => ({
    language: persona.language || 'Korean',
    concept: persona.concept || '',
    target: persona.target || '',
    writingPrompt: persona.writingPrompt || DEFAULT_WRITING_PROMPT,
    referenceStyles: persona.referenceStyles || [],
    uploadedFiles: persona.uploadedFiles || [],
    snsChannels: persona.snsChannels || []
  }));

  const [newReferenceStyle, setNewReferenceStyle] = useState('');

  const [sourceType, setSourceType] = useState<ContentSourceType>('search');
  const [searchTopic, setSearchTopic] = useState(''); // 검색 기반 선택사항
  const [materials, setMaterials] = useState<ContentMaterial[]>([]);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<ContentMaterial | null>(null);
  const [isRegeneratingContent, setIsRegeneratingContent] = useState(false);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [modifyInstructions, setModifyInstructions] = useState('');
  const [isModifying, setIsModifying] = useState(false);

  // Thread 분할 관련 상태
  const [previewTab, setPreviewTab] = useState<'full' | 'split'>('split'); // 탭 상태
  const [editingThreadParts, setEditingThreadParts] = useState<string[]>([]); // 편집 중인 분할 배열

  // Posting 상태 관리
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Threads 인증 상태 관리
  const [isThreadsAuthenticated, setIsThreadsAuthenticated] = useState(false);
  const [threadsUserProfile, setThreadsUserProfile] = useState<ThreadsUserProfile | null>(null);
  const [isLoadingThreadsProfile, setIsLoadingThreadsProfile] = useState(false);

  // Insights 모달 상태 관리
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [selectedInsightsMaterial, setSelectedInsightsMaterial] = useState<ContentMaterial | null>(null);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Threads 인증 상태 확인 및 프로필 로드
  const loadThreadsProfile = async () => {
    // Supabase에서 토큰을 포함하여 정확한 인증 상태 확인
    const isAuth = await threadsService.isAuthenticatedAsync();
    if (isAuth) {
      setIsLoadingThreadsProfile(true);
      try {
        const profile = await threadsService.getUserProfile();
        setThreadsUserProfile(profile);
        setIsThreadsAuthenticated(true);
        console.log('Threads 프로필 로드 성공:', profile.username);
      } catch (error: any) {
        console.error('Threads 프로필 로드 실패:', error);
        // 프로필 로드 실패 시 토큰이 유효하지 않으므로 인증 상태 초기화
        threadsService.clearTokens();
        setIsThreadsAuthenticated(false);
        setThreadsUserProfile(null);
      } finally {
        setIsLoadingThreadsProfile(false);
      }
    } else {
      setIsThreadsAuthenticated(false);
      setThreadsUserProfile(null);
    }
  };

  // 컴포넌트 마운트 시 프로필 로드
  useEffect(() => {
    loadThreadsProfile();
  }, []);

  // 인증 상태 변화 감지 (URL 파라미터, 페이지 포커스 등)
  useEffect(() => {
    // URL 파라미터에서 인증 완료 플래그 확인
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    
    if (authParam === 'success') {
      // 인증 완료 후 프로필 다시 로드
      loadThreadsProfile();
      // URL 파라미터 정리
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 페이지 포커스 시 인증 상태 확인 (다른 브라우저/탭에서 로그인한 경우 등)
    const handleFocus = async () => {
      const isAuth = await threadsService.isAuthenticatedAsync();
      if (isAuth !== isThreadsAuthenticated) {
        loadThreadsProfile();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isThreadsAuthenticated]);

  // Supabase 또는 localStorage에서 materials와 페르소나 불러오기 (컴포넌트 마운트 시)
  useEffect(() => {
    const loadData = async () => {
      // Supabase가 설정되어 있으면 Supabase에서 불러오기
      if (isSupabaseConfigured()) {
        try {
          // Materials 불러오기
          const contents = await historyService.getContentHistory('threads');

          if (contents && contents.length > 0) {
            // pending 상태 항목들을 Supabase에서 삭제 (cleanup)
            const pendingItems = contents.filter(content => {
              const status = (content.metadata as any)?.status;
              return status === 'pending';
            });

            if (pendingItems.length > 0) {
              console.log(`Supabase에서 ${pendingItems.length}개의 pending 항목 정리 중...`);
              for (const item of pendingItems) {
                try {
                  await historyService.deleteContent(item.id);
                } catch (err) {
                  console.error('pending 항목 삭제 실패:', item.id, err);
                }
              }
              console.log('pending 항목 정리 완료');
            }

            // pending 상태는 임시 데이터이므로 로드하지 않음
            const loadedMaterials: ContentMaterial[] = contents
              .filter(content => {
                const metadata = content.metadata as any;

                // 페르소나 설정 제외 (내부 설정용)
                if (metadata?.isPersona === true) {
                  return false;
                }

                const status = metadata?.status;
                return status !== 'pending'; // pending 상태 제외
              })
              .map(content => {
                const status = (content.metadata as any)?.status || 'draft-created';

                return {
                  id: content.id || crypto.randomUUID(),
                  title: content.title,
                  summary: (content.metadata as any)?.summary || content.title,
                  category: (content.metadata as any)?.category || '',
                  sources: content.sources || [],
                  status: status as 'pending' | 'draft-created' | 'published',
                  createdAt: (content.metadata as any)?.createdAt || new Date().toISOString(),
                  // draftContent는 초안이 생성된 경우에만
                  draftContent: (status === 'draft-created' || status === 'published')
                    ? content.content
                    : undefined,
                  publishDate: (content.metadata as any)?.publishDate,
                  sourceType: (content.metadata as any)?.sourceType as ContentSourceType
                };
              });

            setMaterials(loadedMaterials);
            // Supabase 데이터를 localStorage에도 저장
            localStorage.setItem('threads_materials', JSON.stringify(loadedMaterials));
          }

          // 페르소나 불러오기 (threads 타입이면서 isPersona 플래그가 있는 것)
          const allContents = await historyService.getContentHistory();
          const personaRecord = allContents.find(item =>
            item.content_type === 'threads' &&
            (item.metadata as any)?.isPersona === true
          );

          if (personaRecord) {
            try {
              const loadedPersona = JSON.parse(personaRecord.content);
              setPersona(loadedPersona);
              setPersonaId(personaRecord.id); // ID 저장
              localStorage.setItem('threads_persona', personaRecord.content);
              console.log('페르소나 설정 Supabase에서 불러옴');
            } catch (err) {
              console.error('페르소나 파싱 실패:', err);
            }
          }
        } catch (err) {
          console.error('Supabase에서 데이터 불러오기 실패:', err);

          // Supabase 실패 시에만 localStorage에서 불러오기
          try {
            const saved = localStorage.getItem('threads_materials');
            if (saved) {
              setMaterials(JSON.parse(saved));
            }
          } catch (err) {
            console.error('localStorage에서 materials 불러오기 실패:', err);
          }
        }
      } else {
        // Supabase가 설정되지 않은 경우에만 localStorage에서 불러오기
        try {
          const saved = localStorage.getItem('threads_materials');
          if (saved) {
            setMaterials(JSON.parse(saved));
          }
        } catch (err) {
          console.error('localStorage에서 materials 불러오기 실패:', err);
        }
      }
    };

    loadData().finally(() => {
      setIsInitialLoadComplete(true);
    });
  }, []); // 빈 배열: 컴포넌트 마운트 시 한 번만 실행

  // localStorage 및 Supabase 저장 (페르소나)
  useEffect(() => {
    // 초기 로드 중에는 저장하지 않음
    if (!isInitialLoadComplete) return;

    console.log('페르소나 변경 감지, localStorage 저장 중...');
    localStorage.setItem('threads_persona', JSON.stringify(persona));

    // Supabase에도 저장 (debounce)
    const saveTimer = setTimeout(async () => {
      if (!isSupabaseConfigured()) {
        console.log('Supabase 미설정, 저장 건너뜀');
        return;
      }

      console.log('페르소나 Supabase 저장 시작...');
      try {
        if (personaId) {
          // 기존 페르소나 업데이트 (ID가 있는 경우)
          console.log('기존 페르소나 업데이트:', personaId);
          await historyService.updateContent(personaId, {
            title: 'Threads 페르소나 설정',
            content: JSON.stringify(persona),
            metadata: {
              isPersona: true,
              updatedAt: new Date().toISOString()
            }
          });
        } else {
          // 새로 저장 (ID가 없는 경우 - 최초 생성)
          console.log('새 페르소나 생성');
          const savedPersona = await historyService.saveContent({
            content_type: 'threads',
            title: 'Threads 페르소나 설정',
            content: JSON.stringify(persona),
            metadata: {
              isPersona: true,
              createdAt: new Date().toISOString()
            }
          });

          // 생성된 ID 저장
          if (savedPersona?.id) {
            setPersonaId(savedPersona.id);
          }
        }
        console.log('✅ 페르소나 설정 Supabase 저장 완료');
      } catch (err) {
        console.error('❌ 페르소나 Supabase 저장 실패:', err);
      }
    }, 2000); // 2초 debounce

    return () => clearTimeout(saveTimer);
  }, [persona, personaId, isInitialLoadComplete]);

  // localStorage 및 Supabase 저장 (debounced)
  useEffect(() => {
    // 초기 로딩 중에는 저장하지 않음 (덮어쓰기 방지)
    if (!isInitialLoadComplete) return;

    // localStorage에 즉시 저장
    localStorage.setItem('threads_materials', JSON.stringify(materials));

    // Supabase 저장은 debounce (너무 자주 저장하지 않도록)
    const saveTimer = setTimeout(async () => {
      if (!isSupabaseConfigured()) return;

      // 모든 상태의 항목을 Supabase에 저장 (동기화 유지)
      // 컨텐츠 히스토리 페이지에서는 threads 타입을 필터링하여 표시하지 않음
      for (const material of materials) {
        try {
          // material.id가 UUID 형식이면 Supabase에서 온 것이므로 업데이트
          const isSupabaseId = material.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

          if (isSupabaseId) {
            // 기존 컨텐츠 업데이트
            await historyService.updateContent(material.id, {
              title: material.title,
              content: material.draftContent || material.summary,
              metadata: {
                status: material.status,
                category: material.category,
                createdAt: material.createdAt,
                publishDate: material.publishDate,
                summary: material.summary,
                sourceType: material.sourceType
              },
              sources: material.sources || []
            });
          } else {
            // 새 컨텐츠 저장 (UUID가 아닌 경우)
            const savedContent = await historyService.saveContent({
              content_type: 'threads',
              title: material.title,
              content: material.draftContent || material.summary,
              metadata: {
                status: material.status,
                category: material.category,
                createdAt: material.createdAt,
                publishDate: material.publishDate
              },
              sources: material.sources || []
            });

            // 저장된 UUID로 ID 업데이트
            if (savedContent?.id) {
              setMaterials(prev =>
                prev.map(m => m.id === material.id ? { ...m, id: savedContent.id } : m)
              );
            }
          }
        } catch (err) {
          console.error('Supabase threads material 저장 실패:', err);
        }
      }
    }, 1000); // 1초 debounce

    return () => clearTimeout(saveTimer);
  }, [materials, isInitialLoadComplete]);

  // previewMaterial 변경 시 자동 분할
  useEffect(() => {
    if (previewMaterial?.draftContent) {
      const parts = previewMaterial.threadParts || splitContentIntoParts(previewMaterial.draftContent);
      setEditingThreadParts(parts);
    } else {
      setEditingThreadParts([]);
    }
  }, [previewMaterial]);

  // Thread 분할 편집 함수들
  const handleDeleteThreadPart = (index: number) => {
    setEditingThreadParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveThreadPartUp = (index: number) => {
    if (index === 0) return;
    setEditingThreadParts(prev => {
      const newParts = [...prev];
      [newParts[index - 1], newParts[index]] = [newParts[index], newParts[index - 1]];
      return newParts;
    });
  };

  const handleMoveThreadPartDown = (index: number) => {
    if (index === editingThreadParts.length - 1) return;
    setEditingThreadParts(prev => {
      const newParts = [...prev];
      [newParts[index], newParts[index + 1]] = [newParts[index + 1], newParts[index]];
      return newParts;
    });
  };

  const handleUpdateThreadPart = (index: number, newText: string) => {
    setEditingThreadParts(prev => prev.map((part, i) => i === index ? newText : part));
  };

  const handleAutoSplit = () => {
    if (previewMaterial?.draftContent) {
      const parts = splitContentIntoParts(previewMaterial.draftContent);
      setEditingThreadParts(parts);
    }
  };

  // 페르소나 편집 패널 열기
  const handleOpenPersonaPanel = () => {
    setEditingPersona({
      language: persona.language || 'Korean',
      concept: persona.concept || '',
      target: persona.target || '',
      writingPrompt: persona.writingPrompt || DEFAULT_WRITING_PROMPT,
      referenceStyles: persona.referenceStyles || [],
      uploadedFiles: persona.uploadedFiles || [],
      snsChannels: persona.snsChannels || []
    });
    setNewReferenceStyle('');
    setIsPersonaPanelOpen(true);
    setActiveTab('basic');
  };

  // 참고 스타일 추가
  const handleAddReferenceStyle = () => {
    if (!newReferenceStyle.trim()) {
      alert('참고할 글 스타일을 입력해주세요.');
      return;
    }

    const newStyle: ReferenceStyle = {
      id: Date.now().toString(),
      content: newReferenceStyle,
      addedDate: new Date().toISOString()
    };

    setEditingPersona(prev => ({
      ...prev,
      referenceStyles: [...prev.referenceStyles, newStyle]
    }));
    setNewReferenceStyle('');
  };

  // 참고 스타일 삭제
  const handleDeleteReferenceStyle = (styleId: string) => {
    setEditingPersona(prev => ({
      ...prev,
      referenceStyles: prev.referenceStyles.filter(s => s.id !== styleId)
    }));
  };

  // 페르소나 저장
  const handleSavePersona = () => {
    setPersona(editingPersona);
    setIsPersonaPanelOpen(false);
  };

  // 페르소나 입력 핸들러
  const handleEditingPersonaChange = (field: keyof PersonaSettings, value: any) => {
    setEditingPersona(prev => ({ ...prev, [field]: value }));
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file: File) => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      uploadDate: new Date().toISOString()
    }));

    setEditingPersona(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...newFiles]
    }));
  };

  // 파일 삭제 핸들러
  const handleDeleteFile = (fileId: string) => {
    setEditingPersona(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(f => f.id !== fileId)
    }));
  };

  // AI로 소재 생성 (1단계: 타이틀 + 요약 + 카테고리 + 참고 소스)
  const handleGenerateMaterials = async () => {
    if (!persona.concept || !persona.target) {
      alert('페르소나를 먼저 설정해주세요. (컨셉과 타겟 필수)');
      return;
    }

    setIsGenerating(true);

    try {
      // API 키 확인 (AI 설정에서 저장된 키 사용)
      const savedApiKeys = localStorage.getItem('ai_api_keys');
      let apiKey = '';

      if (savedApiKeys) {
        try {
          const parsedKeys = JSON.parse(savedApiKeys);
          apiKey = parsedKeys.gemini || '';
        } catch (e) {
          console.error('API 키 파싱 오류:', e);
        }
      }

      if (!apiKey) {
        alert('Gemini API 키가 설정되지 않았습니다.\n\n좌측 메뉴의 "설정" → "AI 모델 설정"에서 Gemini API 키를 입력하고 저장해주세요.');
        throw new Error('Gemini API 키가 설정되지 않았습니다.');
      }

      const ai = new GoogleGenAI({ apiKey });

      // 참고 스타일 텍스트 합치기
      const referenceStyleText = persona.referenceStyles.length > 0
        ? `\n\n참고할 글 스타일:\n${persona.referenceStyles.map(s => s.content).join('\n\n')}`
        : '';

      // 카테고리 맵핑
      const categoryMap = {
        'search': '검색 정보 기반',
        'creative': '경험 공유형',
        'internal': '내부 정보형'
      };

      let newMaterials: ContentMaterial[] = [];

      if (sourceType === 'search') {
        // 검색 기반: 각 아이디어별로 개별 검색 수행 (다양한 소스 확보)
        const searchTopicText = searchTopic.trim()
          ? `\n\n**검색 주제 및 방향:**\n${searchTopic}`
          : `\n\n**검색 방향:**\n페르소나의 컨셉(${persona.concept})과 타겟 독자(${persona.target})에게 흥미롭고 유용할 만한 최신 트렌드, 이슈, 정보를 웹 검색을 통해 자유롭게 발굴하세요. 쓰레드(Threads) 플랫폼의 특성을 고려하여 짧고 임팩트 있으면서도 정보성과 공감성을 겸비한 주제를 선정하세요.`;

        const basePrompt = `당신은 ${persona.concept} 분야의 전문 콘텐츠 기획자입니다.

**페르소나 정보:**
- 사용 언어: ${persona.language}
- 채널 컨셉: ${persona.concept}
- 타겟 독자: ${persona.target}

**플랫폼 특성:**
- 플랫폼: Threads (Meta)
- 콘텐츠 성격: 짧고 임팩트 있는 정보 전달, 공감과 상호작용 중시
- 적합한 주제: 최신 트렌드, 실용 정보, 공감 가는 경험담, 팁과 인사이트

**글쓰기 스타일:**
${persona.writingPrompt}
${referenceStyleText}

**콘텐츠 소재 유형:** ${categoryMap[sourceType]}
${searchTopicText}`;

        // 3개의 아이디어를 순차적으로 생성 (각각 안정적인 소스 확보)
        const ideas: ContentMaterial[] = [];

        for (let num = 1; num <= 3; num++) {
          const prompt = `${basePrompt}

**요청사항:**
${persona.target}에게 흥미롭고 유용한 쓰레드 콘텐츠 아이디어를 1개 제안해주세요.
${searchTopic.trim() ? '제공된 검색 주제를 중심으로' : '페르소나 정보를 바탕으로 자유롭게 주제를 선정하여'} 웹 검색을 통해 최신 정보를 찾아 활용하세요.
${num > 1 ? `이전 아이디어들과는 다른 새로운 관점이나 주제를 다루세요.` : ''}

다음 형식으로 정확하게 작성해주세요:

제목: [흥미를 끄는 후킹 요소가 포함된 제목, 이모지 사용 가능, 15자 이내]
요약: [이 콘텐츠의 핵심 메시지와 제공 가치를 담은 써머리, 2-3문장, 100자 이내]
참고자료:
[웹 검색으로 찾은 모든 기사/자료의 제목을 한 줄에 하나씩 나열하세요. 반드시 검색한 모든 자료의 제목을 포함해야 합니다.]
- 첫 번째 기사 제목
- 두 번째 기사 제목
- 세 번째 기사 제목
[계속...]

**중요**: 웹 검색으로 참고한 모든 자료의 실제 기사 제목을 빠짐없이 나열하세요.`;

          try {
            console.log(`🎯 아이디어 ${num}/3 생성 중...`);

            const response = await ai.models.generateContent({
              model: "gemini-2.5-pro",
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.3  // 더 일관된 형식 출력을 위해 temperature 낮춤
              }
            });

            const text = response.text;

            // 참고 소스 추출 (각 아이디어마다 개별 소스, 최대 5개로 제한)
            const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
            console.log(`🔍 [아이디어 ${num}] Full Grounding Metadata:`, JSON.stringify(groundingMetadata, null, 2));

            const groundingChunks = groundingMetadata?.groundingChunks || [];

            const sources = groundingChunks
              .slice(0, 5)  // 최대 5개의 소스만 사용
              .map((chunk: any) => {
                // 전체 chunk 구조 확인
                console.log(`📦 [아이디어 ${num}] Single Chunk:`, JSON.stringify(chunk, null, 2));
                return chunk.web;
              })
              .filter(Boolean) as { uri: string; title: string }[];

            console.log(`📚 [아이디어 ${num}] Extracted Sources (최대 5개):`, JSON.stringify(sources, null, 2));

            // 텍스트 파싱
            const titleMatch = text.match(/제목:\s*(.+)/);
            // 요약: 다음부터 참고자료: 또는 줄바꿈 2번 이상까지 추출 (더 안정적)
            const summaryMatch = text.match(/요약:\s*(.+?)(?=\n\s*참고자료:|$)/s);
            const referencesMatch = text.match(/참고자료:\s*(.+)/s);

            console.log(`📝 [아이디어 ${num}] AI Response Text:`, text);
            console.log(`📋 [아이디어 ${num}] Title Match:`, titleMatch?.[1]);
            console.log(`📄 [아이디어 ${num}] Summary Match:`, summaryMatch?.[1]);
            console.log(`📚 [아이디어 ${num}] References Match:`, referencesMatch?.[1]);

            // AI가 추출한 참고자료 제목 파싱
            let sourcesWithTitles = sources;
            if (referencesMatch && referencesMatch[1]) {
              const referencesText = referencesMatch[1].trim();

              // 각 라인을 '-' 또는 숫자로 시작하는 항목으로 분리
              const allLines = referencesText.split('\n');
              const referenceLines = allLines
                .map(line => line.trim())
                .filter(line => {
                  // '-', '•', 또는 숫자로 시작하는 라인만 추출
                  return line.match(/^[-•\d.]\s*.+/) ||
                         (line.length > 10 && !line.startsWith('URL') && !line.startsWith('[') && !line.startsWith('http'));
                })
                .map(line => {
                  // 시작 부분의 마커 제거 (-, •, 1., 2. 등)
                  return line.replace(/^[-•\d.]\s*/, '').trim();
                })
                .map(line => {
                  // 인용부호 제거
                  return line.replace(/^["']|["']$/g, '').trim();
                })
                .map(line => {
                  // URL 부분 제거 (- URL:, - http 등)
                  return line.split(/\s*-\s*(?:URL:|http)/)[0].trim();
                })
                .filter(line => line.length > 5) // 최소 5자 이상
                .slice(0, 5); // 최대 5개만 사용

              console.log(`📋 [아이디어 ${num}] Parsed Reference Lines (최대 5개):`, referenceLines);

              // groundingChunks가 비어있으면 제목만 표시 (URL 없이)
              if (sources.length === 0 && referenceLines.length > 0) {
                console.log(`⚠️ [아이디어 ${num}] groundingChunks 비어있음, 제목만 표시`);
                sourcesWithTitles = referenceLines.map(title => ({
                  uri: '',  // URL이 없음을 표시
                  title: title
                }));
              } else {
                // AI가 제공한 제목을 sources에 매핑
                sourcesWithTitles = sources.map((source, idx) => {
                  if (idx < referenceLines.length && referenceLines[idx]) {
                    const cleanTitle = referenceLines[idx];
                    console.log(`✅ [아이디어 ${num}] Extracted title ${idx}: "${cleanTitle}"`);
                    return { ...source, title: cleanTitle };
                  }
                  // 제목을 찾지 못한 경우 도메인 이름을 한글로 변환
                  console.log(`⚠️ [아이디어 ${num}] No title found for source ${idx}, using domain: ${source.title}`);
                  const domainTitle = source.title.replace(/\.com$|\.co\.kr$|\.kr$|\.net$/i, '');
                  return { ...source, title: `${domainTitle} 기사` };
                });
              }

              console.log(`🎯 [아이디어 ${num}] Final Sources with Titles:`, JSON.stringify(sourcesWithTitles, null, 2));
            } else {
              // 참고자료 섹션이 없는 경우, 도메인 이름만 표시
              sourcesWithTitles = sources.map((source) => {
                const domainTitle = source.title.replace(/\.com$|\.co\.kr$|\.kr$|\.net$/i, '');
                return { ...source, title: `${domainTitle} 기사` };
              });
            }

            // 요약 처리: 줄바꿈을 공백으로, 100자 제한
            let extractedSummary = '콘텐츠 요약을 생성하지 못했습니다.';
            if (summaryMatch && summaryMatch[1]) {
              extractedSummary = summaryMatch[1]
                .trim()
                .replace(/\n+/g, ' ')  // 모든 줄바꿈을 공백으로
                .replace(/\s+/g, ' ')  // 여러 공백을 하나로
                .substring(0, 200);    // 최대 200자 (안전 여유)

              console.log(`✅ [아이디어 ${num}] Extracted summary: "${extractedSummary}"`);
            } else {
              console.warn(`⚠️ [아이디어 ${num}] No summary found, using fallback`);
            }

            const idea: ContentMaterial = {
              id: Date.now().toString() + '-' + num + '-' + Math.random().toString(36).substr(2, 9),
              title: titleMatch ? titleMatch[1].trim() : `아이디어 ${num}`,
              summary: extractedSummary,
              category: categoryMap[sourceType],
              sources: sourcesWithTitles,
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
              sourceType: sourceType
            };

            ideas.push(idea);
            console.log(`✅ 아이디어 ${num}/3 생성 완료`);

          } catch (error) {
            console.error(`❌ 아이디어 ${num} 생성 오류:`, error);
            ideas.push({
              id: Date.now().toString() + '-' + num + '-error',
              title: `아이디어 ${num}`,
              summary: '콘텐츠 생성에 실패했습니다.',
              category: categoryMap[sourceType],
              sources: [],
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
              sourceType: sourceType
            });
          }
        }

        newMaterials = ideas;

      } else {
        // 창작/내부정보: JSON schema 사용
        const materialPrompt = `당신은 ${persona.concept} 분야의 전문 콘텐츠 기획자입니다.

**페르소나 정보:**
- 사용 언어: ${persona.language}
- 채널 컨셉: ${persona.concept}
- 타겟 독자: ${persona.target}

**글쓰기 스타일:**
${persona.writingPrompt}
${referenceStyleText}

**콘텐츠 소재 유형:** ${categoryMap[sourceType]}

**요청사항:**
${persona.target}에게 흥미롭고 유용한 쓰레드 콘텐츠 아이디어를 정확히 3개 제안해주세요.

각 아이디어는 다음을 포함해야 합니다:
1. 제목: 흥미를 끄는 후킹 요소가 포함된 제목 (이모지 사용 가능, 15자 이내)
2. 요약: 이 콘텐츠의 핵심 메시지와 제공 가치를 담은 써머리 (2-3문장, 100자 이내)`;

        // JSON 스키마 정의
        const schema = {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "콘텐츠 제목 (이모지 포함 가능, 15자 이내)"
                  },
                  summary: {
                    type: Type.STRING,
                    description: "콘텐츠 요약 (핵심 메시지와 가치, 2-3문장, 100자 이내)"
                  }
                },
                required: ["title", "summary"]
              },
              description: "정확히 3개의 콘텐츠 아이디어"
            }
          },
          required: ["ideas"]
        };

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: materialPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);

        newMaterials = result.ideas.slice(0, 3).map((idea: any, index: number) => ({
          id: Date.now().toString() + '-' + index,
          title: idea.title,
          summary: idea.summary,
          category: categoryMap[sourceType],
          sources: [],
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          sourceType: sourceType
        }));
      }

      if (newMaterials.length === 0) {
        throw new Error('아이디어를 생성하지 못했습니다.');
      }

      setMaterials(prev => [...newMaterials, ...prev]);

    } catch (error: any) {
      console.error('소재 생성 오류:', error);
      alert(error.message || '콘텐츠 소재 생성에 실패했습니다. API 키를 확인해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 초안 생성 (2단계: 완전한 쓰레드 콘텐츠)
  const handleCreateDraft = async (material: ContentMaterial) => {
    setIsCreatingDraft(material.id);

    try {
      // 참고 스타일 텍스트 합치기
      const referenceStyleText = persona.referenceStyles.length > 0
        ? `\n\n**참고할 글 스타일:**\n${persona.referenceStyles.map(s => s.content).join('\n\n')}`
        : '';

      // 참고 소스 정보
      const sourcesText = material.sources && material.sources.length > 0
        ? `\n\n**참고 자료:**\n${material.sources.map(s => `- ${s.title}: ${s.uri}`).join('\n')}`
        : '';

      // 검색정보 기반인지 확인 (material의 sourceType 사용)
      const materialSourceType = material.sourceType || sourceType;
      const useSearch = materialSourceType === 'search';

      // 완전한 쓰레드 콘텐츠 생성 프롬프트
      const draftPrompt = `당신은 ${persona.concept} 분야의 전문 콘텐츠 작가입니다.

**페르소나 정보:**
- 사용 언어: ${persona.language}
- 채널 컨셉: ${persona.concept}
- 타겟 독자: ${persona.target}

**글쓰기 스타일 가이드:**
${persona.writingPrompt}
${referenceStyleText}

**작성할 콘텐츠 정보:**
- 제목: ${material.title}
- 핵심 요약: ${material.summary}
${sourcesText}

**작성 요구사항:**
1. 위 글쓰기 스타일 가이드를 철저히 따라주세요
2. 쓰레드 형식으로 작성 (2-3개 스레드, 각 스레드는 280자 이하)
3. ${persona.target}의 관심사와 언어 수준에 맞춰 작성
4. 첫 스레드는 강력한 후킹으로 시작
5. 마지막에는 참여를 유도하는 CTA 포함
6. 이모지를 적절히 활용
7. 단락 구분을 명확히 하여 가독성 확보
${useSearch ? `8. 웹 검색을 활용한 경우, 콘텐츠 작성 후 다음 형식으로 참고자료 목록을 반드시 포함하세요:

참고자료:
- 첫 번째 기사 제목
- 두 번째 기사 제목
[계속...]` : ''}

완전한 쓰레드 콘텐츠를 작성해주세요:`;

      // Gemini API 호출 (검색정보 기반일 경우 검색 활성화)
      const result = await generateBlogPost(draftPrompt, useSearch);

      const draftContent = result.text;

      // Sources 병합: result.sources와 기존 material.sources의 title 정보를 유지
      let mergedSources = material.sources || [];
      if (result.sources.length > 0) {
        // result.sources의 URI를 사용하되, 기존 sources의 title이 더 좋으면 그것을 유지
        mergedSources = result.sources.map((newSource, idx) => {
          const existingSource = material.sources?.[idx];
          // 기존 source의 title이 도메인이 아닌 실제 제목이면 유지
          if (existingSource && existingSource.title &&
              !existingSource.title.endsWith(' 기사') &&
              existingSource.title.length > 10) {
            return { ...newSource, title: existingSource.title };
          }
          return newSource;
        });
      }

      // 로컬 상태 업데이트
      setMaterials(prev =>
        prev.map(m =>
          m.id === material.id
            ? { ...m, status: 'draft-created', draftContent, sources: mergedSources }
            : m
        )
      );

      // Supabase에 초안 저장
      if (isSupabaseConfigured()) {
        try {
          await historyService.saveContent({
            content_type: 'threads',
            title: material.title,
            content: draftContent,
            metadata: {
              category: material.category,
              status: 'draft-created',
              createdAt: material.createdAt,
              sourceType: materialSourceType,
              summary: material.summary  // summary도 함께 저장
            },
            sources: mergedSources
          });
          console.log('초안이 히스토리에 저장되었습니다:', material.id);
        } catch (err) {
          console.error('히스토리 저장 실패:', err);
          // 저장 실패해도 로컬 상태는 유지
        }
      }

    } catch (error: any) {
      console.error('초안 생성 오류:', error);
      alert(error.message || '콘텐츠 초안 생성에 실패했습니다. API 키를 확인해주세요.');
    } finally {
      setIsCreatingDraft(null);
    }
  };

  // 발행
  const handlePublish = async (material: ContentMaterial, publishDate: string) => {
    // Threads 인증 확인
    if (!isThreadsAuthenticated) {
      alert('먼저 Threads 계정을 연동해주세요.');
      return;
    }

    // 초안이 없는 경우
    if (!material.draftContent) {
      alert('먼저 초안을 생성해주세요.');
      return;
    }

    try {
      // Threads에 포스트 발행
      const result = await threadsService.createAndPublishPost({
        text: material.draftContent,
        media_type: 'TEXT'
      });

      console.log('Threads 포스트 발행 성공:', result);

      // 상태 업데이트
      setMaterials(prev =>
        prev.map(m =>
          m.id === material.id
            ? { ...m, status: 'published', publishDate }
            : m
        )
      );

      alert(`Threads에 포스트가 발행되었습니다!${result.permalink ? '\n링크: ' + result.permalink : ''}`);
    } catch (error: any) {
      console.error('Threads 포스트 발행 실패:', error);
      alert(`Threads 포스트 발행 실패:\n${error.message}`);
    }
  };

  // Threads 로그인 핸들러
  const handleThreadsLogin = () => {
    if (!threadsService.isConfigured()) {
      alert('Threads API가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
      return;
    }

    // OAuth URL로 리다이렉트
    const authUrl = threadsService.getAuthUrl();
    window.location.href = authUrl;
  };

  // Threads 로그아웃 핸들러
  const handleThreadsLogout = async () => {
    if (confirm('Threads 연동을 해제하시겠습니까?')) {
      await threadsService.clearTokens();
      setIsThreadsAuthenticated(false);
      setThreadsUserProfile(null);
      alert('Threads 연동이 해제되었습니다.');
    }
  };

  // Threads 연결 진단
  const handleDiagnoseThreads = async () => {
    try {
      console.log('🔍 Threads 연결 진단 시작...');
      const diagnosis = await threadsService.diagnoseConnection();

      let detailMessage = `진단 결과:\n\n`;
      detailMessage += `API 설정: ${diagnosis.details.apiConfigured ? '✅' : '❌'}\n`;
      detailMessage += `토큰 존재: ${diagnosis.details.hasToken ? '✅' : '❌'}\n`;
      detailMessage += `토큰 유효: ${diagnosis.details.tokenValid ? '✅' : '❌'}\n`;

      if (diagnosis.details.username) {
        detailMessage += `사용자: @${diagnosis.details.username}\n`;
      }
      if (diagnosis.details.userId) {
        detailMessage += `User ID: ${diagnosis.details.userId}\n`;
      }
      if (diagnosis.details.scopes) {
        detailMessage += `권한: ${diagnosis.details.scopes}\n`;
      }
      if (diagnosis.details.profileError) {
        detailMessage += `\n프로필 에러: ${diagnosis.details.profileError}\n`;
      }

      detailMessage += `\n${diagnosis.message}`;

      console.log(detailMessage);

      // 포스팅 권한 테스트
      if (diagnosis.success) {
        const confirmTest = confirm(detailMessage + '\n\n포스팅 권한도 테스트하시겠습니까?');
        if (confirmTest) {
          console.log('🧪 포스팅 권한 테스트 중...');
          const testResult = await threadsService.testPostPermission();
          alert(testResult.message + (testResult.error ? `\n\n에러: ${testResult.error}` : ''));
        } else {
          alert(detailMessage);
        }
      } else {
        alert(detailMessage);
      }
    } catch (error: any) {
      console.error('진단 실패:', error);
      alert(`진단 중 오류 발생:\n${error.message}`);
    }
  };

  // 소재 삭제
  const handleDeleteMaterial = async (id: string) => {
    if (confirm('이 소재를 삭제하시겠습니까?')) {
      const material = materials.find(m => m.id === id);

      // Supabase에 저장된 경우 (UUID 형식) Supabase에서도 삭제
      const isSupabaseId = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      if (isSupabaseId && isSupabaseConfigured()) {
        try {
          await historyService.deleteContent(id);
          console.log('Supabase에서 삭제됨:', id);
        } catch (err) {
          console.error('Supabase 삭제 실패:', err);
        }
      }

      setMaterials(prev => prev.filter(m => m.id !== id));
    }
  };

  // 작성 대기중 항목 전체 삭제
  const handleClearPendingMaterials = () => {
    const pendingCount = materials.filter(m => m.status === 'pending').length;
    if (pendingCount === 0) {
      alert('삭제할 항목이 없습니다.');
      return;
    }

    if (confirm(`작성 대기중 항목 ${pendingCount}개를 모두 삭제하시겠습니까?`)) {
      setMaterials(prev => prev.filter(m => m.status !== 'pending'));
      alert(`${pendingCount}개 항목이 삭제되었습니다.`);
    }
  };

  // 초안을 "초안 사용됨"으로 이동 및 히스토리 저장
  const handleSaveToUsed = async () => {
    if (!previewMaterial) return;

    try {
      // 상태를 "published"로 변경
      setMaterials(prev => prev.map(m =>
        m.id === previewMaterial.id
          ? { ...m, status: 'published' as const, publishDate: new Date().toISOString() }
          : m
      ));

      // Supabase에 히스토리 저장 (초안 생성됨 → 초안 사용됨으로 이동 시)
      if (isSupabaseConfigured()) {
        try {
          // 기존 데이터가 있으면 업데이트, 없으면 새로 저장
          const existingContents = await historyService.getContentHistory('threads');
          const existingContent = existingContents?.find(c => c.id === previewMaterial.id);

          if (existingContent) {
            // 기존 데이터 업데이트 (상태만 변경)
            await historyService.updateContent(previewMaterial.id, {
              metadata: {
                ...existingContent.metadata,
                status: 'published',
                publishDate: new Date().toISOString(),
                summary: previewMaterial.summary
              }
            });
            console.log('컨텐츠 상태가 업데이트되었습니다:', previewMaterial.id);
          } else {
            // 새로 저장 (초안 생성됨에서 바로 저장하지 않은 경우)
            await historyService.saveContent({
              content_type: 'threads',
              title: previewMaterial.title,
              content: previewMaterial.draftContent || previewMaterial.summary,
              metadata: {
                category: previewMaterial.category,
                status: 'published',
                publishDate: new Date().toISOString(),
                summary: previewMaterial.summary
              },
              sources: previewMaterial.sources || []
            });
            console.log('컨텐츠가 히스토리에 저장되었습니다:', previewMaterial.id);
          }
        } catch (err) {
          console.error('히스토리 저장/업데이트 실패:', err);
        }
      }

      // 모달 닫기
      setPreviewMaterial(null);
      alert('초안이 "초안 사용됨"으로 이동되었습니다!');
    } catch (error) {
      console.error('저장 중 오류:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 초안 저장 (상태 변경 없이 내용만 업데이트)
  const handleSaveDraft = async () => {
    if (!previewMaterial) return;

    try {
      // editingThreadParts를 하나의 텍스트로 합치기
      const updatedContent = editingThreadParts.join('\n\n');

      // 로컬 상태 업데이트 (status는 'draft-created' 유지)
      const updatedMaterial = {
        ...previewMaterial,
        draftContent: updatedContent,
        threadParts: editingThreadParts,
        status: 'draft-created' as const // 상태 유지
      };

      setMaterials(prev => prev.map(m =>
        m.id === previewMaterial.id ? updatedMaterial : m
      ));
      setPreviewMaterial(updatedMaterial);

      // Supabase에 저장
      if (isSupabaseConfigured()) {
        try {
          const existingContents = await historyService.getContentHistory('threads');
          const existingContent = existingContents?.find(c => c.id === previewMaterial.id);

          if (existingContent) {
            // 기존 데이터 업데이트
            await historyService.updateContent(previewMaterial.id, {
              content: updatedContent,
              metadata: {
                ...existingContent.metadata,
                status: 'draft-created', // 상태 유지
                threadParts: editingThreadParts,
                threadCount: editingThreadParts.length,
                updatedAt: new Date().toISOString()
              }
            });
            console.log('초안이 업데이트되었습니다:', previewMaterial.id);
          } else {
            // 새로 저장
            await historyService.saveContent({
              content_type: 'threads',
              title: previewMaterial.title,
              content: updatedContent,
              metadata: {
                category: previewMaterial.category,
                status: 'draft-created',
                threadParts: editingThreadParts,
                threadCount: editingThreadParts.length,
                createdAt: previewMaterial.createdAt,
                summary: previewMaterial.summary
              },
              sources: previewMaterial.sources || []
            });
            console.log('초안이 저장되었습니다:', previewMaterial.id);
          }
        } catch (err) {
          console.error('히스토리 저장 실패:', err);
          alert('Supabase 저장에 실패했지만 로컬에는 저장되었습니다.');
        }
      }

      alert('✅ 초안이 저장되었습니다!');
    } catch (error) {
      console.error('초안 저장 오류:', error);
      alert('초안 저장에 실패했습니다.');
    }
  };

  // 발행된 콘텐츠 인사이트 확인
  const handleViewInsights = async (material: ContentMaterial) => {
    setSelectedInsightsMaterial(material);
    setInsightsModalOpen(true);
    setIsLoadingInsights(true);
    setInsightsData(null);

    try {
      // material.metadata에서 threadsPostId 확인 (또는 다른 위치)
      const metadata = material as any;
      const threadsPostId = metadata.threadsPostId || metadata.metadata?.threadsPostId;

      if (threadsPostId) {
        console.log('Fetching insights for post:', threadsPostId);
        const insights = await threadsService.getInsights(threadsPostId);
        setInsightsData(insights);
      } else {
        console.warn('포스트 ID가 없어 인사이트를 가져올 수 없습니다.');
        setInsightsData(null);
      }
    } catch (error: any) {
      console.error('인사이트 로드 실패:', error);
      setInsightsData(null);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // 바로 포스팅 (Threads API 사용)
  const handleImmediatePost = async () => {
    if (!previewMaterial) return;
    if (!previewMaterial.draftContent || previewMaterial.draftContent.trim() === '') {
      alert('포스팅할 콘텐츠가 없습니다. 먼저 AI 콘텐츠를 생성해주세요.');
      return;
    }

    // Threads 인증 확인
    if (!isThreadsAuthenticated) {
      alert('Threads 계정 연결이 필요합니다. 먼저 Threads 계정을 연결해주세요.');
      return;
    }

    // 분할된 스레드 콘텐츠 확인
    if (!editingThreadParts || editingThreadParts.length === 0) {
      alert('포스팅할 콘텐츠가 없습니다.');
      return;
    }

    const threadCount = editingThreadParts.length;
    const confirmMessage = threadCount === 1
      ? '지금 바로 Threads에 포스팅하시겠습니까?'
      : `지금 바로 Threads에 스레드(메인 포스트 + ${threadCount - 1}개 댓글)로 포스팅하시겠습니까?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsPosting(true);

    try {
      let result;

      if (threadCount === 1) {
        // 단일 포스트
        result = await threadsService.createAndPublishPost({
          text: editingThreadParts[0],
          media_type: 'TEXT'
        });
        console.log('Threads 포스팅 성공:', result);
      } else {
        // 스레드 포스팅 (메인 + 댓글들)
        console.log(`스레드 포스팅 시작: 총 ${threadCount}개 포스트`);
        const threadResult = await threadsService.createAndPublishThread(editingThreadParts);

        result = threadResult.mainPost;
        console.log('스레드 포스팅 완료:', {
          mainPost: threadResult.mainPost.id,
          replyCount: threadResult.replies.length
        });
      }

      // 상태를 "published"로 변경
      setMaterials(prev => prev.map(m =>
        m.id === previewMaterial.id
          ? {
              ...m,
              status: 'published' as const,
              publishDate: new Date().toISOString(),
              threadParts: editingThreadParts
            }
          : m
      ));

      // Supabase에 히스토리 저장
      if (isSupabaseConfigured()) {
        try {
          const existingContents = await historyService.getContentHistory('threads');
          const existingContent = existingContents?.find(c => c.id === previewMaterial.id);

          if (existingContent) {
            await historyService.updateContent(previewMaterial.id, {
              metadata: {
                ...existingContent.metadata,
                status: 'published',
                publishDate: new Date().toISOString(),
                threadsPostId: result.id,
                threadsPermalink: result.permalink,
                threadParts: editingThreadParts,
                threadCount: threadCount,
                summary: previewMaterial.summary
              }
            });
          } else {
            await historyService.saveContent({
              content_type: 'threads',
              title: previewMaterial.title,
              content: previewMaterial.draftContent,
              metadata: {
                category: previewMaterial.category,
                status: 'published',
                publishDate: new Date().toISOString(),
                threadsPostId: result.id,
                threadsPermalink: result.permalink,
                threadParts: editingThreadParts,
                threadCount: threadCount,
                summary: previewMaterial.summary
              },
              sources: previewMaterial.sources || []
            });
          }
        } catch (err) {
          console.error('히스토리 저장 실패:', err);
        }
      }

      setPreviewMaterial(null);
      const successMessage = threadCount === 1
        ? 'Threads에 성공적으로 포스팅되었습니다!\n\n초안이 "초안 사용됨"으로 이동되었습니다.'
        : `Threads에 스레드가 성공적으로 포스팅되었습니다!\n(메인 포스트 + ${threadCount - 1}개 댓글)\n\n초안이 "초안 사용됨"으로 이동되었습니다.`;
      alert(successMessage);
    } catch (error: any) {
      console.error('Threads 포스팅 실패:', error);
      alert(`포스팅에 실패했습니다.\n\n${error.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  // 예약 포스팅 모달 열기
  const handleOpenScheduleModal = () => {
    if (!previewMaterial) return;
    if (!previewMaterial.draftContent || previewMaterial.draftContent.trim() === '') {
      alert('포스팅할 콘텐츠가 없습니다. 먼저 AI 콘텐츠를 생성해주세요.');
      return;
    }

    // Threads 인증 확인
    if (!isThreadsAuthenticated) {
      alert('Threads 계정 연결이 필요합니다. 먼저 Threads 계정을 연결해주세요.');
      return;
    }

    // 현재 시간 + 1시간을 기본값으로 설정 (로컬 시간대 사용, 한국은 KST)
    const now = new Date();
    now.setHours(now.getHours() + 1);
    // datetime-local input은 로컬 시간대를 사용하므로 timezone offset을 고려
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    setScheduledDateTime(defaultDateTime);
    setIsScheduleModalOpen(true);
  };

  // 예약 포스팅 확정
  const handleConfirmScheduledPost = async () => {
    if (!previewMaterial) return;
    if (!scheduledDateTime) {
      alert('예약 일시를 선택해주세요.');
      return;
    }

    // datetime-local의 값을 로컬 시간대(KST)로 파싱
    const scheduledDate = new Date(scheduledDateTime);
    const now = new Date();

    // 과거 시간 체크
    if (scheduledDate <= now) {
      alert('예약 일시는 현재 시간 이후여야 합니다.');
      return;
    }

    // 분할된 스레드 콘텐츠 확인
    if (!editingThreadParts || editingThreadParts.length === 0) {
      alert('포스팅할 콘텐츠가 없습니다.');
      return;
    }

    setIsScheduleModalOpen(false);

    try {
      const threadCount = editingThreadParts.length;

      // 로컬 시간대(KST) 문자열로 저장 (ISO 형식이지만 로컬 시간대 정보 포함)
      const kstOffset = 9 * 60; // KST는 UTC+9
      const localOffset = scheduledDate.getTimezoneOffset(); // 분 단위 (KST는 -540)
      const scheduledDateISO = scheduledDate.toISOString();

      // 상태를 "published"로 변경하고 scheduledDate, threadParts 저장
      setMaterials(prev => prev.map(m =>
        m.id === previewMaterial.id
          ? {
              ...m,
              status: 'published' as const,
              scheduledDate: scheduledDateISO,
              threadParts: editingThreadParts
            }
          : m
      ));

      // Supabase에 히스토리 저장
      if (isSupabaseConfigured()) {
        try {
          const existingContents = await historyService.getContentHistory('threads');
          const existingContent = existingContents?.find(c => c.id === previewMaterial.id);

          if (existingContent) {
            await historyService.updateContent(previewMaterial.id, {
              metadata: {
                ...existingContent.metadata,
                status: 'published',
                scheduledDate: scheduledDate.toISOString(),
                threadParts: editingThreadParts,
                threadCount: threadCount,
                summary: previewMaterial.summary
              }
            });
          } else {
            await historyService.saveContent({
              content_type: 'threads',
              title: previewMaterial.title,
              content: previewMaterial.draftContent || previewMaterial.summary,
              metadata: {
                category: previewMaterial.category,
                status: 'published',
                scheduledDate: scheduledDate.toISOString(),
                threadParts: editingThreadParts,
                threadCount: threadCount,
                summary: previewMaterial.summary
              },
              sources: previewMaterial.sources || []
            });
          }
        } catch (err) {
          console.error('히스토리 저장 실패:', err);
        }
      }

      setPreviewMaterial(null);
      const scheduleMessage = threadCount === 1
        ? `예약 포스팅이 설정되었습니다!\n\n예약 시간: ${scheduledDate.toLocaleString('ko-KR')}\n\n초안이 "초안 사용됨"으로 이동되었습니다.`
        : `예약 포스팅이 설정되었습니다!\n\n예약 시간: ${scheduledDate.toLocaleString('ko-KR')}\n스레드 구성: 메인 포스트 + ${threadCount - 1}개 댓글\n\n초안이 "초안 사용됨"으로 이동되었습니다.`;
      alert(scheduleMessage);
    } catch (error) {
      console.error('예약 설정 중 오류:', error);
      alert('예약 설정에 실패했습니다.');
    }
  };

  // AI 콘텐츠 생성 (활용된 지식으로 재작성)
  const handleRegenerateContent = async () => {
    if (!previewMaterial) return;

    setIsRegeneratingContent(true);

    try {
      const referenceStyleText = persona.referenceStyles.length > 0
        ? `\n\n**참고할 글 스타일:**\n${persona.referenceStyles.map(s => s.content).join('\n\n')}`
        : '';

      const sourcesText = previewMaterial.sources && previewMaterial.sources.length > 0
        ? `\n\n**참고 자료:**\n${previewMaterial.sources.map(s => `- ${s.title}: ${s.uri}`).join('\n')}`
        : '';

      const draftPrompt = `당신은 ${persona.concept} 분야의 전문 콘텐츠 작가입니다.

**페르소나 정보:**
- 사용 언어: ${persona.language}
- 채널 컨셉: ${persona.concept}
- 타겟 독자: ${persona.target}

**글쓰기 스타일 가이드:**
${persona.writingPrompt}
${referenceStyleText}

**작성할 콘텐츠 정보:**
- 제목: ${previewMaterial.title}
- 핵심 요약: ${previewMaterial.summary}
${sourcesText}

**작성 요구사항:**
1. 위 글쓰기 스타일 가이드를 철저히 따라주세요
2. 쓰레드 형식으로 작성 (2-3개 스레드, 각 스레드는 280자 이하)
3. ${persona.target}의 관심사와 언어 수준에 맞춰 작성
4. 첫 스레드는 강력한 후킹으로 시작
5. 마지막에는 참여를 유도하는 CTA 포함
6. 이모지를 적절히 활용
7. 단락 구분을 명확히 하여 가독성 확보

완전히 새로운 쓰레드 콘텐츠를 작성해주세요:`;

      const result = await generateBlogPost(draftPrompt, sourceType === 'search');
      const newContent = result.text;

      // 콘텐츠 생성 성공 시 "초안 생성됨" 상태로 변경하고 히스토리에 저장
      const updatedMaterial = {
        ...previewMaterial,
        draftContent: newContent,
        status: 'draft-created' as const
      };

      setMaterials(prev =>
        prev.map(m =>
          m.id === previewMaterial.id
            ? updatedMaterial
            : m
        )
      );
      setPreviewMaterial(updatedMaterial);

      // Supabase에 히스토리 저장 ("초안 생성됨"으로 이동 시)
      if (isSupabaseConfigured()) {
        try {
          const savedContent = await historyService.saveContent({
            content_type: 'threads',
            title: updatedMaterial.title,
            content: newContent,
            metadata: {
              category: updatedMaterial.category,
              status: 'draft-created',
              createdAt: updatedMaterial.createdAt
            },
            sources: updatedMaterial.sources || []
          });

          // 저장 후 반환된 ID로 material.id 업데이트
          if (savedContent && savedContent.id) {
            setMaterials(prev => prev.map(m =>
              m.id === previewMaterial.id ? { ...m, id: savedContent.id! } : m
            ));
            setPreviewMaterial({ ...updatedMaterial, id: savedContent.id });
            console.log('초안이 히스토리에 저장되었습니다:', savedContent.id);
          }
        } catch (err) {
          console.error('히스토리 저장 실패:', err);
        }
      }

    } catch (error: any) {
      console.error('콘텐츠 재생성 오류:', error);
      alert(error.message || 'AI 콘텐츠 생성에 실패했습니다.');
    } finally {
      setIsRegeneratingContent(false);
    }
  };

  // AI로 수정하기
  const handleModifyContent = async () => {
    if (!previewMaterial || !modifyInstructions.trim()) {
      alert('수정 지시사항을 입력해주세요.');
      return;
    }

    setIsModifying(true);

    try {
      const modifyPrompt = `당신은 ${persona.concept} 분야의 전문 콘텐츠 편집자입니다.

**현재 쓰레드 콘텐츠:**
${previewMaterial.draftContent || ''}

**글쓰기 스타일 가이드:**
${persona.writingPrompt}

**수정 지시사항:**
${modifyInstructions}

**작업 요구사항:**
1. 위 수정 지시사항에 따라 현재 콘텐츠를 수정해주세요
2. 글쓰기 스타일 가이드는 유지해주세요
3. 쓰레드 형식 (2-3개 스레드, 각 280자 이하) 준수
4. 수정된 부분이 자연스럽게 전체와 어울리도록 작성

**중요: 수정된 쓰레드 콘텐츠만 작성하고, 어떠한 설명이나 서문, 후기 없이 바로 콘텐츠만 출력하세요. "수정된 쓰레드 콘텐츠" 같은 제목도 포함하지 마세요.**`;

      const result = await generateBlogPost(modifyPrompt, false);
      let modifiedContent = result.text;

      // AI 응답에서 불필요한 설명 제거
      // "수정된 쓰레드 콘텐츠", "***", 서문 등을 제거하고 실제 콘텐츠만 추출
      const lines = modifiedContent.split('\n');
      const contentStartIndicators = [
        '### **수정된',
        '수정된 쓰레드',
        '***',
        '---',
        '네, ',
        '알겠습니다',
        '물론입니다',
      ];

      let startIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const isIndicator = contentStartIndicators.some(indicator => line.includes(indicator));
        if (isIndicator || line.length === 0) {
          startIndex = i + 1;
        } else {
          break;
        }
      }

      if (startIndex > 0 && startIndex < lines.length) {
        modifiedContent = lines.slice(startIndex).join('\n').trim();
      }

      setMaterials(prev =>
        prev.map(m =>
          m.id === previewMaterial.id
            ? { ...m, draftContent: modifiedContent }
            : m
        )
      );
      setPreviewMaterial({ ...previewMaterial, draftContent: modifiedContent });
      setIsModifyModalOpen(false);
      setModifyInstructions('');

    } catch (error: any) {
      console.error('콘텐츠 수정 오류:', error);
      alert(error.message || 'AI 수정에 실패했습니다.');
    } finally {
      setIsModifying(false);
    }
  };

  // 상태별 필터링
  const pendingMaterials = materials.filter(m => m.status === 'pending');
  const draftMaterials = materials.filter(m => m.status === 'draft-created');
  const publishedMaterials = materials.filter(m => m.status === 'published');

  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };


  return (
    <div className="max-w-7xl mx-auto">
      {/* Threads 인증 상태 섹션 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068c0-3.518.85-6.373 2.495-8.432C5.852 1.332 8.605.15 12.186.126h.014c3.581.024 6.334 1.206 8.184 3.51C21.85 5.695 22.7 8.55 22.7 12.068c0 3.518-.85 6.373-2.495 8.432-1.652 2.051-4.405 3.233-7.986 3.257h-.033zm-.007-22.75h-.007c-3.209.022-5.558 1.082-7.004 3.15C3.685 6.314 2.95 8.854 2.95 12.068c0 3.214.735 5.753 2.218 7.668 1.446 2.068 3.795 3.128 7.004 3.15h.014c3.209-.022 5.558-1.082 7.004-3.15 1.483-1.915 2.218-4.454 2.218-7.668 0-3.214-.735-5.753-2.218-7.668-1.446-2.068-3.795-3.128-7.004-3.15h-.007z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Threads 연동 상태
              </h2>
              {isThreadsAuthenticated && threadsUserProfile ? (
                <p className="text-sm text-slate-600 mt-1">
                  @{threadsUserProfile.username}로 연동됨
                </p>
              ) : (
                <p className="text-sm text-slate-600 mt-1">
                  Threads 계정을 연동하여 자동 포스팅을 시작하세요
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isLoadingThreadsProfile ? (
              <div className="px-6 py-2 bg-slate-100 rounded-lg">
                <span className="text-sm text-slate-600">로딩 중...</span>
              </div>
            ) : isThreadsAuthenticated ? (
              <>
                <button
                  onClick={handleDiagnoseThreads}
                  className="px-6 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                  title="토큰 및 권한 확인"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  연결 진단
                </button>
                <button
                  onClick={handleThreadsLogout}
                  className="px-6 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  연동 해제
                </button>
              </>
            ) : (
              <button
                onClick={handleThreadsLogin}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068c0-3.518.85-6.373 2.495-8.432C5.852 1.332 8.605.15 12.186.126h.014c3.581.024 6.334 1.206 8.184 3.51C21.85 5.695 22.7 8.55 22.7 12.068c0 3.518-.85 6.373-2.495 8.432-1.652 2.051-4.405 3.233-7.986 3.257h-.033zm-.007-22.75h-.007c-3.209.022-5.558 1.082-7.004 3.15C3.685 6.314 2.95 8.854 2.95 12.068c0 3.214.735 5.753 2.218 7.668 1.446 2.068 3.795 3.128 7.004 3.15h.014c3.209-.022 5.558-1.082 7.004-3.15 1.483-1.915 2.218-4.454 2.218-7.668 0-3.214-.735-5.753-2.218-7.668-1.446-2.068-3.795-3.128-7.004-3.15h-.007z"/>
                </svg>
                Threads 계정 연동하기
              </button>
            )}
          </div>
        </div>

        {!isThreadsAuthenticated && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Threads 연동 방법:</strong> 위의 "Threads 계정 연동하기" 버튼을 클릭하여 Threads 계정으로 로그인하면, 생성한 포스트를 자동으로 Threads에 발행할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 페르소나 설정 섹션 (읽기 전용) */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            페르소나 설정
          </h2>
          <button
            onClick={handleOpenPersonaPanel}
            className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            페르소나 편집
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">언어</label>
            <p className="text-slate-800 font-semibold">{persona.language || '설정되지 않음'}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">컨셉 (채널 및 컨텐츠)</label>
            <p className="text-slate-800 font-semibold">{persona.concept || '설정되지 않음'}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">타겟</label>
            <p className="text-slate-800 font-semibold">{persona.target || '설정되지 않음'}</p>
          </div>
        </div>

        {(!persona.concept || !persona.target) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-800">
              페르소나를 설정하면 AI가 더 정확한 콘텐츠를 생성할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 콘텐츠 소재 선택 섹션 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          콘텐츠 소재 선택
        </h2>

        {/* 소재 타입 선택 버튼 */}
        <div className="flex gap-3 mb-4">
          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="sourceType"
              value="search"
              checked={sourceType === 'search'}
              onChange={(e) => setSourceType(e.target.value as ContentSourceType)}
              className="sr-only"
            />
            <div className={`px-4 py-3 rounded-lg border-2 transition-all text-center ${
              sourceType === 'search'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}>
              <div className={`font-semibold ${sourceType === 'search' ? 'text-indigo-700' : 'text-slate-700'}`}>
                검색 정보 기반
              </div>
            </div>
          </label>

          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="sourceType"
              value="creative"
              checked={sourceType === 'creative'}
              onChange={(e) => setSourceType(e.target.value as ContentSourceType)}
              className="sr-only"
            />
            <div className={`px-4 py-3 rounded-lg border-2 transition-all text-center ${
              sourceType === 'creative'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}>
              <div className={`font-semibold ${sourceType === 'creative' ? 'text-indigo-700' : 'text-slate-700'}`}>
                창작 스토리 기반
              </div>
            </div>
          </label>

          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="sourceType"
              value="internal"
              checked={sourceType === 'internal'}
              onChange={(e) => setSourceType(e.target.value as ContentSourceType)}
              className="sr-only"
            />
            <div className={`px-4 py-3 rounded-lg border-2 transition-all text-center ${
              sourceType === 'internal'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}>
              <div className={`font-semibold ${sourceType === 'internal' ? 'text-indigo-700' : 'text-slate-700'}`}>
                내부 지식 기반
              </div>
            </div>
          </label>
        </div>

        {/* 선택된 소재 타입에 따른 설명 및 입력 영역 */}
        {sourceType === 'search' && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700 mb-3">
              검색 기반 소재 발굴: 웹과 검색 정보의 특성(주제, 관점, 제목)을 적으면 관련 자료를 탐색+수집 다수의 아이디어 후보를 제안합니다.
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              어떤 소재에서, 어떤 종류의 정보를 찾아볼까요? (선택사항)
            </label>
            <textarea
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="예: Reddit에서 AI 트렌드 검색, 네이버 블로그에서 마케팅 팁 찾기, 최신 테크 뉴스"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
              rows={3}
            />
          </div>
        )}

        {sourceType === 'creative' && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700">
              창작 스토리: 외부 자료 없이 AI가 제안의 창작성 콘텐츠를 구성합니다.
            </p>
          </div>
        )}

        {sourceType === 'internal' && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700 mb-3">
              내부 지식: 계정에 업로드된 문서에서 정보를 추출해 콘텐츠를 구성합니다.
            </p>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">내부 지식 문서</h4>
              <p className="text-sm text-slate-600 mb-3">
                현재 계정에 등록된 문서가 없습니다.<br />
                계정 관리에서 문서를 업로드하여 지식 관리를 시작하세요
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerateMaterials}
          disabled={isGenerating}
          className="w-full px-6 py-3 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-lg transition-colors font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              AI 소재 생성 중...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 콘텐츠 요청
            </>
          )}
        </button>
      </div>

      {/* 칸반 보드 스타일 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 작성 대기중 칸 */}
        <div className="bg-orange-50 rounded-xl shadow-md p-4 border-2 border-orange-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
              <span className="bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                작성 대기중
              </span>
              <span>{pendingMaterials.length}</span>
            </h2>
            {pendingMaterials.length > 0 && (
              <button
                onClick={handleClearPendingMaterials}
                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                title="작성 대기중 항목 전체 삭제"
              >
                전체 삭제
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
            {pendingMaterials.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                AI로 소재를 발굴하면 여기에 표시됩니다
              </div>
            ) : (
              <div className="space-y-3">
                {pendingMaterials.map((material) => (
                  <div key={material.id} className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm hover:shadow-md transition-shadow relative group">
                    {/* 삭제 버튼 (호버 시 표시) */}
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* 제목 */}
                    <h3 className="font-bold text-sm text-slate-800 mb-2 pr-6">{material.title}</h3>

                    {/* 요약 */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
                      {material.summary}
                    </p>

                    {/* 카테고리 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                        {material.category}
                      </span>
                    </div>

                    {/* 외부 지식 소스 */}
                    {material.sources && material.sources.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1.5">외부 지식 소스</p>
                        <div className="space-y-1">
                          {material.sources.slice(0, 5).map((source: { uri: string; title: string }, idx: number) => {
                            const hasValidUri = source.uri && source.uri !== '#' && source.uri.startsWith('http');
                            return (
                              <div key={idx} className="flex items-start gap-1.5">
                                <svg className="w-3 h-3 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                {hasValidUri ? (
                                  <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-orange-600 hover:text-orange-800 hover:underline flex-1 line-clamp-1"
                                    title={source.title}
                                  >
                                    {source.title}
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-600 flex-1 line-clamp-1" title={source.title}>
                                    {source.title}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {material.sources.slice(0, 5).map((source: { uri: string; title: string }, idx: number) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <svg className="w-3 h-3 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              {source.uri && source.uri.startsWith('http') ? (
                                <a
                                  href={source.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange-600 hover:text-orange-800 hover:underline flex-1 line-clamp-1"
                                  title={source.title}
                                >
                                  {source.title}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-600 flex-1 line-clamp-1" title={source.title}>
                                  {source.title}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 하단: 날짜 및 버튼 */}
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(material.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </p>
                      <div>
                        <button
                          onClick={() => handleCreateDraft(material)}
                          disabled={isCreatingDraft === material.id}
                          className="w-full px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded transition-colors flex items-center justify-center gap-1"
                        >
                          {isCreatingDraft === material.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              생성 중...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              콘텐츠 생성
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 초안 생성됨 칸 */}
        <div className="bg-blue-50 rounded-xl shadow-md p-4 border-2 border-blue-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
              <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                초안 생성됨
              </span>
              <span>{draftMaterials.length}</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
            {draftMaterials.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                콘텐츠 생성 버튼을 누르면 초안이 여기에 표시됩니다
              </div>
            ) : (
              <div className="space-y-3">
                {draftMaterials.map((material) => (
                  <div key={material.id} className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm hover:shadow-md transition-shadow relative group">
                    {/* 삭제 버튼 (호버 시 표시) */}
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* 제목 */}
                    <h3 className="font-bold text-sm text-slate-800 mb-2 pr-6">{material.title}</h3>

                    {/* 요약 */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
                      {material.summary}
                    </p>

                    {/* 카테고리 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                        {material.category}
                      </span>
                    </div>

                    {/* 외부 지식 소스 */}
                    {material.sources && material.sources.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1.5">외부 지식 소스</p>
                        <div className="space-y-1">
                          {material.sources.slice(0, 5).map((source: { uri: string; title: string }, idx: number) => {
                            const hasValidUri = source.uri && source.uri !== '#' && source.uri.startsWith('http');
                            return (
                              <div key={idx} className="flex items-start gap-1.5">
                                <svg className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                {hasValidUri ? (
                                  <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex-1 line-clamp-1"
                                    title={source.title}
                                  >
                                    {source.title}
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-600 flex-1 line-clamp-1" title={source.title}>
                                    {source.title}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {material.sources.slice(0, 5).map((source: { uri: string; title: string }, idx: number) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <svg className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              {source.uri && source.uri.startsWith('http') ? (
                                <a
                                  href={source.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex-1 line-clamp-1"
                                  title={source.title}
                                >
                                  {source.title}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-600 flex-1 line-clamp-1" title={source.title}>
                                  {source.title}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 하단: 날짜 및 버튼 */}
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(material.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreateDraft(material)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          콘텐츠 재생성
                        </button>
                        <button
                          onClick={() => setPreviewMaterial(material)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                        >
                          초안 확인하기
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 초안 사용됨 칸 */}
        <div className="bg-green-50 rounded-xl shadow-md p-4 border-2 border-green-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
              <span className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                초안 사용됨
              </span>
              <span>{publishedMaterials.length}</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
            {publishedMaterials.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                발행 일자를 설정하면 여기로 이동합니다
              </div>
            ) : (
              <div className="space-y-3">
                {publishedMaterials.map((material) => (
                  <div key={material.id} className="bg-white rounded-lg p-4 border border-green-200 shadow-sm hover:shadow-md transition-shadow relative group">
                    {/* 삭제 버튼 (호버 시 표시) */}
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <h3 className="font-bold text-sm text-slate-800 mb-2 pr-6">{material.title}</h3>
                    {material.publishDate && (
                      <p className="text-xs text-green-700 mb-3">
                        📅 {new Date(material.publishDate).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                    <div className="bg-slate-50 rounded p-2 mb-3">
                      <p className="text-xs text-slate-700 line-clamp-3">{material.draftContent}</p>
                    </div>

                    {/* 콘텐츠 확인하기 버튼 */}
                    <button
                      onClick={() => handleViewInsights(material)}
                      className="w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      콘텐츠 확인하기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div> {/* 칸반 보드 그리드 닫기 */}

      {/* 페르소나 편집 모달 팝업 */}
      {isPersonaPanelOpen && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black/50 z-[70] transition-opacity"
            onClick={() => setIsPersonaPanelOpen(false)}
          ></div>

          {/* 중앙 모달 패널 */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl rounded-xl overflow-y-auto pointer-events-auto p-6">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">스레드 계정명 AI 설정</h2>
                <button
                  onClick={() => setIsPersonaPanelOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 프로그레스 표시 */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-800">스레드 계정명 AI 설정</span>
                  <span className="text-lg font-bold text-green-800">100/100</span>
                </div>
                <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 transition-all" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-green-700 mt-2">완벽해요! AI가 최고의 콘텐츠를 만들 준비가 됐어요 🎯</p>
              </div>

              {/* 탭 네비게이션 */}
              <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`px-4 py-3 font-medium transition-all border-b-2 ${
                    activeTab === 'basic'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                >
                  기본 정보
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">30/30</span>
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className={`px-4 py-3 font-medium transition-all border-b-2 ${
                    activeTab === 'content'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                >
                  콘텐츠 설정
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">40/40</span>
                </button>
                <button
                  onClick={() => setActiveTab('automation')}
                  className={`px-4 py-3 font-medium transition-all border-b-2 ${
                    activeTab === 'automation'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                >
                  자동화 설정
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">30/30</span>
                </button>
              </div>

              {/* 탭 컨텐츠 */}
              <div className="space-y-6">
                {/* 기본 정보 탭 */}
                {activeTab === 'basic' && (
                  <>
                    {/* 언어 */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        언어 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editingPersona.language}
                        onChange={(e) => handleEditingPersonaChange('language', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      >
                        <option value="Korean">한국어</option>
                        <option value="English">English</option>
                        <option value="Japanese">日本語</option>
                        <option value="Chinese">中文</option>
                      </select>
                    </div>

                    {/* 컨셉 */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        컨셉 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={editingPersona.concept}
                        onChange={(e) => handleEditingPersonaChange('concept', e.target.value)}
                        rows={4}
                        placeholder="AI 시대, 사이버를 말하다 - 에이치텍크 전문가가 만에 따른 사.나.의 팀터 인사이트 외부"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {editingPersona.concept.length}/2000
                      </p>
                    </div>

                    {/* 타겟 오디언스 */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        타겟 오디언스 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={editingPersona.target}
                        onChange={(e) => handleEditingPersonaChange('target', e.target.value)}
                        rows={3}
                        placeholder="1차 타겟: 테크 얼리어답터 MZ세대 (25~40세) - 60% | 2차 타겟: 스토밍/테크 담당 존재 - 40%"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {editingPersona.target.length}/500
                      </p>
                    </div>
                  </>
                )}

                {/* 콘텐츠 설정 탭 */}
                {activeTab === 'content' && (
                  <>
                    {/* 글쓰기 프롬프트 */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        글쓰기 프롬프트 <span className="text-red-500">*</span>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </label>
                      <textarea
                        value={editingPersona.writingPrompt || ''}
                        onChange={(e) => handleEditingPersonaChange('writingPrompt', e.target.value)}
                        rows={12}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                        placeholder="AI에게 어떤 스타일로 글을 써달라고 지시할지 입력하세요..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {(editingPersona.writingPrompt || '').length} 글자
                      </p>
                    </div>

                    {/* 참고할 글 스타일 */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
                        <span>참고할 글 스타일</span>
                        <span className="text-xs text-slate-500 font-normal">
                          {editingPersona.referenceStyles.length > 0 ? `20/20점` : '25 추가됨'}
                        </span>
                      </label>

                      {/* 탭: 직접 입력 / 기존 포스트에서 선택 */}
                      <div className="flex gap-2 mb-3 border-b border-slate-200">
                        <button className="px-4 py-2 text-sm font-medium border-b-2 border-indigo-600 text-indigo-700">
                          직접 입력
                        </button>
                        <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-600 hover:text-slate-800">
                          기존 포스트에서 선택
                        </button>
                      </div>

                      {/* 새 참고 글 스타일 추가 영역 */}
                      <div className="space-y-3 mb-4">
                        <textarea
                          value={newReferenceStyle}
                          onChange={(e) => setNewReferenceStyle(e.target.value)}
                          rows={6}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                          placeholder="새 참고할 글 스타일 추가"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddReferenceStyle}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            추가
                          </button>
                        </div>
                      </div>

                      {/* 저장된 참고 글 스타일 목록 */}
                      {editingPersona.referenceStyles && editingPersona.referenceStyles.length > 0 && (
                        <div className="border-t border-slate-200 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-700">
                              저장된 참고할 글 스타일 ({editingPersona.referenceStyles.length})
                            </h4>
                          </div>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {editingPersona.referenceStyles.map((style) => (
                              <div key={style.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-start justify-between mb-2">
                                  <p className="text-xs text-slate-500">
                                    {new Date(style.addedDate).toLocaleDateString('ko-KR')}
                                  </p>
                                  <button
                                    onClick={() => handleDeleteReferenceStyle(style.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{style.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 내부 지식 관리 */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        내부 지식 관리
                      </label>
                      <p className="text-xs text-slate-600 mb-3">
                        AI가 답변할 때 참고할 수 있는 내부 문서를 업로드하세요.<br />
                        PDF, TXT, DOCX, CSV, XLSX 파일을 지원합니다 (최대 50MB).
                      </p>

                      {/* 파일 업로드 */}
                      <div className="mb-4">
                        <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-medium text-slate-700">파일 업로드</p>
                            <p className="text-xs text-slate-500 mt-1">클릭하여 파일을 선택하세요</p>
                          </div>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.txt,.docx,.csv,.xlsx"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* 업로드된 파일 목록 */}
                      {editingPersona.uploadedFiles && editingPersona.uploadedFiles.length > 0 && (
                        <div className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              업로드된 파일
                            </h4>
                            <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                              새로고침
                            </button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {editingPersona.uploadedFiles.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <svg className="w-8 h-8 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!editingPersona.uploadedFiles || editingPersona.uploadedFiles.length === 0) && (
                        <div className="text-center py-8 text-slate-400">
                          <svg className="w-16 h-16 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm">업로드된 문서가 없습니다</p>
                          <p className="text-xs mt-1">첫 번째 문서를 업로드하여 지식 관리를 시작하세요</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 자동화 설정 탭 */}
                {activeTab === 'automation' && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">자동화 설정</h3>
                    <p className="text-slate-500 text-sm">이 기능은 곧 출시될 예정입니다.</p>
                  </div>
                )}
              </div>

              {/* 저장 버튼 */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={handleSavePersona}
                  className="w-full px-6 py-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold text-lg shadow-md hover:shadow-lg"
                >
                  콘텐츠 설정 업데이트
                </button>
              </div>

              {/* 추가 정보 */}
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">위험 구역</h3>
                <p className="text-sm text-red-700">
                  채널을 중단할 수 있습니다. 신중하게 진행하세요.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 초안 확인 모달 */}
      {previewMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-2xl font-bold text-slate-800">초안 확인하기</h2>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문: 2단 레이아웃 */}
            <div className="flex-1 flex overflow-hidden">
              {/* 좌측: 편집 영역 */}
              <div className="w-1/2 border-r border-slate-200 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* 1. 제목 */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-3">{previewMaterial.title}</h3>
                  </div>

                  {/* 2. 초안 요약 */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">초안 요약</h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 min-w-[80px]">제목:</span>
                        <span className="text-slate-800 font-medium">{previewMaterial.title}</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 min-w-[80px]">요약:</span>
                        <span className="text-slate-700">{previewMaterial.summary}</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 min-w-[80px]">카테고리:</span>
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                          {previewMaterial.category}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 min-w-[80px]">상태:</span>
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {previewMaterial.status === 'pending' ? '작성 대기중' :
                           previewMaterial.status === 'draft-created' ? '초안 생성됨' : '발행됨'}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 min-w-[80px]">생성일:</span>
                        <span className="text-slate-700">
                          {new Date(previewMaterial.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      {previewMaterial.sources && previewMaterial.sources.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500 min-w-[80px]">활용된 지식:</span>
                          <div className="flex-1 space-y-1">
                            {previewMaterial.sources.map((source: { uri: string; title: string }, idx: number) => (
                              source.uri && source.uri.startsWith('http') ? (
                                <a
                                  key={idx}
                                  href={source.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                  title={source.uri}
                                >
                                  {source.title}
                                </a>
                              ) : (
                                <span key={idx} className="block text-xs text-slate-600" title={source.title}>
                                  {source.title}
                                </span>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. 콘텐츠 AI 수정 영역 */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={handleRegenerateContent}
                      disabled={isRegeneratingContent}
                      className="px-4 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isRegeneratingContent ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          생성 중...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI 콘텐츠 생성
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsModifyModalOpen(true)}
                      className="px-4 py-3 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-2 border-2 border-dashed border-indigo-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      AI로 수정하기
                    </button>
                    <button
                      onClick={() => setIsPersonaPanelOpen(true)}
                      className="px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      페르소나 편집
                    </button>
                  </div>

                  {/* 4. 쓰레드 콘텐츠 영역 - 탭 UI */}
                  <div>
                    {/* 탭 헤더 */}
                    <div className="flex border-b border-slate-200 mb-4">
                      <button
                        onClick={() => setPreviewTab('split')}
                        className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                          previewTab === 'split'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        분할 미리보기
                      </button>
                      <button
                        onClick={() => setPreviewTab('full')}
                        className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                          previewTab === 'full'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        전체 보기
                      </button>
                    </div>

                    {/* 탭 내용 */}
                    {previewTab === 'full' ? (
                      /* 전체 보기 탭 */
                      <div>
                        <textarea
                          value={previewMaterial.draftContent || ''}
                          onChange={(e) => {
                            const updated = materials.map(m =>
                              m.id === previewMaterial.id
                                ? { ...m, draftContent: e.target.value }
                                : m
                            );
                            setMaterials(updated);
                            setPreviewMaterial({ ...previewMaterial, draftContent: e.target.value });
                          }}
                          rows={12}
                          placeholder="AI가 생성한 쓰레드 콘텐츠가 여기에 표시됩니다..."
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-slate-500">
                            {(previewMaterial.draftContent || '').length} 글자
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* 분할 미리보기 탭 */
                      <div className="space-y-3">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={handleAutoSplit}
                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            자동 분할
                          </button>
                        </div>

                        {editingThreadParts.map((part, index) => (
                          <div key={index} className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden">
                            {/* 헤더 */}
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                {index === 0 ? (
                                  <>
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs font-bold text-blue-600">메인 포스트</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs font-bold text-green-600">댓글 {index}</span>
                                  </>
                                )}
                                <span className="text-xs text-slate-500">({part.length}/500자)</span>
                              </div>

                              {/* 편집 버튼 */}
                              <div className="flex items-center gap-1">
                                {index > 0 && (
                                  <button
                                    onClick={() => handleMoveThreadPartUp(index)}
                                    className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
                                    title="위로"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                  </button>
                                )}
                                {index < editingThreadParts.length - 1 && (
                                  <button
                                    onClick={() => handleMoveThreadPartDown(index)}
                                    className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
                                    title="아래로"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                )}
                                {editingThreadParts.length > 1 && (
                                  <button
                                    onClick={() => handleDeleteThreadPart(index)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                    title="삭제"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 콘텐츠 */}
                            <textarea
                              value={part}
                              onChange={(e) => handleUpdateThreadPart(index, e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="포스트 내용을 입력하세요..."
                            />
                          </div>
                        ))}

                        <div className="text-center text-xs text-slate-500 mt-2">
                          총 {editingThreadParts.length}개 포스트 (메인 1개 + 댓글 {editingThreadParts.length - 1}개)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 하단 버튼 */}
                  <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveDraft}
                        disabled={isPosting}
                        className="flex-1 px-6 py-3 text-slate-700 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        저장
                      </button>
                      <button
                        onClick={handleOpenScheduleModal}
                        disabled={isPosting}
                        className="flex-1 px-6 py-3 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        예약 포스팅
                      </button>
                      <button
                        onClick={handleImmediatePost}
                        disabled={isPosting}
                        className="flex-1 px-6 py-3 text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isPosting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            포스팅 중...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            바로 포스팅
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => setPreviewMaterial(null)}
                      className="w-full px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>

              {/* 우측: 모바일 프레임 미리보기 */}
              <div className="w-1/2 p-6 bg-slate-50 flex items-center justify-center">
                <div className="relative w-[360px] h-[680px] bg-black rounded-[3rem] shadow-2xl overflow-hidden border-[6px] border-slate-800">
                  {/* 노치 */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10"></div>

                  {/* 스크린 */}
                  <div className="h-full bg-white overflow-y-auto">
                    {/* Threads 헤더 */}
                    <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          기억
                        </div>
                        <div>
                          <div className="font-bold text-sm">memory.drawer25</div>
                          <div className="text-xs text-slate-500">· 기억의 서랍</div>
                        </div>
                      </div>
                      <button className="text-slate-600">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                    </div>

                    {/* 포스트 콘텐츠 - 스레드 형식 */}
                    <div className="p-4 space-y-4">
                      {previewTab === 'split' && editingThreadParts.length > 0 ? (
                        /* 분할 미리보기: 스레드 형식 */
                        <>
                          {editingThreadParts.map((part, index) => (
                            <div key={index} className={index > 0 ? "ml-8 border-l-2 border-slate-200 pl-4" : ""}>
                              {/* 메인 포스트 헤더 */}
                              {index === 0 && (
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    기
                                  </div>
                                  <div>
                                    <div className="font-bold text-xs">memory.drawer25</div>
                                  </div>
                                </div>
                              )}

                              {/* 포스트 내용 */}
                              <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 mb-3">
                                {part || '콘텐츠를 생성해주세요.'}
                              </div>

                              {/* 인터랙션 바 */}
                              <div className="flex items-center gap-4 text-slate-500">
                                <button className="flex items-center gap-1 hover:text-slate-700">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                  <span className="text-xs">0</span>
                                </button>
                                <button className="flex items-center gap-1 hover:text-slate-700">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  <span className="text-xs">{index === 0 ? editingThreadParts.length - 1 : 0}</span>
                                </button>
                                <button className="flex items-center gap-1 hover:text-slate-700">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        /* 전체 보기: 단일 포스트 */
                        <>
                          <h2 className="font-bold text-lg mb-3">{previewMaterial.title}</h2>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                            {previewMaterial.draftContent || '콘텐츠를 생성해주세요.'}
                          </div>

                          {/* 인터랙션 바 */}
                          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-200 text-slate-600">
                            <button className="flex items-center gap-2 hover:text-slate-800">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span className="text-xs">0</span>
                            </button>
                            <button className="flex items-center gap-2 hover:text-slate-800">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="text-xs">0</span>
                            </button>
                            <button className="flex items-center gap-2 hover:text-slate-800">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span className="text-xs">0</span>
                            </button>
                            <button className="flex items-center gap-2 hover:text-slate-800">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 수정 지시사항 입력 모달 */}
      {isModifyModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">AI로 수정하기</h3>
                <button
                  onClick={() => {
                    setIsModifyModalOpen(false);
                    setModifyInstructions('');
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    수정 지시사항
                  </label>
                  <textarea
                    value={modifyInstructions}
                    onChange={(e) => setModifyInstructions(e.target.value)}
                    rows={6}
                    placeholder="예: 첫 문장을 더 강렬하게 수정해주세요&#10;예: 전문용어를 쉬운 말로 바꿔주세요&#10;예: 이모지를 더 추가해주세요"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    AI에게 어떻게 수정할지 구체적으로 알려주세요
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setIsModifyModalOpen(false);
                      setModifyInstructions('');
                    }}
                    className="flex-1 px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleModifyContent}
                    disabled={isModifying || !modifyInstructions.trim()}
                    className="flex-1 px-6 py-3 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isModifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        수정 중...
                      </>
                    ) : (
                      '수정하기'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 예약 포스팅 날짜/시간 선택 모달 */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-bold text-slate-800">예약 포스팅 설정</h3>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    포스팅 예약 일시
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    ⏰ 한국 시간(KST) 기준으로 선택한 시간에 자동으로 Threads에 포스팅됩니다.
                  </p>
                </div>

                {previewMaterial && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">예약 내용</h4>
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-medium">제목:</span> {previewMaterial.title}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">카테고리:</span> {previewMaterial.category}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmScheduledPost}
                  className="flex-1 px-6 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                >
                  예약 확정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 콘텐츠 인사이트 모달 */}
      {insightsModalOpen && selectedInsightsMaterial && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-bold text-slate-800">콘텐츠 인사이트</h3>
              </div>
              <button
                onClick={() => {
                  setInsightsModalOpen(false);
                  setSelectedInsightsMaterial(null);
                  setInsightsData(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="p-6 space-y-6">
              {/* 콘텐츠 정보 */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="text-lg font-bold text-slate-800 mb-3">{selectedInsightsMaterial.title}</h4>

                {selectedInsightsMaterial.publishDate && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>발행일시: {new Date(selectedInsightsMaterial.publishDate).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                )}

                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedInsightsMaterial.draftContent || selectedInsightsMaterial.summary}
                </div>
              </div>

              {/* 인사이트 데이터 */}
              <div>
                <h5 className="text-md font-semibold text-slate-800 mb-4">포스팅 성과</h5>

                {isLoadingInsights ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm text-slate-600">인사이트를 불러오는 중...</p>
                    </div>
                  </div>
                ) : insightsData ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* 조회수 */}
                    {insightsData.views !== undefined && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-xs font-medium text-blue-700">조회수</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{insightsData.views.toLocaleString()}</p>
                      </div>
                    )}

                    {/* 좋아요 */}
                    {insightsData.likes !== undefined && (
                      <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span className="text-xs font-medium text-pink-700">좋아요</span>
                        </div>
                        <p className="text-2xl font-bold text-pink-900">{insightsData.likes.toLocaleString()}</p>
                      </div>
                    )}

                    {/* 댓글 */}
                    {insightsData.replies !== undefined && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="text-xs font-medium text-green-700">댓글</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{insightsData.replies.toLocaleString()}</p>
                      </div>
                    )}

                    {/* 리포스트 */}
                    {insightsData.reposts !== undefined && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <span className="text-xs font-medium text-purple-700">리포스트</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{insightsData.reposts.toLocaleString()}</p>
                      </div>
                    )}

                    {/* 인용 */}
                    {insightsData.quotes !== undefined && (
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="text-xs font-medium text-amber-700">인용</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-900">{insightsData.quotes.toLocaleString()}</p>
                      </div>
                    )}

                    {/* 도달 */}
                    {insightsData.reach !== undefined && (
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-xs font-medium text-indigo-700">도달</span>
                        </div>
                        <p className="text-2xl font-bold text-indigo-900">{insightsData.reach.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-slate-600 mb-1">인사이트 데이터를 불러올 수 없습니다</p>
                    <p className="text-xs text-slate-500">
                      포스트 ID가 없거나 아직 인사이트가 생성되지 않았을 수 있습니다.
                    </p>
                  </div>
                )}
              </div>

              {/* 닫기 버튼 */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setInsightsModalOpen(false);
                    setSelectedInsightsMaterial(null);
                    setInsightsData(null);
                  }}
                  className="w-full px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreadsAutoPosting;
