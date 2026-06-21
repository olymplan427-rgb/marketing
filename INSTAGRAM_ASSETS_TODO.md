# Instagram Service - Missing Assets

## 필요한 파일

InstagramPostPreview 컴포넌트가 제대로 작동하려면 다음 파일들이 필요합니다:

### 1. `/public/logo.png`
- 기억의 서랍 로고 이미지
- 포스트 하단에 표시됩니다
- 현재: base64 fallback 사용 중 (임시 로고)
- 권장: memory-drawer-content-generator에서 실제 로고 파일 복사

### 2. `/public/bg.png`
- 기본 배경 이미지
- 사용자가 배경을 선택하지 않았을 때 사용
- 권장 크기: 1080x1350 (Instagram 세로 비율)

## 해결 방법

### 옵션 1: memory-drawer 저장소에서 복사
```bash
# memory-drawer-content-generator의 public 폴더에서 파일 확인
# 해당 로고와 배경 이미지를 /public/ 폴더에 복사
```

### 옵션 2: 새로 생성
- 로고: 기억의 서랍 브랜드 로고 (투명 PNG 권장)
- 배경: 1080x1350 크기의 기본 배경 이미지

## 현재 상태
- ✅ InstagramPostPreview 컴포넌트는 동작함 (base64 fallback 사용)
- ⚠️ 실제 로고 파일 없음
- ⚠️ 기본 배경 이미지 없음 (현재 `/bg.png` 경로 사용 중)

## 참고
InstagramPostPreview.tsx:75-78에서 `/logo.png` 로드 실패 시 base64 이미지로 fallback됩니다.
