// Household guidance card, kept in step with hackathon-backend/config/reuse.php (the safety tiers).
// Filipino and Waray are DRAFT translations: have a native speaker review them before printing.

export type Lang = "en" | "fil" | "war";

export type GuideText = {
  langName: string;
  draft: boolean;
  title: string;
  intro: string;
  greyTitle: string;
  greyIntro: string;
  greyYesTitle: string;
  greyYes: string[];
  greyNoTitle: string;
  greyNo: string[];
  startTitle: string;
  startItems: string[];
  gainTitle: string;
  gainItems: string[];
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
    greyTitle: "What counts as greywater?",
    greyIntro: "Greywater is water you have already used once that is still fairly clean. Reuse it the same day; never store it.",
    greyYesTitle: "Greywater you can reuse",
    greyYes: [
      "Shower and bath water",
      "Laundry rinse water (the clearer rinses after washing)",
      "Bathroom sink water from washing hands or face",
    ],
    greyNoTitle: "Not greywater: never reuse",
    greyNo: [
      "Toilet water",
      "Kitchen sink and dishwashing water (grease and food scraps)",
      "Water from washing diapers or very soiled clothes",
      "Water with bleach or strong cleaners",
    ],
    startTitle: "Start in 10 minutes",
    startItems: [
      "Rain: put a drum with a lid under the roof edge or downspout. Let the first few minutes of rain run off before you fill it.",
      `Keep it covered with the lid or a tied cloth, and label it "${DRUM_LABEL}".`,
      "Rinse water: catch the last laundry rinse in a basin and use it to flush the toilet the same day.",
      "Shower water: pour it on the soil around plants, the same day.",
    ],
    gainTitle: "What's in it for your household",
    gainItems: [
      "Your toilet keeps working when the water stops: three covered drums give a family of five about 3 days of flushing and washing.",
      "A smaller water bill: reusing rinse water saves a family of five about ₱60 a month at water-district base rates.",
      "Fewer mosquitoes: covering water containers follows the DOH's dengue-prevention advice.",
      "A free drum cover if your barangay is in the pilot, and your barangay's readiness shows on the city map.",
    ],
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
    greyTitle: "Ano ang greywater?",
    greyIntro: "Ang greywater ay tubig na nagamit na nang isang beses pero medyo malinis pa. Gamitin ulit sa araw ding iyon; huwag iimbak.",
    greyYesTitle: "Greywater na puwedeng gamitin ulit",
    greyYes: [
      "Tubig mula sa paliligo",
      "Pinagbanlawan ng labada (ang mas malinaw na banlaw pagkatapos maglaba)",
      "Tubig mula sa lababo ng banyo na pinaghugasan ng kamay o mukha",
    ],
    greyNoTitle: "Hindi greywater: huwag kailanman gamitin ulit",
    greyNo: [
      "Tubig mula sa inidoro",
      "Tubig mula sa lababo ng kusina at pinaghugasan ng pinggan (may mantika at tira-tirang pagkain)",
      "Tubig na pinaglabhan ng lampin o maruruming damit",
      "Tubig na may bleach o matapang na panlinis",
    ],
    startTitle: "Simulan sa loob ng 10 minuto",
    startItems: [
      "Ulan: maglagay ng drum na may takip sa ilalim ng alulod o gilid ng bubong. Palipasin muna ang unang ilang minuto ng ulan bago sahurin.",
      `Laging takpan ng takip o nakataling tela, at lagyan ng label: "${DRUM_LABEL}".`,
      "Pinagbanlawan: saluhin sa palanggana ang huling banlaw ng labada at gamitin itong pang-flush sa araw ding iyon.",
      "Tubig mula sa paliligo: ibuhos sa lupa sa paligid ng halaman, sa araw ding iyon.",
    ],
    gainTitle: "Ano ang pakinabang sa inyong pamilya",
    gainItems: [
      "Gumagana pa rin ang inidoro kapag nawalan ng tubig: ang tatlong drum na may takip ay sapat sa pamilyang may lima nang mga 3 araw.",
      "Mas mababang bayarin sa tubig: ang paggamit ulit ng pinagbanlawan ay makatitipid nang mga ₱60 kada buwan sa pamilyang may lima.",
      "Mas kaunting lamok: ang pagtatakip ng lalagyan ng tubig ay ayon sa payo ng DOH laban sa dengue.",
      "Libreng takip ng drum kung kasali ang inyong barangay sa pilot, at makikita sa mapa ng lungsod ang kahandaan ng inyong barangay.",
    ],
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
    greyTitle: "Ano an greywater?",
    greyIntro: "An greywater amo an tubig nga nagamit na hin makausa pero medyo malimpyo pa. Gamita liwat ha sugad nga adlaw; ayaw tipiga.",
    greyYesTitle: "Greywater nga puydi gamiton liwat",
    greyYes: [
      "Tubig tikang ha pagdigo",
      "Binanlawan han labada (an mas matin-aw nga banlaw kahuman maglaba)",
      "Tubig tikang ha lababo han banyo nga ginhugasan han kamot o bayhon",
    ],
    greyNoTitle: "Diri greywater: ayaw gud gamita liwat",
    greyNo: [
      "Tubig tikang ha kasilyas",
      "Tubig tikang ha lababo han kusina ngan ginhugasan han pinggan (may mantika ngan sobra nga pagkaon)",
      "Tubig nga ginlabhan han lampin o mahugaw gud nga bado",
      "Tubig nga may bleach o makusog nga panlimpyo",
    ],
    startTitle: "Tikanga ha sulod hin 10 minuto",
    startItems: [
      "Uran: butangi hin drum nga may takop ha ilarom han alulod o sidsid han atop. Pabay-i anay an siyahan nga pipira ka minuto han uran antes sahuron.",
      `Pirme takpi hin takop o tela nga gin-higot, ngan butangi hin label: "${DRUM_LABEL}".`,
      "Binanlawan: sahura ha palanggana an urhi nga banlaw han labada ngan gamita pag-flush ha sugad nga adlaw.",
      "Tubig tikang ha pagdigo: ibubu ha tuna palibot han tanom, ha sugad nga adlaw.",
    ],
    gainTitle: "Ano an kaupayan para ha iyo pamilya",
    gainItems: [
      "Nagana gihapon an kasilyas kun mawara an tubig: an tulo nga drum nga may takop igo para ha pamilya nga lima ha mga tulo ka adlaw.",
      "Mas gutiay nga bayaran ha tubig: an paggamit liwat han binanlawan makakatipig hin mga ₱60 kada bulan para ha pamilya nga lima.",
      "Mas gutiay nga namok: an pagtakop han surudlan han tubig uyon ha tambag han DOH kontra dengue.",
      "Libre nga takop han drum kun kaapi an iyo barangay ha pilot, ngan makikita ha mapa han syudad an kahimanan han iyo barangay.",
    ],
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
