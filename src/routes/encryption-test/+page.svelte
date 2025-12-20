<script lang="ts">
    import { encryptSeed, decryptSeed } from "$lib/utils/encryption/cryptoSeed";

    let inputText = "";
    let encryptedText = "";
    let decryptedText = "";

    // Test Keys (from previous defaults)
    const TEST_KEY = "rClo7QA4gdgyITHAPWrfXw==";
    const TEST_IV_STRING = "WPAYSTDWPAY00000";
    // Access Buffer from window in browser environment or global in node
    const getBuffer = () =>
        typeof window !== "undefined" ? (window as any).Buffer : Buffer;

    let TEST_IV = "";
    // Initialize IV on mount or lazily. Since this is Svelte 5, let's just do it inside the function or init

    // Simple helper to get IV
    function getTestIV() {
        const buf = getBuffer();
        if (buf) return buf.from(TEST_IV_STRING, "utf-8").toString("base64");
        return "";
    }

    function handleEncrypt() {
        try {
            const iv = getTestIV();
            encryptedText = encryptSeed(inputText, TEST_KEY, iv);
            decryptedText = ""; // Clear previous decryption
        } catch (e) {
            console.error(e);
            alert("암호화 실패: " + e);
        }
    }

    function handleDecrypt() {
        try {
            const iv = getTestIV();
            decryptedText = decryptSeed(encryptedText, TEST_KEY, iv);
        } catch (e) {
            console.error(e);
            alert("복호화 실패: " + e);
        }
    }
</script>

<div class="p-4 space-y-4">
    <h1 class="text-2xl font-bold">SEED 암호화 테스트</h1>

    <div class="space-y-2">
        <label for="input-text" class="block font-semibold">입력 텍스트:</label>
        <input
            id="input-text"
            type="text"
            bind:value={inputText}
            class="border p-2 w-full rounded"
            placeholder="암호화할 텍스트를 입력하세요"
        />
    </div>

    <div class="space-x-2">
        <button
            on:click={handleEncrypt}
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            암호화 실행
        </button>
    </div>

    {#if encryptedText}
        <div class="p-4 bg-gray-100 rounded">
            <p><strong>암호화 결과 (Base64):</strong></p>
            <code class="break-all">{encryptedText}</code>

            <button
                on:click={handleDecrypt}
                class="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 block"
            >
                위 결과 복호화
            </button>
        </div>
    {/if}

    {#if decryptedText}
        <div class="p-4 bg-gray-100 rounded border border-green-200">
            <p><strong>복호화 결과:</strong></p>
            <p>{decryptedText}</p>
        </div>
    {/if}
</div>
