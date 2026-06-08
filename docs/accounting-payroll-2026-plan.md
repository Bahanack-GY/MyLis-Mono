# SYSCOHADA + Cameroun 2026 — Plan d'implémentation

> Stack: NestJS + Sequelize (sequelize-typescript), React + TypeScript.
> Schéma: model-first. Appliquer avec `cd server && npx ts-node src/scripts/migrate.ts` (`sync({ alter: true })` — additif uniquement).
> ⚠️ Postgres + `sync` n'ajoute pas de valeurs aux ENUM existants → on utilise des `STRING` (union TS) + JSONB plutôt que de nouveaux enums.

**Séquence validée:** Epic A (auxiliaires) → Epic B (balance 6 colonnes) → Epic C (paie complète).
**Décisions:** paie = refonte complète · soldes d'ouverture = dynamique + journal d'à-nouveaux.

Principes transverses:
- Tous les nouveaux champs **nullable / valeur par défaut** → aucune écriture/paie existante cassée.
- Montants `DECIMAL(15,2)` (Sequelize renvoie une string → `Number()` systématique).
- Nouveaux endpoints **à côté** des anciens (l'ancienne balance reste tant que la 6-colonnes n'est pas adoptée).
- i18n: clés ajoutées dans `UI/src/i18n/locales/{fr,en}.json`.
- Accès: routes comptables `@Roles('MANAGER','ACCOUNTANT')` (existant).

---

## EPIC A — Auxiliarisation des comptes de tiers (fondation)

Objectif: la balance générale n'affiche que le **compte collectif** (411, 401, 421, 425); le **drill-down** déploie les auxiliaires nominatifs. Mécanisme = **double-indexation** (`general_account_id` + `auxiliary_account_id`) recommandée dans le rapport.

### A1 — Modèles / schéma
- `account.model.ts`: + `isCollective` BOOLEAN (def. false), + `thirdPartyType` STRING nullable (`'CLIENT'|'SUPPLIER'|'EMPLOYEE'`). Les auxiliaires = comptes enfants via `parentId` existant (isCollective=false, thirdPartyType renseigné).
- `journal-entry-line.model.ts`: + `auxiliaryAccountId` UUID FK→Account nullable. `accountId` reste le **collectif**; `auxiliaryAccountId` = le tiers. (Belongs-to `auxiliaryAccount`.)
- `client.model.ts`, `supplier.model.ts`, `employee.model.ts`: + `accountId` UUID FK→Account nullable (son compte auxiliaire).
- Marquer 411xxx / 401xxx / 421xxx / 425xxx comme `isCollective=true` dans le seed.

### A2 — Services backend
- `accounts.service.ts`:
  - `createAuxiliary(collectiveId, { thirdPartyType, thirdPartyId, name })` → crée un Account enfant, code auto = `racine collectif + séquence` (ex. `4111` → `4111001`, `4111002`), `isCollective=false`.
  - `resolveAuxiliary(collectiveCode, thirdPartyType, thirdPartyId)` → renvoie (ou crée à la volée) l'auxiliaire.
  - `listAuxiliaries(collectiveId)` (drill-down).
  - Garde-fou: un auxiliaire ne peut pas avoir d'enfants; on ne poste jamais en débit/crédit direct sur un collectif sans auxiliaire pour les classes de tiers.
- Auto-création de l'auxiliaire à la création d'un client/fournisseur/employé (hook dans `clients.service`, `suppliers` service, `employees.service`), + back-fill pour les tiers existants (script ponctuel).
- `journal-engine.service.ts`: à chaque imputation 411/401/421/425, résoudre l'auxiliaire depuis `clientId`/`supplierId`/`employeeId` et renseigner `auxiliaryAccountId` (collectif conservé dans `accountId`).

### A3 — Reports / concordance
- `reports.service.ts` `grandLivre`/`trialBalance`: GROUP BY `accountId` (collectif) par défaut.
- Nouvel endpoint `GET /accounting/reports/auxiliary-balance/:fiscalYearId/:collectiveAccountId` → détail nominatif (GROUP BY `auxiliaryAccountId`).
- **Sanity check de concordance**: solde collectif == Σ soldes auxiliaires (sinon warning/bloc).

### A4 — Frontend
- `ChartOfAccounts.tsx`: badge "Collectif"; clic → liste des auxiliaires.
- Balance & Grand Livre: lignes collectives repliables → expand = auxiliaires (réutilisé par Epic B).
- Formulaires Client/Fournisseur/Employé: afficher le compte auxiliaire (lecture seule, généré).

---

## EPIC B — Balance à 6 colonnes

Colonnes: `N° compte · Libellé · SI Débit · SI Crédit · Mvt Débit · Mvt Crédit · SF Débit · SF Crédit`.

### B1 — Soldes d'ouverture (dynamique + à-nouveaux)
- Journal **AN** (à-nouveaux) ajouté au seed des journaux. Sert au 1er exercice / migration / reprise.
- `sixColumnBalance(fiscalYearId, fromDate?, toDate?)` dans `reports.service.ts`:
  - **SI** = Σ écritures VALIDATED **antérieures** à `startDate` de la période (cross-exercice + journal AN) → orientées débit/crédit.
  - **M** = Σ débits / crédits **dans** la période.
  - **SF** via formules d'orientation du rapport:
    - compte débiteur: `SF_D = max(0, SI_D−SI_C + M_D−M_C)`, `SF_C=0`
    - compte créditeur: `SF_C = max(0, SI_C−SI_D + M_C−M_D)`, `SF_D=0`
    - nature dérivée de `account.type` (ASSET/EXPENSE→débiteur; LIABILITY/EQUITY/REVENUE→créditeur).
- **3 contrôles d'équilibre** renvoyés + bloquants pour la clôture: `ΣSI_D=ΣSI_C`, `ΣM_D=ΣM_C`, `ΣSF_D=ΣSF_C`.
- Endpoint `GET /accounting/reports/six-column-balance/:fiscalYearId?from=&to=&departmentId=`.

### B2 — Génération des à-nouveaux
- `POST /accounting/fiscal-years/:id/carry-forward` → crée l'écriture AN d'ouverture = soldes de clôture (SF) de l'exercice précédent (intangibilité du bilan d'ouverture). Idempotent.

### B3 — Frontend
- `Reports.tsx` BalanceTab: tableau 6 colonnes, 3 paires de totaux, indicateurs d'équilibre (3 ✓), filtre période (date range), export. Drill-down collectif→auxiliaire (Epic A).

---

## EPIC C — Paie Cameroun 2026 (refonte complète)

### C1 — Barème & constantes (`cameroon-tax.constants.ts`)
| Élément | Salarial | Patronal | Assiette / Plafond |
|---|---|---|---|
| CNPS Prestations familiales | 0% | **7%** | salaire cotisable, plafond 750 000/mois |
| CNPS PVID (vieillesse) | **4,2%** | **4,2%** | cotisable, plafond 750 000 |
| CNPS AT/MP | **0%** | **1,75 / 2,5 / 5%** (classe risque) | brut social, **non plafonné** |
| CFC | **1%** | **1,5%** | salaire taxable, non plafonné |
| FNE | 0% | **1%** | taxable, non plafonné |
| RAV | tranches | 0% | brut fiscal (barème mensuel) |
| TDL | tranches | 0% | salaire de base (barème) |
| IRPP | barème 10→35% + **10% CAC** | 0% | net catégoriel |

- **IRPP / net catégoriel**: brut global − abattement 30% frais pro (plafond 4 800 000/an) − PVID 4,2% (plafond 31 500/mois) − abattement 500 000/an, puis barème (0–2M:10% · 2–3M:15% · 3–5M:25% · >5M:35%), + 10% CAC, arrondi au franc.
- AT/MP **100% patronal** (jamais de part salariale — règle dure, bloquante).

### C2 — Structure de rémunération
- `employee.model.ts`: `baseSalary` (remplace l'usage de `salary` comme assiette; `salary` conservé = compat), `riskClass` (AT/MP), `contractType` STRING.
- Nouveau modèle `salary-component.model.ts` (par employé): `type` (`PRIME`|`INDEMNITE`|`AVANTAGE_NATURE`), `label`, `amount`, `taxable` BOOLEAN, `cnpsBase` BOOLEAN, `cap` (plafond légal), `justificatifUrl` nullable.
- Avantages en nature (évaluation forfaitaire sur brut taxable): logement 15%, véhicule 10%, nourriture 10%, électricité 4%, eau 2%, domestique 5%.
- Indemnités exonérées (transport, panier, représentation ≤10% base, salissure, déplacement) avec **plafonds** et **pièce justificative**.

### C3 — Calculateur (`payroll-calculator.service.ts`, refonte)
- Calcule: brut (base + primes + avantages), **cotisable** (plafonné), **taxable** (fiscal), **net catégoriel**.
- Décompose **chaque ligne** en part salariale / patronale (PF, PVID, AT/MP, CFC, FNE, RAV, TDL, IRPP, CAC).
- **Sanity checks** (bloquants/avertissements): indemnités exonérées > plafonds légaux ou sans justificatif → blocage de validation (anti-requalification).
- Sortie enrichie stockée en `details` JSONB (évite N nouvelles colonnes/enums).

### C4 — Modèles paie
- `payslip.model.ts`: + colonnes clés (`cnpsFamilyAllowance`, `pvidEmployee`, `pvidEmployer`, `atmp`, `fne`, `cfcEmployee`, `cfcEmployer`, `rav`, `tdl`, `cac`, `baseSalary`, `grossTaxable`, `grossCotisable`, `netCategoriel`) — toutes nullable; détail complet en `details` JSONB.
- `company-settings` (NIU, RCCM, raison sociale, classe risque par défaut, profil pays) → sort le PDF du hardcode.

### C5 — Comptabilisation (schéma 3 écritures, `journal-engine.service.ts`)
- **Écriture 1 (journal de paie)**: D 6611/6612/6638 · C 4211xxx (net, **nominatif** via Epic A), 4311 (PVID sal.), 4421 (IRPP+CAC), 4428 (CFC sal.+TDL+RAV), 4251 (acomptes).
- **Écriture 2 (charges patronales)**: D 6641 (CNPS pat.), 6413 (CFC pat.), 6414 (FNE) · C 4311 (CNPS pat.), 4428 (CFC+FNE).
- **Écriture 3 (règlement)**: D 4211xxx · C 5211 (banque).
- Seed à compléter: `425000`, `4311`, `4421`, `4428`, `6611`, `6612`, `6638`, `6641`, `6413`, `6414` (réconcilier avec 442000/447000/448000/645100 déjà utilisés par l'engine).

### C6 — Frontend / PDF
- `Payroll.tsx`: bulletin complet salarial/patronal (toutes les nouvelles lignes), édition des composants de rémunération + upload justificatifs, avertissements de conformité.
- `exportPayslipPdf.ts`: bulletin de paie Cameroun complet (charges patronales détaillées, net catégoriel, mentions légales depuis company-settings).
- Optionnel: **fichier de liaison comptable** (export) des écritures de centralisation.

---

## Ordre d'exécution & livraison
1. **A1→A2→A3→A4** (auxiliaires + drill-down) — migration + back-fill tiers.
2. **B1→B2→B3** (balance 6 colonnes + à-nouveaux).
3. **C1→C2→C3→C4→C5→C6** (paie 2026).

Chaque epic: modèles → migrate → service → controller → frontend → vérif manuelle. Migration ENUM éventuelle gérée par SQL explicite si besoin (sinon STRING).

## Risques / points de vigilance
- ENUM Postgres (cf. `fix_enum.sql`) → éviter; STRING + validation applicative.
- Back-fill: générer les comptes auxiliaires pour tous les tiers existants avant d'activer le drill-down.
- DECIMAL renvoyé en string → `Number()` partout (arrondis monétaires explicites côté paie).
- Concordance collectif = Σ auxiliaires à vérifier après migration des écritures existantes (elles n'ont pas d'`auxiliaryAccountId` → restent au niveau collectif; OK, le drill-down ne les montre pas comme nominatives).
