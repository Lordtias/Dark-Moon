# Cierre — Etapa 2 · Adaptación responsive móvil

## Estado final

- Base de la etapa: `fd601a248f5313ee6f704d85963c1b9ac660977f`.
- Fecha de cierre: 19/08/2026.
- Estado: **CERRADA Y APROBADA**.
- Pruebas manuales: **SUPERADAS**.
- Commit/push: no realizados durante la entrega.

## Alcance cerrado

La Etapa 2 deja consolidada una única interfaz responsive, sin crear un modo móvil paralelo ni alterar las reglas jugables. Desktop permanece como referencia visual y las adaptaciones se activan únicamente por viewport, orientación o capacidad táctil.

### HUD final aprobado

**Portrait móvil**

- esferas de Vida y Maná ocultas;
- Vida y Maná como barras horizontales compactas;
- Vida, Maná y Experiencia centradas arriba de las habilidades;
- barra rápida `5×2`;
- navegación debajo de la barra.

**Landscape móvil**

- esferas de Vida y Maná conservadas;
- Experiencia centrada arriba de las habilidades;
- barra rápida `10×1`.

**Desktop**

- HUD y barra `10×1` conservan la composición previa;
- paneles y modales no adoptan comportamiento móvil por resolución normal de PC.

## Contratos responsive cerrados

1. `100dvh` con fallback `100vh` y safe areas.
2. Capa responsive única y aditiva.
3. Paneles primarios fullscreen sólo cuando el contexto móvil lo requiere.
4. Árbol de habilidades con nodos legibles y scroll cuando falta altura.
5. Objetivos táctiles ampliados sólo en contexto táctil reducido.
6. Modales reutilizados; no existen duplicados móviles.
7. Información jugable no depende exclusivamente de hover.
8. Creación y comercio contemplan reducción de viewport por teclado virtual.
9. Regresión desktop obligatoria.
10. Vida/Maná compactos consumen los mismos valores canónicos que las esferas; no existe lógica de recursos duplicada.

## Validación

La implementación base fue validada automáticamente antes de la entrega responsive y el correctivo posterior del HUD móvil pasó las comprobaciones de sintaxis y configuraciones. Finalmente, el usuario confirmó que las pruebas manuales fueron superadas el **19/08/2026**.

No quedan pendientes dentro de la Etapa 2. Cualquier cambio posterior sobre responsive o HUD móvil debe abrirse como corrección o nueva etapa explícita.
