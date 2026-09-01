'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#120024', color: '#f8f5ff', margin: 0 }}>
        <div style={{ maxWidth: 560, margin: '20vh auto', padding: 24 }}>
          <p style={{ letterSpacing: '0.08em', fontSize: 13, color: '#22d3ee' }}>Opply ochart</p>
          <h1 style={{ fontSize: 28, margin: '12px 0' }}>The app could not start</h1>
          <p style={{ color: '#cbb6ef', lineHeight: 1.5 }}>{error.message}</p>
        </div>
      </body>
    </html>
  );
}
