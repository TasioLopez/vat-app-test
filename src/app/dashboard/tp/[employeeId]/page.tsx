import { redirect } from 'next/navigation';

type Params = {
  employeeId: string;
};

/** Legacy TP builder (no instance id) removed — send users back to the employee page. */
export default async function TPBuilderPage({ params }: { params: Promise<Params> }) {
  const { employeeId } = await params;
  redirect(`/dashboard/employees/${employeeId}`);
}
