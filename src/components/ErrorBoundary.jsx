import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('vanguard_active_tab');
      window.location.hash = 'stagnant';
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          fontFamily: 'Inter, Prompt, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#ef4444'
            }}>
              <AlertTriangle size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              เกิดข้อผิดพลาดในการแสดงผลแดชบอร์ด
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
              ระบบตรวจพบข้อผิดพลาดชั่วคราวขณะประมวลผลข้อมูล กรุณากดปุ่มด้านล่างเพื่อรีเฟรชหน้าเว็บ หรือรีเซ็ตกลับหน้าหลัก
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#f1f5f9',
                padding: '12px 16px',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '0.8rem',
                color: '#475569',
                fontFamily: 'monospace',
                overflowX: 'auto',
                marginBottom: '24px',
                border: '1px solid #cbd5e1'
              }}>
                <strong>Error:</strong> {this.state.error?.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                <span>รีเฟรชหน้าเว็บ (Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Home size={16} />
                <span>กลับสู่หน้าแรก</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
