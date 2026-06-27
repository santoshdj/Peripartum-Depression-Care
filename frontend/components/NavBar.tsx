"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGateContext } from "@/context/gate-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/screening", label: "Screening" },
  { href: "/history", label: "History" },
  { href: "/my-care", label: "My Care" },
  { href: "/diary", label: "My Diary" },
  { href: "/mom-talk", label: "Mom Talk" },
  { href: "/resources", label: "Resources" },
];

export default function NavBar() {
  const pathname = usePathname();
  const isLoggedIn = pathname !== "/";
  const { gateRequired, gateCleared } = useGateContext();

  // Links are locked when the gate question hasn't been answered yet
  const locked = gateRequired && !gateCleared;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 text-sm">
          Peripartum Care
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Resources is always visible and always clickable */}
          <Link
            href="/resources"
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              pathname === "/resources"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            Resources
          </Link>

          {isLoggedIn && (
            <>
              {navItems
                .filter((item) => item.href !== "/resources")
                .map(({ href, label }) => (
                  locked ? (
                    <span
                      key={href}
                      title="Answer the setup question on the dashboard to unlock"
                      className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-35 cursor-not-allowed text-gray-500 select-none"
                    >
                      {label}
                    </span>
                  ) : (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                        pathname === href
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      {label}
                    </Link>
                  )
                ))}
              <Link
                href="/profile"
                title="My Profile"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  pathname === "/profile"
                    ? "text-blue-600"
                    : "text-gray-400 hover:text-gray-700"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </Link>
              <Link
                href="/logout"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors ml-2"
              >
                Sign out
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

