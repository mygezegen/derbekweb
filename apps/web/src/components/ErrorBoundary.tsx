import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Bir Hata Oluştu</h2>
            <p className="text-gray-700 mb-4">
              {this.state.error?.message || 'Bilinmeyen bir hata oluştu'}
            </p>
            <details className="text-sm text-gray-600 mb-4">
              <summary className="cursor-pointer font-semibold mb-2">Teknik Detaylar</summary>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-xs">
                {this.state.error?.stack || 'Stack trace yok'}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
