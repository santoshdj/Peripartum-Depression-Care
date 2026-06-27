"use client";

import BackButton from "@/components/BackButton";

const communities = [
  {
    name: "Postpartum Support International (PSI)",
    description:
      "The leading organization for perinatal mental health support. Online support groups, peer mentor matching, and a 24/7 helpline staffed by trained volunteers.",
    href: "https://www.postpartum.net/get-help/psi-online-support-meetings/",
    cta: "Find a support group",
    badge: "Free · Moderated · Clinically supervised",
  },
  {
    name: "PSI Peer Mentor Program",
    description:
      "Get matched one-on-one with a trained volunteer who has personally experienced perinatal mood and anxiety disorders. Email-based, confidential, and free.",
    href: "https://www.postpartum.net/get-help/psi-peer-mentor-program/",
    cta: "Request a peer mentor",
    badge: "Free · Private · One-on-one",
  },
  {
    name: "The Bloom Foundation",
    description:
      "Community and resources for moms navigating postpartum challenges, including peer stories, coping guides, and an active moderated community.",
    href: "https://www.thebloomfoundation.org/",
    cta: "Visit community",
    badge: "Free · Moderated",
  },
  {
    name: "Postpartum Support International Facebook Group",
    description:
      "A private, moderated Facebook group for people experiencing perinatal mental health challenges. Over 30,000 members sharing lived experience.",
    href: "https://www.facebook.com/groups/psiconnect/",
    cta: "Request to join",
    badge: "Free · Private group · Moderated",
  },
];

const hotlines = [
  {
    name: "National Maternal Mental Health Hotline",
    number: "1-833-943-5746",
    description: "Free, confidential 24/7 support before, during, and after pregnancy.",
  },
  {
    name: "Postpartum Support International Helpline",
    number: "1-800-944-4773",
    description: "Talk with a trained volunteer. English and Spanish available.",
  },
  {
    name: "988 Suicide & Crisis Lifeline",
    number: "988",
    description: "Call or text 988 anytime for immediate crisis support.",
  },
];

export default function MomTalkPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mom Talk</h1>
        <p className="text-gray-500 text-sm mt-1">
          You are not alone. Connect with other moms who understand what you&apos;re going through.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">A note before you connect:</span> Peer support is a
          powerful complement to clinical care — not a replacement. If you are in crisis or your
          symptoms are worsening, please contact your provider or call a helpline below first.
        </p>
      </div>

      {/* Community links */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Peer Support Communities
        </h2>
        <div className="space-y-3">
          {communities.map(({ name, description, href, cta, badge }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-800 text-sm">{name}</p>
                <span className="text-blue-600 text-sm shrink-0">↗</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">{description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {cta}
                </span>
                <span className="text-xs text-gray-400">{badge}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Hotlines */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Need to Talk Right Now?
        </h2>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
          {hotlines.map(({ name, number, description }) => (
            <div key={number} className="flex items-start gap-3">
              <a
                href={`tel:${number.replace(/\D/g, "")}`}
                className="shrink-0 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
              >
                {number}
              </a>
              <div>
                <p className="text-sm font-medium text-gray-800">{name}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
