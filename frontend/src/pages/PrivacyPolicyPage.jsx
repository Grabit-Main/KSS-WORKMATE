import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage = () => {
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
              <Shield size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Privacy Policy</h1>
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
            Kalpanaaa Software Solutions (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the <strong>Workmate</strong> collaboration platform. We are dedicated to safeguarding your privacy and ensuring transparency in how information is handled.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>1. Information We Collect</h2>
          <p>
            We collect account information provided by your organization, including your name, corporate email address, and role. When you use Workmate, you may upload files, task deliverables, and comments.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>2. Google Drive Data &amp; OAuth Integration</h2>
          <p>
            Workmate allows users to attach documents stored in their Google Drive accounts using Google Identity Services (GIS) OAuth.
          </p>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li><strong>Requested Scope:</strong> <code>https://www.googleapis.com/auth/drive.file</code>. This scope only permits Workmate to view and manage files that were created or opened with Workmate. It does <em>not</em> grant access to your other Google Drive files.</li>
            <li><strong>Purpose:</strong> We upload project deliverables and task attachments directly to your personal Drive in a dedicated <code>Workmate/</code> folder and generate shareable links for authorized project teammates.</li>
            <li><strong>Data Retention:</strong> Workmate does not store your Google account password or use your Google Drive contents for AI training, marketing, or advertising.</li>
          </ul>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>3. Data Protection &amp; Security</h2>
          <p>
            All data transmitted between your browser, our servers, and third-party APIs (including Google and Cloudinary) is encrypted in transit using industry-standard TLS 1.3 encryption.
          </p>

          <h2 style={{ fontSize: '18px', color: '#f8fafc', margin: '16px 0 0' }}>4. Contact Us</h2>
          <p>
            If you have questions regarding this Privacy Policy or data privacy at Kalpanaaa Software Solutions, please contact us at:
            <br />
            <strong>Email:</strong> <code>2041004022.satyaranjandas@gmail.com</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
