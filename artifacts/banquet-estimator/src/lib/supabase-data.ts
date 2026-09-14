import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { CatalogCategory } from '@/lib/catalog';
import { cloneCatalog, loadCatalog } from '@/lib/catalog';
import type { EstimatePayload } from '@/lib/estimate-connection';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() as string | undefined;

let supabaseClient: SupabaseClient | null = null;
let configurationError = '';

if (!supabaseUrl || !supabaseAnonKey) {
  configurationError = 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect this site to Supabase.';
} else {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    configurationError = 'The Supabase URL or public key is invalid. Check the values in your deployment environment.';
  }
}

export const supabaseConfig = {
  configured: Boolean(supabaseClient),
  error: configurationError,
};

export const catalogQueryKey = ['supabase', 'catalog'] as const;

export type QuoteStatus = 'new' | 'contacted' | 'confirmed' | 'archived';
export type SavedQuote = EstimatePayload & {
  id: string;
  createdAt: string;
  status: QuoteStatus;
};

type CatalogRow = {
  categories: unknown;
};

type QuoteRow = {
  id: string;
  reference: string;
  customer_name: string;
  mobile: string;
  event_type: string;
  event_date: string;
  guests: number;
  customer_gst_number: string | null;
  hall: string;
  services: EstimatePayload['services'];
  pricing: EstimatePayload['pricing'];
  status: string;
  created_at: string;
};

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error(supabaseConfig.error);
  }
  return supabaseClient;
}

function asCatalog(value: unknown): CatalogCategory[] {
  return Array.isArray(value) && value.length > 0 ? value as CatalogCategory[] : cloneCatalog();
}

function asQuoteStatus(value: string): QuoteStatus {
  return value === 'contacted' || value === 'confirmed' || value === 'archived' ? value : 'new';
}

function toSavedQuote(row: QuoteRow): SavedQuote {
  return {
    id: row.id,
    reference: row.reference,
    customer: {
      name: row.customer_name,
      mobile: row.mobile,
      eventType: row.event_type,
      eventDate: row.event_date,
      guests: row.guests,
      gstNumber: row.customer_gst_number ?? '',
      hall: row.hall,
    },
    services: row.services,
    pricing: {
      ...row.pricing,
      gstNumber: row.pricing.gstNumber ?? '',
      gstNumberVisible: row.pricing.gstNumberVisible ?? false,
    },
    createdAt: row.created_at,
    status: asQuoteStatus(row.status),
  };
}

async function fetchCatalog() {
  if (!supabaseClient) return loadCatalog();

  const { data, error } = await supabaseClient
    .from('catalog')
    .select('categories')
    .eq('id', 'default')
    .maybeSingle<CatalogRow>();

  if (error) throw error;
  return asCatalog(data?.categories);
}

export function useGetCatalog() {
  return useQuery({
    queryKey: catalogQueryKey,
    queryFn: fetchCatalog,
  });
}

export async function updateCatalog(categories: CatalogCategory[]) {
  const { data, error } = await requireSupabase()
    .from('catalog')
    .upsert({ id: 'default', categories }, { onConflict: 'id' })
    .select('categories')
    .single<CatalogRow>();

  if (error) throw error;
  return asCatalog(data.categories);
}

export async function createQuote(payload: EstimatePayload) {
  const client = requireSupabase();
  const existing = await client
    .from('quotes')
    .select('*')
    .eq('reference', payload.reference)
    .maybeSingle<QuoteRow>();

  if (existing.error) throw existing.error;
  if (existing.data) return toSavedQuote(existing.data);

  const { data, error } = await client
    .from('quotes')
    .insert({
      reference: payload.reference,
      customer_name: payload.customer.name,
      mobile: payload.customer.mobile,
      event_type: payload.customer.eventType,
      event_date: payload.customer.eventDate,
      guests: payload.customer.guests,
      customer_gst_number: payload.customer.gstNumber || null,
      hall: payload.customer.hall,
      services: payload.services,
      pricing: payload.pricing,
      status: 'new',
    })
    .select('*')
    .single<QuoteRow>();

  if (error) throw error;
  return toSavedQuote(data);
}

export function useCreateQuote() {
  return useMutation({
    mutationFn: ({ data }: { data: EstimatePayload }) => createQuote(data),
  });
}

export async function listQuotes(limit = 25) {
  const { data, error } = await requireSupabase()
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<QuoteRow[]>();

  if (error) throw error;
  return data.map(toSavedQuote);
}

export function useListQuotes({ limit = 25, enabled = true }: { limit?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['supabase', 'quotes', limit],
    queryFn: () => listQuotes(limit),
    enabled: enabled && supabaseConfig.configured,
  });
}

export async function getQuote(reference: string) {
  const { data, error } = await requireSupabase()
    .from('quotes')
    .select('*')
    .eq('reference', reference)
    .maybeSingle<QuoteRow>();

  if (error) throw error;
  if (!data) throw new Error('Quote not found');
  return toSavedQuote(data);
}

export const getGetQuoteQueryKey = (reference: string) => ['supabase', 'quote', reference] as const;

export function useGetQuote(reference: string, options?: { query?: { enabled?: boolean; queryKey?: readonly unknown[] } }) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetQuoteQueryKey(reference),
    queryFn: () => getQuote(reference),
    enabled: Boolean(reference) && (options?.query?.enabled ?? true) && supabaseConfig.configured,
  });
}

type AdminAuth = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  error: string;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

export function useAdminAuth(): AdminAuth {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseClient) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabaseClient.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabaseClient) {
      setError(supabaseConfig.error);
      return false;
    }
    setError('');
    const result = await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setSession(result.data.session);
    return true;
  };

  const signOut = async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    setSession(null);
  };

  return { loading, session, user: session?.user ?? null, error, signIn, signOut };
}