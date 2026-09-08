import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #0f172a)',
      color: 'var(--text-primary, #f8fafc)',
      padding: '40px 20px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'var(--surface, #1e293b)',
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Terms of Service</h1>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>Workmate · Kalpanaaa Software Solutions</p>
            </div>
          </div>
          <Link to="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#818cf8',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 500
          }}>
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>

        <div style={{ lineHeight: 1.7, fontSize: '14px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p>
            <strong>Last Updated:</strong> September 2026
          </p>
          <p>
            Welcome to <strong>Workmate</strong>, developed by Kalpanaaa Software Solutions. By accessing or using the Workmate application, you agree to comply with and be bound by these Terms of Service.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>1. Authorized Access &amp; Accounts</h2>
          <p>
            Workmate accounts are provisioned for authorized organizational team members. Users are responsible for maintaining the confidentiality of their credentials and one-time verification codes.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>2. Acceptable Use</h2>
          <p>
            You agree to use Workmate exclusively for legitimate internal business deliverables, project collaboration, and task coordination. Uploading malicious software, unauthorized content, or violating intellectual property rights is strictly prohibited.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>3. Third-Party Integrations</h2>
          <p>
            When utilizing third-party services such as Google Drive through Workmate, your use is also governed by Google&apos;s applicable terms and policies. Workmate facilitates direct file storage on your account and does not claim ownership of files uploaded to your personal Google Drive.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>4. Termination</h2>
          <p>
            We reserve the right to suspend or terminate account access if a user engages in unauthorized conduct or violates company security guidelines.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>5. Contact</h2>
          <p>
            For legal inquiries or terms questions, please email:
            <br />
            <strong>Email:</strong> <code>2041004022.satyaranjandas@gmail.com</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
