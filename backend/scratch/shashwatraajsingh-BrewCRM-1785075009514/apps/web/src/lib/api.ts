import axios from 'axios';
import { Campaign, ChatMessage, Customer, CustomerStats, Segment, SegmentRule, Message, AgentResponse } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

// --- Customers ---
export const getCustomers = async (params?: { status?: string; channel?: string; limit?: number; offset?: number }) => {
  const { data } = await api.get<{ data: Customer[]; total: number }>('/customers', { 
    params: { limit: 25, offset: 0, ...params } 
  });
  return data;
};

export const getCustomer = async (id: string) => {
  const { data } = await api.get<Customer>(`/customers/${id}`);
  return data;
};

export const getCustomerStats = async () => {
  const { data } = await api.get<CustomerStats>('/customers/stats');
  return data;
};

// --- Segments ---
export const getSegments = async () => {
  const { data } = await api.get<Segment[]>('/segments');
  return data;
};

export const getSegment = async (id: string) => {
  const { data } = await api.get<Segment>(`/segments/${id}`);
  return data;
};

export const createSegment = async (segment: { name: string; description?: string; rules: SegmentRule[] }) => {
  const { data } = await api.post<Segment>('/segments', segment);
  return data;
};

export const deleteSegment = async (id: string) => {
  await api.delete(`/segments/${id}`);
};

// --- Campaigns ---
export const getCampaigns = async () => {
  const { data } = await api.get<Campaign[]>('/campaigns');
  return data;
};

export const getCampaign = async (id: string) => {
  const { data } = await api.get<Campaign>(`/campaigns/${id}`);
  return data;
};

export const createCampaign = async (campaign: Partial<Campaign>) => {
  const { data } = await api.post<Campaign>('/campaigns', campaign);
  return data;
};

export const launchCampaign = async (id: string) => {
  const { data } = await api.post<Campaign>(`/campaigns/${id}/launch`);
  return data;
};

export const getCampaignMessages = async (id: string, params?: { limit?: number; offset?: number }) => {
  const { data } = await api.get<{ data: Message[]; total: number }>(`/campaigns/${id}/messages`, { params });
  return data;
};

// --- Agent ---
export const chatWithAgent = async (messages: ChatMessage[], sessionId: string) => {
  const { data } = await api.post<AgentResponse>('/agent/chat', { messages, sessionId });
  return data;
};
