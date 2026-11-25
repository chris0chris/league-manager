# UI Button Patterns / Button-Muster

Short convention for self-service forms (and any form that follows them).

## Rule / Regel

1. **Primary action / Hauptaktion** — `Speichern`, `Einsatz nachtragen`, `Alle speichern`,
   `Einsatz übernehmen` — takes the full remaining width of the row (`w-100`
   inside a flex column that grows, or `col` next to the cancel button).
   `Abbrechen` keeps its natural size and uses `class="btn btn-outline-danger"`.
2. **One shared row / Eine gemeinsame Zeile** — the primary action and
   `Abbrechen` sit in the same row below the form body. Secondary actions such
   as `Weitere Zeile hinzufügen` stay in their own row **above** it.
3. No second primary button in the same row and no `btn-danger` for `Abbrechen`.

```html
<div class="d-grid gap-2">
  <button type="submit" class="btn btn-outline-secondary">Weitere Zeile hinzufügen</button>
</div>
<div class="d-flex align-items-center gap-2 mt-3">
  <button type="submit" class="btn btn-primary flex-grow-1">Alle speichern</button>
  <a class="btn btn-outline-danger" href="…">Abbrechen</a>
</div>
```

German UI copy is mandatory; keep the labels of the primary actions exactly as
listed above so they stay consistent across the pages.
