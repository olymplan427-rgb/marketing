import React, { useState } from 'react';
import { AIProvider, AI_PROVIDER_NAMES } from '../constants';

interface AISettingsPageProps {
    apiKeys: Record<AIProvider, string>;
    setApiKeys: (keys: Record<AIProvider, string>) => void;
    activeProvider: AIProvider;
    setActiveProvider: (provider: AIProvider) => void;
    selectedSubModels: Record<AIProvider, string>;
    setSelectedSubModels: (models: Record<AIProvider, string>) => void;
}

const PROVIDER_CONFIG: Record<AIProvider, { name: string; description: string; keyUrl: string; keyPageName: string; keyPlaceholder: string; }> = {
    gemini: {
        name: 'Google Gemini',
        description: 'Google의 최신 AI 모델로 한국어 지원이 우수합니다.',
        keyUrl: 'https://aistudio.google.com/app/apikey',
        keyPageName: 'Google Gemini API 키 발급 페이지 열기',
        keyPlaceholder: 'AIzaSy...'
    },
    openai: {
        name: 'OpenAI GPT',
        description: 'OpenAI의 강력한 GPT 모델들입니다.',
        keyUrl: 'https://platform.openai.com/api-keys',
        keyPageName: 'OpenAI API 키 발급 페이지 열기',
        keyPlaceholder: 'sk-...'
    },
    anthropic: {
        name: 'Anthropic Claude',
        description: 'Anthropic의 Claude 모델로 정확하고 안전한 응답을 제공합니다.',
        keyUrl: 'https://console.anthropic.com/settings/keys',
        keyPageName: 'Anthropic API 키 발급 페이지 열기',
        keyPlaceholder: 'sk-ant-...'
    }
};

const SUB_MODEL_CONFIG: Record<AIProvider, { label: string; models: { value: string; display: string }[] }> = {
    gemini: { label: '세부 모델', models: [{ value: 'gemini-2.5-pro', display: 'gemini-2.5-pro (폴백: flash)' }] },
    openai: { label: '세부 모델', models: [
        { value: 'gpt-5', display: 'GPT-5' },
        { value: 'gpt-5-mini', display: 'GPT-5-mini' },
        { value: 'gpt-4.1', display: 'GPT-4.1' },
        { value: 'gpt-4.1-mini', display: 'GPT-4.1-mini' }
    ] },
    anthropic: { label: '세부 모델', models: [
        { value: 'claude-sonnet-4-6', display: 'Claude Sonnet 4.6 (균형)' },
        { value: 'claude-opus-4-8', display: 'Claude Opus 4.8 (고품질)' },
        { value: 'claude-haiku-4-5', display: 'Claude Haiku 4.5 (빠름·저렴)' }
    ] }
};

const AISettingsPage: React.FC<AISettingsPageProps> = ({
    apiKeys,
    setApiKeys,
    activeProvider,
    setActiveProvider,
    selectedSubModels,
    setSelectedSubModels
}) => {
    const [showSaveNotification, setShowSaveNotification] = useState(false);

    const handleApiKeyChange = (provider: AIProvider, value: string) => {
        setApiKeys({ ...apiKeys, [provider]: value });
    };

    const handleSave = () => {
        setShowSaveNotification(true);
        setTimeout(() => setShowSaveNotification(false), 3000);
    };

    const currentProviderConfig = PROVIDER_CONFIG[activeProvider];

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-graphite mb-2">AI 모델 설정</h1>
                <p className="text-concrete">사용할 AI 모델과 API 키를 설정하세요</p>
            </div>

            {/* Success Notification */}
            {showSaveNotification && (
                <div className="mb-6 bg-mist border-l-4 border-graphite text-graphite p-4 rounded-lg animate-slideIn">
                    <p className="font-medium">✓ 설정이 저장되었습니다!</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Model Selection */}
                <div className="bg-chalk border border-hairline rounded-card p-8">
                    <h2 className="text-xl font-semibold text-graphite mb-6">AI 모델 선택</h2>

                    <div className="space-y-4 mb-8">
                        {(Object.keys(PROVIDER_CONFIG) as AIProvider[]).map((providerKey) => {
                            const provider = PROVIDER_CONFIG[providerKey];
                            const isSelected = activeProvider === providerKey;
                            return (
                                <label
                                    key={providerKey}
                                    className={`relative block p-5 rounded-card border-2 cursor-pointer transition-colors ${
                                        isSelected
                                            ? 'bg-mist border-graphite'
                                            : 'bg-mist border-hairline hover:border-concrete'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <span className="font-bold text-lg text-graphite">{provider.name}</span>
                                            <p className="text-sm text-concrete mt-1">{provider.description}</p>
                                        </div>
                                        <div className="flex-shrink-0 ml-4 mt-1">
                                            <input
                                                type="radio"
                                                name="ai-model"
                                                className="sr-only"
                                                value={providerKey}
                                                checked={isSelected}
                                                onChange={() => setActiveProvider(providerKey)}
                                            />
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                isSelected
                                                    ? 'bg-graphite border-graphite'
                                                    : 'bg-chalk border-hairline'
                                            }`}>
                                                {isSelected && (
                                                    <svg className="w-3 h-3 text-chalk" fill="currentColor" viewBox="0 0 12 12">
                                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="sub-model" className="block text-sm font-medium text-graphite mb-2">
                                세부 모델
                            </label>
                            <select
                                id="sub-model"
                                value={selectedSubModels[activeProvider]}
                                onChange={(e) => setSelectedSubModels({ ...selectedSubModels, [activeProvider]: e.target.value })}
                                className="w-full px-4 py-3 bg-chalk text-graphite border border-hairline rounded-lg focus:ring-2 focus:ring-graphite focus:outline-none"
                            >
                                {SUB_MODEL_CONFIG[activeProvider].models.map(model => (
                                    <option key={model.value} value={model.value}>{model.display}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="api-key" className="block text-sm font-medium text-graphite mb-2 flex justify-between items-center">
                                <span>{currentProviderConfig.name} API Key <span className="text-graphite">*</span></span>
                                <a
                                    href={currentProviderConfig.keyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-graphite hover:text-carbon underline"
                                >
                                    API 키 발급받기
                                </a>
                            </label>
                            <input
                                id="api-key"
                                type="password"
                                value={apiKeys[activeProvider]}
                                onChange={(e) => handleApiKeyChange(activeProvider, e.target.value)}
                                placeholder={currentProviderConfig.keyPlaceholder}
                                required
                                className="w-full px-4 py-3 bg-chalk text-graphite border border-hairline rounded-lg focus:ring-2 focus:ring-graphite focus:outline-none placeholder-ash"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-chalk bg-graphite rounded-lg hover:bg-carbon transition-colors disabled:bg-ash disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        설정 저장
                    </button>
                </div>

                {/* Right Side: Guide */}
                <div className="bg-chalk border border-hairline rounded-card p-8">
                    <h2 className="text-xl font-semibold text-graphite mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-graphite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        API 키 발급 가이드
                    </h2>

                    <div className="space-y-4">
                        <a
                            href={currentProviderConfig.keyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center bg-graphite hover:bg-carbon text-chalk font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                            {currentProviderConfig.keyPageName}
                        </a>

                        <div className="bg-mist border-l-4 border-graphite p-4 rounded-r-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-graphite" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-concrete">
                                        <span className="font-bold">보안 팁:</span> API 키는 브라우저에만 저장되며 외부로 전송되지 않습니다. 하지만 보안을 위해 주기적으로 키를 재생성하는 것을 권장합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-mist border-l-4 border-graphite p-4 rounded-r-lg">
                            <h3 className="font-semibold text-graphite mb-2">설정 방법</h3>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-concrete">
                                <li>위 버튼을 클릭하여 API 키 발급 페이지로 이동</li>
                                <li>새로운 API 키를 생성</li>
                                <li>생성된 키를 복사하여 위 입력란에 붙여넣기</li>
                                <li>"설정 저장" 버튼을 클릭하여 저장</li>
                            </ol>
                        </div>

                        <div className="bg-mist p-4 rounded-lg">
                            <h3 className="font-semibold text-graphite mb-2">현재 설정</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-concrete">활성 모델:</span>
                                    <span className="font-medium text-graphite">{AI_PROVIDER_NAMES[activeProvider]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-concrete">세부 모델:</span>
                                    <span className="font-medium text-graphite">{selectedSubModels[activeProvider]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-concrete">API 키 상태:</span>
                                    <span className={`font-medium ${apiKeys[activeProvider] ? 'text-graphite' : 'text-ash'}`}>
                                        {apiKeys[activeProvider] ? '✓ 설정됨' : '✗ 미설정'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateY(-10px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AISettingsPage;
