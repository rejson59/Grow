export type AssetCategory = "crypto" | "stock";

export type AssetDefinition = {
  symbol: string;
  name: string;
  ticker: string;
  category: AssetCategory;
  marketSymbol: string;
  coinId?: string;
  mark: string;
  color: string;
  background: string;
};

export const ASSETS: AssetDefinition[] = [
  { symbol: "BTC", name: "Bitcoin", ticker: "BTC", category: "crypto", marketSymbol: "BTCUSDT", coinId: "bitcoin", mark: "₿", color: "#f59e0b", background: "#fff3dc" },
  { symbol: "ETH", name: "Ethereum", ticker: "ETH", category: "crypto", marketSymbol: "ETHUSDT", coinId: "ethereum", mark: "Ξ", color: "#6676c8", background: "#ecefff" },
  { symbol: "SOL", name: "Solana", ticker: "SOL", category: "crypto", marketSymbol: "SOLUSDT", coinId: "solana", mark: "◎", color: "#7c5ce0", background: "#f0eaff" },
  { symbol: "XRP", name: "XRP", ticker: "XRP", category: "crypto", marketSymbol: "XRPUSDT", coinId: "ripple", mark: "✕", color: "#273e54", background: "#e9eef2" },
  { symbol: "BNB", name: "BNB", ticker: "BNB", category: "crypto", marketSymbol: "BNBUSDT", coinId: "binancecoin", mark: "◆", color: "#d9a51e", background: "#fff7dc" },
  { symbol: "PKN", name: "ORLEN", ticker: "PKN", category: "stock", marketSymbol: "PKN.WA", mark: "O", color: "#d33e4a", background: "#fcebee" },
  { symbol: "PKO", name: "PKO Bank Polski", ticker: "PKO", category: "stock", marketSymbol: "PKO.WA", mark: "P", color: "#1f6cc0", background: "#e8f1ff" },
  { symbol: "CDR", name: "CD PROJEKT", ticker: "CDR", category: "stock", marketSymbol: "CDR.WA", mark: "C", color: "#e24946", background: "#ffedeb" },
  { symbol: "KGH", name: "KGHM", ticker: "KGH", category: "stock", marketSymbol: "KGH.WA", mark: "K", color: "#b1662c", background: "#fff0e4" },
  { symbol: "PZU", name: "PZU", ticker: "PZU", category: "stock", marketSymbol: "PZU.WA", mark: "P", color: "#2190bb", background: "#e5f6fd" },
  { symbol: "ALE", name: "Allegro", ticker: "ALE", category: "stock", marketSymbol: "ALE.WA", mark: "a", color: "#fa681d", background: "#fff0e5" },
];

export const getAsset = (symbol: string) => ASSETS.find((asset) => asset.symbol === symbol);

export type Lesson = {
  id: string;
  number: string;
  title: string;
  description: string;
  category: string;
  minutes: number;
  xp: number;
  accent: string;
  icon: string;
  sections: { heading: string; body: string }[];
  takeaway: string;
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
};

export const LESSONS: Lesson[] = [
  {
    id: "start", number: "01", title: "Pierwsze kroki", description: "Czym tak naprawdę jest inwestowanie i od czego zacząć?", category: "PODSTAWY", minutes: 4, xp: 50, accent: "mint", icon: "sparkles",
    sections: [
      { heading: "Pieniądze, które pracują", body: "Inwestowanie to przeznaczanie kapitału na aktywa z nadzieją, że z czasem zyskają na wartości lub przyniosą dochód. Nie jest to jednak obietnica zysku — wartość inwestycji może też spaść." },
      { heading: "Akcje i kryptowaluty", body: "Akcja oznacza udział w spółce. Jej cena zmienia się na giełdzie w zależności m.in. od wyników firmy i oczekiwań inwestorów. Kryptowaluta jest cyfrowym aktywem działającym w sieci blockchain; nie daje udziału w spółce." },
      { heading: "Zacznij od planu", body: "Zanim wydasz pierwszą wirtualną złotówkę, określ cel, horyzont czasowy i kwotę, której utratę jesteś w stanie zaakceptować. W tej grze możesz ćwiczyć decyzje bez ryzyka utraty prawdziwych pieniędzy." },
    ],
    takeaway: "Inwestowanie wiąże się z ryzykiem. Najpierw zrozum aktywo, potem podejmij decyzję.",
    question: "Co oznacza posiadanie akcji spółki?", answers: ["Gwarancję corocznego zysku", "Udział we własności spółki", "Pożyczkę dla giełdy"], correct: 1,
    explanation: "Akcja jest udziałem w spółce. Nie gwarantuje zysku ani dywidendy.",
  },
  {
    id: "gpw", number: "02", title: "Poznaj polską giełdę", description: "Akcje, notowania i sesja na warszawskim parkiecie.", category: "GPW", minutes: 5, xp: 60, accent: "blue", icon: "building",
    sections: [
      { heading: "Czym jest GPW?", body: "Giełda Papierów Wartościowych w Warszawie organizuje obrót m.in. akcjami polskich spółek. W symulatorze obserwujesz znane firmy: ORLEN, PKO BP, CD PROJEKT, KGHM, PZU i Allegro." },
      { heading: "Sesja ma swoje godziny", body: "Rynek akcji nie działa całą dobę. Standardowa sesja giełdowa trwa w dni robocze, a poza nią widzisz ostatni dostępny kurs. Notowania z bezpłatnych źródeł mogą być opóźnione." },
      { heading: "Cena to nie wszystko", body: "Kurs akcji zmienia się pod wpływem podaży i popytu, wyników spółki, sytuacji gospodarczej i nastrojów. Sama niska cena jednej akcji nie oznacza, że spółka jest tania." },
    ],
    takeaway: "Kurs akcji nie stoi w miejscu, a poza sesją możesz widzieć cenę z ostatniego dnia handlu.",
    question: "Co bezpośrednio wpływa na cenę akcji na giełdzie?", answers: ["Podaż i popyt na akcje", "Liczba liter w nazwie spółki", "Zawsze tylko cena Bitcoina"], correct: 0,
    explanation: "Cena powstaje z ofert kupna i sprzedaży, na które wpływa wiele czynników.",
  },
  {
    id: "crypto", number: "03", title: "Krypto bez chaosu", description: "Blockchain, zmienność i bezpieczeństwo w prostych słowach.", category: "KRYPTO", minutes: 5, xp: 60, accent: "violet", icon: "bitcoin",
    sections: [
      { heading: "Rynek, który nie śpi", body: "Kryptowaluty są notowane przez całą dobę, także w weekendy. Bitcoin, Ethereum i inne aktywa cyfrowe potrafią zmieniać cenę znacznie szybciej niż wiele tradycyjnych instrumentów." },
      { heading: "Blockchain i portfel", body: "Blockchain to rozproszony rejestr transakcji. W realnym świecie dostęp do kryptowalut kontrolują klucze prywatne — utrata kluczy może oznaczać utratę środków. Tutaj ćwiczysz tylko na wirtualnym portfelu." },
      { heading: "Nie myl wzrostu z pewnością", body: "Silny wzrost w przeszłości nie oznacza, że cena będzie nadal rosła. Zwracaj uwagę na płynność, ryzyko projektu i własną tolerancję na stratę." },
    ],
    takeaway: "Krypto działa 24/7, ale większa dostępność nie oznacza mniejszego ryzyka.",
    question: "Kiedy można obserwować notowania kryptowalut?", answers: ["Tylko w dni robocze", "Tylko podczas sesji GPW", "Przez całą dobę, 7 dni w tygodniu"], correct: 2,
    explanation: "Rynek kryptowalut działa 24/7, także w soboty i niedziele.",
  },
  {
    id: "risk", number: "04", title: "Oswój ryzyko", description: "Naucz się chronić kapitał i rozpoznawać pułapki.", category: "STRATEGIA", minutes: 6, xp: 70, accent: "orange", icon: "shield",
    sections: [
      { heading: "Nie inwestuj pieniędzy na życie", body: "W realnym świecie najpierw warto zadbać o poduszkę finansową i codzienne potrzeby. W inwestycjach używaj środków, których chwilowa lub trwała utrata nie zburzy twojego budżetu." },
      { heading: "Wielkość pozycji ma znaczenie", body: "Jeśli przeznaczysz cały kapitał na jedno aktywo, pojedynczy spadek mocno uderzy w portfel. Mniejsza pozycja ogranicza skalę potencjalnej straty, choć nie eliminuje ryzyka." },
      { heading: "Zmiana ceny ≠ strata zrealizowana", body: "Dopóki nie sprzedasz aktywa, zmiana jego wyceny jest niezrealizowanym zyskiem lub stratą. Przy sprzedaży wynik staje się zrealizowany. Pamiętaj, że realny handel wiąże się też z opłatami i podatkami." },
    ],
    takeaway: "Najważniejsza zasada: przetrwaj na rynku wystarczająco długo, by móc się uczyć.",
    question: "Co zwiększa ryzyko koncentracji portfela?", answers: ["Kupno różnych aktywów", "Włożenie całego kapitału w jeden token", "Pozostawienie części środków w gotówce"], correct: 1,
    explanation: "Jedna duża pozycja sprawia, że wynik portfela zależy mocno od jednego aktywa.",
  },
  {
    id: "diversification", number: "05", title: "Siła dywersyfikacji", description: "Dlaczego nie warto stawiać wszystkiego na jedną kartę?", category: "STRATEGIA", minutes: 5, xp: 70, accent: "mint", icon: "layers",
    sections: [
      { heading: "Nie wkładaj wszystkich jajek do jednego koszyka", body: "Dywersyfikacja polega na podziale środków pomiędzy różne aktywa, branże lub rodzaje inwestycji. Dzięki temu pojedynczy słaby wynik nie musi przesądzać o całym portfelu." },
      { heading: "Różne nazwy to nie zawsze różne ryzyko", body: "Kupno kilku kryptowalut nie musi dawać dużej dywersyfikacji — ich ceny mogą spadać jednocześnie. Warto myśleć także o tym, jak silnie aktywa reagują na podobne zdarzenia." },
      { heading: "Nie ma magicznej liczby", body: "Sama dywersyfikacja nie gwarantuje zysku ani ochrony przed stratą. To sposób zarządzania ryzykiem, który należy dopasować do swojego celu i sytuacji." },
    ],
    takeaway: "Dywersyfikacja może ograniczać ryzyko pojedynczej pozycji, ale nie usuwa ryzyka rynkowego.",
    question: "Które zdanie o dywersyfikacji jest prawdziwe?", answers: ["Zawsze gwarantuje zysk", "Może ograniczyć wpływ pojedynczego aktywa", "Oznacza kupno tylko jednej spółki"], correct: 1,
    explanation: "Rozłożenie kapitału może zmniejszyć zależność od jednej inwestycji, ale nie daje gwarancji.",
  },
  {
    id: "strategy", number: "06", title: "Plan wygrywa z emocjami", description: "Cele, regularność i decyzje bez pośpiechu.", category: "STRATEGIA", minutes: 6, xp: 80, accent: "blue", icon: "target",
    sections: [
      { heading: "Zanim kupisz, zadaj sobie trzy pytania", body: "Dlaczego kupuję to aktywo? Na jak długo? Co zrobię, jeśli cena spadnie? Zapisany wcześniej plan pomaga unikać decyzji podejmowanych pod wpływem strachu lub FOMO." },
      { heading: "Regularność zamiast zgadywania", body: "Jedną z metod jest regularne inwestowanie podobnych kwot w ustalonych odstępach czasu (DCA). Rozkłada to moment zakupu na wiele dni, ale nie gwarantuje zysku i nie chroni przed długotrwałym spadkiem." },
      { heading: "Sprawdzaj, ale nie obsesyjnie", body: "Codzienne wahania cen są normalne. Dobrze co jakiś czas sprawdzić, czy proporcje portfela nadal odpowiadają twoim celom. W symulatorze eksperymentuj, obserwuj i wyciągaj wnioski." },
    ],
    takeaway: "Najlepsza strategia to taka, której zasady rozumiesz i potrafisz konsekwentnie przestrzegać.",
    question: "Co oznacza metoda DCA?", answers: ["Kupno wszystkiego naraz na szczycie", "Regularne zakupy za podobne kwoty", "Gwarantowany sposób na zysk"], correct: 1,
    explanation: "DCA to rozkładanie zakupów w czasie. Nie jest gwarancją dodatniego wyniku.",
  },
];

export const TIPS = [
  { label: "PODSTAWY", title: "Nie ścigaj zielonych świec", body: "Nagły wzrost ceny potrafi kusić. Zanim klikniesz „Kup”, sprawdź, co naprawdę stoi za ruchem i czy pasuje to do twojego planu." },
  { label: "RYZYKO", title: "Zostaw sobie oddech", body: "Nie musisz inwestować całego wirtualnego salda. Wolne środki dają elastyczność, gdy pojawi się nowa okazja lub rynek spadnie." },
  { label: "GPW", title: "Giełda robi sobie przerwy", body: "Akcje na GPW nie są notowane w nocy ani w weekend. Po sesji widzisz ostatni dostępny kurs, a darmowe notowania mogą być opóźnione." },
  { label: "KRYPTO", title: "24/7 nie oznacza bezpiecznie", body: "Krypto handluje się także w weekendy. Wysoka zmienność oznacza, że wartość pozycji może szybko wzrosnąć, ale i mocno spaść." },
  { label: "STRATEGIA", title: "Patrz na cały portfel", body: "Jedna rosnąca pozycja nie mówi wszystkiego. Sprawdzaj łączną wartość portfela, środki dostępne i wynik względem wpłat." },
  { label: "NAWYK", title: "Najpierw wiedza, potem ruch", body: "Poświęć kilka minut na lekcję przed pierwszą transakcją. Decyzja zrozumiana jest cenniejsza niż decyzja podjęta w pośpiechu." },
  { label: "PAMIĘTAJ", title: "Przeszłość nie obiecuje przyszłości", body: "Historyczny wykres pokazuje to, co już się wydarzyło. Żaden trend nie gwarantuje podobnego wyniku jutro." },
];
