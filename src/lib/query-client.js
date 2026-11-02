import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// sem internet as consultas respondem pela cópia guardada no aparelho
			networkMode: 'always',
			gcTime: 24 * 60 * 60 * 1000,
		},
	},
});