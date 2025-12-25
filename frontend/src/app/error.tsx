'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Oops!</h1>
      <h2 className="text-xl text-gray-700 mb-2">Something went wrong</h2>
      <p className="text-gray-500 mb-8">
        We encountered an error while loading this page. Please try again.
      </p>
      <button onClick={reset} className="btn-primary">
        Try Again
      </button>
    </div>
  );
}
