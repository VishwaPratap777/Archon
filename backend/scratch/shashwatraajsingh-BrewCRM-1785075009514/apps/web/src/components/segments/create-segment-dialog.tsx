'use client';

import { useState } from 'react';
import { useCreateSegment } from '@/hooks/use-segments';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Rule = { field: string; operator: string; value: string };

const FIELDS = [
  { value: 'totalOrders', label: 'Total Orders' },
  { value: 'totalSpent', label: 'Total Spent' },
  { value: 'daysSinceLastOrder', label: 'Days Since Last Order' },
  { value: 'status', label: 'Status' },
  { value: 'preferredChannel', label: 'Preferred Channel' },
];

const OPERATORS_NUMERIC = [
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
];

const OPERATORS_STRING = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
];

export function CreateSegmentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<Rule[]>([{ field: 'totalOrders', operator: 'gte', value: '' }]);
  
  const { mutate: createSegment, isPending } = useCreateSegment();

  const handleAddRule = () => {
    setRules([...rules, { field: 'totalOrders', operator: 'gte', value: '' }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, key: keyof Rule, val: string) => {
    const newRules = [...rules];
    newRules[index][key] = val;
    // Reset operator if field changes to string/numeric type mismatch
    if (key === 'field') {
      const isString = ['status', 'preferredChannel'].includes(val);
      newRules[index].operator = isString ? 'eq' : 'gte';
    }
    setRules(newRules);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (rules.some(r => !r.value)) return toast.error('All rules must have a value');

    // Parse numeric values
    const formattedRules = rules.map(r => ({
      field: r.field,
      operator: r.operator,
      value: ['status', 'preferredChannel'].includes(r.field) ? r.value : Number(r.value),
    }));

    createSegment(
      { name, description, rules: formattedRules },
      {
        onSuccess: () => {
          toast.success('Segment created');
          setOpen(false);
          setName('');
          setDescription('');
          setRules([{ field: 'totalOrders', operator: 'gte', value: '' }]);
        },
        onError: () => toast.error('Failed to create segment'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Segment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] glass-panel border-border text-foreground">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Segment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Define rules to filter customers. Rules are joined by AND.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <Input 
                id="name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="bg-card border-border" 
                placeholder="e.g. Loyal High Spenders" 
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">Description (optional)</label>
              <Input 
                id="description" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="bg-card border-border" 
                placeholder="e.g. Customers with > 10 orders" 
              />
            </div>

            <div className="space-y-3 mt-2">
              <label className="text-sm font-medium">Rules</label>
              {rules.map((rule, i) => {
                const isString = ['status', 'preferredChannel'].includes(rule.field);
                const operators = isString ? OPERATORS_STRING : OPERATORS_NUMERIC;
                
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <Select value={rule.field} onValueChange={v => handleRuleChange(i, 'field', v)}>
                      <SelectTrigger className="w-[200px] bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {FIELDS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={rule.operator} onValueChange={v => handleRuleChange(i, 'operator', v)}>
                      <SelectTrigger className="w-[100px] bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {operators.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {rule.field === 'status' ? (
                      <Select value={rule.value} onValueChange={v => handleRuleChange(i, 'value', v)}>
                        <SelectTrigger className="flex-1 bg-card border-border">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="at_risk">At Risk</SelectItem>
                          <SelectItem value="churned">Churned</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : rule.field === 'preferredChannel' ? (
                      <Select value={rule.value} onValueChange={v => handleRuleChange(i, 'value', v)}>
                        <SelectTrigger className="flex-1 bg-card border-border">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="rcs">RCS</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        type="number"
                        value={rule.value} 
                        onChange={e => handleRuleChange(i, 'value', e.target.value)} 
                        className="flex-1 bg-card border-border" 
                        placeholder="Value" 
                      />
                    )}

                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveRule(i)}
                      disabled={rules.length === 1}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              
              <Button type="button" variant="outline" size="sm" onClick={handleAddRule} className="mt-2 border-border bg-transparent hover:bg-secondary/50">
                <Plus className="w-3 h-3 mr-2" /> Add Rule
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? 'Creating...' : 'Create Segment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
