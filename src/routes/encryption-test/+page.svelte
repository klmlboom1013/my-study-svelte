<script lang="ts">
    import { encryptSeed, decryptSeed } from "$lib/utils/crypto";

    let inputText = "";
    let encryptedText = "";
    let decryptedText = "";

    function handleEncrypt() {
        try {
            encryptedText = encryptSeed(inputText);
            decryptedText = ""; // Clear previous decryption
        } catch (e) {
            console.error(e);
            alert("암호화 실패: " + e);
        }
    }

    function handleDecrypt() {
        try {
            decryptedText = decryptSeed(encryptedText);
        } catch (e) {
            console.error(e);
            alert("복호화 실패: " + e);
        }
    }
</script>

<div class="p-4 space-y-4">
    <h1 class="text-2xl font-bold">SEED 암호화 테스트</h1>

    <div class="space-y-2">
        <label class="block font-semibold">입력 텍스트:</label>
        <input
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
