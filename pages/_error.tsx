import { NextPageContext } from 'next'

function Error({ statusCode }: { statusCode?: number }) {
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
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        {statusCode || 'Error'}
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#666' }}>
        {statusCode === 500
          ? 'Internal Server Error'
          : statusCode === 404
            ? 'Page Not Found'
            : 'An unexpected error occurred'}
      </p>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
