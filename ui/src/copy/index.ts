// ui/src/copy/index.ts
// Verbatim copy from docs/05c-UI-AGENT-PROMPT-v2.md

export const SHELL_COPY = {
  wordmark: "Incident Investigator",
  nav: [
    { label: "Investigate", path: "/investigate" },
    { label: "Cases", path: "/cases" },
    { label: "How it works", path: "/how-it-works" },
    { label: "Evidence and limits", path: "/evidence" },
    { label: "Data and privacy", path: "/data" },
  ],
  footer: {
    col1Title: "Incident Investigator",
    col1Body: "A prototype for the PayPal AI Hackathon. Sandbox data only.",
    col2Title: "Explore",
    col2Links: [
      { label: "Investigate", path: "/investigate" },
      { label: "Cases", path: "/cases" },
      { label: "How it works", path: "/how-it-works" },
      { label: "Evidence and limits", path: "/evidence" },
    ],
    col3Title: "Notices",
    col3Links: [
      { label: "Data and privacy", path: "/data" },
      { label: "Prototype terms", path: "/terms" },
      { label: "About", path: "/about" },
      { label: "Audit chain check", path: "/audit" },
    ],
    col4Title: "Build",
    buildPrefix: "Build ",
    buildUnknown: "Build unknown",
    disclaimer:
      "Independent prototype built for the PayPal AI Hackathon. Not affiliated with, endorsed by or sponsored by PayPal or WooCommerce. PayPal and WooCommerce are trademarks of their owners. Nothing on this site is financial, legal or accounting advice.",
  },
  notFound: {
    h1: "That page does not exist.",
    body: "Try the start page or the list of recorded cases.",
    links: [
      { label: "Investigate", path: "/investigate" },
      { label: "Cases", path: "/cases" },
    ],
  },
  mockStrip: "Mock data from saved responses",
};

export const HOME_COPY = {
  hero: {
    eyebrow: "Prototype · sandbox data only",
    h1: "Give it a PayPal order ID.",
    lead: "It reads that order from PayPal and the matching order from WooCommerce, shows what each system says, says whether it can link them and where they disagree (or that it cannot tell), and lists which next steps are safe and which are forbidden. It changes nothing in either system.",
    finePrint: "It writes one thing: a local record of each investigation.",
    primaryAction: "Open a recorded case",
    secondaryAction: "What it cannot tell you",
    sceneCaption: "ILLUSTRATION OF THE IDEA. NOT DATA.",
  },
  statementBand: {
    label: "01 · The problem we assumed",
    body: "A WooCommerce store and PayPal can hold two different stories about one payment. We assumed a merchant has to check both by hand. We have not tested that assumption with any merchant.",
  },
  editorialList: {
    sectionLabel: "02 · What one investigation gives you",
    rows: [
      {
        num: "01",
        title: "Both systems, side by side",
        desc: "PayPal's view of the order and the store's view, each with the time we observed it. The two reads are not simultaneous.",
      },
      {
        num: "02",
        title: "A plain answer on identity",
        desc: "Confirmed when both systems name each other. Provisional when we only infer the link. Unresolved when we cannot link them.",
      },
      {
        num: "03",
        title: "Where they disagree, or that we cannot tell",
        desc: "The disagreement we observed and when we observed it. When the evidence is not enough, the result says so and stops.",
      },
      {
        num: "04",
        title: "Evidence behind every sentence",
        desc: "Each statement points to the stored items it came from, and each item carries a hash of the stored copy.",
      },
      {
        num: "05",
        title: "Human-only next steps",
        desc: "Suggestions for a person to consider, and a list of actions this tool will not take.",
      },
    ],
  },
  recordedCaseComponent: {
    sectionLabel: "03 · A recorded case",
    h2: "See what a result looks like.",
    tabs: [
      {
        id: "tab-1",
        name: "Order 17: both agree",
        caseKey: "investigation-confirmed-ok",
        runCaseId: "replay-order-17",
        intro: "This is order 17, a completed order. PayPal shows one completed capture and the store shows the order as paid.",
      },
      {
        id: "tab-2",
        name: "Order 20: provisional link",
        caseKey: "investigation-provisional-approved-not-captured",
        runCaseId: "replay-order-20",
        intro: "This is order 20 from our sandbox store. PayPal shows the buyer approved it and no capture is recorded. The store does not hold the PayPal order ID, so the link between the two is only a provisional association.",
      },
      {
        id: "tab-3",
        name: "Injected: amount differs",
        caseKey: "investigation-injected-amount-mismatch",
        runCaseId: "injected-amount-mismatch",
        intro: "This case was written by us. A capture's amount differs from the store total. It is injected, not a real merchant incident, and the band says so.",
      },
    ],
    frameHeader: "RECORDED EXAMPLE · click the evidence to open it",
    linkBelow: "Run this case yourself",
  },
  honestyTable: {
    sectionLabel: "04 · What is real",
    h2: "What you are looking at, exactly.",
    rows: [
      {
        what: "Recorded real sandbox orders",
        status: "Three orders from one local WooCommerce 11.2.1 store with the PayPal Payments plugin 4.2.0, recorded once and replayed from files.",
      },
      {
        what: "Injected cases",
        status: "Three cases we wrote ourselves to exercise the rules. They are labelled on screen and are not real merchant incidents.",
      },
      {
        what: "Live reads from PayPal and WooCommerce",
        status: "Not enabled in this build.",
      },
      {
        what: "Fixing orders, capturing payments, refunds",
        status: "Not built. Not part of this submission.",
      },
      {
        what: "AI explanations",
        status: "Optional and off by default. Fixed templates write the explanations you see here.",
      },
      {
        what: "Testing with merchants",
        status: "None. We do not know how often the verdicts are right.",
      },
    ],
    linkText: "Read the full evidence and limits",
  },
  closingLine: {
    body: "Nothing here fixes an order or moves money. A person decides what to do next.",
    link1: "Open a recorded case",
    link2: "How it works",
  },
};

export const HOW_IT_WORKS_COPY = {
  header: {
    eyebrow: "How it works",
    h1: "One order, read twice, compared with care.",
    lead: "The method is a fixed set of steps. Nothing in it decides on its own what to do with a payment.",
  },
  steps: [
    {
      num: "01",
      title: "Input",
      text: "You give it a PayPal order ID, or choose a recorded case.",
    },
    {
      num: "02",
      title: "Two reads",
      text: "It reads the PayPal order and the matching WooCommerce order. The two reads are not simultaneous, so the state can change between them. Each is shown with the time we observed it.",
    },
    {
      num: "03",
      title: "Identity",
      text: "It checks whether the two orders name each other. If only PayPal-side details point to the store order, the link is a provisional association. If it cannot link them, it says so.",
    },
    {
      num: "04",
      title: "Decision",
      text: "A fixed table of 14 rules, checked in order, picks the verdict. When no rule fits or the evidence is incomplete, the tool abstains. A matched rule is not a measure of accuracy.",
    },
    {
      num: "05",
      title: "Evidence",
      text: "Each statement cites stored evidence items. Each item carries a hash of the stored copy, which identifies the copy and does not show that PayPal or the store said it.",
    },
    {
      num: "06",
      title: "Explanation",
      text: "Fixed templates write the explanation. An optional AI step can rephrase it. That step is off by default, and its text is shown only if it passes a check against the evidence.",
    },
    {
      num: "07",
      title: "Next steps",
      text: "The result lists suggestions for a person and actions the tool will not take. Nothing is executed.",
    },
    {
      num: "08",
      title: "Record",
      text: "A local record, an audit entry and an evidence bundle are written. The bundle can be re-run offline to show that the decision follows from the stored inputs. It does not show that the inputs matched PayPal or the store.",
    },
  ],
  aside: {
    title: "What it writes",
    body: "Only local files and memory on the machine that runs the server: the investigation record, a line in an audit log, and an evidence bundle. It writes nothing to PayPal and nothing to WooCommerce.",
  },
};

export const EVIDENCE_COPY = {
  header: {
    eyebrow: "Evidence and limits",
    h1: "What we observed, and what we do not know.",
    lead: "Read this before you rely on any result. It lists what the prototype has actually seen and what it cannot tell you.",
    h2Coverage: "What the evidence covers",
    coverageRows: [
      {
        label: "Three recorded real sandbox orders",
        text: "Orders 13, 17 and 20 from one local WooCommerce 11.2.1 store with the PayPal Payments plugin 4.2.0, in PayPal's sandbox. Each was recorded once. The recordings are checked against a hash list. That shows the files have not changed since the list was made. It does not show that PayPal or WooCommerce produced them.",
      },
      {
        label: "One timing observation",
        text: "In one sandbox run, PayPal created a capture about 50 minutes after the order was created. That is one order, not a typical delay.",
      },
      {
        label: "Order 20",
        text: "PayPal shows it as approved, with no capture recorded. The store did not hold the PayPal order ID, so the link between the two is a provisional association.",
      },
      {
        label: "Three injected cases",
        text: "Cases we wrote to exercise the rules: a capture the store shows as unpaid, an amount that differs from the store total, and two captures on one order. They have not been observed in a real store.",
      },
      {
        label: "Automated tests",
        text: "They check how the code behaves on our cases. They do not measure how often a verdict is right.",
      },
    ],
  },
  limits: {
    h2: "What this tool does not know",
    items: [
      "It cannot know that two orders are the same purchase when WooCommerce does not hold the PayPal order ID. It can only suggest a provisional association.",
      "It does not find problem orders. You supply the PayPal order ID.",
      "It has seen PayPal's sandbox and one plugin version in one store setup (block checkout, a virtual product, US dollars, one way of interrupting a payment). It says nothing about other setups.",
      "The plugin version is declared by the operator. It is not read from the store.",
      "It does not know when a disagreement began, only when we observed it.",
      "Its two reads are not simultaneous. State can change between them.",
      "It does not add up several captures, and it does not handle refunds, partial captures, currency conversion or fees.",
      "A verdict means a rule matched. It is not a measured accuracy. No merchant has tested the central idea.",
      "Removal of personal data from stored records is best effort and can miss fields.",
      "The audit log shows that its entries are consistent with each other. It does not show that the data was genuine, and someone with access to the file could rewrite all of it.",
    ],
  },
  labels: {
    h2: "How to read the labels",
    definitions: [
      { term: "Replay", def: "A recording of a real sandbox order, played back from a file. The times are recording times, not now." },
      { term: "Injected", def: "A case written by us to exercise the rules. It is not a real merchant incident." },
      { term: "Observation", def: "Read from a system, or from its recording." },
      { term: "Derived", def: "Computed from observations by a fixed rule." },
      { term: "Inference", def: "A reasoned link that neither system states." },
      { term: "Declared", def: "Stated by the operator, not read from a system." },
      { term: "Advice", def: "A suggestion for a person." },
      { term: "Hash", def: "A fingerprint of a stored copy of a record. It does not show that PayPal or the store said it." },
      { term: "Chain check", def: "A check that audit entries are consistent with each other. It does not prove the data was genuine." },
    ],
  },
  footerLine: "The repository lists every requirement with its tests and its evidence, and marks what is not built.",
};

export const INVESTIGATE_COPY = {
  startScreen: {
    h1: "Give it a PayPal order ID.",
    lead: "It reads that order from PayPal and the matching order from WooCommerce, shows what each system says, says whether it can link them and where they disagree (or that it cannot tell), and lists which next steps are safe and which are forbidden. It changes nothing in either system.",
    fieldLabel: "PayPal order ID",
    fieldHelper: "Letters and digits, 10 to 30 characters. The server checks the format.",
    button: "Investigate",
    helpTitle: "Where do I find the ID?",
    helpBody: "In the PayPal transaction details, or on the WooCommerce order page when the store holds it. Some stuck orders do not have it in the store. Then you need PayPal's copy.",
    casesTitle: "Or open a recorded case",
    casesIntro: "Recorded cases come from a real sandbox store. Injected cases were written by us and are labelled.",
    noteBelowForm: "Typed order IDs are looked up in recorded and injected data only in this build.",
  },
  verdictHeadlines: {
    ok: "Both systems agree: completed and paid",
    not_approved: "PayPal shows the order as not yet approved",
    approved_not_captured: "Approved on PayPal, no capture recorded",
    approved_not_captured_locally_cancelled: "Approved on PayPal, no capture recorded, store order cancelled",
    captured_local_unpaid: "Captured on PayPal, store order not marked paid",
    captured_local_cancelled: "Captured on PayPal, store order cancelled",
    capture_pending: "PayPal lists the capture as pending",
    capture_declined: "The capture did not succeed on PayPal",
    multiple_captures: "More than one capture on this order",
    amount_mismatch: "Captured amount or currency differs from the store total",
    unknown: "Not enough evidence to diagnose this order",
  } as Record<string, string>,
  decisionStatusLabels: {
    rule_matched: "A rule matched",
    abstain: "The tool abstained",
  } as Record<string, string>,
  identityReasonMap: {
    store_has_no_paypal_order_id: "The store order does not hold a PayPal order ID.",
    ids_disagree: "The two orders do not name each other.",
    plugin_version_not_recorded: "The plugin version is not one we have recorded, so we do not interpret its fields.",
    paypal_custom_id_missing: "The PayPal order has no usable store order number.",
  } as Record<string, string>,
  errorCopyMap: {
    invalid_order_id: {
      headline: "That does not look like a PayPal order ID",
      body: "Check the ID and try again.",
    },
    invalid_body: {
      headline: "The request could not be used",
      body: "Check what you entered and try again.",
    },
    unknown_case: {
      headline: "That case is not available",
      body: "Choose a case from the list.",
    },
    mode_not_enabled: {
      headline: "This mode is not available here",
      body: "This build reads recorded and injected cases only.",
    },
    paypal_order_not_found: {
      headline: "PayPal says there is no such order",
      body: "PayPal answered that it has no order with this ID. Check the ID and whether you meant the sandbox.",
    },
    store_order_not_found: {
      headline: "The store says there is no such order",
      body: "The store answered that it has no order with this number. Check the number.",
    },
    investigation_not_found: {
      headline: "That record is not available",
      body: "Investigations are held in memory and are lost when the server restarts.",
    },
    evidence_not_found: {
      headline: "That evidence item is not available",
      body: "It may belong to a record that is no longer held.",
    },
    rate_limited: {
      headline: "Too many requests",
      body: "Wait a moment and try again.",
    },
    upstream_unreachable: {
      headline: "We could not reach {system}",
      body: "The read did not complete.",
    },
    upstream_auth_rejected: {
      headline: "The credential for {system} was rejected",
      body: "Nothing was retried. This is a setup matter for whoever runs the server. It is not something to fix on this page.",
    },
    upstream_bad_response: {
      headline: "{system} answered in a way we could not use",
      body: "The read did not complete.",
    },
    deadline_exceeded: {
      headline: "The read took longer than 30 seconds",
      body: "It is not known which system was slow.",
    },
    internal_error: {
      headline: "Something went wrong on the server",
      body: "The read did not complete.",
    },
  } as Record<string, { headline: string; body: string }>,
  errorPanelNote: "No result was produced. The tool shows no verdict when it cannot read both systems.",
  loading: {
    statusText: "Reading both systems.",
    cancelButton: "Stop waiting",
    cancelHelper: "The server may still finish and keep a record.",
  },
  injectedBand: "INJECTED · not a real merchant incident",
  systemsHeader: "What each system says",
  systemsSubhead: "Times are when we observed each system, not when anything happened.",
  explanationHeader: "Explanation",
  explanationTagTemplate: "Standard explanation (fixed template)",
  explanationTagAi: "AI-rephrased from the evidence",
  explanationAiNote: "It was checked against the evidence. That check does not prove the text is true.",
  explanationAiRejected: "The AI text did not pass the check, so the standard explanation is shown.",
  evidenceHeader: "Evidence",
  limitsHeader: "What this result does not tell you",
  integrityHeader: "Integrity",
  rawJsonToggle: "Show raw response",
  hideRawJson: "Hide raw response",
  newInvestigation: "Start another investigation",
  suggestedStepsHeader: "Suggested next step (a person decides)",
  notAllowedHeader: "Not allowed here",
  actionsNote: "These are suggestions for a person. The tool does not do any of them.",
};

export const CASES_COPY = {
  header: {
    eyebrow: "Cases",
    h1: "Recorded and injected cases.",
    lead: "Every case available in this prototype. Recorded cases come from a real sandbox store; injected cases were written by us to test the rules.",
  },
  groupReplay: "Recorded real sandbox captures",
  groupInjected: "Injected cases (written by us)",
  descriptions: {
    "replay-order-13": "Both systems agree. A completed order from the S0-A recording.",
    "replay-order-17": "Both systems agree. A completed order from the S0-B recording.",
    "replay-order-20": "PayPal shows it approved with no capture recorded. The store does not hold the PayPal order ID.",
    "injected-captured-local-unpaid": "Written by us. PayPal shows a capture, the store still shows the order as pending.",
    "injected-amount-mismatch": "Written by us. A capture's amount differs from the store total.",
    "injected-multiple-captures": "Written by us. Two captures on one order.",
  } as Record<string, string>,
  runLink: "Run this case",
};

export const AUDIT_COPY = {
  h1: "Audit chain check",
  button: "Run the check",
  body: "This checks that the audit entries are consistent with each other. It does not show that the data was genuine, and it cannot detect someone who rewrites the whole file.",
  okLabel: "Chain consistent: yes",
  badLabel: "Chain inconsistent at index: ",
  entriesPrefix: "Entries checked: ",
};

export const DATA_COPY = {
  eyebrow: "Data and privacy",
  h1: "What is stored and what leaves your machine.",
  lead: "This is a prototype that uses sandbox data. This page says what it stores and what it sends.",
  sections: [
    {
      h2: "What this site collects",
      body: "Nothing about you. The site sets no cookies, runs no analytics and loads no third-party scripts, fonts or images. Your choice of light or dark theme is saved in your browser's local storage and nowhere else.",
    },
    {
      h2: "What the investigator stores",
      body: "Each investigation creates a record on the server that runs the API: the result you see, a line in an audit log and, if switched on, an evidence bundle file. These hold order statuses, amounts, currencies, order and capture identifiers and times. Buyer names, email addresses, postal addresses, notes and payment-method details are not stored. Removal of personal data is best effort and can miss fields that are not on its list.",
    },
    {
      h2: "Sandbox identifiers",
      body: "Recorded cases contain PayPal sandbox order IDs. They are not secrets.",
    },
    {
      h2: "AI explanations",
      body: "Off by default. If the operator switches them on, the statuses, amounts, identifiers and times in the engine's result are sent to the chosen model provider (Google or NVIDIA) so it can rephrase them. Buyer details are not sent.",
    },
    {
      h2: "How long it is kept",
      body: "Investigations are held in the server's memory and are lost when it restarts. Audit logs and bundle files stay on the server's disk until the operator deletes them. There is no automatic deletion.",
    },
    {
      h2: "Live data",
      body: "This build does not read live PayPal or store data.",
    },
    {
      h2: "Questions",
      body: "To ask about this prototype, use the contact details on its hackathon submission page.",
    },
  ],
  note: "This notice was written by the project author and has not been reviewed by a lawyer.",
};

export const TERMS_COPY = {
  eyebrow: "Prototype terms",
  h1: "Terms for using this prototype.",
  items: [
    {
      num: "1",
      title: "What this is",
      text: "A prototype built for the PayPal AI Hackathon. It works on sandbox data and recorded examples.",
    },
    {
      num: "2",
      title: "No reliance",
      text: "Do not use its output to decide anything about real payments or real customers. It is not financial, legal or accounting advice.",
    },
    {
      num: "3",
      title: "No warranty",
      text: "It is provided as it is, without warranty of any kind. It may be wrong or unavailable.",
    },
    {
      num: "4",
      title: "Independence",
      text: "It is not affiliated with, endorsed by or sponsored by PayPal, WooCommerce or any other company named here. Names are trademarks of their owners and appear only to say which systems the tool reads.",
    },
    {
      num: "5",
      title: "What you enter",
      text: "Order IDs you enter are handled as described on the Data and privacy page. Do not enter real customer information.",
    },
    {
      num: "6",
      title: "Changes",
      text: "These terms may change. They are a plain-language notice, and a lawyer has not checked them.",
    },
  ],
};

export const ABOUT_COPY = {
  eyebrow: "About",
  h1: "A one-person prototype.",
  body1:
    "Incident Investigator was built by one developer for the PayPal AI Hackathon. It started from a question: when a WooCommerce store and PayPal disagree about an order, how quickly can someone see what each system says and what is not known? We have not tested that question with any merchant.",
  body2:
    "The project keeps a written record of its requirements, tests and evidence in its repository, including what is not built.",
};
