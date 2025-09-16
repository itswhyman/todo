import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught (konsola loglandı):', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Bir hata oluştu.</h1>
          <p>Lütfen sayfayı yenileyin veya tekrar giriş yapmayı deneyin.</p>
          <p>Destek için iletişime geçebilirsiniz.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;