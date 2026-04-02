import Link from "next/link";

export default function HelpAdminHomePage() {
  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Help center admin</h1>
      <p className="text-gray-600">
        Manage knowledge base categories and articles, handle support tickets, and view insights.
      </p>
      <ul className="space-y-2 text-purple-700 font-medium">
        <li>
          <Link href="/dashboard/help/admin/categories" className="underline">
            Categories
          </Link>
        </li>
        <li>
          <Link href="/dashboard/help/admin/articles" className="underline">
            Articles
          </Link>
        </li>
        <li>
          <Link href="/dashboard/help/admin/tickets" className="underline">
            Tickets
          </Link>
        </li>
        <li>
          <Link href="/dashboard/help/admin/insights" className="underline">
            Insights
          </Link>
        </li>
      </ul>
    </div>
  );
}
