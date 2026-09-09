import { useEffect, useState } from 'react';
import { account } from './appwrite/config';

function App() {
  const [status, setStatus] = useState<string>('Connecting to Appwrite...');

  useEffect(() => {
    // Try to get the current user session (will fail gracefully if not logged in)
    account.get()
      .then((user) => {
        setStatus(`Connected! Hello ${user.name || 'User'}`);
      })
      .catch((error) => {
        // A 401 error is actually a SUCCESSFUL connection! 
        // It means Appwrite answered, but no user is logged in yet.
        if (error.code === 401) {
          setStatus('Connected to Appwrite! (No active session)');
        } else {
          setStatus(`Connection failed: ${error.message}`);
        }
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Appwrite Connection Status</h1>
        <p className={`text-lg font-semibold ${status.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>
          {status}
        </p>
      </div>
    </div>
  );
}

export default App;