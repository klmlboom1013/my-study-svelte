<script lang="ts">
    import ApiCategoryForm from "../ApiCategoryForm.svelte";
</script>

<div class="flex flex-col gap-6 max-w-3xl mx-auto">
    <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
            Create API Category
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
            Add a new category to organize your API endpoints.
        </p>
    </div>

    <ApiCategoryForm />
</div>
