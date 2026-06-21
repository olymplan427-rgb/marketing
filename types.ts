import type { ReactNode } from 'react';

export interface BlogGenerationParams {
  region: string;
  category: string;
  topic: string;
  keywords: string;
  targetAudience: string;
  writerInsight: string;
  wordCount: string;
  fileContents?: string;
  referenceUrls?: string;
}

export interface FieldSuggestions {
  keywords: string[];
  targetAudience: string[];
  writerInsight: string;
}

// FIX: Define and export StepCardProps to resolve import error in components/StepCard.tsx.
export interface StepCardProps {
  step: number | string;
  title: string;
  children: ReactNode;
  isComplete: boolean;
  isDisabled: boolean;
}

// FIX: Define and export SuggestionSelectorProps to resolve import error in components/SuggestionSelector.tsx.
export interface SuggestionSelectorProps {
  label: string;
  suggestions: string[];
  selectedValue: string;
  isLoading: boolean;
  onGenerate: () => void;
  onSelect: (value: string) => void;
  onEdit: (value: string) => void;
}

export interface BlogPostResult {
  text: string;
  sources?: { uri: string; title: string }[];
}

export interface PromptTemplates {
  topicSuggestion: string;
  fieldSuggestion: string;
  blogPost: string;
  midjourneyPrompt: string;
  imagenPrompt: string;
}

export interface GeneratedImage {
  prompt: string;
  imageUrl: string | null;
  error?: string;
  midjourneyPrompt?: string;
  geminiImageUrl?: string | null;
  geminiImageError?: string;
}