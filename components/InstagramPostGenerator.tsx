import React, { useState } from 'react';
import { InstagramPostPreview } from './InstagramPostPreview';
import { InstagramBackgroundManager } from './InstagramBackgroundManager';
import { InstagramAppHeader } from './InstagramAppHeader';
import { InstagramErrorDisplay } from './InstagramErrorDisplay';
import { InstagramQuestionEditor } from './InstagramQuestionEditor';
import { InstagramCaptionEditor } from './InstagramCaptionEditor';
import { InstagramControls } from './InstagramControls';
import { InstagramUsageInstructions } from './InstagramUsageInstructions';
import { useInstagramContentState } from '../hooks/useInstagramContentState';
import { useInstagramImageCapture } from '../hooks/useInstagramImageCapture';

const InstagramPostGenerator: React.FC = () => {
  const {
    state,
    canSave,
    setError,
    handleGenerateQuestion,
    handleQuestionChange,
    handleCaptionChange,
    setSaving
  } = useInstagramContentState();

  const { capturePostRef, handleSaveAll } = useInstagramImageCapture();
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState('/bg.png');

  const handleBackgroundChange = (url: string) => {
    setCurrentBackgroundUrl(url);
  };

  const onSave = async () => {
    setSaving(true);
    const success = await handleSaveAll({
      question: state.question,
      caption: state.caption,
      backgroundUrl: currentBackgroundUrl,
      onProgress: (msg) => console.log(msg),
      onError: (err) => setError(err)
    });
    setSaving(false);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center p-4 lg:p-8">
      {/* Off-screen component for high-resolution image capture */}
      <div style={{ position: 'absolute', top: 0, left: '-9999px', pointerEvents: 'none' }}>
        <InstagramPostPreview
          ref={capturePostRef}
          question={state.question}
          isForCapture={true}
          backgroundUrl={currentBackgroundUrl}
        />
      </div>

      <main className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">
        {/* Visible, responsive preview */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-start">
          <div className="w-full flex justify-center mb-8">
            <InstagramPostPreview
              question={state.question}
              isForCapture={false}
              backgroundUrl={currentBackgroundUrl}
            />
          </div>
          <div className="w-full flex justify-center">
            <InstagramBackgroundManager onBackgroundChange={handleBackgroundChange} />
          </div>
        </div>

        {/* Controls and information */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start pt-8 lg:pt-0 relative">
          <InstagramAppHeader />

          <InstagramErrorDisplay
            error={state.error}
            onDismiss={() => setError(null)}
          />

          <InstagramQuestionEditor
            question={state.question}
            onChange={handleQuestionChange}
            disabled={state.isLoading || state.isSaving}
          />

          <InstagramCaptionEditor
            caption={state.caption}
            onChange={handleCaptionChange}
            disabled={state.isLoading || state.isSaving}
          />

          <InstagramControls
            onGenerate={handleGenerateQuestion}
            onSave={onSave}
            isLoading={state.isLoading}
            isQuestionReady={canSave}
            isSaving={state.isSaving}
          />

          <InstagramUsageInstructions />
        </div>
      </main>
    </div>
  );
};

export default InstagramPostGenerator;
