
import React from 'react';

interface InstagramErrorDisplayProps {
    error: string | null;
    onDismiss: () => void;
}

export const InstagramErrorDisplay: React.FC<InstagramErrorDisplayProps> = ({ error, onDismiss }) => {
    if (!error) return null;

    return (
        <div className="w-full mb-6 bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg flex justify-between items-center">
            <div className="flex-1">
                <strong className="font-bold">오류: </strong>
                <span className="text-sm">{error}</span>
            </div>
            <button onClick={onDismiss} className="ml-4 text-red-300 hover:text-white font-bold">×</button>
        </div>
    );
};
