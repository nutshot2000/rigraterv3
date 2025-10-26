import React from 'react';
import { useApp } from '../../context/AppContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useApp();

    return (
        <div className="fixed bottom-5 right-5 z-[100] space-y-3 w-full max-w-xs">
            {toasts.map(toast => (
                <Toast 
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
