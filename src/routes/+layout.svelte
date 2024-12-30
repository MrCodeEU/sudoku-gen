<script>
    import '../app.css';
</script>

<nav class="bg-gray-800 text-white p-4 mb-4">
    <div class="container mx-auto flex gap-4">
        <a href="/" class="hover:text-gray-300">Generator</a>
        <a href="/list" class="hover:text-gray-300">Sudoku Liste</a>
    </div>
</nav>

<main>
    <slot />
</main>
