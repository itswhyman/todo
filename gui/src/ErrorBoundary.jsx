import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Bir hata oluştu. Lütfen sayfayı yenileyin.</h1>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;