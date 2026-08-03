export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  preferredChannel: 'email' | 'whatsapp' | 'sms' | 'rcs';
  status: 'active' | 'churned' | 'at_risk';
  totalSpent: number;
  totalOrders: number;
  lastOrderAt?: string;
  firstOrderAt?: string;
  tags: string[];
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  amount: number;
  status: string;
  productCategory: string;
  orderedAt: string;
}

export interface SegmentRule {
  field: string;
  operator: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRule[];
  customerCount: number;
  createdBy: 'manual' | 'ai';
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  segmentId: string;
  segment?: Segment;
  channel: 'email' | 'whatsapp' | 'sms' | 'rcs';
  messageTemplate: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  ordersCount: number;
  aiPrompt?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Message {
  id: string;
  campaignId: string;
  customerId: string;
  customer?: Customer;
  channel: string;
  personalizedText: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked' | 'ordered';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  churned: number;
  at_risk: number;
  avgOrderValue: number;
  avgOrderCount: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  response: string;
  toolCalls: string[];
  campaignLaunched?: {
    campaignId: string;
    totalCount: number;
  };
}
