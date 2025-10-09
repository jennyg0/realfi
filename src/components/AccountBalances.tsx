"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flex } from "@/components/ui/flex";
import { Heading, Text } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Edit2, Trash2, Plus } from "react-feather";

type AccountBalance = {
  id: number;
  category: string;
  label: string;
  amount: number;
  countTowardGoal: boolean;
};

type AccountBalancesProps = {
  balances: AccountBalance[];
  privyId: string;
  onBalanceChange: () => void;
};

const CATEGORIES = [
  { value: "savings", label: "💰 Savings", color: "#10b981" },
  { value: "stocks", label: "📈 Stocks & ETFs", color: "#3b82f6" },
  { value: "crypto", label: "🪙 Crypto", color: "#f59e0b" },
  { value: "real-estate", label: "🏠 Real Estate", color: "#8b5cf6" },
  { value: "angel", label: "🚀 Angel Investing", color: "#ec4899" },
  { value: "retirement", label: "💼 Retirement", color: "#6366f1" },
  { value: "cash", label: "💵 Cash", color: "#6b7280" },
  { value: "custom", label: "➕ Custom", color: "#64748b" },
];

export function AccountBalances({ balances, privyId, onBalanceChange }: AccountBalancesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<AccountBalance | null>(null);
  const [category, setCategory] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [countTowardGoal, setCountTowardGoal] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingBalance(null);
    setCategory("");
    setLabel("");
    setAmount("");
    setCountTowardGoal(false);
    setCustomCategory("");
    setIsOpen(true);
  };

  const handleOpenEdit = (balance: AccountBalance) => {
    setEditingBalance(balance);
    setCategory(balance.category);
    setLabel(balance.label);
    setAmount(balance.amount.toString());
    setCountTowardGoal(balance.countTowardGoal);
    setCustomCategory(CATEGORIES.find(c => c.value === balance.category) ? "" : balance.category);
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!category || !label || !amount) return;

    setIsSaving(true);
    try {
      const finalCategory = category === "custom" ? customCategory : category;

      const res = await fetch('/api/balances/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId,
          id: editingBalance?.id,
          category: finalCategory,
          label,
          amount: Number(amount),
          countTowardGoal,
        }),
      });

      if (!res.ok) throw new Error('Failed to save balance');

      setIsOpen(false);
      onBalanceChange();
    } catch (error) {
      console.error('Error saving balance:', error);
      alert('Failed to save balance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this balance?')) return;

    try {
      const res = await fetch(`/api/balances/delete?privyId=${privyId}&id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete balance');

      onBalanceChange();
    } catch (error) {
      console.error('Error deleting balance:', error);
      alert('Failed to delete balance');
    }
  };

  // Group balances by category
  const grouped = balances.reduce((acc, balance) => {
    if (!acc[balance.category]) {
      acc[balance.category] = [];
    }
    acc[balance.category].push(balance);
    return acc;
  }, {} as Record<string, AccountBalance[]>);

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <Flex justify="between" align="center" className="mb-6">
            <div>
              <Heading size="4" className="mb-1">Account Balances</Heading>
              <Text size="2" color="gray">Track external accounts & assets</Text>
            </div>
            <Button size="2" onClick={handleOpenAdd}>
              <Plus size={16} /> Add Account
            </Button>
          </Flex>

        {balances.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign size={48} color="#d1d5db" className="mx-auto mb-3" />
            <Text color="gray">No accounts added yet</Text>
            <Text size="1" color="gray">Add your external holdings to track total portfolio</Text>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <Text size="2" weight="medium" className="mb-2 block capitalize">
                  {CATEGORIES.find(c => c.value === cat)?.label || cat}
                </Text>
                <div className="space-y-2">
                  {items.map((balance) => (
                    <Flex
                      key={balance.id}
                      align="center"
                      justify="between"
                      className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex-1">
                        <Text size="2" weight="medium">{balance.label}</Text>
                        <Text size="3" weight="bold" className="mt-1">
                          ${balance.amount.toLocaleString()}
                        </Text>
                      </div>
                      <Flex gap="2" align="center">
                        {balance.countTowardGoal && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Goal</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="1"
                          onClick={() => handleOpenEdit(balance)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="1"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(balance.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </Flex>
                    </Flex>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[450px]">
          <DialogTitle>{editingBalance ? 'Edit Balance' : 'Add Balance'}</DialogTitle>

          <div className="space-y-4 mt-4">
            <div>
              <Text size="2" weight="medium" className="mb-2 block">Category</Text>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {category === "custom" && (
              <div>
                <Text size="2" weight="medium" className="mb-2 block">Custom Category Name</Text>
                <input
                  type="text"
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="e.g., Art Collection, Bonds"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
            )}

            <div>
              <Text size="2" weight="medium" className="mb-2 block">Label</Text>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                placeholder="e.g., Chase Savings, Total Stocks"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div>
              <Text size="2" weight="medium" className="mb-2 block">Amount (USD)</Text>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <Flex align="center" gap="2">
              <Switch
                checked={countTowardGoal}
                onCheckedChange={setCountTowardGoal}
              />
              <Text size="2">Count toward savings goal</Text>
            </Flex>
          </div>

          <Flex gap="3" className="mt-6" justify="end">
            <Button variant="soft" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !category || !label || !amount}>
              {isSaving ? 'Saving...' : editingBalance ? 'Update' : 'Add'}
            </Button>
          </Flex>
        </DialogContent>
      </Dialog>
    </>
  );
}
