
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';
import { PROJECT_CONTEXT } from '$lib/server/gemini/projectContext';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TAG = '[POST][/api/chat]';
const REQUEST_LIMIT = 15;
const SIMULATED_DELAY_MS = 1000;
const requests: number[] = [];

export const POST: RequestHandler = async ({ request }) => {
    try {
        // 1. Rate Limiting Check
        const now = Date.now();
        // Remove timestamps older than 1 minute
        while (requests.length > 0 && requests[0] < now - 60000) {
            requests.shift();
        }

        if (requests.length >= REQUEST_LIMIT) {
            return json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        requests.push(now);

        if (!GEMINI_API_KEY) {
            return json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
        }

        const { message, history } = await request.json();
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        // 시스템 프롬프트를 히스토리의 첫 부분에 주입 (호환성 확보)
        const systemHistory = [
            {
                role: 'user',
                parts: [{ text: `[System Instruction]\n${PROJECT_CONTEXT}\n\n위 가이드를 준수하여 답변해.` }]
            },
            {
                role: 'model',
                parts: [{ text: '네, 알겠습니다. 프로젝트 가이드를 준수하여 답변하겠습니다.' }]
            }
        ];

        const chat = model.startChat({
            history: [...systemHistory, ...(history || [])],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return json({ response: text });
    } catch (error: any) {
        console.error('Gemini API Error:', error);

        // Google API 예외 처리 (429 등 상태 코드 전달)
        const status = error.status || 500;
        const message = error.message || 'Failed to process request';

        return json({ error: message }, { status });
    }
};
