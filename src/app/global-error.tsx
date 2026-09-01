'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f6f4ef', margin: 0 }}>
        <div style={{ maxWidth: 560, margin: '20vh auto', padding: 24 }}>
          <p style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 11, color: '#c9a227' }}>
            OrgPulse
          </p>
          <h1 style={{ fontSize: 28, margin: '12px 0' }}>The app could not start</h1>
          <p style={{ color: '#5c564c', lineHeight: 1.5 }}>{error.message}</p>
        </div>
      </body>
    </html>
  );
}
