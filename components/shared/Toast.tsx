import React from 'react';
import { ToastMessage } from '../../types';
import { CheckCircleIcon, XCircleIcon, InfoCircleIcon, CloseIcon } from '../public/Icons';

interface ToastProps {
    message: string;
    type: ToastMessage['type'];
    onClose: () => void;
}

const ICONS = {
    success: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
    error: <XCircleIcon className="w-6 h-6 text-red-400" />,
    info: <InfoCircleIcon className="w-6 h-6 text-blue-400" />,
};

const BORDER_COLORS = {
    success: 'border-green-500',
    error: 'border-red-500',
    info: 'border-blue-500',
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    return (
        <div className={`flex items-center gap-4 w-full max-w-xs p-4 text-gray-200 bg-gray-800 rounded-lg shadow-lg border-l-4 ${BORDER_COLORS[type]} animate-fade-in`} role="alert">
            {ICONS[type]}
            <div className="text-sm font-normal flex-grow">{message}</div>
            <button type="button" onClick={onClose} className="p-1.5 -m-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 inline-flex h-8 w-8 items-center justify-center" aria-label="Close">
                <span className="sr-only">Close</span>
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Toast;
