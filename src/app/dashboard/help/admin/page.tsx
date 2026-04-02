import Link from "next/link";

export default function HelpAdminHomePage() {
  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Helpcentrum beheer</h1>
      <p className="text-gray-600">
        Beheer kenniscategorieën en artikelen, behandel supporttickets en bekijk inzichten.
      </p>
      <ul className="space-y-2 text-purple-700 font-medium">
        <li>
          <Link href="/dashboard/help/admin/categories" className="underline">
            Categorieën
          </Link>
        </li>
        <li>
          <Link href="/dashboard/help/admin/articles" className="underline">
            Artikelen
          </Link>
        </li>
        <li>
          <Link href="/dashboard/help/admin/tickets" className="underline">
            Tickets
          </Link>
        </li>
        <li>
          <Link href="/dashboard/help/admin/insights" className="underline">
            Inzichten
          </Link>
        </li>
      </ul>
    </div>
  );
}
