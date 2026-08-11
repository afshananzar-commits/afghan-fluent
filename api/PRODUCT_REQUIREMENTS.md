# Afghan Fluent — Product requirements v1

## Productdoel
Een aantrekkelijke, dagelijkse taalcoach waarmee volwassenen en kinderen Afghaans/Dari leren **verstaan en spreken**. Schrift leren is secundair. De primaire content bestaat uit circa 1.000 woorden, 400 veelgebruikte zinnen, praktische grammatica en audio.

## Kernprincipes
1. Spreken vóór schrijven.
2. Eén leerdoel per scherm.
3. Zeer korte sessies van 3–10 minuten.
4. Veel audio, visuele cues en herhaling.
5. Progressie moet duidelijk maar niet schools voelen.
6. Geschikt voor ouder + kind, zonder kinderachtig te zijn.
7. Content blijft extern beheerbaar en valideerbaar.

## Informatiearchitectuur
### Vandaag
Dagplan, streak, herhaalset, volgende les, snelle oefening.
### Leerpad
A1 basis -> A2 dagelijks -> thematische modules. Elke module: woorden, luisteren, uitspraak, zinnen, mini-grammatica, checkpoint.
### Woorden
Flashcards, ontdekmodus, quiz, categorieën, favorieten, afbeeldingen, audio, beheersstatus.
### Zinnen
Veelgebruikte zinnen per situatie, woord-voor-woord hulp, audio langzaam/normaal, favorieten.
### Grammatica
Kleine praktische lessen op basis van patronen, nooit lange theoriepagina's.
### Spreken
Luister-herhaal, opnemen, speech-to-text, vergelijkingsfeedback, moeilijke klanken.
### Profiel
Niveau, statistieken, persoonlijke doelen, ouder/kindprofielen, instellingen.

## Leermechaniek
- Spaced repetition engine: FSRS of vergelijkbaar.
- Status per item: Nieuw / Leren / Bijna / Beheerst.
- Dagelijkse queue combineert nieuw + due reviews + fouten.
- Maximaal 7 nieuwe woorden per mini-les voor kinderen; 10–15 voor volwassenen.
- Herhaling via meerdere modaliteiten: NL -> Afghaans, audio -> betekenis, beeld -> woord, zin aanvullen, spreken.
- Moeilijke woorden krijgen automatisch hogere frequentie.
- Checkpoints na 3–5 lessen.

## Woordmodel
Vereiste velden: id, Nederlands, fonetisch Afghaans, optioneel origineel schrift, categorie, subcategorie, voorbeeldzin NL, voorbeeldzin Afghaans fonetisch, audio_url, image_url/image_prompt, moeilijkheid, tags, validated.

## Zinnenmodel
id, Nederlands, Afghaans fonetisch, optioneel origineel schrift, situatie, niveau, audio langzaam, audio normaal, tags, woorden_in_zin, validated.

## Grammatica
Elke grammaticales bevat: titel, communicatief doel, patroon, maximaal 3 regels uitleg, 3–5 voorbeelden, audio, mini-oefening, spreekopdracht.

## Uitspraak
MVP: afspeelknop + langzaam/normaal + browser/TTS fallback.
V2: echte native audio.
V3: microfoonopname + speech-to-text + inhoudsscore + feedback op problematische woorden.
Belangrijk: geen pseudo-wetenschappelijke “accentscore”; feedback moet bruikbaar en voorzichtig geformuleerd zijn.

## Oefentypen
Flashcard; meerkeuze; luister en kies; beeld en kies; NL -> Afghaans; Afghaans -> NL; zin op volgorde; ontbrekend woord; luister en typ/kies; spreek na; mini-dialogen.

## Family mode
Meerdere profielen op één account. Kindprofiel toont grotere visuals, minder tekst, kortere sessies, stickers/badges. Volwassen profiel toont meer uitleg, statistiek en grammatica. Contentbasis blijft dezelfde.

## Gamification
Streak, XP optioneel, weekdoel, badges, modulekaart, persoonlijke records. Geen agressieve verliesmechanismen. Streak freeze optioneel.

## AI-functies
- “Leg dit simpeler uit”.
- Genereer extra oefenzin op huidig vocabulaire.
- Gesprekscoach binnen bekende woorden/niveau.
- Uitspraak/speech feedback met transcriptie.
- Automatisch content taggen of concept-oefeningen genereren; publicatie pas na validatie.
AI mag de gevalideerde woordenlijst niet stilzwijgend overschrijven.

## Zoek- en filterfuncties
Zoek NL of fonetisch Afghaans. Filter categorie, niveau, status, favoriet, moeilijk. Sorteren op alfabet, nieuw, laatste oefening, moeilijkheid.

## Offline/PWA
App installable als PWA. Kernlessen en gedownloade audio offline beschikbaar. Progressie later synchroniseren.

## Accessibility
Minimale touch targets 44px; voldoende contrast; schaalbare tekst; audio nooit enige informatiedrager; microfoonfunctionaliteit heeft tekstalternatief.

## Analytics
Daily active learner, sessielengte, lessons completed, review accuracy, pronunciation attempts, mastery, retention D1/D7/D30, drop-off per exercise. Geen onnodige tracking van kinderen.

## Contentbeheer
Excel/OneDrive blijft bron voor handmatige validatie in eerste fase. Een importscript/API transformeert de sheet naar genormaliseerde JSON of database records. Validated=false wordt niet aan eindgebruikers getoond.

## Technische architectuur
Frontend: React/Vite of Next.js, mobile-first PWA. Backend V2: Supabase/Postgres. Auth: magic link/social optioneel. Storage voor audio/beelden. Content importer vanuit Excel/CSV. Speech: Whisper/Realtime of andere STT-laag. Audio: native recordings waar beschikbaar, TTS als fallback.

## Look & feel
“Warm Afghan Japandi”: crème, zand, saliegroen, terracotta, donker olijfgroen. Zachte afgeronde kaarten, tactiele iconografie, veel witruimte. Subtiele bogen en geometrische patronen geïnspireerd op Afghaanse architectuur/textiel, zonder drukke folklorestijl. Fotografie/illustraties vriendelijk, helder, eenvoudig en herkenbaar voor kinderen. Typography: expressieve serif voor koppen + rustige sans-serif voor UI.

## MVP acceptatiecriteria
- gebruiker kan door Vandaag, Leerpad, Woorden, Zinnen, Grammatica, Uitspraak navigeren;
- flashcards werken en items kunnen als gekend worden gemarkeerd;
- zoeken in vocabulaire werkt;
- audio kan worden afgespeeld via minimaal TTS/fallback;
- progressie kan lokaal worden opgeslagen (volgende sprint);
- responsive op iPhone en desktop;
- contentlaag is los van UI voorbereid;
- build deployt succesvol op Vercel.

## Roadmap
MVP: UX shell + flashcards + zinnen + grammatica + audio fallback.
V1: volledige 1.000 woorden/400 zinnen import, categorieën, lokale progressie, images.
V1.5: accounts, family profiles, FSRS, echte audio.
V2: speech recognition, uitspraakfeedback, AI-dialogen, offline PWA.
V3: admin/content pipeline, uitgebreide analytics, personalisatie.
