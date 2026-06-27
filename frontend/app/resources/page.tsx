import BackButton from "@/components/BackButton";

export default function ResourcesPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Support Resources</h1>
        <p className="text-gray-500 text-sm mt-1">
          Help is available. These resources are always accessible — no login required.
        </p>
      </div>

      {/* Crisis line — most prominent */}
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
        <h2 className="font-semibold text-red-800 text-lg">Need help right now?</h2>
        <p className="text-red-700 mt-2 text-2xl font-bold">
          <a href="tel:18339435746" className="hover:underline">
            1-833-943-5746
          </a>
        </p>
        <p className="text-red-700 text-sm mt-1">
          National Maternal Mental Health Hotline — free, confidential, 24/7, English &amp;
          Spanish
        </p>
      </div>

      {/* Additional crisis lines */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900">Additional Crisis Lines</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">988 Suicide &amp; Crisis Lifeline</span>
            <a href="tel:988" className="text-blue-600 font-medium hover:underline">
              988
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Crisis Text Line</span>
            <span className="text-gray-600">Text HOME to 741741</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Postpartum Support International</span>
            <a href="tel:18008735678" className="text-blue-600 font-medium hover:underline">
              1-800-873-5678
            </a>
          </div>
        </div>
      </div>

      {/* What is peripartum depression */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900">What is Peripartum Depression?</h2>
        <p className="text-gray-600 text-sm">
          Peripartum depression (also called perinatal or postpartum depression) is a common
          medical condition that can occur during pregnancy or in the first year after giving birth.
          It affects about 1 in 5 people and is not a sign of weakness or failure.
        </p>
        <p className="text-gray-600 text-sm">
          Symptoms can include persistent sadness, loss of interest in activities, difficulty
          bonding with your baby, changes in sleep or appetite, and feelings of worthlessness.
          These feelings are treatable with the right support.
        </p>
      </div>

      {/* Coping strategies */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900">Coping Strategies</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Talk to your OB, midwife, or primary care provider about how you are feeling",
            "Reach out to a trusted friend or family member — you don't have to go through this alone",
            "Try to rest when your baby rests, even if sleep is hard",
            "Get outside for a short walk when you can manage it",
            "Join a support group for new parents — Postpartum Support International has a directory at postpartum.net",
            "Limit social media if it makes you feel worse about yourself",
            "Accept help when it is offered",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* EPDS explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2">
        <h2 className="font-medium text-blue-900">About the EPDS Screening</h2>
        <p className="text-blue-800 text-sm">
          The Edinburgh Postnatal Depression Scale (EPDS) is a 10-question screening tool used
          by healthcare providers worldwide to identify peripartum depression. A score of 10 or
          above suggests you may benefit from talking to your care team. This screening is not a
          diagnosis — it is a conversation starter with your provider.
        </p>
      </div>

      {/* Types of perinatal mood disorders */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h2 className="font-medium text-gray-900">Types of Perinatal Mood &amp; Anxiety Disorders</h2>
        <p className="text-gray-500 text-xs">
          Peripartum depression is the most well-known, but several related conditions can occur during pregnancy and the postpartum period.
        </p>
        {[
          {
            name: "Peripartum Depression (PPD)",
            description:
              "Persistent sadness, low energy, loss of interest, difficulty bonding with your baby, and feelings of hopelessness lasting more than 2 weeks. Affects 1 in 5 people. Treatable with therapy, medication, or both.",
          },
          {
            name: "Perinatal Anxiety",
            description:
              "Excessive worry, racing thoughts, physical tension, or panic attacks during pregnancy or postpartum. Often co-occurs with depression. Very common and highly treatable.",
          },
          {
            name: "Postpartum OCD (PPOCD)",
            description:
              "Intrusive, unwanted thoughts (often about harming the baby) that are deeply distressing and ego-dystonic — meaning the person does not want to act on them. These thoughts are a symptom, not intent. Responds well to CBT and medication.",
          },
          {
            name: "Postpartum PTSD",
            description:
              "Can follow a traumatic birth experience. Symptoms include flashbacks, nightmares, hypervigilance, and avoidance. Trauma-focused therapy (EMDR, CPT) is effective.",
          },
          {
            name: "Postpartum Psychosis",
            description:
              "Rare (1–2 per 1,000 births) but a medical emergency. Symptoms include hallucinations, delusions, rapid mood swings, and confusion. Onset is typically within the first 2 weeks. Requires immediate medical attention — call 911 or go to the ER.",
          },
        ].map(({ name, description }) => (
          <div key={name} className="border-l-4 border-blue-200 pl-3">
            <p className="text-sm font-semibold text-gray-800">{name}</p>
            <p className="text-xs text-gray-600 mt-0.5">{description}</p>
          </div>
        ))}
      </div>

      {/* Treatment options */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900">Evidence-Based Treatment Options</h2>
        <p className="text-gray-500 text-xs">All options below have strong clinical evidence for perinatal mood disorders.</p>
        {[
          {
            label: "Therapy (Psychotherapy)",
            detail:
              "Cognitive Behavioral Therapy (CBT) and Interpersonal Therapy (IPT) are first-line treatments. Both have strong evidence specifically for PPD. Telehealth therapy is widely available.",
          },
          {
            label: "Medication (Antidepressants)",
            detail:
              "SSRIs such as sertraline and escitalopram are considered safe during breastfeeding and are effective for PPD. Talk to your OB or psychiatrist — you do not need to choose between treatment and nursing.",
          },
          {
            label: "Support Groups",
            detail:
              "Peer support significantly reduces symptom severity. Postpartum Support International runs free, moderated online groups every week. See Mom Talk in this app for links.",
          },
          {
            label: "Brexanolone / Zuranolone",
            detail:
              "FDA-approved medications specifically for PPD. Brexanolone (Zulresso) is an IV infusion; zuranolone (Zurzuvae) is an oral option. Ask your provider if these are appropriate for you.",
          },
          {
            label: "Exercise & Lifestyle",
            detail:
              "Regular moderate exercise (e.g., 20-minute walks) has a meaningful effect on mood. Sleep hygiene, social connection, and reducing isolation are also clinically supported.",
          },
        ].map(({ label, detail }) => (
          <div key={label} className="flex items-start gap-2 text-sm">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">{label}: </span>
              <span className="text-gray-600">{detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* For partners & support people */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900">For Partners &amp; Support People</h2>
        <p className="text-gray-500 text-xs">
          PPD affects the whole family. Here is how you can help.
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Know the signs: persistent sadness, withdrawal, difficulty caring for the baby, or expressing hopelessness are all worth taking seriously.",
            "Don't minimize — avoid phrases like \"you should be happy\" or \"this is normal.\" Validate instead: \"This sounds really hard. I'm here.\"",
            "Take on practical load without being asked: nights, feeds, household tasks.",
            "Encourage — not pressure — professional help. Offer to help book the appointment or come along.",
            "Partners can also experience postpartum depression (up to 10% of new fathers). Check in with yourself too.",
            "Postpartum Support International has a dedicated partners' page at postpartum.net/for-partners.",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Curated educational links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900">Trusted Educational Resources</h2>
        {[
          {
            name: "Postpartum Support International",
            url: "https://www.postpartum.net/learn-more/",
            description: "Comprehensive library on all perinatal mood disorders, by the leading clinical organization.",
          },
          {
            name: "MGH Center for Women's Mental Health",
            url: "https://womensmentalhealth.org/specialty-clinics/postpartum-psychiatric-disorders/",
            description: "Evidence-based clinical articles on PPD, medication safety during pregnancy and breastfeeding.",
          },
          {
            name: "ACOG — Postpartum Depression FAQ",
            url: "https://www.acog.org/womens-health/faqs/postpartum-depression",
            description: "American College of OB/GYNs patient FAQ on symptoms, diagnosis, and treatment.",
          },
          {
            name: "CDC — Depression During & After Pregnancy",
            url: "https://www.cdc.gov/mental-health/depression-during-after-pregnancy/index.html",
            description: "National statistics, risk factors, and guidance on getting help.",
          },
          {
            name: "Postpartum.net — Find a Provider",
            url: "https://www.postpartum.net/get-help/provider-directory/",
            description: "Directory of perinatal mental health specialists searchable by location.",
          },
        ].map(({ name, url, description }) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-2 hover:text-blue-600 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600">{name} ↗</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
