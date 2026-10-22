// Supabase has been removed. All data in Zen is local-first via AsyncStorage.
// This mock object ensures backward compatibility without any network calls or errors.

const createNoOpChain = () => {
  const chain: any = {
    select: () => chain,
    insert: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    delete: () => chain,
    update: () => chain,
    eq: () => chain,
    in: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    order: () => Promise.resolve({ data: null, error: null }),
  };
  return chain;
};

export const supabase: any = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithOAuth: async () => ({ data: null, error: null }),
    setSession: async () => ({ data: null, error: null }),
    exchangeCodeForSession: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    startAutoRefresh: () => {},
    stopAutoRefresh: () => {},
  },
  from: () => createNoOpChain(),
};
