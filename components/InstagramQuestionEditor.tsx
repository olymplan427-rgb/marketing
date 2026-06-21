
import React from 'react';

interface InstagramQuestionEditorProps {
    question: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
}

export const InstagramQuestionEditor: React.FC<InstagramQuestionEditorProps> = ({ question, onChange, disabled }) => {
    return (
        <div className="w-full mb-4">
            <label className="block text-sm font-medium text-graphite mb-2">질문 텍스트</label>
            <textarea
                value={question}
                onChange={onChange}
                disabled={disabled}
                className="w-full bg-chalk border border-hairline rounded-lg p-3 text-graphite placeholder-ash focus:ring-2 focus:ring-graphite focus:border-graphite transition-colors disabled:opacity-50"
                rows={3}
                placeholder="이미지에 표시될 질문을 입력하세요..."
            />
        </div>
    );
};
