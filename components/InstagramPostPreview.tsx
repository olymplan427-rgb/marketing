import React, { forwardRef, useMemo } from 'react';

interface InstagramPostPreviewProps {
  question: string;
  isForCapture?: boolean;
  backgroundUrl?: string;
}

export const InstagramPostPreview = forwardRef<HTMLDivElement, InstagramPostPreviewProps>(
  ({ question, isForCapture = false, backgroundUrl = '/bg.png' }, ref) => {

    // Scale logic for responsive preview (not needed for capture)
    // For on-screen preview, we use a fixed size (360x450) and scale the 1080x1350 content
    const scale = 0.33333333; // 360 / 1080

    const containerStyle: React.CSSProperties = isForCapture
      ? { width: '1080px', height: '1350px' }
      : {
        width: '360px',
        height: '450px',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden'
      };

    const innerStyle: React.CSSProperties = isForCapture
      ? { width: '1080px', height: '1350px', position: 'relative' }
      : {
        width: '1080px',
        height: '1350px',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'absolute',
        top: 0,
        left: 0
      };

    return (
      <div
        className={`${isForCapture ? '' : 'shadow-2xl mx-auto bg-gray-800'}`}
        style={containerStyle}
      >
        <div
          ref={ref}
          className="flex items-center justify-center overflow-hidden"
          style={innerStyle}
        >
          {/* Background Image */}
          <img
            src={backgroundUrl}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
          />

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Question Text Container */}
          <div className="relative z-10 w-full px-20 text-center">
            <p
              className="text-white leading-[1.6] whitespace-pre-wrap break-keep tracking-tight"
              style={{
                fontFamily: "'Nanum Myeongjo', serif",
                fontSize: '52px',
                fontWeight: 700,
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}
            >
              {question}
            </p>
          </div>

          {/* Branding/Footer */}
          <div className="absolute bottom-16 left-0 w-full text-center z-10">
            <p
              className="text-white/80 tracking-widest uppercase"
              style={{
                fontFamily: "'Nanum Myeongjo', serif",
                fontSize: '24px',
                fontWeight: 400
              }}
            >
              기억의 서랍
            </p>
          </div>
        </div>
      </div>
    );
  }
);

InstagramPostPreview.displayName = 'InstagramPostPreview';
