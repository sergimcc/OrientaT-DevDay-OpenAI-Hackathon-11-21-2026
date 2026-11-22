import type { FichaCatalogo, FichaTexto, TramiteId } from "@/data/tramites";
import type { LoginMethod } from "@/lib/extension-catalog";

/** Who does each part of the journey (lane labels in the cards). */
export type Who = "tu" | "extension" | "web";

/**
 * Spanish (castellano): the reference language. Its shape defines `Messages`; every other
 * language file must match it. Markdown (`**bold**`, `*italic*`) is allowed in chat replies and
 * in `extension.mock.bot`.
 */
export const es = {
  meta: { title: "OrientaT · Asistente de trámites", language: "Idioma" },
  /** The name, OrientaT, is fixed in every language (see `Wordmark`); only the descriptor is translated. */
  brand: { descriptor: "Asistente de trámites" },
  header: { extension: "La extensión", installed: "Instalada en este navegador", lightMode: "Modo claro", darkMode: "Modo oscuro" },
  hero: {
    title: "¿Qué trámite tienes que hacer?",
    subtitle: "Pregúntalo con tus palabras. Te decimos qué es, qué necesitas y dónde hacerlo.",
  },
  extension: {
    eyebrow: "La extensión",
    title: "De aquí, a dentro de la web oficial.",
    intro:
      "Aquí descubres qué tienes que hacer. Con un clic, la extensión abre la web oficial y te guía dentro de ella, pantalla a pantalla, sin hacer nada en tu nombre.",
    steps: [
      {
        title: "Descubre aquí qué trámite es",
        text: "Pregunta en esta web con tus palabras. Te decimos qué trámite es, qué tener a mano y cómo se entra.",
      },
      {
        title: "Pulsa «Hacerlo con la extensión»",
        text: "Se abre la web oficial en una pestaña nueva, con el asistente en un panel al lado.",
      },
      {
        title: "Te lleva hasta el trámite",
        text: "Ya sabe qué quieres hacer: sigue enlaces, abre menús y pestañas hasta llegar al formulario.",
      },
      {
        title: "Te señala dónde actuar",
        text: "Marca cada casilla con un recuadro y te dice qué poner. Tú escribes, firmas y presentas.",
      },
    ],
    does: {
      title: "Lo que hace por ti",
      items: [
        "Seguir enlaces y abrir menús o pestañas",
        "Llevarte a la página exacta del trámite",
        "Señalarte cada campo y explicarte qué poner",
      ],
    },
    never: {
      title: "Lo que nunca hace",
      items: [
        "Escribir tus datos o elegir opciones",
        "Firmar, pagar, guardar o presentar",
        "Salir de las webs oficiales que conoce",
      ],
    },
    knows: {
      title: "Lo que ya sabe hacer",
      subtitle: "Pulsa uno: te decimos qué necesitas y lo abres con la extensión.",
    },
    soon: "Próximamente para Chrome y Safari",
    mock: {
      field: "DNI / NIE",
      hint: "Escribe tú",
      hintText: "Tu número de DNI, con la letra.",
      validity: "Fecha de validez",
      panelTitle: "Asistente",
      user: "Quiero ver mi borrador de la renta",
      bot: "Te he llevado a **Renta WEB**. Para entrar, escribe tu DNI en el recuadro amarillo.",
      botNext: "Cuando lo tengas, pulsa tú «Continuar».",
      composer: "Escribe aquí…",
    },
  },
  footer: {
    disclaimer:
      "Servicio no oficial, no afiliado al Gobierno de España. La información es orientativa: consulta siempre la sede electrónica antes de presentar.",
  },
  chat: {
    /** The first one is about the extension and gets the puzzle icon. */
    suggestions: ["Cómo funciona la extensión", "Renovar el DNI", "Alquiler asequible", "Hacer la renta"],
    placeholderEmpty: "Por ejemplo: me he mudado y tengo que empadronarme",
    placeholder: "Escribe tu pregunta…",
    footnote: "Nada se envía sin tu confirmación",
    voice: {
      start: "Hablar con el asistente",
      stop: "Finalizar conversación de voz",
      connecting: "Conectando la voz…",
      connected: "Voz de IA conectada. Puedes hablar.",
      unavailable: "Este navegador no permite iniciar una conversación de voz.",
      permission: "Permite el acceso al micrófono para hablar con el asistente.",
      timeout: "La conexión de voz tardó demasiado. Vuelve a intentarlo.",
      connection: "No se pudo iniciar la voz. Comprueba el micrófono y vuelve a intentarlo.",
      response: "No se pudo completar la respuesta de voz.",
      disconnected: "Se cerró la conexión de voz.",
    },
    title: "Asistente de trámites",
    reset: "Nueva",
    reading: "Leyendo tu consulta…",
    send: "Enviar",
    stop: "Detener",
    thinking: "Pensando…",
    thoughtFew: "Pensó unos segundos",
    thoughtFor: (s: number) => `Pensó ${s} s`,
    sources: (n: number) => (n === 1 ? "1 fuente oficial" : `${n} fuentes oficiales`),
    /** Sent by the header button. */
    askExtension: "¿Cómo funciona la extensión?",
    /** Sent from the list of procedures the extension knows. Must quote the title as is. */
    askPlan: (titulo: string) => `¿Cómo hago «${titulo}» con la extensión?`,
    tool: {
      status: {
        "approval-requested": "Esperando aprobación",
        "approval-responded": "Respondido",
        "input-available": "En curso",
        "input-streaming": "Pendiente",
        "output-available": "Hecho",
        "output-denied": "Denegado",
        "output-error": "Error",
      },
      params: "Parámetros",
      result: "Resultado",
      error: "Error",
    },
  },
  tools: {
    buscar_tramite: { running: "Buscando en el catálogo de trámites…", done: "Catálogo de trámites" },
    explicar_extension: { running: "Preparando la guía de la extensión…", done: "Guía de la extensión" },
    plan_extension: { running: "Leyendo el mapa del trámite…", done: "Mapa del trámite en la extensión" },
  } as Record<string, { running: string; done: string }>,
  cards: {
    needs: (done: number, total: number) => `Qué necesitas · ${done}/${total}`,
    handoff: {
      title: "Sigue en la web oficial, con la extensión",
      /** `**…**` marks the host in bold. */
      opens: (host: string, mapped: boolean) =>
        `Se abre **${host}** en una pestaña nueva con el asistente al lado. Ya sabe qué quieres hacer y te lleva hasta ello${mapped ? "" : ", leyendo la página"}.`,
      cta: "Hacerlo con la extensión",
      install: "Instala la extensión para continuar · Próximamente",
      openOnly: "Solo abrir la web",
      okPanel: (host: string) => `Listo: se ha abierto ${host} con el asistente. Sigue allí.`,
      okNoPanel: (host: string) =>
        `Se ha abierto ${host}. Pulsa el icono del Asistente de trámites en la barra del navegador (lleva un 1) y empieza solo.`,
      errUrl: "La extensión no puede abrir esta web: no es una web oficial que conozca.",
      errOther: "La extensión no ha respondido. Recarga esta página y vuelve a intentarlo.",
      alreadyOpen: "¿Ya tienes la web abierta? Abre el panel y escríbele",
      copied: "Copiado",
    },
    lanes: { tu: "Tú", extension: "Extensión", web: "Esta web" },
    /** The whole journey: discovery here, hand-off to the extension, guidance inside the official site. */
    journey: [
      {
        title: "Aquí descubres qué trámite es",
        lanes: [
          ["tu", "Cuentas qué necesitas, con tus palabras."],
          ["web", "Te dice qué trámite es, quién lo gestiona, qué tener a mano y cómo se entra."],
        ],
      },
      {
        title: "Pulsas «Hacerlo con la extensión»",
        lanes: [
          ["tu", "Un clic."],
          ["extension", "Abre la web oficial en una pestaña nueva, con su panel al lado, y ya sabe qué quieres hacer."],
        ],
      },
      {
        title: "Te lleva hasta el trámite",
        lanes: [
          ["tu", "Nada: miras cómo avanza."],
          ["extension", "Sigue enlaces y abre menús y pestañas hasta el formulario. Solo en webs oficiales."],
        ],
      },
      {
        title: "Rellenas el formulario",
        lanes: [
          ["tu", "Escribes tus datos y eliges las opciones."],
          ["extension", "Rodea cada campo con un recuadro amarillo y te dice qué poner. No escribe nada por ti."],
        ],
      },
      {
        title: "Terminas tú",
        lanes: [
          ["tu", "Revisas, firmas, pagas o presentas, y guardas el justificante."],
          ["extension", "Te señala el botón final y te recuerda revisar. Nunca lo pulsa."],
        ],
      },
    ] as { title: string; lanes: [Who, string][] }[],
    guide: {
      eyebrow: "De esta web a la web oficial",
      installed: "✓ Tienes la extensión instalada en este navegador.",
      needInstall: "Necesitas la extensión instalada (próximamente para Chrome y Safari).",
      knows: "Ya sabe guiarte en estos trámites",
    },
    plan: {
      eyebrow: (sitio: string) => `${sitio} · la extensión tiene su mapa`,
      access: "Cómo se entra",
      have: "Ten a mano",
      whatHappens: "Qué pasará en la web oficial",
      draft: "Mapa en revisión: si la web ha cambiado, la extensión se guía por lo que vea en pantalla.",
      or: " o ",
    },
  },
  /** Texts the web writes around the extension's site maps (the maps themselves are in Spanish). */
  extensionPlan: {
    stepPerson: "Te lleva a esta pantalla, te explica qué es cada cosa y señala con un recuadro dónde actuar.",
    stepAuto: "Lo hace por ti: navega hasta la información, la lee y te la explica.",
    login: {
      clave: "Cl@ve",
      clave_pin: "Cl@ve PIN",
      clave_permanente: "Cl@ve permanente",
      certificado: "certificado digital",
      dnie: "DNIe",
      referencia: "número de referencia",
      sms: "SMS",
      sin_identificacion: "sin identificarte",
    } as Record<LoginMethod, string>,
  },
  replies: {
    planReasoning: (sitio: string, tramite: string, pasos: number) =>
      `La extensión tiene mapa de ${sitio}: «${tramite}», ${pasos} pasos. Preparo qué hace ella y qué haces tú en cada uno.`,
    planText:
      "Esto **lo puedes hacer con la extensión**, y tiene el mapa de esta web. Arriba tienes qué tener a mano, cómo se entra y qué pasará en cada paso.\n\n" +
      "Cuando estés listo, pulsa **Hacerlo con la extensión**: se abre la web oficial con el asistente al lado y te lleva hasta el trámite.",
    planSource: (sitio: string) => `${sitio} · página de inicio del trámite`,
    extensionReasoning:
      "Explico la extensión paso a paso, separando lo que haces tú de lo que hace ella, y listo los trámites que ya conoce.",
    extension:
      "En resumen: **aquí descubres qué trámite es; la extensión te lleva dentro de la web oficial.** Allí navega por ti, te explica cada pantalla y te señala dónde actuar, pero nunca escribe por ti ni pulsa enviar, firmar o pagar.\n\n" +
      "Pulsa cualquiera de los trámites de la lista y te preparo el camino.",
    estado:
      "Para ver el estado de **tus** expedientes tienes que identificarte en **Carpeta Ciudadana** con Cl@ve, certificado digital o DNIe: ahí aparecen los trámites abiertos con la Administración General del Estado y sus notificaciones.\n\n" +
      "Si me dices qué trámite es, te explico en qué fase suele estar y cuánto tarda.",
    estadoSource: "Carpeta Ciudadana",
    tramiteReasoning: (titulo: string, organismo: string) =>
      `La consulta encaja con «${titulo}» (${organismo}). Reviso requisitos, coste y canal de presentación.`,
    tramiteText: (f: FichaCatalogo) =>
      `**${f.titulo}** se gestiona con ${f.organismo}. ${f.resumen}\n\n` +
      `Necesitarás ${f.requisitos.length} cosas; te las dejo arriba como lista. ` +
      "Cuando lo tengas, pulsa **Hacerlo con la extensión**: abre la web oficial con el asistente al lado. Aún no tiene el mapa de esta web, así que se guiará leyendo cada página.",
    tramiteSource: (organismo: string) => `${organismo} · ficha oficial`,
    fallback:
      "Puedo ayudarte a **encontrar el trámite** que necesitas y decirte **qué tener a mano**. Luego la extensión te lleva **dentro de la web oficial**, paso a paso.\n\n" +
      "Cuéntame qué quieres hacer, por ejemplo: *«Renovar el DNI»*, *«Necesito el NIE»* o *«¿Cómo hago la renta?»*.",
  },
  tramites: {
    nie: {
      titulo: "Asignación de NIE",
      organismo: "Policía Nacional · Extranjería",
      resumen:
        "Número de Identidad de Extranjero, necesario para trabajar, abrir una cuenta o firmar un contrato en España.",
      requisitos: [
        "Formulario EX-15 cumplimentado",
        "Pasaporte o documento de identidad y copia",
        "Justificante del motivo (oferta de trabajo, matrícula, compraventa…)",
        "Justificante del pago de la tasa 790 código 012",
      ],
      duracion: "En el día de la cita, en la mayoría de oficinas",
      coste: "Tasa 790-012 (consulta el importe vigente)",
    },
    padron: {
      titulo: "Alta en el padrón municipal",
      organismo: "Ayuntamiento",
      resumen: "Inscripción en el municipio donde vives. Da acceso a sanidad, escolarización y otros servicios.",
      requisitos: [
        "Documento de identidad (DNI, NIE o pasaporte)",
        "Contrato de alquiler, escritura o autorización del titular",
        "Formulario de inscripción del ayuntamiento",
      ],
      duracion: "Inmediato en la cita; certificado en 1–7 días",
      coste: "Gratuito",
    },
    renta: {
      titulo: "Declaración de la Renta (IRPF)",
      organismo: "Agencia Tributaria",
      resumen:
        "Presentación anual del IRPF. El borrador se revisa y presenta en Renta WEB con Cl@ve, certificado o número de referencia.",
      requisitos: [
        "Cl@ve, certificado digital o número de referencia",
        "Datos fiscales del ejercicio",
        "IBAN para devolución o domiciliación",
      ],
      duracion: "Campaña de abril a junio",
      coste: "Gratuito",
    },
    paro: {
      titulo: "Prestación por desempleo",
      organismo: "SEPE",
      resumen:
        "Solicitud de la prestación contributiva tras el fin de una relación laboral. Hay 15 días hábiles para pedirla.",
      requisitos: [
        "Inscripción como demandante de empleo",
        "Certificado de empresa (lo envía la empresa al SEPE)",
        "Documento de identidad y número de cuenta",
      ],
      duracion: "Resolución en unos 15 días hábiles",
      coste: "Gratuito",
    },
    certificado: {
      titulo: "Certificado digital de persona física",
      organismo: "FNMT-RCM",
      resumen:
        "Firma electrónica para hacer casi cualquier trámite online. Se solicita online y se acredita la identidad en una oficina o por vídeo.",
      requisitos: [
        "DNI o NIE",
        "Navegador compatible para la descarga",
        "Acreditación de identidad (presencial o videoidentificación)",
      ],
      duracion: "Descarga tras acreditar la identidad",
      coste: "Gratuito (presencial)",
    },
    clave: {
      titulo: "Registro en Cl@ve",
      organismo: "Gobierno de España",
      resumen: "Sistema de identificación con usuario y PIN o app para la Administración electrónica.",
      requisitos: ["DNI o NIE", "Teléfono móvil", "Carta de invitación, videollamada o registro presencial"],
      duracion: "Inmediato por videollamada",
      coste: "Gratuito",
    },
    "vida-laboral": {
      titulo: "Informe de vida laboral",
      organismo: "Seguridad Social · Import@ss",
      resumen: "Historial de altas y bajas en la Seguridad Social. Se descarga al momento en Import@ss.",
      requisitos: ["Cl@ve, certificado digital o SMS al móvil registrado"],
      duracion: "Inmediato",
      coste: "Gratuito",
    },
    carnet: {
      titulo: "Renovación del permiso de conducir",
      organismo: "DGT",
      resumen: "Renovación por caducidad. Puede hacerse en un centro de reconocimiento que la tramite.",
      requisitos: ["Informe de aptitud psicofísica", "Fotografía reciente", "Pago de la tasa"],
      duracion: "Permiso provisional en el momento",
      coste: "Tasa DGT 4.1 (consulta el importe vigente)",
    },
  } as Record<TramiteId, FichaTexto>,
};

export type Messages = typeof es;
