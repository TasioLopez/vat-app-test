import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CV',
};

export default function CVPage() {
  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold text-gray-700">CV</h1>
      <p className="mt-4 text-gray-500">Coming soon...</p>
    </div>
  );
}
