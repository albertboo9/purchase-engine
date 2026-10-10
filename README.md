# purchase-engine — passerelle de paiement Studies Learning

Page de paiement unique de l'écosystème (ADR-0004) : elle affiche le contexte d'achat fourni par l'agrégateur
(prix et devise décidés par le serveur, jamais par le navigateur), applique les codes promo, puis lance le paiement
auprès du prestataire choisi (mobile money, carte). Pages de retour `/success`, `/cancel`, `/failed` qui ramènent
l'apprenant à sa formation.

Types d'achat : formation individuelle (`B2C_COURSE`), place admise et frais de candidature (`ADMISSION_OFFER`,
`ADMISSION_FEE`), offres B2B (licences, packages) — une stratégie par type dans `src/components/checkout-strategies`.

## Démarrage

```bash
cp .env.example .env.local   # URL de l'agrégateur et du frontend Studies Learning
npm ci
npm run dev                  # port 3005 dans la pile locale
```

## Qualité

`npx tsc --noEmit` et `npx eslint <fichiers modifiés>` ; la CI GitHub les rejoue sur chaque PR.
Next.js récent : voir `AGENTS.md` avant de modifier le routage ou la configuration.

## Règles

- Libellés : jamais « Acheter » ; « S'inscrire », « Commencer », « Se former ».
- Aucune variable secrète côté client : seules des URL publiques (`NEXT_PUBLIC_*`).
