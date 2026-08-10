// Catálogo canónico de efectos que una plantilla de objeto consumible puede
// declarar. Los sistemas que validan o ejecutan consumibles dependen de este
// contrato, sin que el modelo de objeto necesite conocer el ejecutor.
export const TIPOS_EFECTO_CONSUMIBLE = Object.freeze({
  RECUPERAR_VIDA: "recuperarVida",
  RECUPERAR_MANA: "recuperarMana",
});
