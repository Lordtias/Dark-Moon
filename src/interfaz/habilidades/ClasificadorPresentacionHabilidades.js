// Clasifica una habilidad únicamente para su presentación. Reutilizan este
// contrato el árbol y el modal para evitar dos interpretaciones distintas de
// qué contenido es Pasiva, Aura, Maldición u Ofensiva.
export function clasificarPresentacionHabilidad({
  habilidad,
  ejecucion,
  catalogoEfectos = {},
} = {}) {
  if (habilidad?.tipo === "pasiva") return "pasiva";

  const grados = Object.values(ejecucion?.ejecucion?.grados ?? {});
  const idsEfecto = new Set(
    grados.flatMap((grado) =>
      (grado?.efectos ?? [])
        .map((efecto) => efecto?.efectoId)
        .filter(Boolean),
    ),
  );

  for (const idEfecto of idsEfecto) {
    const etiquetas = catalogoEfectos?.[idEfecto]?.etiquetas ?? [];
    if (etiquetas.includes("aura")) return "aura";
  }

  for (const idEfecto of idsEfecto) {
    const etiquetas = catalogoEfectos?.[idEfecto]?.etiquetas ?? [];
    if (etiquetas.includes("maldicion")) return "maldicion";
  }

  return "ofensiva";
}
