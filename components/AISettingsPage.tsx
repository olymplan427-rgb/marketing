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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">AI 모델 설정</h1>
                <p className="text-slate-600 dark:text-slate-400">사용할 AI 모델과 API 키를 설정하세요</p>
            </div>

            {/* Success Notification */}
            {showSaveNotification && (
                <div className="mb-6 bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-400 text-green-700 dark:text-green-300 p-4 rounded-md animate-slideIn">
                    <p className="font-medium">✓ 설정이 저장되었습니다!</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Model Selection */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-xl p-8">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">AI 모델 선택</h2>

                    <div className="space-y-4 mb-8">
                        {(Object.keys(PROVIDER_CONFIG) as AIProvider[]).map((providerKey) => {
                            const provider = PROVIDER_CONFIG[providerKey];
                            const isSelected = activeProvider === providerKey;
                            return (
                                <label
                                    key={providerKey}
                                    className={`relative block p-5 rounded-xl border-2 cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-400 shadow-md'
                                            : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{provider.name}</span>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{provider.description}</p>
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
                                                    ? 'bg-indigo-500 dark:bg-indigo-400 border-indigo-400 dark:border-indigo-300'
                                                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                                            }`}>
                                                {isSelected && (
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
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
                            <label htmlFor="sub-model" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                세부 모델
                            </label>
                            <select
                                id="sub-model"
                                value={selectedSubModels[activeProvider]}
                                onChange={(e) => setSelectedSubModels({ ...selectedSubModels, [activeProvider]: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none"
                            >
                                {SUB_MODEL_CONFIG[activeProvider].models.map(model => (
                                    <option key={model.value} value={model.value}>{model.display}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg p-4">
                            <p className="text-sm text-emerald-800 dark:text-emerald-300">
                                <span className="font-semibold">🔒 API 키는 서버에서 안전하게 관리됩니다.</span><br />
                                키를 직접 입력할 필요가 없습니다. 사용할 모델만 선택하세요.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        설정 저장
                    </button>
                </div>

                {/* Right Side: Guide */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-xl p-8">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        사용 안내
                    </h2>

                    <div className="space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-400 dark:border-emerald-500 p-4 rounded-r-lg">
                            <p className="text-sm text-emerald-800 dark:text-emerald-300">
                                <span className="font-bold">🔒 API 키는 서버에서 안전하게 관리됩니다.</span> 모든 AI 호출은 서버를 통해 처리되며, 키가 브라우저에 노출되지 않습니다. 별도의 키 입력이 필요 없습니다.
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-500 p-4 rounded-r-lg">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">사용 방법</h3>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
                                <li>사용할 AI 제공자(Gemini / OpenAI / Claude)를 선택</li>
                                <li>세부 모델을 선택</li>
                                <li>"설정 저장" 클릭 후 바로 사용</li>
                            </ol>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">현재 설정</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">활성 모델:</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{AI_PROVIDER_NAMES[activeProvider]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">세부 모델:</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedSubModels[activeProvider]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">API 키:</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                        ✓ 서버에서 관리됨
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
