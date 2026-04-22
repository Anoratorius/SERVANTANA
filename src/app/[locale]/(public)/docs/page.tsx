"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-blue-600 to-green-500 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Servantana API</h1>
          <p className="text-blue-100">
            Complete API documentation for building integrations with Servantana
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-amber-800 mb-2">Authentication</h2>
          <p className="text-amber-700 text-sm">
            Most endpoints require authentication. Include your JWT token in the
            Authorization header: <code className="bg-amber-100 px-1 rounded">Bearer your-token</code>
          </p>
        </div>
        <SwaggerUI
          url="/api/docs"
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          persistAuthorization={true}
        />
      </div>
    </main>
  );
}
