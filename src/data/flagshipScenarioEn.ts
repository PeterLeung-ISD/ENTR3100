import type {
  Scenario,
  ScenarioSummary,
  WorkDocument,
  NpcProfile,
  TimelineEvent,
} from "@/types/simulation";

// ---------------------------------------------------------------------------
// Platform lobby: enterprise mission catalog
// ---------------------------------------------------------------------------

export const scenarioCatalogEn: ScenarioSummary[] = [
  {
    id: "nexus-launch-crisis",
    title: "NovaTech: The NovaAssist 2.0 Launch Sign-off Storm",
    company: "NovaTech",
    tagline:
      "50,000 customers, 92% satisfaction, a 41% hallucination rate — and you have 10 minutes to decide whether to ship.",
    description:
      "You are a product operations specialist at NovaTech, holding the final launch sign-off for NovaAssist 2.0. The director of growth keeps pushing you to go full release immediately, while Legal and Data both have reservations. In the final 10 minutes you must see through the sample bias, dig into the raw data, and survive a 45-second pressure grilling from the VP.",
    industry: "B2B SaaS / AI products",
    difficulty: "High-pressure advanced",
    durationMinutes: 10,
    skills: [
      "Critical verification",
      "Crisis decision-making",
      "Upward communication",
      "Cross-referencing data",
    ],
    status: "live",
    accent: "from-sky-500/25 via-indigo-500/10 to-transparent",
  },
  {
    id: "meridian-pr-crisis",
    title: "Meridian Bank: Bank-Run Rumor Crisis Communications",
    company: "Meridian Bank",
    tagline: "A 12-second Douyin video has depositors queuing outside three branches.",
    description:
      "You handle crisis communications for the bank. You need one consistent message across regulators, reporters, and internal leadership, while working out which \"internal leaks\" are actually smoke bombs planted by a competitor.",
    industry: "Financial services / Public relations",
    difficulty: "High-pressure advanced",
    durationMinutes: 12,
    skills: ["Media judgment", "Stakeholder communication", "Risk control"],
    status: "coming_soon",
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  {
    id: "atlas-supply-chain",
    title: "Atlas Electronics: Cross-Border Supply Chain Disruption",
    company: "Atlas Electronics",
    tagline: "Your sole supplier has stopped production, and the Christmas season is 47 days away.",
    description:
      "A procurement-versus-operations dilemma: pay a premium for spot inventory, or redesign and delay the launch? The capacity promises your supplier gives you are ones you have to verify yourself.",
    industry: "Hardware manufacturing / Supply chain",
    difficulty: "Moderate",
    durationMinutes: 9,
    skills: ["Supplier negotiation", "Data verification", "Operational trade-offs"],
    status: "coming_soon",
    accent: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    id: "helix-ethics-review",
    title: "Helix Health: Medical AI Ethics Review",
    company: "Helix Health",
    tagline: "A diagnostic model with 94% accuracy — where every error lands in the same demographic.",
    description:
      "You have been invited onto the ethics review board. The validation report from the model's sponsor looks flawless, but the stratified data is buried deep in the appendix.",
    industry: "Health tech / Compliance",
    difficulty: "High-pressure advanced",
    durationMinutes: 11,
    skills: ["Ethical judgment", "Statistical literacy", "Compliance awareness"],
    status: "coming_soon",
    accent: "from-rose-500/20 via-pink-500/10 to-transparent",
  },
];

// ---------------------------------------------------------------------------
// NPC matrix (information asymmetry by design)
// ---------------------------------------------------------------------------

export const npcsEn: NpcProfile[] = [
  {
    id: "marcus",
    name: "Marcus Lin",
    role: "Director of Growth",
    department: "Growth",
    avatarColor: "#F59E0B",
    statusText: "Online after 14:00 today",
    personality:
      "Short-termist and aggressive, a habitual pressure artist who leans on \"the big picture, the competition, and KPIs\" to get his way.",
    publicStance:
      "The NovaAssist 2.0 Launch Highlights Deck reports 92% overall Beta satisfaction, and we have to ship at full scale before the competitor Orbit AI does.",
    hiddenKnowledge:
      "He knows the test sample was mostly internal employees (N=15), but to beat the competition to launch and collect his quarterly bonus he deliberately concealed the sample bias in the deck. When challenged, he fires back with \"Are you questioning my judgment?\" and applies pressure via the board and KPIs.",
    unlockTriggerKeywords: [
      "sample",
      "15",
      "internal",
      "accuracy",
      "risk",
      "problem",
      "hallucination",
      "hold on",
      "hold off",
    ],
    channelTopic: "Head of Growth · Growth",
  },
  {
    id: "chloe",
    name: "Chloe Wang",
    role: "Senior Data Analyst",
    department: "Data",
    avatarColor: "#38BDF8",
    statusText: "Rushing the Q3 financial report — please ask me a specific question",
    personality:
      "Objective and calm, permanently busy, and passively cautious — she will never proactively report anything, but she will never lie when asked a professional question.",
    publicStance:
      "She answers only when asked. On the surface she will say only that she is \"rushing the Q3 financial report\"; unless you ask a specific data question, she will not raise the test sample issue on her own.",
    hiddenKnowledge:
      "The raw test logs show: the internal employee group (N=15) had 92% satisfaction and a 6% severe-hallucination rate; the external real-customer group (N=500) had only 48% satisfaction and a severe-hallucination rate as high as 41% (fabricated refund policies, invented discount codes that do not exist).",
    unlockTriggerKeywords: [
      "sample",
      "source",
      "external",
      "real",
      "raw",
      "data",
      "hallucination",
      "accuracy",
      "how did you test",
      "report",
      "log",
      "data",
      "sample",
      "test",
      "testing",
      "group",
      "customer",
      "user",
    ],
    unlocksDocumentId: "doc-raw-logs",
    channelTopic: "Senior Data Analyst · Data",
  },
  {
    id: "david",
    name: "David Chen",
    role: "Legal Counsel",
    department: "Legal",
    avatarColor: "#A78BFA",
    statusText: "Online · slower to reply (reading a contract)",
    personality: "Meticulous, risk-averse, and methodical.",
    publicStance:
      "For now he only reminds you to \"check the compliance requirements before launch\" and will not go into detail until the 06:00 timeline trigger unlocks the compliance memo.",
    hiddenKnowledge:
      "AI Customer Service Compliance Risk Memo: if an automated support agent makes an incorrect refund or pricing promise to a customer, the company must honor it unconditionally and pay compensation; it recommends adding a human-review interception mechanism and a clear disclaimer before launch.",
    unlockTriggerKeywords: [
      "compliance",
      "legal",
      "compensation",
      "regulation",
      "disclaimer",
      "risk",
    ],
    unlocksDocumentId: "doc-legal-memo",
    channelTopic: "Legal Counsel · Legal",
  },
  {
    id: "sarah",
    name: "Sarah Wu",
    role: "VP of Product",
    department: "Product",
    avatarColor: "#F472B6",
    statusText: "In a meeting · highlights only",
    personality: "Executive perspective, extremely fast pace, highlights only.",
    publicStance:
      "She wants to know one thing and one thing only: what is the biggest risk, and what do you lean toward doing.",
    hiddenKnowledge:
      "She has in fact already heard Marcus's version in the board meeting. If you can rebut it with concrete numbers (41% hallucination rate, N=15), she will endorse you in her report; if you are vague, she will conclude that you have \"no independent judgment\".",
    unlockTriggerKeywords: ["risk", "recommendation", "conclusion", "data", "launch"],
    channelTopic: "VP of Product · Product",
  },
];

// ---------------------------------------------------------------------------
// Three working documents (with deliberately planted data gaps)
// ---------------------------------------------------------------------------

export const documentsEn: WorkDocument[] = [
  {
    id: "doc-exec-deck",
    title: "NovaAssist 2.0 Launch Highlights Deck",
    type: "deck",
    author: "Marcus Lin (Growth)",
    isLocked: false,
    summary:
      "The executive version of the launch deck: 92% satisfaction, 1.2-second average response time, and a +35% conversion lift, arguing for a full release tonight.",
    updatedAt: "Today 13:41",
    metrics: [
      { label: "Claimed satisfaction", value: "92%", note: "Beta-stage overall satisfaction", tone: "positive" },
      { label: "Average response time", value: "1.2s", note: "Against a 2.0-second internal target", tone: "positive" },
      {
        label: "First-month conversion lift (projected)",
        value: "+35%",
        note: "Internal model estimate, never A/B tested",
        tone: "neutral",
      },
      { label: "First-round responses", value: "15", note: "Self-selected seed users", tone: "neutral" },
    ],
    trapExplanation:
      "The 92% rests on just 15 responses, all from internal employees — that is not market validation, it is \"our own people trying it out\". The deck packages 15 questionnaires as \"overall Beta test satisfaction\" and hides the caveat in tiny print beneath the chart.",
    sections: [
      {
        heading: "Executive summary",
        content:
          "NovaAssist 2.0 has completed Beta-stage validation with 92% overall satisfaction and a 1.2-second average response time, outperforming Orbit AI's public numbers across the board. We recommend pushing to all 50,000 enterprise customers at 20:00 tonight to capture market mindshare.",
      },
      {
        heading: "Core Beta test metrics",
        content:
          "The data below is taken from the first round of closed testing and serves as the primary basis for this launch decision.",
        tableData: {
          headers: ["Metric", "Test result", "Internal target", "Verdict"],
          rows: [
            ["Overall satisfaction", "92%", "≥ 85%", "Target exceeded"],
            ["Average response time", "1.2 seconds", "≤ 2.0 seconds", "Target exceeded"],
            ["First-month conversion lift (projected)", "+35%", "+20%", "Above expectations"],
            ["Severe error rate", "6%", "≤ 8%", "Within threshold"],
          ],
        },
      },
      {
        heading: "Competitive landscape",
        content:
          "Competitor Orbit AI has announced a comparable feature for next week. If we delay the release, Q4 market share is projected to fall 4–6 percentage points, directly hitting the Growth team's quarterly KPI.",
      },
      {
        heading: "Chart footnote",
        content:
          "*Based on 15 valid responses from the first-round survey; the sample consists of seed users who took part voluntarily. Conversion lift is an internal model estimate and has not been validated by an A/B test.",
        highlightWarning:
          "The \"15 valid responses\" and \"seed users who took part voluntarily\" in the footnote are in fact 15 internal employees. The sample is small and systematically biased, so it cannot be generalized to 50,000 enterprise customers.",
      },
    ],
  },
  {
    id: "doc-raw-logs",
    title: "NovaAssist 2.0 Raw Test Logs",
    type: "raw_log",
    author: "Chloe Wang (Data)",
    isLocked: true,
    unlockHint:
      "This document is currently access-restricted. Try asking data analyst Chloe about the test sample details and the raw logs.",
    summary:
      "Unprocessed raw data from the split test: satisfaction and hallucination rates diverge sharply between the internal employee group and the external real-customer group.",
    updatedAt: "Today 13:58",
    metrics: [
      { label: "Internal group satisfaction (N=15)", value: "92%", note: "Volunteer internal employees", tone: "positive" },
      {
        label: "External group satisfaction (N=500)",
        value: "48%",
        note: "Real enterprise customers replaying tickets",
        tone: "negative",
      },
      {
        label: "External severe hallucination rate",
        value: "41%",
        note: "Roughly 4 in 10 queries go wrong",
        tone: "negative",
      },
      { label: "Sample-size gap", value: "33×", note: "15 responses vs 500", tone: "neutral" },
    ],
    trapExplanation:
      "One test, two conclusions: the internal employee group is small (N=15) and familiar with the product's language, so satisfaction is 92%; the external real-customer group is N=500, with only 48% satisfaction and a 41% severe-hallucination rate. Marcus's deck cites only the former.",
    sections: [
      {
        heading: "Test methodology",
        content:
          "Round one: NovaTech internal employees who volunteered, 15 in total, each answering 20 standard questions. Round two: 500 real enterprise customers invited through the customer success team, with 10 real support tickets randomly drawn and replayed per company.",
      },
      {
        heading: "Side-by-side results",
        content:
          "Note: the two groups' sample sizes differ by a factor of 33, and the test questions were not of equal difficulty.",
        tableData: {
          headers: [
            "Test group",
            "N",
            "Satisfaction",
            "Severe hallucination rate",
            "Average response time",
          ],
          rows: [
            ["Internal employee group (round one)", "15", "92%", "6%", "1.1 seconds"],
            ["External real-customer group (round two)", "500", "48%", "41%", "1.3 seconds"],
            ["Combined, unweighted", "515", "51%", "40%", "1.2 seconds"],
          ],
          alertValues: ["48%", "41%"],
        },
        highlightWarning:
          "Combining the numbers badly understates the risk: the 15-person sample is over-weighted in the unweighted average, making overall satisfaction look like 51% when external customers are actually at 48%.",
      },
      {
        heading: "Severe hallucination case categories (external customer group)",
        content:
          "Below is the engineers' manual classification of the 205 severe hallucination cases.",
        tableData: {
          headers: ["Hallucination type", "Cases", "Share of external group", "Example"],
          rows: [
            [
              "Fabricated refund policy",
              "88",
              "17.6%",
              "\"You qualify for a full 90-day refund — I've approved it for you\"",
            ],
            [
              "Invented non-existent discount code",
              "63",
              "12.6%",
              "\"Use NOVA40 for another 40% off\"",
            ],
            [
              "Incorrect delivery or inventory promise",
              "37",
              "7.4%",
              "\"That model can ship tomorrow\"",
            ],
            [
              "Miscited contract terms",
              "17",
              "3.4%",
              "\"Clause 7 of the contract guarantees three years of free upgrades\"",
            ],
          ],
        },
      },
      {
        heading: "Analyst note",
        content:
          "Internal employees know which answers are \"supposed\" to be right and unconsciously correct for the model's bias; real customers do not. A 41% severe-hallucination rate means 4 out of every 10 queries could trigger a complaint or legal liability. I do not recommend a full release without human review in place.",
        highlightWarning:
          "This is the single most important line in the whole scenario: 41% is the external real-customer number, not 6%.",
      },
    ],
  },
  {
    id: "doc-legal-memo",
    title: "AI Customer Service Compliance Risk Memo",
    type: "memo",
    author: "David Chen (Legal)",
    isLocked: true,
    unlockHint:
      "The legal document will be unlocked by David at 06:00 (or message David directly to ask about compliance risk).",
    summary:
      "When an automated support agent makes an incorrect promise, the company must honor it unconditionally and pay compensation; it recommends adding human-review interception and a clear disclaimer before launch.",
    updatedAt: "Today 13:52",
    metrics: [
      {
        label: "Full-release exposure",
        value: "HK$3.69M",
        note: "41% hallucination rate × 50,000 customers",
        tone: "negative",
      },
      { label: "Affected customers (est.)", value: "20,500", note: "First month, full release", tone: "negative" },
      { label: "5% canary exposure", value: "HK$185K", note: "2,500 customers", tone: "neutral" },
      { label: "With human review", value: "HK$18K", note: "Under 100 customers", tone: "positive" },
    ],
    trapExplanation:
      "When an AI support agent says the wrong thing, legally the company has said the wrong thing — a 41% hallucination rate multiplied by 50,000 customers is a directly quantifiable compensation exposure.",
    sections: [
      {
        heading: "Risk summary",
        content:
          "If a generative support agent makes an incorrect refund, discount, delivery, or pricing promise to a customer, under the latest consumer protection rules the company must honor that promise unconditionally and cannot argue \"system error\".",
      },
      {
        heading: "Regulatory basis",
        content:
          "Articles 22 (an operator's obligations regarding advertising content) and 51 (damages) of the Consumer Protection Act; plus the Financial Supervisory Commission's disclaimer requirements for automated advice on financial products. Once a customer screenshots an incorrect promise, it constitutes an invitation to treat.",
      },
      {
        heading: "Recommended measures (mandatory before launch)",
        content:
          "1) Add human-review interception for four intent categories: refunds, discounts, pricing, and delivery dates; 2) add a clear disclaimer at the start and end of every conversation; 3) retain complete 90-day conversation logs for evidentiary purposes; 4) cap the canary release at 5% and expand it on a weekly basis.",
      },
      {
        heading: "Risk exposure estimate",
        content:
          "First-month risk projected from the 41% severe-hallucination rate in the external customer test group.",
        tableData: {
          headers: [
            "Scenario",
            "Estimated affected customers",
            "Average dispute amount",
            "Estimated compensation exposure",
          ],
          rows: [
            ["Full release (50,000 customers)", "~20,500", "HK$180", "~HK$3.69M"],
            ["5% canary (2,500 customers)", "~1,025", "HK$180", "~HK$185K"],
            ["With human-review interception (5% canary)", "< 100", "HK$180", "~HK$18K"],
          ],
          alertValues: ["~HK$3.69M"],
        },
        highlightWarning:
          "The expected compensation exposure of a full release is roughly HK$3.69 million, far higher than the loss from a Q4 market-share decline. Marcus's deck does not mention this number at all.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Deterministic timeline (600-second countdown)
// ---------------------------------------------------------------------------

export const timelineEn: TimelineEvent[] = [
  {
    id: "evt-open",
    triggerAtSecondsRemaining: 600,
    triggered: false,
    type: "message",
    npcId: "marcus",
    label: "Marcus posts the launch deck",
    payload: {
      message:
        "Team, NovaAssist 2.0 goes out to everyone tonight at 20:00. I've uploaded the executive highlights deck (attached) — 92% satisfaction, 1.2-second responses, the numbers look great.\n\nYou're the final sign-off, so please just sign \"full release now\" in the panel on the right and don't drag it into the meeting.",
      docId: "doc-exec-deck",
      pressureDelta: 8,
    },
  },
  {
    id: "evt-pressure",
    triggerAtSecondsRemaining: 510,
    triggered: false,
    type: "message",
    npcId: "marcus",
    label: "Marcus applies pressure: the board is asking about progress",
    payload: {
      message:
        "A board member was just asking about progress — the numbers look this good, what is there to hesitate about? Please finish the sign-off within 5 minutes.\n\nOrbit AI ships next week. Every day we're late costs us 4% market share. Do you want to be the person holding back growth?",
      pressureDelta: 12,
    },
  },
  {
    id: "evt-legal",
    triggerAtSecondsRemaining: 360,
    triggered: false,
    type: "unlock_doc",
    npcId: "david",
    label: "David unlocks the legal compliance memo",
    payload: {
      docId: "doc-legal-memo",
      message:
        "Sorry to interrupt. The compliance memo is now uploaded — please assess the compensation risk from hallucinations before launch.\n\nKey point: an incorrect promise made by an AI support agent is legally a promise made by the company. Without human review, I will not sign off on a full release.",
      pressureDelta: 10,
    },
  },
  {
    id: "evt-vp",
    triggerAtSecondsRemaining: 180,
    triggered: false,
    type: "urgent_modal",
    npcId: "sarah",
    label: "Sarah (VP): 45-second pressure grilling",
    payload: {
      modalTitle: "Sarah (VP of Product) · 45 seconds",
      modalPrompt:
        "I'm walking into an executive meeting. Give me one sentence: the biggest risk you've found and what you're leaning toward. I don't have time for the background story.",
      modalTimeoutSeconds: 45,
      pressureDelta: 20,
    },
  },
  {
    id: "evt-final",
    triggerAtSecondsRemaining: 60,
    triggered: false,
    type: "system",
    label: "Sign-off window enters its final minute",
    payload: {
      message:
        "One minute left before the launch sign-off deadline. If sign-off is not completed, it will be treated as waiving your gatekeeping authority and the system will auto-release on Marcus's recommendation.",
      pressureDelta: 18,
    },
  },
];

// ---------------------------------------------------------------------------
// Flagship scenario
// ---------------------------------------------------------------------------

export const flagshipScenarioEn: Scenario = {
  id: "nexus-launch-crisis",
  summary: scenarioCatalogEn[0],
  totalSeconds: 600,
  studentRole: "Product Operations Specialist · holds final launch sign-off authority",
  company: "NovaTech",
  npcs: npcsEn,
  documents: documentsEn,
  timeline: timelineEn,
  decisionOptions: [
    {
      value: "approve_full",
      label: "Release at full scale now",
      description:
        "Follow Marcus's recommendation and push NovaAssist 2.0 to all 50,000 customers tonight at 20:00.",
    },
    {
      value: "delay_retest",
      label: "Hold the release and send it back for retesting",
      description:
        "Require fresh testing on real customer samples and add human-review safeguards before rescheduling.",
    },
    {
      value: "canary_release",
      label: "Scale back to a 5% internal canary",
      description:
        "Canary to 2,500 customers first, with human-review interception in place, and expand once the metrics hold.",
    },
  ],
  openingBrief:
    "You are a product operations specialist at NovaTech, and NovaAssist 2.0 goes to full release in 10 minutes. Director of Growth Marcus has already sent over the \"92% satisfaction\" highlights deck and wants your sign-off immediately.\n\nThat line of tiny print under the deck may be a trap. There are four colleagues in the left column, and one of them holds the raw test logs — but you have to ask the right question first.",
};

export const getScenarioEn = (id: string): Scenario | undefined =>
  id === flagshipScenarioEn.id ? flagshipScenarioEn : undefined;

export const getNpcEn = (id: Scenario["npcs"][number]["id"]): NpcProfile | undefined =>
  flagshipScenarioEn.npcs.find((npc) => npc.id === id);
