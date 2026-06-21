import React, { useState, useEffect } from 'react';
import { AIProvider, AI_PROVIDER_NAMES } from '../constants';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
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

const SUB_MODEL_CONFIG: Record<AIProvider, { label: string; models: string[] }> = {
    gemini: { label: '세부 모델', models: ['gemini-2.5-flash'] },
    openai: { label: '세부 모델', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    anthropic: { label: '세부 모델', models: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'] }
};


const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    apiKeys, 
    setApiKeys, 
    activeProvider, 
    setActiveProvider,
    selectedSubModels,
    setSelectedSubModels
}) => {
    const [localApiKeys, setLocalApiKeys] = useState(apiKeys);
    const [localActiveProvider, setLocalActiveProvider] = useState(activeProvider);
    const [localSubModels, setLocalSubModels] = useState(selectedSubModels);

    useEffect(() => {
        if (isOpen) {
            setLocalApiKeys(apiKeys);
            setLocalActiveProvider(activeProvider);
            setLocalSubModels(selectedSubModels);
        }
    }, [isOpen, apiKeys, activeProvider, selectedSubModels]);
    
    const handleSave = () => {
        setApiKeys(localApiKeys);
        setActiveProvider(localActiveProvider);
        setSelectedSubModels(localSubModels);
        onClose();
    };

    const handleApiKeyChange = (provider: AIProvider, value: string) => {
        setLocalApiKeys(prev => ({ ...prev, [provider]: value }));
    }

    if (!isOpen) return null;

    const currentProviderConfig = PROVIDER_CONFIG[localActiveProvider];

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-transform duration-300 animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-semibold">AI 모델 설정</h2>
                        <p className="text-sm text-slate-400 mt-1">사용할 AI 모델과 API 키를 설정하세요</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full text-2xl leading-none">&times;</button>
                </header>
                
                <main className="flex-grow grid grid-cols-1 md:grid-cols-2">
                    {/* Left Side: Model Selection */}
                    <div className="p-6 space-y-6 border-r-0 md:border-r border-slate-700 overflow-y-auto">
                        <h3 className="text-lg font-medium text-slate-300">AI 모델 선택</h3>
                        <div className="space-y-3">
                            {(Object.keys(PROVIDER_CONFIG) as AIProvider[]).map((providerKey) => {
                                const provider = PROVIDER_CONFIG[providerKey];
                                const isSelected = localActiveProvider === providerKey;
                                return (
                                    <label key={providerKey} className={`relative block p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'bg-blue-500/20 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-base">{provider.name}</span>
                                                <p className="text-sm text-slate-400 mt-1">{provider.description}</p>
                                            </div>
                                            <div className="flex-shrink-0 ml-4 mt-1">
                                                <input type="radio" name="ai-model" className="sr-only" value={providerKey} checked={isSelected} onChange={() => setLocalActiveProvider(providerKey)} />
                                                <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'bg-blue-500 border-blue-400' : 'bg-slate-600 border-slate-500'}`}></div>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        
                        <div className="space-y-2">
                            <label htmlFor="sub-model" className="text-sm font-medium text-slate-400">세부 모델</label>
                            <select 
                                id="sub-model"
                                value={localSubModels[localActiveProvider]}
                                onChange={(e) => setLocalSubModels(prev => ({ ...prev, [localActiveProvider]: e.target.value }))}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {SUB_MODEL_CONFIG[localActiveProvider].models.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        </div>

                         <div className="space-y-2">
                            <label htmlFor="api-key" className="text-sm font-medium text-slate-400 flex justify-between items-center">
                               <span>{currentProviderConfig.name} API Key <span className="text-red-400">*</span></span>
                               <a href={currentProviderConfig.keyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                                    API 키 발급받기
                               </a>
                            </label>
                            <div className="relative">
                                <input 
                                    id="api-key"
                                    type="password"
                                    value={localApiKeys[localActiveProvider]}
                                    onChange={(e) => handleApiKeyChange(localActiveProvider, e.target.value)}
                                    placeholder={currentProviderConfig.keyPlaceholder}
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Guide */}
                    <div className="p-6 bg-slate-900/40">
                         <h3 className="text-lg font-medium text-slate-300 mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                            API 키 발급 가이드
                         </h3>
                         <a href={currentProviderConfig.keyUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors">
                            {currentProviderConfig.keyPageName}
                         </a>
                         <div className="mt-4 text-sm text-amber-300/80 bg-amber-500/20 p-3 rounded-lg">
                            <p><span className="font-bold">💡 팁:</span> API 키는 브라우저에만 저장되며 외부로 전송되지 않습니다. 하지만 보안을 위해 주기적으로 키를 재 생성하는 것을 권장합니다.</p>
                         </div>
                    </div>
                </main>
                
                <footer className="flex justify-end items-center gap-3 p-4 bg-slate-900/50 border-t border-slate-700 rounded-b-xl">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M12 2v2" /><path d="M12 22v-2" /><path d="m17 7 1.4-1.4" /><path d="m6.4 18.4 1.4-1.4" /><path d="M22 12h-2" /><path d="M4 12H2" /><path d="m17 17-1.4 1.4" /><path d="m6.4 5.6-1.4 1.4" /></svg>
                        설정 저장
                    </button>
                </footer>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scaleIn { animation: scaleIn 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default SettingsModal;