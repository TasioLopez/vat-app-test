import CvShareGateClient from '@/components/cv/share/CvShareGateClient';

export const metadata = {
  title: 'CV openen',
};

export default async function CvSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CvShareGateClient token={token} />;
}
