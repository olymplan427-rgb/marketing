
import { useState, useCallback } from 'react';
import { generateMemoryDrawerContent } from '../services/geminiService';

export interface InstagramAppState {
    question: string;
    caption: string;
    isLoading: boolean;
    error: string | null;
    isSaving: boolean;
}

const DEFAULT_QUESTION = '이곳에 생성된 질문이 표시됩니다.';

export const useInstagramContentState = () => {
    const [state, setState] = useState<InstagramAppState>({
        question: DEFAULT_QUESTION,
        caption: '',
        isLoading: false,
        error: null,
        isSaving: false
    });

    const setLoading = useCallback((isLoading: boolean) => {
        setState(prev => ({ ...prev, isLoading }));
    }, []);

    const setSaving = useCallback((isSaving: boolean) => {
        setState(prev => ({ ...prev, isSaving }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState(prev => ({ ...prev, error }));
    }, []);

    const setQuestion = useCallback((question: string) => {
        setState(prev => ({ ...prev, question }));
    }, []);

    const setCaption = useCallback((caption: string) => {
        setState(prev => ({ ...prev, caption }));
    }, []);

    const handleGenerateQuestion = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const content = await generateMemoryDrawerContent();

            setState(prev => ({
                ...prev,
                question: content.question,
                caption: content.caption,
                isLoading: false
            }));

        } catch (err: any) {
            setError(`컨텐츠 생성에 실패했습니다: ${err.message}`);
            setLoading(false);
        }
    }, []);

    const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setQuestion(e.target.value);
    }, []);

    const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCaption(e.target.value);
    }, []);

    const resetState = useCallback(() => {
        setState({
            question: DEFAULT_QUESTION,
            caption: '',
            isLoading: false,
            error: null,
            isSaving: false
        });
    }, []);

    const canGenerate = !state.isLoading && !state.isSaving;
    const canSave = state.question !== DEFAULT_QUESTION && state.question.trim() !== '' && !state.isLoading && !state.isSaving;

    return {
        state,
        canGenerate,
        canSave,
        setLoading,
        setSaving,
        setError,
        setQuestion,
        setCaption,
        handleGenerateQuestion,
        handleQuestionChange,
        handleCaptionChange,
        resetState
    };
};
