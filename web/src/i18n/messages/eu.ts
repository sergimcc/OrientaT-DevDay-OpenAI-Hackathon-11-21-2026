import type { Messages } from "./es";

/** Euskara. */
export const eu: Messages = {
  meta: { title: "OrientaT · Izapideen laguntzailea", language: "Hizkuntza" },
  brand: { descriptor: "Izapideen laguntzailea" },
  header: { extension: "Luzapena", installed: "Nabigatzaile honetan instalatuta", lightMode: "Modu argia", darkMode: "Modu iluna" },
  hero: {
    title: "Zer izapide egin behar duzu?",
    subtitle: "Galdetu zure hitzekin. Zer den, zer behar duzun eta non egin esango dizugu.",
  },
  extension: {
    eyebrow: "Luzapena",
    title: "Hemendik, webgune ofizialaren barrura.",
    intro:
      "Hemen jakingo duzu zer egin behar duzun. Klik batekin, luzapenak webgune ofiziala irekitzen du eta barruan gidatzen zaitu, pantailaz pantaila, zure izenean ezer egin gabe.",
    steps: [
      {
        title: "Jakin hemen zer izapide den",
        text: "Galdetu webgune honetan zure hitzekin. Zer izapide den, zer izan behar duzun eskura eta nola sartzen den esango dizugu.",
      },
      {
        title: "Sakatu «Luzapenarekin egin»",
        text: "Webgune ofiziala fitxa berri batean irekitzen da, laguntzailea ondoko panel batean duela.",
      },
      {
        title: "Izapideraino eramaten zaitu",
        text: "Badaki zer egin nahi duzun: estekei jarraitzen die, eta menuak eta fitxak irekitzen ditu formulariora iritsi arte.",
      },
      {
        title: "Non jardun erakusten dizu",
        text: "Eremu bakoitza lauki batekin markatzen du eta zer jarri esaten dizu. Zuk idazten, sinatzen eta aurkezten duzu.",
      },
    ],
    does: {
      title: "Zure ordez egiten duena",
      items: [
        "Estekei jarraitu eta menuak edo fitxak ireki",
        "Izapidearen orri zehatzera eraman",
        "Eremu bakoitza erakutsi eta zer jarri azaldu",
      ],
    },
    never: {
      title: "Inoiz egiten ez duena",
      items: [
        "Zure datuak idatzi edo aukerak hautatu",
        "Sinatu, ordaindu, gorde edo aurkeztu",
        "Ezagutzen dituen webgune ofizialetatik irten",
      ],
    },
    knows: {
      title: "Dagoeneko badakiena",
      subtitle: "Sakatu bat: zer behar duzun esango dizugu, eta luzapenarekin irekiko duzu.",
    },
    soon: "Laster Chrome eta Safarirako",
    mock: {
      field: "DNI / NIE",
      hint: "Zuk idatzi",
      hintText: "Zure NAN zenbakia, letrarekin.",
      validity: "Baliozkotasun-data",
      panelTitle: "Laguntzailea",
      user: "Nire errentaren zirriborroa ikusi nahi dut",
      bot: "**Renta WEB** zerbitzura eraman zaitut. Sartzeko, idatzi zure NANa lauki horian.",
      botNext: "Idatzita duzunean, sakatu zuk «Continuar».",
      composer: "Idatzi hemen…",
    },
  },
  footer: {
    disclaimer:
      "Zerbitzu ez-ofiziala, Espainiako Gobernuarekin loturarik gabea. Informazioa orientagarria da: aurkeztu aurretik, kontsultatu beti egoitza elektronikoa.",
  },
  chat: {
    suggestions: ["Nola funtzionatzen du luzapenak", "NANa berritu", "Alokairu eskuragarria", "Errenta-aitorpena egin"],
    placeholderEmpty: "Adibidez: etxez aldatu naiz eta erroldatu egin behar dut",
    placeholder: "Idatzi zure galdera…",
    footnote: "Ez da ezer bidaltzen zuk berretsi gabe",
    voice: {
      start: "Laguntzailearekin hitz egin",
      stop: "Ahots bidezko elkarrizketa amaitu",
      connecting: "Ahotsa konektatzen…",
      connected: "AAren ahotsa konektatuta. Hitz egin dezakezu.",
      unavailable: "Nabigatzaile honek ez du ahots bidezko elkarrizketarik abiarazten uzten.",
      permission: "Baimendu mikrofonoa erabiltzea laguntzailearekin hitz egiteko.",
      timeout: "Ahots-konexioak denbora gehiegi behar izan du. Saiatu berriro.",
      connection: "Ezin izan da ahotsa abiarazi. Egiaztatu mikrofonoa eta saiatu berriro.",
      response: "Ezin izan da ahots-erantzuna osatu.",
      disconnected: "Ahots-konexioa itxi da.",
    },
    title: "Izapideen laguntzailea",
    reset: "Berria",
    reading: "Zure kontsulta irakurtzen…",
    send: "Bidali",
    stop: "Gelditu",
    thinking: "Pentsatzen…",
    thoughtFew: "Segundo batzuez pentsatu du",
    thoughtFor: (s) => `${s} s pentsatu du`,
    sources: (n) => (n === 1 ? "Iturri ofizial 1" : `${n} iturri ofizial`),
    askExtension: "Nola funtzionatzen du luzapenak?",
    askPlan: (titulo) => `Nola egin «${titulo}» luzapenarekin?`,
    tool: {
      status: {
        "approval-requested": "Onarpenaren zain",
        "approval-responded": "Erantzunda",
        "input-available": "Abian",
        "input-streaming": "Zain",
        "output-available": "Eginda",
        "output-denied": "Ukatuta",
        "output-error": "Errorea",
      },
      params: "Parametroak",
      result: "Emaitza",
      error: "Errorea",
    },
  },
  tools: {
    buscar_tramite: { running: "Izapideen katalogoan bilatzen…", done: "Izapideen katalogoa" },
    explicar_extension: { running: "Luzapenaren gida prestatzen…", done: "Luzapenaren gida" },
    plan_extension: { running: "Izapidearen mapa irakurtzen…", done: "Izapidearen mapa luzapenean" },
  },
  cards: {
    needs: (done, total) => `Zer behar duzun · ${done}/${total}`,
    handoff: {
      title: "Jarraitu webgune ofizialean, luzapenarekin",
      opens: (host, mapped) =>
        `**${host}** fitxa berri batean irekiko da, laguntzailea ondoan duela. Badaki zer egin nahi duzun eta hara eramango zaitu${mapped ? "" : ", orria irakurriz"}.`,
      cta: "Luzapenarekin egin",
      install: "Instalatu luzapena jarraitzeko · Laster",
      openOnly: "Webgunea ireki besterik ez",
      okPanel: (host) => `Prest: ${host} ireki da laguntzailearekin. Jarraitu han.`,
      okNoPanel: (host) =>
        `${host} ireki da. Sakatu Izapideen laguntzailearen ikonoa nabigatzailearen barran (1 bat du) eta hasi zuk.`,
      errUrl: "Luzapenak ezin du webgune hau ireki: ez da ezagutzen duen webgune ofizial bat.",
      errOther: "Luzapenak ez du erantzun. Kargatu berriro orri hau eta saiatu berriro.",
      alreadyOpen: "Webgunea irekita duzu dagoeneko? Ireki panela eta idatzi hau",
      copied: "Kopiatuta",
    },
    lanes: { tu: "Zu", extension: "Luzapena", web: "Webgune hau" },
    journey: [
      {
        title: "Hemen jakingo duzu zer izapide den",
        lanes: [
          ["tu", "Zer behar duzun kontatzen duzu, zure hitzekin."],
          ["web", "Zer izapide den, nork kudeatzen duen, zer izan eskura eta nola sartzen den esaten dizu."],
        ],
      },
      {
        title: "«Luzapenarekin egin» sakatzen duzu",
        lanes: [
          ["tu", "Klik bat."],
          ["extension", "Webgune ofiziala fitxa berri batean irekitzen du, bere panela ondoan duela, eta badaki zer egin nahi duzun."],
        ],
      },
      {
        title: "Izapideraino eramaten zaitu",
        lanes: [
          ["tu", "Ezer ez: nola aurrera egiten duen begiratzen duzu."],
          ["extension", "Estekei jarraitzen die, eta menuak eta fitxak irekitzen ditu formulariora arte. Webgune ofizialetan bakarrik."],
        ],
      },
      {
        title: "Formularioa betetzen duzu",
        lanes: [
          ["tu", "Zure datuak idazten dituzu eta aukerak hautatzen."],
          ["extension", "Eremu bakoitza lauki hori batekin inguratzen du eta zer jarri esaten dizu. Ez du ezer idazten zure ordez."],
        ],
      },
      {
        title: "Zuk amaitzen duzu",
        lanes: [
          ["tu", "Berrikusi, sinatu, ordaindu edo aurkeztu egiten duzu, eta ziurtagiria gordetzen duzu."],
          ["extension", "Azken botoia erakusten dizu eta berrikusteko gogorarazten dizu. Ez du inoiz sakatzen."],
        ],
      },
    ],
    guide: {
      eyebrow: "Webgune honetatik webgune ofizialera",
      installed: "✓ Luzapena nabigatzaile honetan instalatuta duzu.",
      needInstall: "Luzapena instalatuta izan behar duzu (laster Chrome eta Safarirako).",
      knows: "Izapide hauetan gidatzen badaki dagoeneko",
    },
    plan: {
      eyebrow: (sitio) => `${sitio} · luzapenak bere mapa du`,
      access: "Nola sartzen den",
      have: "Izan eskura",
      whatHappens: "Zer gertatuko den webgune ofizialean",
      draft: "Mapa berrikusten: webgunea aldatu bada, luzapena pantailan ikusten duenaren arabera gidatuko da.",
      or: " edo ",
    },
  },
  extensionPlan: {
    stepPerson: "Pantaila honetara eramaten zaitu, gauza bakoitza zer den azaltzen dizu eta non jardun lauki batekin erakusten dizu.",
    stepAuto: "Zure ordez egiten du: informazioraino nabigatzen du, irakurri eta azaldu egiten dizu.",
    login: {
      clave: "Cl@ve",
      clave_pin: "Cl@ve PIN",
      clave_permanente: "Cl@ve iraunkorra",
      certificado: "ziurtagiri digitala",
      dnie: "NANe",
      referencia: "erreferentzia-zenbakia",
      sms: "SMS",
      sin_identificacion: "identifikatu gabe",
    },
  },
  replies: {
    planReasoning: (sitio, tramite, pasos) =>
      `Luzapenak ${sitio} webgunearen mapa du: «${tramite}», ${pasos} urrats. Urrats bakoitzean berak zer egiten duen eta zuk zer egiten duzun prestatzen ari naiz.`,
    planText:
      "Hau **luzapenarekin egin dezakezu**, eta webgune honen mapa du. Goian dituzu zer izan eskura, nola sartzen den eta urrats bakoitzean zer gertatuko den.\n\n" +
      "Prest zaudenean, sakatu **Luzapenarekin egin**: webgune ofiziala irekiko da laguntzailea ondoan duela, eta izapideraino eramango zaitu.",
    planSource: (sitio) => `${sitio} · izapidearen hasiera-orria`,
    extensionReasoning:
      "Luzapena urratsez urrats azaltzen dut, zuk egiten duzuna eta berak egiten duena bereizita, eta dagoeneko ezagutzen dituen izapideak zerrendatzen ditut.",
    extension:
      "Laburbilduz: **hemen jakingo duzu zer izapide den; luzapenak webgune ofizialaren barrura eramaten zaitu.** Han zure ordez nabigatzen du, pantaila bakoitza azaltzen dizu eta non jardun erakusten dizu, baina ez du inoiz zure ordez idazten, ezta bidali, sinatu edo ordaindu sakatzen ere.\n\n" +
      "Sakatu zerrendako edozein izapide eta bidea prestatuko dizut.",
    estado:
      "**Zure** espedienteen egoera ikusteko, **Herritarren Karpetan** identifikatu behar duzu Cl@ve, ziurtagiri digitala edo NANe erabiliz: han agertzen dira Estatuko Administrazio Orokorrarekin irekita dituzun izapideak eta haien jakinarazpenak.\n\n" +
      "Zer izapide den esaten badidazu, zer fasetan egon ohi den eta zenbat irauten duen azalduko dizut.",
    estadoSource: "Herritarren Karpeta",
    tramiteReasoning: (titulo, organismo) =>
      `Kontsulta «${titulo}» izapidearekin bat dator (${organismo}). Baldintzak, kostua eta aurkezteko bidea berrikusten ditut.`,
    tramiteText: (f) =>
      `**${f.titulo}**: ${f.organismo} arduratzen da. ${f.resumen}\n\n` +
      `${f.requisitos.length} gauza beharko dituzu; goian utzi dizkizut zerrenda gisa. ` +
      "Prest dituzunean, sakatu **Luzapenarekin egin**: webgune ofiziala irekiko du laguntzailea ondoan duela. Oraindik ez du webgune honen maparik, beraz orri bakoitza irakurriz gidatuko da.",
    tramiteSource: (organismo) => `${organismo} · fitxa ofiziala`,
    fallback:
      "**Behar duzun izapidea aurkitzen** eta **zer izan behar duzun eskura** esaten lagun diezazuket. Gero luzapenak **webgune ofizialaren barrura** eramaten zaitu, urratsez urrats.\n\n" +
      "Kontatu zer egin nahi duzun, adibidez: *«NANa berritu»*, *«NIEa behar dut»* edo *«Nola egin errenta-aitorpena?»*.",
  },
  tramites: {
    nie: {
      titulo: "NIEaren esleipena",
      organismo: "Polizia Nazionala · Atzerritartasuna",
      resumen:
        "Atzerritarraren Identifikazio Zenbakia, Espainian lan egiteko, kontu bat irekitzeko edo kontratu bat sinatzeko beharrezkoa.",
      requisitos: [
        "EX-15 formularioa beteta",
        "Pasaportea edo nortasun-agiria, eta kopia",
        "Arrazoiaren egiaztagiria (lan-eskaintza, matrikula, salerosketa…)",
        "790 tasaren (012 kodea) ordainagiria",
      ],
      duracion: "Hitzorduaren egunean bertan, bulego gehienetan",
      coste: "790-012 tasa (kontsultatu indarreko zenbatekoa)",
    },
    padron: {
      titulo: "Udal erroldan alta ematea",
      organismo: "Udala",
      resumen:
        "Bizi zaren udalerrian izena ematea. Osasun-laguntzarako, eskolatzerako eta beste zerbitzu batzuetarako sarbidea ematen du.",
      requisitos: [
        "Nortasun-agiria (NAN, NIE edo pasaportea)",
        "Alokairu-kontratua, eskritura edo titularraren baimena",
        "Udalaren inskripzio-formularioa",
      ],
      duracion: "Berehala hitzorduan; ziurtagiria 1–7 egunean",
      coste: "Doan",
    },
    renta: {
      titulo: "Errenta-aitorpena (PFEZ)",
      organismo: "Zerga Agentzia",
      resumen:
        "PFEZaren urteko aurkezpena. Zirriborroa Renta WEB zerbitzuan berrikusten eta aurkezten da, Cl@ve, ziurtagiri edo erreferentzia-zenbakiarekin.",
      requisitos: [
        "Cl@ve, ziurtagiri digitala edo erreferentzia-zenbakia",
        "Ekitaldiko datu fiskalak",
        "IBANa, itzulketarako edo helbideratzeko",
      ],
      duracion: "Kanpaina apiriletik ekainera",
      coste: "Doan",
    },
    paro: {
      titulo: "Langabezia-prestazioa",
      organismo: "SEPE",
      resumen:
        "Kotizaziopeko prestazioaren eskaera, lan-harreman bat amaitu ondoren. 15 egun balioduneko epea dago eskatzeko.",
      requisitos: [
        "Enplegu-eskatzaile gisa izena ematea",
        "Enpresaren ziurtagiria (enpresak bidaltzen dio SEPEri)",
        "Nortasun-agiria eta kontu-zenbakia",
      ],
      duracion: "Ebazpena 15 egun baliodun ingurutan",
      coste: "Doan",
    },
    certificado: {
      titulo: "Pertsona fisikoaren ziurtagiri digitala",
      organismo: "FNMT-RCM",
      resumen:
        "Sinadura elektronikoa, ia edozein izapide sarean egiteko. Sarean eskatzen da, eta nortasuna bulego batean edo bideo bidez egiaztatzen da.",
      requisitos: [
        "NAN edo NIE",
        "Deskargarako nabigatzaile bateragarria",
        "Nortasunaren egiaztapena (aurrez aurre edo bideo-identifikazioa)",
      ],
      duracion: "Deskarga, nortasuna egiaztatu ondoren",
      coste: "Doan (aurrez aurre)",
    },
    clave: {
      titulo: "Cl@ve sisteman erregistratzea",
      organismo: "Espainiako Gobernua",
      resumen: "Administrazio elektronikorako identifikazio-sistema, erabiltzailearekin eta PINarekin edo aplikazioarekin.",
      requisitos: ["NAN edo NIE", "Telefono mugikorra", "Gonbidapen-gutuna, bideodeia edo aurrez aurreko erregistroa"],
      duracion: "Berehala, bideodei bidez",
      coste: "Doan",
    },
    "vida-laboral": {
      titulo: "Lan-bizitzaren txostena",
      organismo: "Gizarte Segurantza · Import@ss",
      resumen: "Gizarte Segurantzako alten eta bajen historia. Import@ss zerbitzuan berehala deskargatzen da.",
      requisitos: ["Cl@ve, ziurtagiri digitala edo SMSa erregistratutako mugikorrera"],
      duracion: "Berehala",
      coste: "Doan",
    },
    carnet: {
      titulo: "Gidabaimena berritzea",
      organismo: "DGT",
      resumen: "Iraungitzeagatiko berritzea. Izapidetzen duen azterketa-zentro batean egin daiteke.",
      requisitos: ["Gaitasun psikofisikoaren txostena", "Argazki berria", "Tasa ordaintzea"],
      duracion: "Behin-behineko baimena unean bertan",
      coste: "DGTren 4.1 tasa (kontsultatu indarreko zenbatekoa)",
    },
  },
};
