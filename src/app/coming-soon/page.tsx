export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1
            className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent uppercase"
            style={{ fontFamily: 'var(--font-logo)' }}
          >
            SERVANTANA
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-600 mx-auto rounded-full"></div>
        </div>

        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          Coming Soon
        </h2>

        <p className="text-gray-600 text-lg">
          We&apos;re working hard to bring you something amazing. Stay tuned!
        </p>
      </div>
    </div>
  );
}
