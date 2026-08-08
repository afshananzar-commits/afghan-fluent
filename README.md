# Afghan Fluent — Final UI build

Een complete React/Vite taalapp gebaseerd op de 1.000 woorden + 400 zinnen uit de meegeleverde dataset.

## Functies
- Vandaag-dashboard en streak
- Leerpad A1/A2
- 1.000 flashcards met zoeken, categorieën, favorieten en beheersing
- 400 zinnen met validatiestatus en audio
- Praktische grammatica
- Uitspraaktraining via browser TTS + SpeechRecognition waar ondersteund
- Volwassen/Kids mode
- Lokale voortgang via localStorage
- Responsive mobiele interface in de Afghan-Japandi stijl van de finale mockup

## Starten
```bash
npm install
npm run dev
```

## Productiebuild
```bash
npm run build
```

## Deployen
De map kan rechtstreeks worden gekoppeld aan GitHub/Vercel. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.

## Dataset
`src/vocabulary.json` bevat 1.000 woorden en `src/sentences.json` bevat 400 zinnen, overgenomen uit de aangeleverde Excel-dataset. Niet-gevalideerde content wordt in de app gemarkeerd.
