
import React from 'react';

export const InstagramUsageInstructions: React.FC = () => {
    return (
        <div className="w-full mt-8 p-4 bg-mist rounded-lg border border-hairline">
            <h3 className="text-sm font-semibold text-graphite mb-2">📖 사용 방법</h3>
            <ol className="text-sm text-concrete space-y-2 list-decimal list-inside">
                <li>'새 질문 생성' 버튼을 눌러 AI로 오늘의 질문을 생성합니다.</li>
                <li>생성된 질문과 캡션이 마음에 들지 않으면 직접 수정할 수 있습니다.</li>
                <li>배경 관리에서 원하는 배경 이미지를 선택하세요.</li>
                <li>'저장하기' 버튼을 누르면 이미지가 생성되어 Dropbox에 업로드되고 정보가 Airtable에 저장됩니다.</li>
            </ol>
        </div>
    );
};
