import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Search,
 Plus,
 X,
 ChevronRight,
 ChevronDown,
 Edit3,
 Trash2,
 Loader2,
 BookOpen,
 Database,
 Layers,
 AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
 getAccountsTree,
 getAccounts,
 getCategories,
 seedAccounting,
 createAccount,
 updateAccount,
 deleteAccount,
} from '../../api/accounting/api';
import type { Account, AccountCategory, AccountTreeCategory } from '../../api/accounting/types';

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, { text: string }> = {
 ASSET: { text: 'text-blue-700' },
 LIABILITY: { text: 'text-orange-700' },
 EQUITY: { text: 'text-purple-700' },
 REVENUE: { text: 'text-emerald-700' },
 EXPENSE: { text: 'text-red-700' },
};

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

const formatType = (type: string) => {
 const map: Record<string, string> = {
 ASSET: 'Actif',
 LIABILITY: 'Passif',
 EQUITY: 'Capitaux',
 REVENUE: 'Produit',
 EXPENSE: 'Charge',
 };
 return map[type] || type;
};

const inputCls =
 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
const labelCls =
 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

/* ------------------------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------------------------ */

const useAccountsTree = () =>
 useQuery<AccountTreeCategory[]>({
 queryKey: ['accounting', 'accounts', 'tree'],
 queryFn: getAccountsTree,
 });

const useAllAccounts = () =>
 useQuery<Account[]>({
 queryKey: ['accounting', 'accounts'],
 queryFn: getAccounts,
 });

const useCategoriesList = () =>
 useQuery<AccountCategory[]>({
 queryKey: ['accounting', 'categories'],
 queryFn: getCategories,
 });

const useSeedAccounting = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: seedAccounting,
 onSuccess: () => {
 toast.success('Plan comptable SYSCOHADA initialisé avec succès');
 qc.invalidateQueries({ queryKey: ['accounting'] });
 },
 onError: () => toast.error('Erreur lors de l\'initialisation'),
 });
};

const useCreateAccount = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => createAccount(data),
 onSuccess: () => {
 toast.success('Compte créé avec succès');
 qc.invalidateQueries({ queryKey: ['accounting'] });
 },
 onError: () => toast.error('Erreur lors de la création'),
 });
};

const useUpdateAccount = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ id, data }: { id: string; data: any }) => updateAccount(id, data),
 onSuccess: () => {
 toast.success('Compte modifié avec succès');
 qc.invalidateQueries({ queryKey: ['accounting'] });
 },
 onError: () => toast.error('Erreur lors de la modification'),
 });
};

const useDeleteAccount = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => deleteAccount(id),
 onSuccess: () => {
 toast.success('Compte supprimé');
 qc.invalidateQueries({ queryKey: ['accounting'] });
 },
 onError: () => toast.error('Erreur lors de la suppression'),
 });
};

/* ------------------------------------------------------------------ */
/* Account Form Modal */
/* ------------------------------------------------------------------ */

interface AccountFormModalProps {
 onClose: () => void;
 account?: Account | null;
 categories: AccountCategory[];
 accounts: Account[];
}

const AccountFormModal = ({ onClose, account, categories, accounts }: AccountFormModalProps) => {
 const { t } = useTranslation();
 const createMut = useCreateAccount();
 const updateMut = useUpdateAccount();
 const isEdit = !!account;

 const [form, setForm] = useState({
 code: account?.code || '',
 name: account?.name || '',
 type: account?.type || 'ASSET',
 categoryId: account?.categoryId || '',
 parentId: account?.parentId || '',
 description: account?.description || '',
 });

 useEffect(() => {
 const handleKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
 };
 document.addEventListener('keydown', handleKey);
 document.body.style.overflow = 'hidden';
 return () => {
 document.removeEventListener('keydown', handleKey);
 document.body.style.overflow = '';
 };
 }, [onClose]);

 const isValid = form.code.trim() && form.name.trim() && form.categoryId;
 const isPending = createMut.isPending || updateMut.isPending;

 const handleSubmit = () => {
 if (!isValid || isPending) return;
 const payload = {
 code: form.code.trim(),
 name: form.name.trim(),
 type: form.type,
 categoryId: form.categoryId,
 parentId: form.parentId || null,
 description: form.description.trim() || null,
 };
 if (isEdit && account) {
 updateMut.mutate({ id: account.id, data: payload }, { onSuccess: onClose });
 } else {
 createMut.mutate(payload, { onSuccess: onClose });
 }
 };

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ type: 'spring', stiffness: 400, damping: 30 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
 >
 {/* Header */}
 <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
 <BookOpen size={20} className="text-[#33cbcc]"/>
 </div>
 <h2 className="text-lg font-bold text-gray-800">
 {isEdit ? 'Modifier le compte' : 'Nouveau compte'}
 </h2>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X size={18} />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-4 overflow-y-auto flex-1">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Code</label>
 <input
 type="text"
 value={form.code}
 onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
 placeholder="401000"
 className={inputCls}
 />
 </div>
 <div>
 <label className={labelCls}>Type</label>
 <select
 value={form.type}
 onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
 className={inputCls + ' appearance-none cursor-pointer'}
 >
 {ACCOUNT_TYPES.map((t) => (
 <option key={t} value={t}>
 {formatType(t)}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className={labelCls}>Nom du compte</label>
 <input
 type="text"
 value={form.name}
 onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
 placeholder="Fournisseurs d'exploitation"
 className={inputCls}
 />
 </div>

 <div>
 <label className={labelCls}>Categorie</label>
 <select
 value={form.categoryId}
 onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
 className={inputCls + ' appearance-none cursor-pointer'}
 >
 <option value="">-- Selectionner --</option>
 {categories.map((c) => (
 <option key={c.id} value={c.id}>
 {c.code} - {c.name}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className={labelCls}>Compte parent (optionnel)</label>
 <select
 value={form.parentId}
 onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
 className={inputCls + ' appearance-none cursor-pointer'}
 >
 <option value="">Aucun</option>
 {accounts
 .filter((a) => a.id !== account?.id)
 .map((a) => (
 <option key={a.id} value={a.id}>
 {a.code} - {a.name}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className={labelCls}>Description</label>
 <textarea
 value={form.description}
 onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
 placeholder="Description du compte..."
 rows={2}
 className={inputCls + ' resize-none'}
 />
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
 <button
 onClick={onClose}
 className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
 >
 Annuler
 </button>
 <button
 disabled={!isValid || isPending}
 onClick={handleSubmit}
 className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
 isValid && !isPending
 ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] '
 : 'bg-gray-300 cursor-not-allowed shadow-none'
 }`}
 >
 {isPending ? (
 <Loader2 size={16} className="animate-spin"/>
 ) : isEdit ? (
 <Edit3 size={16} />
 ) : (
 <Plus size={16} />
 )}
 {isEdit ? 'Modifier' : 'Creer'}
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Delete Confirmation Modal */
/* ------------------------------------------------------------------ */

const DeleteConfirmModal = ({
 account,
 onClose,
 onConfirm,
 isPending,
}: {
 account: Account;
 onClose: () => void;
 onConfirm: () => void;
 isPending: boolean;
}) => {
 useEffect(() => {
 const handleKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
 };
 document.addEventListener('keydown', handleKey);
 return () => document.removeEventListener('keydown', handleKey);
 }, [onClose]);

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl p-6 w-full max-w-sm"
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2.5 rounded-xl bg-red-50">
 <AlertTriangle size={20} className="text-red-500"/>
 </div>
 <h3 className="text-base font-semibold text-gray-800">Supprimer le compte</h3>
 </div>
 <p className="text-sm text-gray-500 mb-2">
 Voulez-vous vraiment supprimer le compte{' '}
 <strong>
 {account.code} - {account.name}
 </strong>{' '}
 ?
 </p>
 <p className="text-xs text-red-500 mb-6">Cette action est irreversible.</p>
 <div className="flex gap-3 justify-end">
 <button
 onClick={onClose}
 className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
 >
 Annuler
 </button>
 <button
 onClick={onConfirm}
 disabled={isPending}
 className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
 >
 {isPending ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />}
 Supprimer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Category Row */
/* ------------------------------------------------------------------ */

interface CategoryRowProps {
 category: AccountTreeCategory;
 search: string;
 onEdit: (account: Account) => void;
 onDelete: (account: Account) => void;
}

const AccountRow = ({
 account,
 depth,
 search,
 onEdit,
 onDelete,
}: {
 account: Account & { children?: Account[] };
 depth: number;
 search: string;
 onEdit: (a: Account) => void;
 onDelete: (a: Account) => void;
}) => {
 const colors = TYPE_COLORS[account.type] || { text: 'text-gray-500' };

 return (
 <>
 <tr className="hover:bg-gray-50/50 transition-colors group">
 <td className="px-6 py-3 text-sm font-mono font-semibold text-gray-800"style={{ paddingLeft: `${24 + depth * 24}px` }}>
 {account.code}
 </td>
 <td className="px-6 py-3 text-sm text-gray-700">{account.name}</td>
 <td className="px-6 py-3">
 <span className={`text-[10px] font-semibold ${colors.text}`}>
 {formatType(account.type)}
 </span>
 </td>
 <td className="px-6 py-3 text-right">
 {!account.isSystem && (
 <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => onEdit(account)}
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-colors"
 title="Modifier"
 >
 <Edit3 size={14} />
 </button>
 <button
 onClick={() => onDelete(account)}
 className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
 title="Supprimer"
 >
 <Trash2 size={14} />
 </button>
 </div>
 )}
 </td>
 </tr>
 {account.children?.map((child) => (
 <AccountRow
 key={child.id}
 account={child as Account & { children?: Account[] }}
 depth={depth + 1}
 search={search}
 onEdit={onEdit}
 onDelete={onDelete}
 />
 ))}
 </>
 );
};

const CategorySection = ({ category, search, onEdit, onDelete }: CategoryRowProps) => {
 const [expanded, setExpanded] = useState(true);

 const filteredAccounts = useMemo(() => {
 if (!search) return category.accounts;
 const q = search.toLowerCase();
 const matchesAccount = (acc: Account & { children?: Account[] }): boolean => {
 if (acc.code.toLowerCase().includes(q) || acc.name.toLowerCase().includes(q)) return true;
 return acc.children?.some(matchesAccount) || false;
 };
 return category.accounts.filter(matchesAccount);
 }, [category.accounts, search]);

 if (search && filteredAccounts.length === 0) return null;

 return (
 <div className="mb-4">
 <button
 onClick={() => setExpanded(!expanded)}
 className="w-full flex items-center gap-3 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl"
 >
 {expanded ? (
 <ChevronDown size={16} className="text-gray-400"/>
 ) : (
 <ChevronRight size={16} className="text-gray-400"/>
 )}
 <span className="text-xs font-bold text-[#33cbcc] uppercase tracking-wider">
 Classe {category.code}
 </span>
 <span className="text-sm font-semibold text-gray-700">{category.name}</span>
 <span className="ml-auto text-xs text-gray-400">{filteredAccounts.length} comptes</span>
 </button>

 {expanded && filteredAccounts.length > 0 && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="overflow-hidden"
 >
 <table className="w-full">
 <tbody>
 {filteredAccounts.map((account) => (
 <AccountRow
 key={account.id}
 account={account}
 depth={0}
 search={search}
 onEdit={onEdit}
 onDelete={onDelete}
 />
 ))}
 </tbody>
 </table>
 </motion.div>
 )}
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

export default function ChartOfAccounts() {
 const { t } = useTranslation();
 const [search, setSearch] = useState('');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [editingAccount, setEditingAccount] = useState<Account | null>(null);
 const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

 const { data: tree, isLoading: treeLoading } = useAccountsTree();
 const { data: allAccounts } = useAllAccounts();
 const { data: categories } = useCategoriesList();
 const seed = useSeedAccounting();
 const deleteMut = useDeleteAccount();

 const isEmpty = !treeLoading && (!tree || tree.length === 0);
 const totalAccounts = useMemo(() => {
 if (!tree) return 0;
 let count = 0;
 const countAccounts = (accs: any[]) => {
 for (const a of accs) {
 count++;
 if (a.children) countAccounts(a.children);
 }
 };
 for (const cat of tree) countAccounts(cat.accounts);
 return count;
 }, [tree]);

 if (treeLoading) {
 return (
 <div className="space-y-6">
 <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"/>
 <div className="h-4 bg-gray-100 rounded w-48 animate-pulse"/>
 <div className="space-y-3">
 {[...Array(5)].map((_, i) => (
 <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"/>
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-800">Plan Comptable</h1>
 <p className="text-sm text-gray-500 mt-1">
 Plan comptable SYSCOHADA{' '}
 {totalAccounts > 0 && (
 <span className="text-[#33cbcc] font-semibold">{totalAccounts} comptes</span>
 )}
 </p>
 </div>
 <div className="flex items-center gap-3">
 {isEmpty && (
 <button
 onClick={() => seed.mutate()}
 disabled={seed.isPending}
 className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
 >
 {seed.isPending ? (
 <Loader2 size={16} className="animate-spin"/>
 ) : (
 <Database size={16} />
 )}
 Initialiser SYSCOHADA
 </button>
 )}
 <button
 onClick={() => {
 setEditingAccount(null);
 setShowCreateModal(true);
 }}
 className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors"
 >
 <Plus size={16} />
 Nouveau Compte
 </button>
 </div>
 </div>

 {/* Search */}
 <div className="bg-white rounded-2xl p-2 flex items-center border border-gray-100 focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
 <Search className="text-gray-400 ml-3"size={20} />
 <input
 type="text"
 placeholder="Rechercher par code ou nom de compte..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
 />
 </div>

 {/* Empty state */}
 {isEmpty && (
 <div className="bg-white rounded-2xl p-12 text-center">
 <Layers size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-500 font-medium mb-2">Aucun compte comptable</p>
 <p className="text-sm text-gray-400">
 Cliquez sur"Initialiser SYSCOHADA"pour creer le plan comptable standard.
 </p>
 </div>
 )}

 {/* Tree view */}
 {tree && tree.length > 0 && (
 <div className="bg-white rounded-2xl overflow-hidden">
 {/* Table header */}
 <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 <div className="col-span-3">Code</div>
 <div className="col-span-5">Nom du compte</div>
 <div className="col-span-2">Type</div>
 <div className="col-span-2 text-right">Actions</div>
 </div>

 <div className="p-3">
 {tree.map((category) => (
 <CategorySection
 key={category.id}
 category={category}
 search={search}
 onEdit={(account) => {
 setEditingAccount(account);
 setShowCreateModal(true);
 }}
 onDelete={(account) => setDeletingAccount(account)}
 />
 ))}
 </div>
 </div>
 )}

 {/* Modals */}
 <AnimatePresence>
 {showCreateModal && (
 <AccountFormModal
 onClose={() => {
 setShowCreateModal(false);
 setEditingAccount(null);
 }}
 account={editingAccount}
 categories={categories || []}
 accounts={allAccounts || []}
 />
 )}
 {deletingAccount && (
 <DeleteConfirmModal
 account={deletingAccount}
 onClose={() => setDeletingAccount(null)}
 onConfirm={() => {
 deleteMut.mutate(deletingAccount.id, {
 onSuccess: () => setDeletingAccount(null),
 });
 }}
 isPending={deleteMut.isPending}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
