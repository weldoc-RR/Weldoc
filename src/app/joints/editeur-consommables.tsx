"use client";

type Consommable = { id: string; type: string; fabricant: string; reference: string; lot: string };

// Sélecteur de consommables déjà enregistrés dans la bibliothèque (voir
// POST /api/consommables-cnd), réutilisé par les contrôles ressuage,
// magnétoscopie, radiographie et ultrasons — jamais ressaisis à la main.
export function EditeurConsommables({
  consommables,
  selectionnes,
  onChange,
}: {
  consommables: Consommable[];
  selectionnes: string[];
  onChange: (ids: string[]) => void;
}) {
  if (consommables.length === 0) return null;

  function basculer(id: string) {
    onChange(selectionnes.includes(id) ? selectionnes.filter((c) => c !== id) : [...selectionnes, id]);
  }

  return (
    <div style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>
      Consommables utilisés (optionnel) :
      <ul style={{ listStyle: "none", padding: 0, maxHeight: 100, overflowY: "auto" }}>
        {consommables.map((c) => (
          <li key={c.id}>
            <label>
              <input type="checkbox" checked={selectionnes.includes(c.id)} onChange={() => basculer(c.id)} />{" "}
              {c.type} — {c.fabricant} {c.reference} (lot {c.lot})
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
