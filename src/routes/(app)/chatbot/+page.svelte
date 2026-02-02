<script lang="ts">
    import { onMount, afterUpdate } from "svelte";
    import { fade } from "svelte/transition";
    import { Send, Bot, User, Loader2 } from "lucide-svelte";

    let message = "";
    let chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] =
        [];
    let isLoading = false;
    let chatContainer: HTMLElement;

    async function sendMessage() {
        if (!message.trim() || isLoading) return;

        const userMessage = message.trim();
        message = "";
        isLoading = true;

        // Add user message to UI immediately
        chatHistory = [
            ...chatHistory,
            { role: "user", parts: [{ text: userMessage }] },
        ];

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    history: chatHistory.map((h) => ({
                        role: h.role,
                        parts: h.parts,
                    })),
                }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(
                        "이용량이 많아 잠시 제한되었습니다. 1분 뒤 다시 시도해주세요.",
                    );
                }
                throw new Error("Failed to fetch response");
            }

            const data = await response.json();

            // Add AI response to UI
            chatHistory = [
                ...chatHistory,
                { role: "model", parts: [{ text: data.response }] },
            ];
        } catch (error: any) {
            console.error("Error:", error);
            const errorMessage =
                error.message === "Failed to fetch response"
                    ? "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
                    : error.message;

            chatHistory = [
                ...chatHistory,
                {
                    role: "model",
                    parts: [{ text: errorMessage }],
                },
            ];
        } finally {
            isLoading = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";

    onMount(() => {
        if (chatContainer) {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: "smooth",
            });
        }
    });

    afterUpdate(() => {
        if (chatContainer) {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: "smooth",
            });
        }
    });
</script>

<div class="flex flex-col h-full">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Chatbot" }]} />

    <div
        class="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
        <!-- Header -->
        <div
            class="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3"
        >
            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bot class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h2
                    class="text-lg font-semibold text-slate-800 dark:text-slate-100"
                >
                    Gemini AI Chatbot
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                    Powered by Google Gemini 1.5 Flash
                </p>
            </div>
        </div>

        <!-- Chat Area -->
        <div
            class="flex-1 overflow-y-auto p-4 space-y-4"
            bind:this={chatContainer}
        >
            {#if chatHistory.length === 0}
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-4"
                    in:fade
                >
                    <Bot class="w-12 h-12 opacity-20" />
                    <p>
                        무엇이든 물어보세요! 프로젝트에 대해 궁금한 점이
                        있으신가요?
                    </p>
                </div>
            {/if}

            {#each chatHistory as chat}
                <div
                    class="flex items-start gap-3 {chat.role === 'user'
                        ? 'flex-row-reverse'
                        : ''}"
                >
                    <div
                        class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    {chat.role === 'user'
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}"
                    >
                        {#if chat.role === "user"}
                            <User class="w-5 h-5" />
                        {:else}
                            <Bot class="w-5 h-5" />
                        {/if}
                    </div>

                    <div
                        class="max-w-[70%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                    {chat.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'}"
                    >
                        <p class="whitespace-pre-wrap">{chat.parts[0].text}</p>
                    </div>
                </div>
            {/each}

            {#if isLoading}
                <div class="flex items-start gap-3" in:fade>
                    <div
                        class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0"
                    >
                        <Bot class="w-5 h-5" />
                    </div>
                    <div
                        class="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2"
                    >
                        <Loader2 class="w-4 h-4 animate-spin text-slate-400" />
                        <span class="text-sm text-slate-400">Thinking...</span>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Input Area -->
        <div
            class="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700"
        >
            <div
                class="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
            >
                <textarea
                    bind:value={message}
                    on:keydown={handleKeydown}
                    placeholder="메시지를 입력하세요..."
                    class="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    rows="1"
                ></textarea>
                <button
                    on:click={sendMessage}
                    disabled={!message.trim() || isLoading}
                    class="p-2 rounded-lg mb-1 transition-all flex-shrink-0
                    {message.trim() && !isLoading
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95'
                        : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'}"
                >
                    <Send class="w-5 h-5" />
                </button>
            </div>
            <p
                class="text-[10px] text-center mt-2 text-slate-400 dark:text-slate-500"
            >
                AI는 실수를 할 수 있습니다. 중요한 정보는 확인해 주세요.
            </p>
        </div>
    </div>
</div>
