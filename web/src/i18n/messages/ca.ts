import type { Messages } from "./es";

/** Català. */
export const ca: Messages = {
  meta: { title: "OrientaT · Assistent de tràmits", language: "Idioma" },
  brand: { descriptor: "Assistent de tràmits" },
  header: { extension: "L'extensió", installed: "Instal·lada en aquest navegador", lightMode: "Mode clar", darkMode: "Mode fosc" },
  hero: {
    title: "Quin tràmit has de fer?",
    subtitle: "Pregunta-ho amb les teves paraules. Et diem què és, què necessites i on fer-ho.",
  },
  extension: {
    eyebrow: "L'extensió",
    title: "D'aquí, a dins del web oficial.",
    intro:
      "Aquí descobreixes què has de fer. Amb un clic, l'extensió obre el web oficial i et guia per dins, pantalla a pantalla, sense fer res en nom teu.",
    steps: [
      {
        title: "Descobreix aquí quin tràmit és",
        text: "Pregunta en aquest web amb les teves paraules. Et diem quin tràmit és, què has de tenir a mà i com s'hi entra.",
      },
      {
        title: "Prem «Fer-ho amb l'extensió»",
        text: "S'obre el web oficial en una pestanya nova, amb l'assistent en un panell al costat.",
      },
      {
        title: "Et porta fins al tràmit",
        text: "Ja sap què vols fer: segueix enllaços, obre menús i pestanyes fins a arribar al formulari.",
      },
      {
        title: "T'assenyala on actuar",
        text: "Marca cada casella amb un requadre i et diu què hi has de posar. Tu escrius, signes i presentes.",
      },
    ],
    does: {
      title: "El que fa per tu",
      items: [
        "Seguir enllaços i obrir menús o pestanyes",
        "Portar-te a la pàgina exacta del tràmit",
        "Assenyalar-te cada camp i explicar-te què hi has de posar",
      ],
    },
    never: {
      title: "El que no fa mai",
      items: [
        "Escriure les teves dades o triar opcions",
        "Signar, pagar, desar o presentar",
        "Sortir dels webs oficials que coneix",
      ],
    },
    knows: {
      title: "El que ja sap fer",
      subtitle: "Prem-ne un: et diem què necessites i l'obres amb l'extensió.",
    },
    soon: "Aviat per a Chrome i Safari",
    mock: {
      field: "DNI / NIE",
      hint: "Escriu-ho tu",
      hintText: "El teu número de DNI, amb la lletra.",
      validity: "Data de validesa",
      panelTitle: "Assistent",
      user: "Vull veure el meu esborrany de la renda",
      bot: "T'he portat a **Renta WEB**. Per entrar, escriu el teu DNI al requadre groc.",
      botNext: "Quan el tinguis, prem tu «Continuar».",
      composer: "Escriu aquí…",
    },
  },
  footer: {
    disclaimer:
      "Servei no oficial, no afiliat al Govern d'Espanya. La informació és orientativa: consulta sempre la seu electrònica abans de presentar res.",
  },
  chat: {
    suggestions: ["Com funciona l'extensió", "Renovar el DNI", "Lloguer assequible", "Fer la renda"],
    placeholderEmpty: "Per exemple: m'he mudat i m'he d'empadronar",
    placeholder: "Escriu la teva pregunta…",
    footnote: "No s'envia res sense la teva confirmació",
    voice: {
      start: "Parlar amb l’assistent",
      stop: "Acabar la conversa de veu",
      connecting: "S’està connectant la veu…",
      connected: "Veu d’IA connectada. Ja pots parlar.",
      unavailable: "Aquest navegador no permet iniciar una conversa de veu.",
      permission: "Permet l’accés al micròfon per parlar amb l’assistent.",
      timeout: "La connexió de veu ha trigat massa. Torna-ho a provar.",
      connection: "No s’ha pogut iniciar la veu. Comprova el micròfon i torna-ho a provar.",
      response: "No s’ha pogut completar la resposta de veu.",
      disconnected: "S’ha tancat la connexió de veu.",
    },
    title: "Assistent de tràmits",
    reset: "Nova",
    reading: "Llegint la teva consulta…",
    send: "Envia",
    stop: "Atura",
    thinking: "Pensant…",
    thoughtFew: "Ha pensat uns segons",
    thoughtFor: (s) => `Ha pensat ${s} s`,
    sources: (n) => (n === 1 ? "1 font oficial" : `${n} fonts oficials`),
    askExtension: "Com funciona l'extensió?",
    askPlan: (titulo) => `Com faig «${titulo}» amb l'extensió?`,
    tool: {
      status: {
        "approval-requested": "Esperant aprovació",
        "approval-responded": "Respost",
        "input-available": "En curs",
        "input-streaming": "Pendent",
        "output-available": "Fet",
        "output-denied": "Denegat",
        "output-error": "Error",
      },
      params: "Paràmetres",
      result: "Resultat",
      error: "Error",
    },
  },
  tools: {
    buscar_tramite: { running: "Cercant al catàleg de tràmits…", done: "Catàleg de tràmits" },
    explicar_extension: { running: "Preparant la guia de l'extensió…", done: "Guia de l'extensió" },
    plan_extension: { running: "Llegint el mapa del tràmit…", done: "Mapa del tràmit a l'extensió" },
  },
  cards: {
    needs: (done, total) => `Què necessites · ${done}/${total}`,
    handoff: {
      title: "Continua al web oficial, amb l'extensió",
      opens: (host, mapped) =>
        `S'obre **${host}** en una pestanya nova amb l'assistent al costat. Ja sap què vols fer i t'hi porta${mapped ? "" : ", llegint la pàgina"}.`,
      cta: "Fer-ho amb l'extensió",
      install: "Instal·la l'extensió per continuar · Aviat",
      openOnly: "Només obrir el web",
      okPanel: (host) => `Fet: s'ha obert ${host} amb l'assistent. Continua allà.`,
      okNoPanel: (host) =>
        `S'ha obert ${host}. Prem la icona de l'Assistent de tràmits a la barra del navegador (porta un 1) i comença tu.`,
      errUrl: "L'extensió no pot obrir aquest web: no és un web oficial que conegui.",
      errOther: "L'extensió no ha respost. Recarrega aquesta pàgina i torna-ho a provar.",
      alreadyOpen: "Ja tens el web obert? Obre el panell i escriu-li",
      copied: "Copiat",
    },
    lanes: { tu: "Tu", extension: "Extensió", web: "Aquest web" },
    journey: [
      {
        title: "Aquí descobreixes quin tràmit és",
        lanes: [
          ["tu", "Expliques què necessites, amb les teves paraules."],
          ["web", "Et diu quin tràmit és, qui el gestiona, què has de tenir a mà i com s'hi entra."],
        ],
      },
      {
        title: "Prems «Fer-ho amb l'extensió»",
        lanes: [
          ["tu", "Un clic."],
          ["extension", "Obre el web oficial en una pestanya nova, amb el seu panell al costat, i ja sap què vols fer."],
        ],
      },
      {
        title: "Et porta fins al tràmit",
        lanes: [
          ["tu", "Res: mires com avança."],
          ["extension", "Segueix enllaços i obre menús i pestanyes fins al formulari. Només en webs oficials."],
        ],
      },
      {
        title: "Omples el formulari",
        lanes: [
          ["tu", "Escrius les teves dades i tries les opcions."],
          ["extension", "Envolta cada camp amb un requadre groc i et diu què hi has de posar. No escriu res per tu."],
        ],
      },
      {
        title: "Acabes tu",
        lanes: [
          ["tu", "Revises, signes, pagues o presentes, i deses el justificant."],
          ["extension", "T'assenyala el botó final i et recorda que revisis. No el prem mai."],
        ],
      },
    ],
    guide: {
      eyebrow: "D'aquest web al web oficial",
      installed: "✓ Tens l'extensió instal·lada en aquest navegador.",
      needInstall: "Necessites l'extensió instal·lada (aviat per a Chrome i Safari).",
      knows: "Ja et sap guiar en aquests tràmits",
    },
    plan: {
      eyebrow: (sitio) => `${sitio} · l'extensió en té el mapa`,
      access: "Com s'hi entra",
      have: "Tingues a mà",
      whatHappens: "Què passarà al web oficial",
      draft: "Mapa en revisió: si el web ha canviat, l'extensió es guia pel que vegi a la pantalla.",
      or: " o ",
    },
  },
  extensionPlan: {
    stepPerson: "Et porta a aquesta pantalla, t'explica què és cada cosa i assenyala amb un requadre on has d'actuar.",
    stepAuto: "Ho fa per tu: navega fins a la informació, la llegeix i te l'explica.",
    login: {
      clave: "Cl@ve",
      clave_pin: "Cl@ve PIN",
      clave_permanente: "Cl@ve permanent",
      certificado: "certificat digital",
      dnie: "DNIe",
      referencia: "número de referència",
      sms: "SMS",
      sin_identificacion: "sense identificar-te",
    },
  },
  replies: {
    planReasoning: (sitio, tramite, pasos) =>
      `L'extensió té el mapa de ${sitio}: «${tramite}», ${pasos} passos. Preparo què fa ella i què fas tu en cada un.`,
    planText:
      "Això **ho pots fer amb l'extensió**, i té el mapa d'aquest web. A dalt tens què has de tenir a mà, com s'hi entra i què passarà a cada pas.\n\n" +
      "Quan estiguis a punt, prem **Fer-ho amb l'extensió**: s'obre el web oficial amb l'assistent al costat i et porta fins al tràmit.",
    planSource: (sitio) => `${sitio} · pàgina d'inici del tràmit`,
    extensionReasoning:
      "Explico l'extensió pas a pas, separant el que fas tu del que fa ella, i llisto els tràmits que ja coneix.",
    extension:
      "En resum: **aquí descobreixes quin tràmit és; l'extensió et porta dins del web oficial.** Allà navega per tu, t'explica cada pantalla i t'assenyala on actuar, però mai no escriu per tu ni prem enviar, signar o pagar.\n\n" +
      "Prem qualsevol dels tràmits de la llista i et preparo el camí.",
    estado:
      "Per veure l'estat dels **teus** expedients t'has d'identificar a **Carpeta Ciutadana** amb Cl@ve, certificat digital o DNIe: hi apareixen els tràmits oberts amb l'Administració General de l'Estat i les seves notificacions.\n\n" +
      "Si em dius quin tràmit és, t'explico en quina fase sol estar i quant triga.",
    estadoSource: "Carpeta Ciutadana",
    tramiteReasoning: (titulo, organismo) =>
      `La consulta encaixa amb «${titulo}» (${organismo}). Reviso requisits, cost i canal de presentació.`,
    tramiteText: (f) =>
      `**${f.titulo}** es gestiona amb ${f.organismo}. ${f.resumen}\n\n` +
      `Necessitaràs ${f.requisitos.length} coses; te les deixo a dalt com a llista. ` +
      "Quan les tinguis, prem **Fer-ho amb l'extensió**: obre el web oficial amb l'assistent al costat. Encara no té el mapa d'aquest web, així que es guiarà llegint cada pàgina.",
    tramiteSource: (organismo) => `${organismo} · fitxa oficial`,
    fallback:
      "Puc ajudar-te a **trobar el tràmit** que necessites i dir-te **què has de tenir a mà**. Després l'extensió et porta **dins del web oficial**, pas a pas.\n\n" +
      "Explica'm què vols fer, per exemple: *«Renovar el DNI»*, *«Necessito el NIE»* o *«Com faig la renda?»*.",
  },
  tramites: {
    nie: {
      titulo: "Assignació de NIE",
      organismo: "Policia Nacional · Estrangeria",
      resumen:
        "Número d'Identitat d'Estranger, necessari per treballar, obrir un compte o signar un contracte a Espanya.",
      requisitos: [
        "Formulari EX-15 emplenat",
        "Passaport o document d'identitat i còpia",
        "Justificant del motiu (oferta de feina, matrícula, compravenda…)",
        "Justificant del pagament de la taxa 790 codi 012",
      ],
      duracion: "El mateix dia de la cita, a la majoria d'oficines",
      coste: "Taxa 790-012 (consulta l'import vigent)",
    },
    padron: {
      titulo: "Alta al padró municipal",
      organismo: "Ajuntament",
      resumen: "Inscripció al municipi on vius. Dona accés a la sanitat, l'escolarització i altres serveis.",
      requisitos: [
        "Document d'identitat (DNI, NIE o passaport)",
        "Contracte de lloguer, escriptura o autorització del titular",
        "Formulari d'inscripció de l'ajuntament",
      ],
      duracion: "Immediat a la cita; certificat en 1–7 dies",
      coste: "Gratuït",
    },
    renta: {
      titulo: "Declaració de la renda (IRPF)",
      organismo: "Agència Tributària",
      resumen:
        "Presentació anual de l'IRPF. L'esborrany es revisa i es presenta a Renta WEB amb Cl@ve, certificat o número de referència.",
      requisitos: [
        "Cl@ve, certificat digital o número de referència",
        "Dades fiscals de l'exercici",
        "IBAN per a la devolució o la domiciliació",
      ],
      duracion: "Campanya d'abril a juny",
      coste: "Gratuït",
    },
    paro: {
      titulo: "Prestació per desocupació",
      organismo: "SEPE",
      resumen:
        "Sol·licitud de la prestació contributiva després de la fi d'una relació laboral. Hi ha 15 dies hàbils per demanar-la.",
      requisitos: [
        "Inscripció com a demandant d'ocupació",
        "Certificat d'empresa (l'envia l'empresa al SEPE)",
        "Document d'identitat i número de compte",
      ],
      duracion: "Resolució en uns 15 dies hàbils",
      coste: "Gratuït",
    },
    certificado: {
      titulo: "Certificat digital de persona física",
      organismo: "FNMT-RCM",
      resumen:
        "Signatura electrònica per fer gairebé qualsevol tràmit en línia. Se sol·licita en línia i s'acredita la identitat en una oficina o per vídeo.",
      requisitos: [
        "DNI o NIE",
        "Navegador compatible per a la descàrrega",
        "Acreditació de la identitat (presencial o videoidentificació)",
      ],
      duracion: "Descàrrega després d'acreditar la identitat",
      coste: "Gratuït (presencial)",
    },
    clave: {
      titulo: "Registre a Cl@ve",
      organismo: "Govern d'Espanya",
      resumen: "Sistema d'identificació amb usuari i PIN o app per a l'Administració electrònica.",
      requisitos: ["DNI o NIE", "Telèfon mòbil", "Carta d'invitació, videotrucada o registre presencial"],
      duracion: "Immediat per videotrucada",
      coste: "Gratuït",
    },
    "vida-laboral": {
      titulo: "Informe de vida laboral",
      organismo: "Seguretat Social · Import@ss",
      resumen: "Historial d'altes i baixes a la Seguretat Social. Es descarrega a l'instant a Import@ss.",
      requisitos: ["Cl@ve, certificat digital o SMS al mòbil registrat"],
      duracion: "Immediat",
      coste: "Gratuït",
    },
    carnet: {
      titulo: "Renovació del permís de conduir",
      organismo: "DGT",
      resumen: "Renovació per caducitat. Es pot fer en un centre de reconeixement que la tramiti.",
      requisitos: ["Informe d'aptitud psicofísica", "Fotografia recent", "Pagament de la taxa"],
      duracion: "Permís provisional al moment",
      coste: "Taxa DGT 4.1 (consulta l'import vigent)",
    },
  },
};
