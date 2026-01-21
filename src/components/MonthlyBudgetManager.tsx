import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MonthlyBudget {
    id: string;
    month: string; // YYYY-MM
    amount: number;
}

interface MonthlyBudgetManagerProps {
    darkMode: boolean;
    onUpdate: () => void; // Callback to refresh dashboard data
}

export const MonthlyBudgetManager: React.FC<MonthlyBudgetManagerProps> = ({ darkMode, onUpdate }) => {
    const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Load budgets on mount
    useEffect(() => {
        fetchBudgets();
    }, []);

    const fetchBudgets = async () => {
        try {
            const { data, error } = await supabase
                .from('monthly_budgets')
                .select('*')
                .order('month', { ascending: false });

            if (error) throw error;
            setBudgets(data || []);
        } catch (error) {
            console.error('Error fetching budgets:', error);
            setMessage({ text: 'Erro ao carregar orçamentos.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMonth || !amount) return;

        setIsSubmitting(true);
        setMessage(null);

        const numericAmount = parseFloat(amount);

        try {
            // Check if exists update, else insert
            const { data: existing } = await supabase
                .from('monthly_budgets')
                .select('id')
                .eq('month', selectedMonth)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('monthly_budgets')
                    .update({ amount: numericAmount })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('monthly_budgets')
                    .insert([{ month: selectedMonth, amount: numericAmount }]);
                if (error) throw error;
            }

            setMessage({ text: 'Verba salva com sucesso!', type: 'success' });
            setAmount('');
            fetchBudgets();
            onUpdate(); // Trigger dashboard refresh if needed
        } catch (error) {
            console.error('Error saving budget:', error);
            setMessage({ text: 'Erro ao salvar verba.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta verba?')) return;

        try {
            const { error } = await supabase
                .from('monthly_budgets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchBudgets();
            onUpdate();
        } catch (error) {
            console.error('Error deleting budget:', error);
            setMessage({ text: 'Erro ao remover verba.', type: 'error' });
        }
    };

    // Helper to format currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // Helper to format month (YYYY-MM -> Month/Year)
    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="card" style={{
            backgroundColor: darkMode ? '#1e293b' : '#ffffff',
            color: darkMode ? '#f8fafc' : '#1f2937'
        }}>
            <h3 style={{ marginTop: 0 }}>💰 Gerenciamento de Verba Mensal</h3>
            <p className="muted">Cadastre o investimento em anúncios para cada mês para obter cálculos precisos de ROI e CPA.</p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: '16px',
                alignItems: 'end',
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                borderRadius: '8px'
            }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Mês de Referência</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            backgroundColor: darkMode ? '#334155' : '#fff',
                            color: darkMode ? '#fff' : '#000'
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Valor Investido (R$)</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            backgroundColor: darkMode ? '#334155' : '#fff',
                            color: darkMode ? '#fff' : '#000'
                        }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ height: '42px', minWidth: '100px' }}
                >
                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
            </form>

            {message && (
                <div style={{
                    padding: '10px',
                    marginBottom: '16px',
                    borderRadius: '4px',
                    backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
                }}>
                    {message.text}
                </div>
            )}

            {/* List */}
            <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Mês</th>
                            <th style={{ textAlign: 'left' }}>Verba Investida</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Carregando...</td></tr>
                        ) : budgets.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Nenhuma verba cadastrada.</td></tr>
                        ) : (
                            budgets.map((budget) => (
                                <tr key={budget.id}>
                                    <td>{formatMonth(budget.month)}</td>
                                    <td style={{ fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(budget.amount)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedMonth(budget.month);
                                                setAmount(budget.amount.toString());
                                            }}
                                            style={{
                                                marginRight: '8px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#3b82f6'
                                            }}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(budget.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#ef4444'
                                            }}
                                            title="Excluir"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
