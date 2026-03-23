import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,               // data fresh for 30 s
            gcTime: 10 * 60 * 1000,             // keep cache 10 min
            refetchOnWindowFocus: true,          // refetch when tab regains focus
            refetchOnReconnect: true,            // refetch after network reconnect
            refetchInterval: 5 * 60 * 1000,        // poll every 5 min (WebSocket handles real-time)
            refetchIntervalInBackground: false,  // pause polling when tab is hidden
            retry: 1,
        },
    },
});
