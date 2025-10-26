import React from 'react';

type ErrorBoundaryState = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
    constructor(props: React.PropsWithChildren) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, info: any) {
        // eslint-disable-next-line no-console
        console.error('UI ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 p-6">
                    <div className="max-w-lg text-center">
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-gray-400 mb-4">Please refresh the page. If this persists, check the browser console for details.</p>
                        <button className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded" onClick={() => window.location.reload()}>Reload</button>
                    </div>
                </div>
            );
        }
        return this.props.children as React.ReactNode;
    }
}


