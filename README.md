# MaatwerkKunststof.nl

Volledig publicatieproject met de goedgekeurde website van 16 september 2026.

## Bronbestanden en bouwen

De actuele pagina's staan als volledige HTML-documenten in `src/`. CSS, JavaScript en afbeeldingen staan in `src/assets/`. Dit project gebruikt Eleventy, maar verwerkt deze HTML niet meer via de oude Nunjucks-templates. De oude templates zijn bewust vervangen om de rechtstreeks in HTML gemaakte wijzigingen te behouden.

```sh
npm ci
npm run build
```

De build schrijft de website naar `_site/`. `npm run dev` start de lokale ontwikkelserver. Wijzig voor toekomstig werk de bestanden in `src/`, niet alleen die in `_site/`.

`src/sitemap.xml` wordt ongewijzigd overgenomen. Werk dit bestand bij wanneer pagina's worden toegevoegd, verwijderd of verplaatst. `robots.txt`, `_headers`, `_redirects`, `llms.txt`, `agents.md` en `404.html` worden eveneens overgenomen.

Headers, navigatie en footers staan in de afzonderlijke HTML-pagina's. Een gedeelde wijziging moet daarom op alle betrokken pagina's worden doorgevoerd.

## Publiceren via de GitHub-repository

Repository: https://github.com/website-voorbeelden/preview-maatwerkkunststof

Deze map bevat het volledige project voor de preview-repository. Controleer voor commit/push of de remote branch intussen nieuwe wijzigingen heeft; verwerk die zonder force-push en zonder de actuele website terug te vervangen door oude templates.

Neem de volledige wijziging mee: `src/`, `eleventy.config.js` en documentatie. Herstel de verwijderde `.njk`-templates niet. De `_site/`-map is gebouwde uitvoer en blijft via `.gitignore` uitgesloten van commits.

De bestaande Cloudflare Pages-instellingen kunnen blijven:

- Build command: `npm run build`
- Build output directory: `_site`
- Root directory: repository-root
- Node.js: 20 of hoger

## Offerteverwerking

De bestaande map `functions/` is ongewijzigd behouden. `functions/api/offerte.js` verwerkt aanvragen op `/api/offerte` via Resend. Publiceer het volledige project, niet alleen `_site/`, zodat de functie bij de deployment blijft horen.

Behoud de bestaande Cloudflare-variabelen en secrets: `RESEND_API_KEY`, `OFFERTES_TO_EMAIL`, `OFFERTES_FROM_EMAIL` en eventueel `SEND_CONFIRMATION`. Deze map bevat geen nieuw ingestelde secrets. Gebruik voor lokale ontwikkeling uitsluitend eigen lokale variabelen; zet sleutels nooit in GitHub.

## Uitgevoerde buildcontrole

`npm run build` is uitgevoerd met de al lokaal geïnstalleerde Eleventy 3.1.6. Alle 170 uitvoerbestanden zijn byte voor byte vergeleken met de bijgewerkte website in de naastgelegen map `maatwerkkunststof`: geen ontbrekende, extra of afwijkende bestanden.

De offertefuncties en het dependency-lockbestand zijn ongewijzigd ten opzichte van het oorspronkelijke lokale project. Er zijn geen proefaanvragen verstuurd en er is niet gepubliceerd.
