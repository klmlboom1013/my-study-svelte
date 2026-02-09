import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    console.log('[Callback Load] URL:', url.toString());
    const data: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
        data[key] = value;
    });

    return {
        method: 'GET',
        data
    };
};

export const actions: Actions = {
    default: async ({ request, url }) => {
        console.log('[Callback Action] POST request received at:', url.toString());
        try {
            const formData = await request.formData();
            const data: Record<string, string> = {};

            formData.forEach((value, key) => {
                data[key] = value.toString();
            });

            console.log('[Callback Action] Data received:', Object.keys(data).length, 'fields');

            return {
                success: true,
                method: 'POST',
                data
            };
        } catch (e) {
            console.error('[Callback Action] Error parsing form data:', e);
            return {
                success: false,
                method: 'POST',
                data: {},
                error: (e as Error).message
            };
        }
    }
};
