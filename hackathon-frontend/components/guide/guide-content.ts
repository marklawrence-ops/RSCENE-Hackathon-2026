// Household guidance card, kept in step with hackathon-backend/config/reuse.php (the safety tiers).
// Filipino and Waray are DRAFT translations: have a native speaker review them before printing.

export type Lang = "en" | "fil" | "war";

export type GuideText = {
  langName: string;
  draft: boolean;
  title: string;
  intro: string;
  doTitle: string;
  doItems: [string, string][]; // [from, to]
  neverTitle: string;
  neverItems: string[];
  drumTitle: string;
  drumItems: string[];
  readyTitle: string;
  readyText: string;
  askText: string;
  print: string;
  draftNote: string;
  footer: string;
};

// The label on every drum stays bilingual in all versions, as on the printed card.
export const DRUM_LABEL = "Hindi maiinom / Not for drinking";

export const GUIDE: Record<Lang, GuideText> = {
  en: {
    langName: "English",
    draft: false,
    title: "Use water twice, safely",
    intro: "Most water at home does not need to be drinking water. Rinse water and rain can do a second job: flushing, cleaning and watering plants.",
    doTitle: "Do this",
    doItems: [
      ["Laundry rinse water", "Flush the toilet"],
      ["Shower or bath water", "Water plants: pour it on the soil, not on leaves"],
      ["Rain in a covered drum", "Flushing, floor washing, laundry, plants"],
      ["Aircon drip water", "Plants or floor cleaning"],
      ["Used water (greywater)", "Use it the same day. Do not store it."],
    ],
    neverTitle: "Never",
    neverItems: [
      "Never drink, cook with, or bathe in stored rain or used water.",
      "Never reuse kitchen sink water (it has grease) or toilet water.",
      "Never keep used water in drums.",
      "Never spray used water, or pour it on vegetables that are eaten raw.",
    ],
    drumTitle: "Rules for rain drums",
    drumItems: [
      "Rainwater only.",
      "Keep it covered at all times, so mosquitoes cannot breed.",
      "Let the first few minutes of rain wash the roof before you collect.",
      `Label it: "${DRUM_LABEL}".`,
      "Keep it away from your drinking water.",
      "Use it and refill it every few weeks.",
    ],
    readyTitle: "Be ready when the water stops",
    readyText:
      "Three covered drums (200 L each) keep a family of five flushing and washing for about 3 days when the piped water stops. Tap water you store before a typhoon is good too, but keep it separate: that one is for drinking.",
    askText: "If your barangay is in the pilot, ask your barangay health worker about a free drum cover.",
    print: "Print card",
    draftNote: "",
    footer: "Guidance only. This does not certify water as safe to drink.",
  },
  fil: {
    langName: "Filipino",
    draft: true,
    title: "Gamitin ang tubig nang dalawang beses, nang ligtas",
    intro: "Karamihan sa tubig sa bahay ay hindi kailangang maiinom. Ang pinagbanlawan at tubig-ulan ay puwedeng gamitin ulit sa pag-flush, paglilinis at pagdidilig.",
    doTitle: "Gawin ito",
    doItems: [
      ["Pinagbanlawan ng labada", "Pang-flush ng inidoro"],
      ["Tubig mula sa paliligo", "Pandilig sa halaman: ibuhos sa lupa, hindi sa dahon"],
      ["Tubig-ulan sa drum na may takip", "Pang-flush, panlampaso, panlaba, pandilig"],
      ["Tubig na tumutulo sa aircon", "Pandilig o panlampaso"],
      ["Ginamit na tubig", "Gamitin sa araw ding iyon. Huwag iimbak."],
    ],
    neverTitle: "Huwag kailanman",
    neverItems: [
      "Huwag inumin, ipangluto, o ipampaligo ang inipong tubig-ulan o ginamit na tubig.",
      "Huwag gamitin ulit ang tubig mula sa lababo ng kusina (may mantika) o mula sa inidoro.",
      "Huwag iimbak sa drum ang ginamit na tubig.",
      "Huwag i-spray ang ginamit na tubig, at huwag idilig sa gulay na kinakain nang hilaw.",
    ],
    drumTitle: "Mga patakaran sa drum ng tubig-ulan",
    drumItems: [
      "Tubig-ulan lang ang ilagay.",
      "Laging may takip, para hindi pamahayan ng lamok.",
      "Palipasin muna ang unang ilang minuto ng ulan bago sahurin.",
      `Lagyan ng label: "${DRUM_LABEL}".`,
      "Ihiwalay sa inuming tubig.",
      "Gamitin at palitan ang laman tuwing ilang linggo.",
    ],
    readyTitle: "Maging handa kapag nawalan ng tubig",
    readyText:
      "Ang tatlong drum na may takip (tig-200 L) ay sapat sa pag-flush at paglalaba ng pamilyang may limang miyembro nang mga 3 araw kapag nawalan ng tubig sa gripo. Mabuti ring mag-ipon ng tubig-gripo bago ang bagyo, pero ihiwalay ito: iyon ang pang-inom.",
    askText: "Kung kasali ang inyong barangay sa pilot, magtanong sa inyong barangay health worker tungkol sa libreng takip ng drum.",
    print: "I-print ang card",
    draftNote: "Draft na salin. Kailangang suriin ng katutubong nagsasalita bago i-print.",
    footer: "Gabay lamang. Hindi nito pinatutunayang ligtas inumin ang tubig.",
  },
  war: {
    langName: "Waray",
    draft: true,
    title: "Gamita liwat an tubig, ha luwas nga paagi",
    intro: "Damo nga tubig ha balay an diri kinahanglan nga mainom. An binanlawan ngan an tubig-uran puydi gamiton liwat pag-flush, paglimpyo ngan pagbubu ha tanom.",
    doTitle: "Buhata ini",
    doItems: [
      ["Binanlawan han labada", "Pag-flush han kasilyas"],
      ["Tubig tikang ha pagdigo", "Pagbubu ha tanom: ibubu ha tuna, diri ha dahon"],
      ["Tubig-uran ha drum nga may takop", "Pag-flush, paglimpyo han salog, paglaba, pagbubu ha tanom"],
      ["Tubig nga natulo tikang ha aircon", "Pagbubu ha tanom o paglimpyo han salog"],
      ["Gin-gamit na nga tubig", "Gamita ha sugad nga adlaw. Ayaw tipiga."],
    ],
    neverTitle: "Ayaw gud",
    neverItems: [
      "Ayaw inuma, ayaw iluto, ngan ayaw ipandigo an tinipigan nga tubig-uran o gin-gamit na nga tubig.",
      "Ayaw na gamita liwat an tubig tikang ha lababo han kusina (may mantika) o tikang ha kasilyas.",
      "Ayaw tipiga ha drum an gin-gamit na nga tubig.",
      "Ayaw iwisik an gin-gamit na nga tubig, ngan ayaw ibubu ha utanon nga ginkakaon nga hilaw.",
    ],
    drumTitle: "Mga sumbanan ha drum han tubig-uran",
    drumItems: [
      "Tubig-uran la an ibutang.",
      "Pirme may takop, para diri pangitlogan han namok.",
      "Pabay-i anay an siyahan nga pipira ka minuto han uran antes sahuron.",
      `Butangi hin label: "${DRUM_LABEL}".`,
      "Ibulag tikang ha tubig nga iinumon.",
      "Gamita ngan bag-oha an sulod kada pipira ka semana.",
    ],
    readyTitle: "Pag-andam kun mawara an tubig",
    readyText:
      "An tulo nga drum nga may takop (200 L kada usa) igo para ha pag-flush ngan paglaba han pamilya nga lima ka myembro ha mga tulo ka adlaw kun mawara an tubig ha gripo. Maupay liwat magtipig hin tubig-gripo antes han bagyo, pero ibulag ini: amo ito an iinumon.",
    askText: "Kun kaapi an iyo barangay ha pilot, pakianhi an iyo barangay health worker mahitungod han libre nga takop han drum.",
    print: "I-print an card",
    draftNote: "Draft nga hubad. Kinahanglan susihon han lumad nga nagyayakan antes i-print.",
    footer: "Giya la ini. Diri ini nagpapamatuod nga luwas inumon an tubig.",
  },
};
