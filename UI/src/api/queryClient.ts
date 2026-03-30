import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,               // data fresh for 30 s
            gcTime: 10 * 60 * 1000,             // keep cache 10 min
            refetchOnWindowFocus: true,          // refetch when tab regains focus
            refetchOnReconnect: true,            // refetch after network reconnect
            refetchInterval: 30 * 1000,           // poll every 30 s as baseline
            refetchIntervalInBackground: false,  // pause polling when tab is hidden
            retry: 1,
        },
    },
});
