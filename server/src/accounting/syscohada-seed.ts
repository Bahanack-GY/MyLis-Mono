// SYSCOHADA Chart of Accounts — Standard accounts for Cameroon/CEMAC zone
// Each category maps to a SYSCOHADA class (1-9)

export interface SeedCategory {
    code: string;
    name: string;
    description: string;
}

export interface SeedAccount {
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    categoryCode: string;
    parentCode?: string;
}

export const SEED_CATEGORIES: SeedCategory[] = [
    { code: '1', name: 'Comptes de ressources durables', description: 'Capitaux propres et emprunts à long terme' },
    { code: '2', name: 'Comptes d\'actif immobilisé', description: 'Immobilisations corporelles, incorporelles et financières' },
    { code: '3', name: 'Comptes de stocks', description: 'Stocks de marchandises, matières premières et produits' },
    { code: '4', name: 'Comptes de tiers', description: 'Fournisseurs, clients, personnel, État, organismes sociaux' },
    { code: '5', name: 'Comptes de trésorerie', description: 'Banques, caisses et autres valeurs' },
    { code: '6', name: 'Comptes de charges', description: 'Charges d\'exploitation, financières et exceptionnelles' },
    { code: '7', name: 'Comptes de produits', description: 'Produits d\'exploitation, financiers et exceptionnels' },
    { code: '8', name: 'Comptes des autres charges et produits', description: 'Charges et produits hors activités ordinaires' },
    { code: '9', name: 'Comptes de la comptabilité analytique', description: 'Comptabilité de gestion interne' },
];

export const SEED_ACCOUNTS: SeedAccount[] = [
    // ===== CLASS 1: EQUITY & LONG-TERM LIABILITIES =====
    { code: '101000', name: 'Capital social', type: 'EQUITY', categoryCode: '1' },
    { code: '106000', name: 'Réserves', type: 'EQUITY', categoryCode: '1' },
    { code: '110000', name: 'Report à nouveau', type: 'EQUITY', categoryCode: '1' },
    { code: '120000', name: 'Résultat de l\'exercice (bénéfice)', type: 'EQUITY', categoryCode: '1' },
    { code: '129000', name: 'Résultat de l\'exercice (perte)', type: 'EQUITY', categoryCode: '1' },
    { code: '130000', name: 'Résultat en instance d\'affectation', type: 'EQUITY', categoryCode: '1' },
    { code: '160000', name: 'Emprunts et dettes assimilées', type: 'LIABILITY', categoryCode: '1' },
    { code: '162000', name: 'Emprunts auprès des établissements de crédit', type: 'LIABILITY', categoryCode: '1', parentCode: '160000' },
    { code: '165000', name: 'Dépôts et cautionnements reçus', type: 'LIABILITY', categoryCode: '1', parentCode: '160000' },

    // ===== CLASS 2: FIXED ASSETS =====
    { code: '210000', name: 'Immobilisations incorporelles', type: 'ASSET', categoryCode: '2' },
    { code: '213000', name: 'Logiciels', type: 'ASSET', categoryCode: '2', parentCode: '210000' },
    { code: '215000', name: 'Fonds commercial', type: 'ASSET', categoryCode: '2', parentCode: '210000' },
    { code: '220000', name: 'Terrains', type: 'ASSET', categoryCode: '2' },
    { code: '230000', name: 'Bâtiments, installations et agencements', type: 'ASSET', categoryCode: '2' },
    { code: '231000', name: 'Bâtiments', type: 'ASSET', categoryCode: '2', parentCode: '230000' },
    { code: '240000', name: 'Matériel', type: 'ASSET', categoryCode: '2' },
    { code: '241000', name: 'Matériel et outillage industriel', type: 'ASSET', categoryCode: '2', parentCode: '240000' },
    { code: '244000', name: 'Matériel et mobilier de bureau', type: 'ASSET', categoryCode: '2', parentCode: '240000' },
    { code: '245000', name: 'Matériel de transport', type: 'ASSET', categoryCode: '2', parentCode: '240000' },
    { code: '246000', name: 'Matériel informatique', type: 'ASSET', categoryCode: '2', parentCode: '240000' },
    { code: '280000', name: 'Amortissements des immobilisations', type: 'ASSET', categoryCode: '2' },
    { code: '281000', name: 'Amortissements des immobilisations incorporelles', type: 'ASSET', categoryCode: '2', parentCode: '280000' },
    { code: '283000', name: 'Amortissements des bâtiments', type: 'ASSET', categoryCode: '2', parentCode: '280000' },
    { code: '284000', name: 'Amortissements du matériel', type: 'ASSET', categoryCode: '2', parentCode: '280000' },

    // ===== CLASS 3: INVENTORY =====
    { code: '310000', name: 'Marchandises', type: 'ASSET', categoryCode: '3' },
    { code: '320000', name: 'Matières premières et fournitures', type: 'ASSET', categoryCode: '3' },
    { code: '330000', name: 'Autres approvisionnements', type: 'ASSET', categoryCode: '3' },
    { code: '360000', name: 'Produits finis', type: 'ASSET', categoryCode: '3' },
    { code: '370000', name: 'Produits intermédiaires et en-cours', type: 'ASSET', categoryCode: '3' },

    // ===== CLASS 4: THIRD-PARTY ACCOUNTS =====
    { code: '401000', name: 'Fournisseurs', type: 'LIABILITY', categoryCode: '4' },
    { code: '401100', name: 'Fournisseurs - Achats de biens', type: 'LIABILITY', categoryCode: '4', parentCode: '401000' },
    { code: '401200', name: 'Fournisseurs - Prestations de services', type: 'LIABILITY', categoryCode: '4', parentCode: '401000' },
    { code: '408000', name: 'Fournisseurs - Factures non parvenues', type: 'LIABILITY', categoryCode: '4', parentCode: '401000' },
    { code: '411000', name: 'Clients', type: 'ASSET', categoryCode: '4' },
    { code: '411100', name: 'Clients - Ventes de biens', type: 'ASSET', categoryCode: '4', parentCode: '411000' },
    { code: '411200', name: 'Clients - Prestations de services', type: 'ASSET', categoryCode: '4', parentCode: '411000' },
    { code: '416000', name: 'Clients douteux', type: 'ASSET', categoryCode: '4', parentCode: '411000' },
    { code: '421000', name: 'Personnel - Rémunérations dues', type: 'LIABILITY', categoryCode: '4' },
    { code: '422000', name: 'Personnel - Avances et acomptes', type: 'ASSET', categoryCode: '4' },
    { code: '431000', name: 'Sécurité sociale (CNPS)', type: 'LIABILITY', categoryCode: '4' },
    { code: '431100', name: 'CNPS - Part salariale', type: 'LIABILITY', categoryCode: '4', parentCode: '431000' },
    { code: '431200', name: 'CNPS - Part patronale', type: 'LIABILITY', categoryCode: '4', parentCode: '431000' },
    { code: '441000', name: 'État - Impôts sur les bénéfices', type: 'LIABILITY', categoryCode: '4' },
    { code: '442000', name: 'État - IRPP retenu à la source', type: 'LIABILITY', categoryCode: '4' },
    { code: '443000', name: 'État - TVA', type: 'LIABILITY', categoryCode: '4' },
    { code: '443100', name: 'TVA collectée', type: 'LIABILITY', categoryCode: '4', parentCode: '443000' },
    { code: '443200', name: 'TVA déductible sur achats', type: 'ASSET', categoryCode: '4', parentCode: '443000' },
    { code: '443300', name: 'TVA déductible sur immobilisations', type: 'ASSET', categoryCode: '4', parentCode: '443000' },
    { code: '443400', name: 'TVA due à l\'État', type: 'LIABILITY', categoryCode: '4', parentCode: '443000' },
    { code: '444000', name: 'État - Autres impôts et taxes', type: 'LIABILITY', categoryCode: '4' },
    { code: '445000', name: 'Organismes internationaux', type: 'LIABILITY', categoryCode: '4' },
    { code: '447000', name: 'État - CFC (Crédit Foncier)', type: 'LIABILITY', categoryCode: '4' },
    { code: '448000', name: 'État - Centimes additionnels communaux', type: 'LIABILITY', categoryCode: '4' },
    { code: '471000', name: 'Comptes d\'attente - Débiteurs', type: 'ASSET', categoryCode: '4' },
    { code: '472000', name: 'Comptes d\'attente - Créditeurs', type: 'LIABILITY', categoryCode: '4' },

    // ===== CLASS 5: TREASURY =====
    { code: '521000', name: 'Banque', type: 'ASSET', categoryCode: '5' },
    { code: '521100', name: 'Banque - Compte courant principal', type: 'ASSET', categoryCode: '5', parentCode: '521000' },
    { code: '521200', name: 'Banque - Compte épargne', type: 'ASSET', categoryCode: '5', parentCode: '521000' },
    { code: '531000', name: 'Chèques à encaisser', type: 'ASSET', categoryCode: '5' },
    { code: '571000', name: 'Caisse', type: 'ASSET', categoryCode: '5' },
    { code: '571100', name: 'Caisse siège', type: 'ASSET', categoryCode: '5', parentCode: '571000' },
    { code: '585000', name: 'Virements de fonds', type: 'ASSET', categoryCode: '5' },

    // ===== CLASS 6: EXPENSES =====
    { code: '601000', name: 'Achats de marchandises', type: 'EXPENSE', categoryCode: '6' },
    { code: '602000', name: 'Achats de matières premières', type: 'EXPENSE', categoryCode: '6' },
    { code: '604000', name: 'Achats stockés de matières et fournitures', type: 'EXPENSE', categoryCode: '6' },
    { code: '605000', name: 'Autres achats', type: 'EXPENSE', categoryCode: '6' },
    { code: '605100', name: 'Fournitures non stockables (eau, électricité)', type: 'EXPENSE', categoryCode: '6', parentCode: '605000' },
    { code: '605200', name: 'Fournitures de bureau', type: 'EXPENSE', categoryCode: '6', parentCode: '605000' },
    { code: '608000', name: 'Achats - Frais accessoires', type: 'EXPENSE', categoryCode: '6' },
    { code: '613000', name: 'Loyers et charges locatives', type: 'EXPENSE', categoryCode: '6' },
    { code: '614000', name: 'Charges d\'entretien et réparations', type: 'EXPENSE', categoryCode: '6' },
    { code: '616000', name: 'Primes d\'assurance', type: 'EXPENSE', categoryCode: '6' },
    { code: '618000', name: 'Autres charges externes', type: 'EXPENSE', categoryCode: '6' },
    { code: '622000', name: 'Honoraires et rémunérations d\'intermédiaires', type: 'EXPENSE', categoryCode: '6' },
    { code: '624000', name: 'Frais de transport', type: 'EXPENSE', categoryCode: '6' },
    { code: '625000', name: 'Frais de déplacement, missions et réceptions', type: 'EXPENSE', categoryCode: '6' },
    { code: '626000', name: 'Frais postaux et de télécommunications', type: 'EXPENSE', categoryCode: '6' },
    { code: '627000', name: 'Frais de publicité et relations publiques', type: 'EXPENSE', categoryCode: '6' },
    { code: '631000', name: 'Impôts, taxes et versements assimilés', type: 'EXPENSE', categoryCode: '6' },
    { code: '641000', name: 'Charges de personnel - Rémunérations', type: 'EXPENSE', categoryCode: '6' },
    { code: '645000', name: 'Charges de personnel - Charges sociales', type: 'EXPENSE', categoryCode: '6' },
    { code: '645100', name: 'Cotisations CNPS (part patronale)', type: 'EXPENSE', categoryCode: '6', parentCode: '645000' },
    { code: '646000', name: 'Charges de personnel - CFC patronal', type: 'EXPENSE', categoryCode: '6' },
    { code: '651000', name: 'Pertes sur créances clients', type: 'EXPENSE', categoryCode: '6' },
    { code: '661000', name: 'Charges d\'intérêts', type: 'EXPENSE', categoryCode: '6' },
    { code: '671000', name: 'Intérêts des emprunts', type: 'EXPENSE', categoryCode: '6' },
    { code: '681000', name: 'Dotations aux amortissements', type: 'EXPENSE', categoryCode: '6' },
    { code: '691000', name: 'Impôts sur les bénéfices (IS)', type: 'EXPENSE', categoryCode: '6' },

    // ===== CLASS 7: REVENUE =====
    { code: '701000', name: 'Ventes de marchandises', type: 'REVENUE', categoryCode: '7' },
    { code: '702000', name: 'Ventes de produits finis', type: 'REVENUE', categoryCode: '7' },
    { code: '706000', name: 'Prestations de services', type: 'REVENUE', categoryCode: '7' },
    { code: '707000', name: 'Ventes de produits accessoires', type: 'REVENUE', categoryCode: '7' },
    { code: '708000', name: 'Produits des activités annexes', type: 'REVENUE', categoryCode: '7' },
    { code: '711000', name: 'Subventions d\'exploitation', type: 'REVENUE', categoryCode: '7' },
    { code: '750000', name: 'Autres produits', type: 'REVENUE', categoryCode: '7' },
    { code: '770000', name: 'Produits financiers', type: 'REVENUE', categoryCode: '7' },
    { code: '771000', name: 'Intérêts de prêts', type: 'REVENUE', categoryCode: '7' },
    { code: '780000', name: 'Reprises sur amortissements et provisions', type: 'REVENUE', categoryCode: '7' },

    // ===== CLASS 8: OTHER (HAO) =====
    { code: '810000', name: 'Valeur comptable des cessions d\'immobilisations', type: 'EXPENSE', categoryCode: '8' },
    { code: '820000', name: 'Produits des cessions d\'immobilisations', type: 'REVENUE', categoryCode: '8' },
    { code: '830000', name: 'Charges HAO', type: 'EXPENSE', categoryCode: '8' },
    { code: '840000', name: 'Produits HAO', type: 'REVENUE', categoryCode: '8' },
];

// Default journals to create
export const SEED_JOURNALS = [
    { code: 'ACH', name: 'Journal des Achats', type: 'PURCHASES' as const },
    { code: 'VTE', name: 'Journal des Ventes', type: 'SALES' as const },
    { code: 'BQ', name: 'Journal de Banque', type: 'BANK' as const },
    { code: 'CAI', name: 'Journal de Caisse', type: 'CASH' as const },
    { code: 'OD', name: 'Journal des Opérations Diverses', type: 'MISCELLANEOUS' as const },
];

// Mapping from expense categories to SYSCOHADA account codes
export const EXPENSE_CATEGORY_ACCOUNT_MAP: Record<string, string> = {
    'Salaire': '641000',
    'Avance sur salaire': '422000',
    'Loyer': '613000',
    'Électricité': '605100',
    'Eau': '605100',
    'Internet': '626000',
    'Téléphone': '626000',
    'Transport': '624000',
    'Déplacement': '625000',
    'Fournitures': '605200',
    'Publicité': '627000',
    'Assurance': '616000',
    'Entretien': '614000',
    'Honoraires': '622000',
    'Formation': '625000',
};

// Default account code for unmapped expense categories
export const DEFAULT_EXPENSE_ACCOUNT = '618000';
