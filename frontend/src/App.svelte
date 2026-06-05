<script lang="ts">
  import { appConfig } from './stores/configStore';
</script>

<main class="app-shell">
  <aside class="sidebar" aria-label="Table of contents">
    <div class="brand">Maakdown</div>
    <p class="muted">No document open</p>
  </aside>

  <section class="reader" aria-label="Markdown document">
    <header class="toolbar">
      <button type="button">Open</button>
      <span class="status">{$appConfig.highlighterEngine}</span>
    </header>

    <article class="document-surface">
      <h1>Maakdown</h1>
      <p>Project scaffold is ready. Renderer implementation starts in P1.</p>
    </article>
  </section>
</main>
