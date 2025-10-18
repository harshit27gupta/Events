import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError() as any;
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = typeof error.data === 'string' ? error.data : (error.data?.message || message);
  } else if (error?.message) {
    message = error.message;
  }
  return (
    <div className="glass p-6">
      <h1 className="text-lg font-semibold mb-2">{title}</h1>
      <p className="text-neutral-300">{message}</p>
    </div>
  );
}


