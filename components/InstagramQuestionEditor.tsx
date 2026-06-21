
import React from 'react';

interface InstagramQuestionEditorProps {
    question: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
}

export const InstagramQuestionEditor: React.FC<InstagramQuestionEditorProps> = ({ question, onChange, disabled }) => {
    return (
        <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">질문 텍스트</label>
            <textarea
                value={question}
                onChange={onChange}
                disabled={disabled}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
                rows={3}
                placeholder="이미지에 표시될 질문을 입력하세요..."
            />
        </div>
    );
};
