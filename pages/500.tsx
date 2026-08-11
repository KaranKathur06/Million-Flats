export default function Custom500() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#fafafa',
        color: '#333',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>500</h1>
      <p style={{ fontSize: '1.1rem', color: '#666' }}>Internal Server Error</p>
    </div>
  )
}

// Required: tells Next.js this page can be statically generated
export function getStaticProps() {
  return { props: {} }
}
