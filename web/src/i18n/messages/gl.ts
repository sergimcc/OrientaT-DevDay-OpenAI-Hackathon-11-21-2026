import type { Messages } from "./es";

/** Galego. */
export const gl: Messages = {
  meta: { title: "OrientaT · Asistente de trámites", language: "Idioma" },
  brand: { descriptor: "Asistente de trámites" },
  header: { extension: "A extensión", installed: "Instalada neste navegador", lightMode: "Modo claro", darkMode: "Modo escuro" },
  hero: {
    title: "Que trámite tes que facer?",
    subtitle: "Pregúntao coas túas palabras. Dicímosche que é, que necesitas e onde facelo.",
  },
  extension: {
    eyebrow: "A extensión",
    title: "De aquí, a dentro da web oficial.",
    intro:
      "Aquí descobres que tes que facer. Cun clic, a extensión abre a web oficial e guíate dentro dela, pantalla a pantalla, sen facer nada no teu nome.",
    steps: [
      {
        title: "Descobre aquí que trámite é",
        text: "Pregunta nesta web coas túas palabras. Dicímosche que trámite é, que ter á man e como se entra.",
      },
      {
        title: "Preme «Facelo coa extensión»",
        text: "Ábrese a web oficial nunha lapela nova, co asistente nun panel ao lado.",
      },
      {
        title: "Lévate ata o trámite",
        text: "Xa sabe que queres facer: segue ligazóns, abre menús e lapelas ata chegar ao formulario.",
      },
      {
        title: "Indícache onde actuar",
        text: "Marca cada campo cun recadro e dite que poñer. Ti escribes, asinas e presentas.",
      },
    ],
    does: {
      title: "O que fai por ti",
      items: [
        "Seguir ligazóns e abrir menús ou lapelas",
        "Levarte á páxina exacta do trámite",
        "Indicarche cada campo e explicarche que poñer",
      ],
    },
    never: {
      title: "O que nunca fai",
      items: [
        "Escribir os teus datos ou escoller opcións",
        "Asinar, pagar, gardar ou presentar",
        "Saír das webs oficiais que coñece",
      ],
    },
    knows: {
      title: "O que xa sabe facer",
      subtitle: "Preme nun: dicímosche que necesitas e ábreso coa extensión.",
    },
    soon: "Proximamente para Chrome e Safari",
    mock: {
      field: "DNI / NIE",
      hint: "Escríbeo ti",
      hintText: "O teu número de DNI, coa letra.",
      validity: "Data de validez",
      panelTitle: "Asistente",
      user: "Quero ver o meu borrador da renda",
      bot: "Leveite a **Renta WEB**. Para entrar, escribe o teu DNI no recadro amarelo.",
      botNext: "Cando o teñas, preme ti «Continuar».",
      composer: "Escribe aquí…",
    },
  },
  footer: {
    disclaimer:
      "Servizo non oficial, non afiliado ao Goberno de España. A información é orientativa: consulta sempre a sede electrónica antes de presentar.",
  },
  chat: {
    suggestions: ["Como funciona a extensión", "Renovar o DNI", "Aluguer asequible", "Facer a renda"],
    placeholderEmpty: "Por exemplo: mudeime e teño que empadroarme",
    placeholder: "Escribe a túa pregunta…",
    footnote: "Non se envía nada sen a túa confirmación",
    voice: {
      start: "Falar co asistente",
      stop: "Rematar a conversa de voz",
      connecting: "Conectando a voz…",
      connected: "Voz de IA conectada. Xa podes falar.",
      unavailable: "Este navegador non permite iniciar unha conversa de voz.",
      permission: "Permite o acceso ao micrófono para falar co asistente.",
      timeout: "A conexión de voz tardou demasiado. Téntao de novo.",
      connection: "Non se puido iniciar a voz. Comproba o micrófono e téntao de novo.",
      response: "Non se puido completar a resposta de voz.",
      disconnected: "Pechouse a conexión de voz.",
    },
    title: "Asistente de trámites",
    reset: "Nova",
    reading: "Lendo a túa consulta…",
    send: "Enviar",
    stop: "Deter",
    thinking: "Pensando…",
    thoughtFew: "Pensou uns segundos",
    thoughtFor: (s) => `Pensou ${s} s`,
    sources: (n) => (n === 1 ? "1 fonte oficial" : `${n} fontes oficiais`),
    askExtension: "Como funciona a extensión?",
    askPlan: (titulo) => `Como fago «${titulo}» coa extensión?`,
    tool: {
      status: {
        "approval-requested": "Agardando aprobación",
        "approval-responded": "Respondido",
        "input-available": "En curso",
        "input-streaming": "Pendente",
        "output-available": "Feito",
        "output-denied": "Denegado",
        "output-error": "Erro",
      },
      params: "Parámetros",
      result: "Resultado",
      error: "Erro",
    },
  },
  tools: {
    buscar_tramite: { running: "Buscando no catálogo de trámites…", done: "Catálogo de trámites" },
    explicar_extension: { running: "Preparando a guía da extensión…", done: "Guía da extensión" },
    plan_extension: { running: "Lendo o mapa do trámite…", done: "Mapa do trámite na extensión" },
  },
  cards: {
    needs: (done, total) => `Que necesitas · ${done}/${total}`,
    handoff: {
      title: "Segue na web oficial, coa extensión",
      opens: (host, mapped) =>
        `Ábrese **${host}** nunha lapela nova co asistente ao lado. Xa sabe que queres facer e lévate ata iso${mapped ? "" : ", lendo a páxina"}.`,
      cta: "Facelo coa extensión",
      install: "Instala a extensión para continuar · Proximamente",
      openOnly: "Só abrir a web",
      okPanel: (host) => `Listo: abriuse ${host} co asistente. Segue alí.`,
      okNoPanel: (host) =>
        `Abriuse ${host}. Preme a icona do Asistente de trámites na barra do navegador (leva un 1) e comeza ti.`,
      errUrl: "A extensión non pode abrir esta web: non é unha web oficial que coñeza.",
      errOther: "A extensión non respondeu. Recarga esta páxina e volve tentalo.",
      alreadyOpen: "Xa tes a web aberta? Abre o panel e escríbelle",
      copied: "Copiado",
    },
    lanes: { tu: "Ti", extension: "Extensión", web: "Esta web" },
    journey: [
      {
        title: "Aquí descobres que trámite é",
        lanes: [
          ["tu", "Contas que necesitas, coas túas palabras."],
          ["web", "Dite que trámite é, quen o xestiona, que ter á man e como se entra."],
        ],
      },
      {
        title: "Premes «Facelo coa extensión»",
        lanes: [
          ["tu", "Un clic."],
          ["extension", "Abre a web oficial nunha lapela nova, co seu panel ao lado, e xa sabe que queres facer."],
        ],
      },
      {
        title: "Lévate ata o trámite",
        lanes: [
          ["tu", "Nada: miras como avanza."],
          ["extension", "Segue ligazóns e abre menús e lapelas ata o formulario. Só en webs oficiais."],
        ],
      },
      {
        title: "Enches o formulario",
        lanes: [
          ["tu", "Escribes os teus datos e escolles as opcións."],
          ["extension", "Rodea cada campo cun recadro amarelo e dite que poñer. Non escribe nada por ti."],
        ],
      },
      {
        title: "Remates ti",
        lanes: [
          ["tu", "Revisas, asinas, pagas ou presentas, e gardas o xustificante."],
          ["extension", "Indícache o botón final e lémbrache revisar. Nunca o preme."],
        ],
      },
    ],
    guide: {
      eyebrow: "Desta web á web oficial",
      installed: "✓ Tes a extensión instalada neste navegador.",
      needInstall: "Necesitas a extensión instalada (proximamente para Chrome e Safari).",
      knows: "Xa sabe guiarte nestes trámites",
    },
    plan: {
      eyebrow: (sitio) => `${sitio} · a extensión ten o seu mapa`,
      access: "Como se entra",
      have: "Ten á man",
      whatHappens: "Que pasará na web oficial",
      draft: "Mapa en revisión: se a web cambiou, a extensión guíase polo que vexa na pantalla.",
      or: " ou ",
    },
  },
  extensionPlan: {
    stepPerson: "Lévate a esta pantalla, explícache que é cada cousa e sinala cun recadro onde actuar.",
    stepAuto: "Faino por ti: navega ata a información, léa e explícacha.",
    login: {
      clave: "Cl@ve",
      clave_pin: "Cl@ve PIN",
      clave_permanente: "Cl@ve permanente",
      certificado: "certificado dixital",
      dnie: "DNIe",
      referencia: "número de referencia",
      sms: "SMS",
      sin_identificacion: "sen identificarte",
    },
  },
  replies: {
    planReasoning: (sitio, tramite, pasos) =>
      `A extensión ten o mapa de ${sitio}: «${tramite}», ${pasos} pasos. Preparo que fai ela e que fas ti en cada un.`,
    planText:
      "Isto **podes facelo coa extensión**, e ten o mapa desta web. Arriba tes que ter á man, como se entra e que pasará en cada paso.\n\n" +
      "Cando esteas listo, preme **Facelo coa extensión**: ábrese a web oficial co asistente ao lado e lévate ata o trámite.",
    planSource: (sitio) => `${sitio} · páxina de inicio do trámite`,
    extensionReasoning:
      "Explico a extensión paso a paso, separando o que fas ti do que fai ela, e listo os trámites que xa coñece.",
    extension:
      "En resumo: **aquí descobres que trámite é; a extensión lévate dentro da web oficial.** Alí navega por ti, explícache cada pantalla e indícache onde actuar, pero nunca escribe por ti nin preme enviar, asinar ou pagar.\n\n" +
      "Preme calquera dos trámites da lista e prepároche o camiño.",
    estado:
      "Para ver o estado dos **teus** expedientes tes que identificarte en **Carpeta Cidadá** con Cl@ve, certificado dixital ou DNIe: aí aparecen os trámites abertos coa Administración Xeral do Estado e as súas notificacións.\n\n" +
      "Se me dis que trámite é, explícoche en que fase adoita estar e canto tarda.",
    estadoSource: "Carpeta Cidadá",
    tramiteReasoning: (titulo, organismo) =>
      `A consulta encaixa con «${titulo}» (${organismo}). Reviso requisitos, custo e canle de presentación.`,
    tramiteText: (f) =>
      `**${f.titulo}** xestiónase con ${f.organismo}. ${f.resumen}\n\n` +
      `Necesitarás ${f.requisitos.length} cousas; déixochas arriba como lista. ` +
      "Cando as teñas, preme **Facelo coa extensión**: abre a web oficial co asistente ao lado. Aínda non ten o mapa desta web, así que se guiará lendo cada páxina.",
    tramiteSource: (organismo) => `${organismo} · ficha oficial`,
    fallback:
      "Podo axudarche a **atopar o trámite** que necesitas e dicirche **que ter á man**. Despois a extensión lévate **dentro da web oficial**, paso a paso.\n\n" +
      "Cóntame que queres facer, por exemplo: *«Renovar o DNI»*, *«Necesito o NIE»* ou *«Como fago a renda?»*.",
  },
  tramites: {
    nie: {
      titulo: "Asignación de NIE",
      organismo: "Policía Nacional · Estranxeiría",
      resumen:
        "Número de Identidade de Estranxeiro, necesario para traballar, abrir unha conta ou asinar un contrato en España.",
      requisitos: [
        "Formulario EX-15 cuberto",
        "Pasaporte ou documento de identidade e copia",
        "Xustificante do motivo (oferta de traballo, matrícula, compravenda…)",
        "Xustificante do pagamento da taxa 790 código 012",
      ],
      duracion: "No día da cita, na maioría das oficinas",
      coste: "Taxa 790-012 (consulta o importe vixente)",
    },
    padron: {
      titulo: "Alta no padrón municipal",
      organismo: "Concello",
      resumen: "Inscrición no municipio onde vives. Dá acceso á sanidade, á escolarización e a outros servizos.",
      requisitos: [
        "Documento de identidade (DNI, NIE ou pasaporte)",
        "Contrato de aluguer, escritura ou autorización do titular",
        "Formulario de inscrición do concello",
      ],
      duracion: "Inmediato na cita; certificado en 1–7 días",
      coste: "Gratuíto",
    },
    renta: {
      titulo: "Declaración da renda (IRPF)",
      organismo: "Axencia Tributaria",
      resumen:
        "Presentación anual do IRPF. O borrador revísase e preséntase en Renta WEB con Cl@ve, certificado ou número de referencia.",
      requisitos: [
        "Cl@ve, certificado dixital ou número de referencia",
        "Datos fiscais do exercicio",
        "IBAN para a devolución ou a domiciliación",
      ],
      duracion: "Campaña de abril a xuño",
      coste: "Gratuíto",
    },
    paro: {
      titulo: "Prestación por desemprego",
      organismo: "SEPE",
      resumen:
        "Solicitude da prestación contributiva tras o fin dunha relación laboral. Hai 15 días hábiles para pedila.",
      requisitos: [
        "Inscrición como demandante de emprego",
        "Certificado de empresa (envíao a empresa ao SEPE)",
        "Documento de identidade e número de conta",
      ],
      duracion: "Resolución nuns 15 días hábiles",
      coste: "Gratuíto",
    },
    certificado: {
      titulo: "Certificado dixital de persoa física",
      organismo: "FNMT-RCM",
      resumen:
        "Sinatura electrónica para facer case calquera trámite en liña. Solicítase en liña e acredítase a identidade nunha oficina ou por vídeo.",
      requisitos: [
        "DNI ou NIE",
        "Navegador compatible para a descarga",
        "Acreditación da identidade (presencial ou videoidentificación)",
      ],
      duracion: "Descarga tras acreditar a identidade",
      coste: "Gratuíto (presencial)",
    },
    clave: {
      titulo: "Rexistro en Cl@ve",
      organismo: "Goberno de España",
      resumen: "Sistema de identificación con usuario e PIN ou app para a Administración electrónica.",
      requisitos: ["DNI ou NIE", "Teléfono móbil", "Carta de invitación, videochamada ou rexistro presencial"],
      duracion: "Inmediato por videochamada",
      coste: "Gratuíto",
    },
    "vida-laboral": {
      titulo: "Informe de vida laboral",
      organismo: "Seguridade Social · Import@ss",
      resumen: "Historial de altas e baixas na Seguridade Social. Descárgase ao momento en Import@ss.",
      requisitos: ["Cl@ve, certificado dixital ou SMS ao móbil rexistrado"],
      duracion: "Inmediato",
      coste: "Gratuíto",
    },
    carnet: {
      titulo: "Renovación do permiso de conducir",
      organismo: "DGT",
      resumen: "Renovación por caducidade. Pode facerse nun centro de recoñecemento que a tramite.",
      requisitos: ["Informe de aptitude psicofísica", "Fotografía recente", "Pagamento da taxa"],
      duracion: "Permiso provisional no momento",
      coste: "Taxa DGT 4.1 (consulta o importe vixente)",
    },
  },
};
