import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
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
    default: async ({ request }) => {
        const formData = await request.formData();
        const data: Record<string, string> = {};

        formData.forEach((value, key) => {
            data[key] = value.toString();
        });

        return {
            success: true,
            method: 'POST',
            data
        };
    }
};
