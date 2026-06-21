import { useRef, useCallback } from 'react';
import * as htmlToImage from 'html-to-image';

interface ImageCaptureResult {
  dataUrl: string;
  base64: string;
  filename: string;
}

interface SaveOptions {
  question: string;
  caption: string;
  backgroundUrl: string;
  onProgress?: (step: string) => void;
  onError?: (error: string) => void;
}

export const useInstagramImageCapture = () => {
  const capturePostRef = useRef<HTMLDivElement>(null);

  const generateFilename = useCallback((): string => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateId = `${yy}${mm}${dd}`;

    const key = `insta_seq_${dateId}`;
    const current = Number(localStorage.getItem(key) || '0');
    const next = current + 1;
    localStorage.setItem(key, String(next));
    const sequence = String(next).padStart(3, '0');

    return `today_${dateId}_${sequence}.jpg`;
  }, []);

  const captureImage = useCallback(async (): Promise<ImageCaptureResult> => {
    if (!capturePostRef.current) {
      throw new Error('이미지 변환에 필요한 요소를 찾을 수 없습니다.');
    }

    const dataUrl = await htmlToImage.toJpeg(capturePostRef.current, {
      quality: 0.85,
      pixelRatio: 1,
      width: 1080,
      height: 1350
    });

    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const filename = generateFilename();

    return {
      dataUrl,
      base64,
      filename
    };
  }, [generateFilename]);

  const uploadToDropbox = useCallback(async (
    dataUrl: string,
    filename: string
  ): Promise<{ success: boolean; shareUrl?: string }> => {
    const response = await fetch('/api/upload-to-dropbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: dataUrl,
        filename,
        folderPath: '/Drawer_instagram'
      }),
    });

    if (!response.ok) {
      throw new Error('Dropbox 업로드 실패');
    }

    const result = await response.json();
    return {
      success: true,
      shareUrl: result.dropbox?.shareUrl || ''
    };
  }, []);

  const saveToAirtable = useCallback(async (
    question: string,
    caption: string,
    filename: string,
    dropboxUrl: string
  ): Promise<void> => {
    const response = await fetch('/api/save-to-airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        caption,
        createdAt: new Date().toISOString(),
        filename,
        dropboxUrl
      }),
    });

    if (!response.ok) {
      throw new Error('Airtable 저장 실패');
    }
  }, []);

  const handleSaveAll = useCallback(async (
    options: SaveOptions
  ): Promise<boolean> => {
    const { question, caption, backgroundUrl, onProgress, onError } = options;

    try {
      console.log('🚀 저장 프로세스 시작');

      onProgress?.('이미지 생성 중...');
      const imageResult = await captureImage();

      onProgress?.('Dropbox 업로드 중...');
      const uploadResult = await uploadToDropbox(imageResult.dataUrl, imageResult.filename);

      onProgress?.('Airtable 저장 중...');
      await saveToAirtable(
        question,
        caption,
        imageResult.filename,
        uploadResult.shareUrl || ''
      );

      alert(`✅ 저장이 완료되었습니다!\n\n📁 파일명: ${imageResult.filename}\n💾 Airtable & Dropbox 저장 완료`);
      return true;

    } catch (error: any) {
      console.error('❌ 저장 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      onError?.(errorMessage);
      alert(`❌ 저장 실패: ${errorMessage}`);
      return false;
    }
  }, [captureImage, uploadToDropbox, saveToAirtable]);

  return {
    capturePostRef,
    captureImage,
    handleSaveAll
  };
};
