# grow. — Symulator inwestowania w krypto i na GPW

> Ucz się inwestowania bez ryzyka. Wirtualny portfel, prawdziwe notowania krypto i polskiej giełdy, lekcje, quizy oraz praktyczne wskazówki.
> **Wersja 100% lokalna — bez bazy danych, bez backendu, gotowa na GitHub Pages.**

## 🚀 Jak to działa teraz?

- **Brak bazy danych** — cały stan gry (portfel, pozycje, transakcje, XP, ukończone lekcje) trzymany jest w `localStorage` przeglądarki.
- **Brak API routes** — aplikacja jest w pełni statyczna (`output: export` w Next.js).
- **Dane rynkowe live w przeglądarce:**
  - **Krypto (BTC, ETH, SOL, XRP, BNB)** — bezpośrednio z CoinGecko API (CORS-friendly) + fallback Binance + NBP dla USD/PLN.
  - **GPW (PKN, PKO, CDR, KGH, PZU, ALE)** — Yahoo Finance blokuje CORS, więc w wersji przeglądarkowej używamy realistycznych danych demonstracyjnych z losowym random-walk. Na serwerze (stara wersja) były prawdziwe notowania — teraz, żeby działało na GitHub Pages bez proxy, jest tryb offline, który i tak pozwala ćwiczyć handel.
- **Handel** — `getFreshQuote` pobiera aktualną cenę przed każdą transakcją (CoinGecko dla krypto, demo dla GPW).

## 📦 Uruchomienie lokalne (bez bazy!)

```bash
# 1. zainstaluj zależności
npm install

# 2. dev server (działa na http://localhost:3000)
npm run dev

# 3. build statyczny (folder out/)
npm run build
# lub podgląd produkcyjny
npm run start
```

Wszystko działa lokalnie, nie musisz ustawiać `DATABASE_URL`, Dockera, Postgresa itd.

## 🌐 GitHub Pages

Projekt jest przygotowany pod GitHub Pages z repozytorium `rejson59/Grow` → URL będzie `https://rejson59.github.io/Grow/`.

### Co zrobiono, żeby działało na Pages:

1. **`next.config.ts`**:
   ```ts
   {
     output: "export",
     images: { unoptimized: true },
     trailingSlash: true,
     basePath: process.env.GITHUB_PAGES ? "/Grow" : "",
     assetPrefix: process.env.GITHUB_PAGES ? "/Grow/" : undefined,
   }
   ```
2. **Usunięto** `src/app/api/` i `src/db/` — API nie działa na statycznym hostingu.
3. **Przepisano logikę** na:
   - `src/lib/market-client.ts` — fetchuje dane rynkowe w przeglądarce, z fallbackiem na mock GPW
   - `src/lib/game-local.ts` — cała logika portfela w localStorage (deposit, withdraw, trade, lesson, reset)
4. **Workflow** `.github/workflows/pages.yml` — buduje `npm run build:pages` i deployuje `out/` na GitHub Pages.

### Jak włączyć Pages w repo:

1. Wejdź w **Settings → Pages**
2. W **Build and deployment** wybierz **GitHub Actions** (nie Deploy from branch)
3. Push na `main` — workflow zbuduje i wdroży automatycznie.
4. Alternatywnie możesz ręcznie: `npm run build:pages` i wrzucić zawartość `out/` na branch `gh-pages`, ale workflow robi to za Ciebie.

Lokalnie Pages build przetestujesz:

```bash
GITHUB_PAGES=true npm run build
npx serve out
# otwórz http://localhost:3000/Grow/  (zwróć uwagę na /Grow/)
```

Dla deva bez basePath po prostu `npm run dev` i `http://localhost:3000`.

## 📁 Struktura

```
src/
  app/
    page.tsx          # teraz tylko <Dashboard initialMarket={null} />
    layout.tsx
    globals.css
  components/
    dashboard.tsx     # cała aplikacja, teraz używa game-local + market-client
  lib/
    content.ts        # definicje aktywów, lekcji, tipów
    game-types.ts     # typy GameState itd.
    game-local.ts     # logika portfela w localStorage
    market-client.ts  # pobieranie notowań w przeglądarce + mock GPW
```

## 🧠 Tryb offline GPW

Yahoo Finance (`query1.finance.yahoo.com`) nie wysyła `Access-Control-Allow-Origin`, więc fetch z przeglądarki kończy się CORS error. Dlatego:

- Jeśli fetch się uda (np. przez rozszerzenie CORS lub w przyszłości), użyjemy prawdziwych danych.
- Jeśli nie — generujemy `generateMockStockQuote` i `generateMockChart` z bazowymi cenami:
  - PKN ~64.8, PKO ~56.2, CDR ~118.5, KGH ~129.7, PZU ~45.3, ALE ~32.1
  - z random walk ±2% i sparkline.

Dzięki temu aplikacja zawsze działa, nawet bez internetu dla GPW, a krypto dalej próbuje pobrać live z CoinGecko.

## 🔧 Reset i dane

- Dane są w `localStorage` pod kluczem `grow_game_state_v1`.
- Reset w UI (Portfel → Zresetuj symulację) czyści wszystko i przywraca 25 000 PLN.
- Możesz też w konsoli: `localStorage.removeItem('grow_game_state_v1')`

## 📝 Licencja / Disclaimer

To symulacja edukacyjna. To nie jest porada inwestycyjna. Inwestowanie wiąże się z ryzykiem. Dane: CoinGecko, Binance, NBP, Yahoo Finance (gdzie CORS pozwala).
