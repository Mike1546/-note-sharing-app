import React, { useEffect, useState } from 'react';
import { account } from '../appwrite';

const AppwriteTest = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await account.get();
        setResult(res);
        console.log('Appwrite account.get() result:', res);
      } catch (err) {
        console.error('Appwrite connection error:', err);
        setError(err);
      }
    };
    run();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Appwrite Connection Test</h2>
      {result && (
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(result, null, 2)}</pre>
      )}
      {error && (
        <div style={{ color: 'red' }}>
          <strong>Error:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      {!result && !error && <div>Loading...</div>}
    </div>
  );
};

export default AppwriteTest;
