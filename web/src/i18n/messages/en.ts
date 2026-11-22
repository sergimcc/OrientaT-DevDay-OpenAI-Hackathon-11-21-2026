import type { Messages } from "./es";

/** English. */
export const en: Messages = {
  meta: { title: "OrientaT · Procedures assistant", language: "Language" },
  brand: { descriptor: "Procedures assistant" },
  header: { extension: "The extension", installed: "Installed in this browser", lightMode: "Light mode", darkMode: "Dark mode" },
  hero: {
    title: "Which procedure do you need to do?",
    subtitle: "Ask in your own words. We'll tell you what it is, what you need and where to do it.",
  },
  extension: {
    eyebrow: "The extension",
    title: "From here, into the official website.",
    intro:
      "Here you find out what you need to do. With one click, the extension opens the official website and guides you through it, screen by screen, without doing anything on your behalf.",
    steps: [
      {
        title: "Find out here which procedure it is",
        text: "Ask on this website in your own words. We'll tell you which procedure it is, what to have ready and how to sign in.",
      },
      {
        title: "Press “Do it with the extension”",
        text: "The official website opens in a new tab, with the assistant in a side panel.",
      },
      {
        title: "It takes you to the procedure",
        text: "It already knows what you want to do: it follows links and opens menus and tabs until it reaches the form.",
      },
      {
        title: "It shows you where to act",
        text: "It marks each field with a box and tells you what to enter. You type, sign and submit.",
      },
    ],
    does: {
      title: "What it does for you",
      items: [
        "Follow links and open menus or tabs",
        "Take you to the exact page for the procedure",
        "Point out each field and explain what to enter",
      ],
    },
    never: {
      title: "What it never does",
      items: [
        "Type your details or choose options",
        "Sign, pay, save or submit",
        "Leave the official websites it knows",
      ],
    },
    knows: {
      title: "What it can already do",
      subtitle: "Pick one: we'll tell you what you need, and you open it with the extension.",
    },
    soon: "Coming soon for Chrome and Safari",
    mock: {
      field: "DNI / NIE",
      hint: "You type",
      hintText: "Your DNI number, with the letter.",
      validity: "Expiry date",
      panelTitle: "Assistant",
      user: "I want to see my tax return draft",
      bot: "I've taken you to **Renta WEB**. To sign in, type your DNI in the yellow box.",
      botNext: "Once it's in, press “Continuar” yourself.",
      composer: "Type here…",
    },
  },
  footer: {
    disclaimer:
      "Unofficial service, not affiliated with the Government of Spain. The information is for guidance only: always check the official e-government site before submitting anything.",
  },
  chat: {
    suggestions: ["How the extension works", "Renew my DNI", "Affordable rent", "File my tax return"],
    placeholderEmpty: "For example: I've moved house and need to register at the town hall",
    placeholder: "Type your question…",
    footnote: "Nothing is sent without your confirmation",
    voice: {
      start: "Talk to the assistant",
      stop: "End voice conversation",
      connecting: "Connecting voice…",
      connected: "AI voice connected. You can speak.",
      unavailable: "This browser cannot start a voice conversation.",
      permission: "Allow microphone access to talk to the assistant.",
      timeout: "The voice connection timed out. Try again.",
      connection: "Could not start voice. Check your microphone and try again.",
      response: "Could not complete the voice reply.",
      disconnected: "The voice connection closed.",
    },
    title: "Procedures assistant",
    reset: "New",
    reading: "Reading your question…",
    send: "Send",
    stop: "Stop",
    thinking: "Thinking…",
    thoughtFew: "Thought for a few seconds",
    thoughtFor: (s) => `Thought for ${s} s`,
    sources: (n) => (n === 1 ? "1 official source" : `${n} official sources`),
    askExtension: "How does the extension work?",
    askPlan: (titulo) => `How do I do “${titulo}” with the extension?`,
    tool: {
      status: {
        "approval-requested": "Awaiting approval",
        "approval-responded": "Responded",
        "input-available": "Running",
        "input-streaming": "Pending",
        "output-available": "Done",
        "output-denied": "Denied",
        "output-error": "Error",
      },
      params: "Parameters",
      result: "Result",
      error: "Error",
    },
  },
  tools: {
    buscar_tramite: { running: "Searching the procedures catalogue…", done: "Procedures catalogue" },
    explicar_extension: { running: "Preparing the extension guide…", done: "Extension guide" },
    plan_extension: { running: "Reading the procedure map…", done: "Procedure map in the extension" },
  },
  cards: {
    needs: (done, total) => `What you need · ${done}/${total}`,
    handoff: {
      title: "Continue on the official website, with the extension",
      opens: (host, mapped) =>
        `**${host}** opens in a new tab with the assistant alongside. It already knows what you want to do and takes you there${mapped ? "" : ", reading the page"}.`,
      cta: "Do it with the extension",
      install: "Install the extension to continue · Coming soon",
      openOnly: "Just open the website",
      okPanel: (host) => `Done: ${host} is open with the assistant. Carry on there.`,
      okNoPanel: (host) =>
        `${host} is open. Click the Procedures assistant icon in the browser toolbar (it shows a 1) and it starts on its own.`,
      errUrl: "The extension can't open this website: it isn't an official site it knows.",
      errOther: "The extension didn't respond. Reload this page and try again.",
      alreadyOpen: "Already have the website open? Open the panel and type",
      copied: "Copied",
    },
    lanes: { tu: "You", extension: "Extension", web: "This site" },
    journey: [
      {
        title: "Here you find out which procedure it is",
        lanes: [
          ["tu", "You say what you need, in your own words."],
          ["web", "It tells you which procedure it is, who handles it, what to have ready and how to sign in."],
        ],
      },
      {
        title: "You press “Do it with the extension”",
        lanes: [
          ["tu", "One click."],
          ["extension", "It opens the official website in a new tab, with its panel alongside, already knowing what you want to do."],
        ],
      },
      {
        title: "It takes you to the procedure",
        lanes: [
          ["tu", "Nothing: you watch it move along."],
          ["extension", "It follows links and opens menus and tabs up to the form. Only on official websites."],
        ],
      },
      {
        title: "You fill in the form",
        lanes: [
          ["tu", "You type your details and choose the options."],
          ["extension", "It draws a yellow box around each field and tells you what to enter. It never types for you."],
        ],
      },
      {
        title: "You finish",
        lanes: [
          ["tu", "You review, sign, pay or submit, and keep the receipt."],
          ["extension", "It points out the final button and reminds you to review. It never presses it."],
        ],
      },
    ],
    guide: {
      eyebrow: "From this site to the official website",
      installed: "✓ The extension is installed in this browser.",
      needInstall: "You need the extension installed (coming soon for Chrome and Safari).",
      knows: "It can already guide you through these",
    },
    plan: {
      eyebrow: (sitio) => `${sitio} · the extension has its map`,
      access: "How to sign in",
      have: "Have ready",
      whatHappens: "What will happen on the official website",
      draft: "Map under review: if the website has changed, the extension goes by what it sees on screen.",
      or: " or ",
    },
  },
  extensionPlan: {
    stepPerson: "It takes you to this screen, explains what everything is and marks where to act with a box.",
    stepAuto: "It does this for you: it navigates to the information, reads it and explains it.",
    login: {
      clave: "Cl@ve",
      clave_pin: "Cl@ve PIN",
      clave_permanente: "permanent Cl@ve",
      certificado: "digital certificate",
      dnie: "electronic DNI",
      referencia: "reference number",
      sms: "SMS",
      sin_identificacion: "no sign-in needed",
    },
  },
  replies: {
    planReasoning: (sitio, tramite, pasos) =>
      `The extension has a map of ${sitio}: “${tramite}”, ${pasos} steps. Working out what it does and what you do at each one.`,
    planText:
      "**You can do this with the extension**, and it has a map of this website. Above you'll find what to have ready, how to sign in and what will happen at each step.\n\n" +
      "When you're ready, press **Do it with the extension**: the official website opens with the assistant alongside and it takes you to the procedure.",
    planSource: (sitio) => `${sitio} · procedure start page`,
    extensionReasoning:
      "Explaining the extension step by step, separating what you do from what it does, and listing the procedures it already knows.",
    extension:
      "In short: **here you find out which procedure it is; the extension takes you inside the official website.** There it navigates for you, explains each screen and shows you where to act, but it never types for you or presses send, sign or pay.\n\n" +
      "Pick any procedure from the list and I'll set up the way.",
    estado:
      "To see the status of **your** cases you need to sign in to **Carpeta Ciudadana** with Cl@ve, a digital certificate or your electronic DNI: it lists your open procedures with the central government and their notifications.\n\n" +
      "If you tell me which procedure it is, I'll explain what stage it's usually at and how long it takes.",
    estadoSource: "Carpeta Ciudadana",
    tramiteReasoning: (titulo, organismo) =>
      `The question matches “${titulo}” (${organismo}). Checking requirements, cost and how to apply.`,
    tramiteText: (f) =>
      `**${f.titulo}** is handled by ${f.organismo}. ${f.resumen}\n\n` +
      `You'll need ${f.requisitos.length} things; I've listed them above. ` +
      "Once you have them, press **Do it with the extension**: it opens the official website with the assistant alongside. It doesn't have a map of this site yet, so it will guide you by reading each page.",
    tramiteSource: (organismo) => `${organismo} · official page`,
    fallback:
      "I can help you **find the procedure** you need and tell you **what to have ready**. Then the extension takes you **inside the official website**, step by step.\n\n" +
      "Tell me what you want to do, for example: *“Renew my DNI”*, *“I need an NIE”* or *“How do I file my tax return?”*.",
  },
  tramites: {
    nie: {
      titulo: "NIE assignment",
      organismo: "National Police · Immigration",
      resumen: "Foreigner Identity Number, needed to work, open a bank account or sign a contract in Spain.",
      requisitos: [
        "Completed EX-15 form",
        "Passport or ID document, plus a copy",
        "Proof of the reason (job offer, enrolment, property purchase…)",
        "Proof of payment of fee 790, code 012",
      ],
      duracion: "On the day of the appointment, at most offices",
      coste: "Fee 790-012 (check the current amount)",
    },
    padron: {
      titulo: "Registering on the municipal census (padrón)",
      organismo: "Town hall",
      resumen: "Registration in the municipality where you live. It gives access to healthcare, schooling and other services.",
      requisitos: [
        "ID document (DNI, NIE or passport)",
        "Rental contract, title deed or the owner's authorisation",
        "The town hall's registration form",
      ],
      duracion: "Immediate at the appointment; certificate in 1–7 days",
      coste: "Free",
    },
    renta: {
      titulo: "Income tax return (IRPF)",
      organismo: "Tax Agency",
      resumen:
        "Annual IRPF filing. The draft is reviewed and filed in Renta WEB with Cl@ve, a certificate or a reference number.",
      requisitos: [
        "Cl@ve, digital certificate or reference number",
        "Tax data for the year",
        "IBAN for the refund or direct debit",
      ],
      duracion: "Campaign from April to June",
      coste: "Free",
    },
    paro: {
      titulo: "Unemployment benefit",
      organismo: "SEPE",
      resumen: "Application for contributory benefit after a job ends. You have 15 working days to apply.",
      requisitos: [
        "Registration as a jobseeker",
        "Company certificate (the employer sends it to SEPE)",
        "ID document and bank account number",
      ],
      duracion: "Decision in about 15 working days",
      coste: "Free",
    },
    certificado: {
      titulo: "Digital certificate for individuals",
      organismo: "FNMT-RCM",
      resumen:
        "An electronic signature for doing almost any procedure online. You apply online and verify your identity at an office or by video.",
      requisitos: [
        "DNI or NIE",
        "A compatible browser for the download",
        "Identity verification (in person or by video)",
      ],
      duracion: "Download after verifying your identity",
      coste: "Free (in person)",
    },
    clave: {
      titulo: "Registering for Cl@ve",
      organismo: "Government of Spain",
      resumen: "Identification system for e-government, with a username and PIN or an app.",
      requisitos: ["DNI or NIE", "Mobile phone", "Invitation letter, video call or in-person registration"],
      duracion: "Immediate by video call",
      coste: "Free",
    },
    "vida-laboral": {
      titulo: "Employment history report (vida laboral)",
      organismo: "Social Security · Import@ss",
      resumen: "Record of your registrations and terminations with Social Security. Downloaded instantly from Import@ss.",
      requisitos: ["Cl@ve, digital certificate or SMS to your registered mobile"],
      duracion: "Immediate",
      coste: "Free",
    },
    carnet: {
      titulo: "Driving licence renewal",
      organismo: "DGT",
      resumen: "Renewal on expiry. It can be done at a medical test centre that handles the paperwork.",
      requisitos: ["Fitness-to-drive medical report", "Recent photo", "Payment of the fee"],
      duracion: "Temporary licence on the spot",
      coste: "DGT fee 4.1 (check the current amount)",
    },
  },
};
