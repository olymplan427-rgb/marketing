
import React from 'react';

interface InstagramCaptionEditorProps {
    caption: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
}

export const InstagramCaptionEditor: React.FC<InstagramCaptionEditorProps> = ({ caption, onChange, disabled }) => {
    return (
        <div className="w-full mb-6">
            <label className="block text-sm font-medium text-graphite mb-2">인스타그램 캡션</label>
            <textarea
                value={caption}
                onChange={onChange}
                disabled={disabled}
                className="w-full bg-chalk border border-hairline rounded-lg p-3 text-graphite placeholder-ash focus:ring-2 focus:ring-graphite focus:border-graphite transition-colors disabled:opacity-50"
                rows={5}
                placeholder="인스타그램에 게시할 캡션 내용을 입력하세요..."
            />
        </div>
    );
};
