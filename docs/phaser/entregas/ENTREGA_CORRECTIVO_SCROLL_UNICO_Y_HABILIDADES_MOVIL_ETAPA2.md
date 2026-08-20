# Correctivo post-Etapa 2 — Scroll único y Habilidades móvil

## Base

- SHA de referencia: `12f9bb01e913fc94f2d7b90d10a429c064922afc`.
- Este correctivo incluye y supera el correctivo anterior de scroll de modales móviles.
- Estado: **IMPLEMENTADO — PENDIENTE DE VALIDACIÓN MANUAL EN CELULAR**.

## Problema reproducido

En `Revisar botín` el desplazamiento sólo respondía al swipe iniciado sobre la sección de objetos. Después de bajar hasta el detalle/acciones no era posible regresar iniciando el gesto desde esas zonas. La causa era la coexistencia de varias superficies verticales con `overflow`, de modo que cada sección podía capturar o perder el gesto de forma independiente.

La auditoría mostró el mismo patrón de riesgo en Comercio, Curación, Selección de mazmorra, Detalle de objeto/entidad, Ayuda y paneles fullscreen con listas internas.

## Contrato corregido

En móvil, un modal o panel largo dispone de **un único contenedor vertical desplazable principal**. Listas, detalles y acciones participan del mismo flujo y no mantienen scrolls verticales competidores. Los botones permiten `pan-y`, por lo que un gesto iniciado sobre una acción puede continuar desplazando el contenedor y un tap conserva su función normal.

La creación de personaje mantiene el criterio equivalente ya aplicado: el viewport/página es la superficie vertical principal.

## Rediseño móvil de Habilidades

Se conserva el árbol/grafo y sus relaciones. El rediseño reduce el espacio de navegación que ocultaba el árbol:

- categorías: una banda superior compacta de cuatro opciones;
- maestrías: una sola banda horizontal desplazable, en vez de varias filas;
- cabecera y contadores: versión compacta móvil;
- árbol: mantiene estructura de niveles y conexiones;
- nodo: aprox. `50×50 px` en portrait y `46×46 px` en landscape bajo;
- el árbol usa scroll vertical sólo cuando realmente excede el área disponible;
- el selector de maestrías usa scroll horizontal independiente (`pan-x`), deliberadamente distinto del scroll vertical del árbol;
- cada re-render mantiene automáticamente visible la maestría activa, evitando que una selección situada al final de la banda vuelva visualmente al comienzo.

## Auditoría complementaria

Se revisaron los siguientes componentes por el mismo patrón de scroll táctil:

- Botín / contenedor de objetos;
- Comercio;
- Curación;
- Selección de mazmorra;
- Detalle de objeto;
- Detalle de entidad;
- Ayuda;
- Personaje;
- Inventario/Equipamiento;
- Registro;
- modal de desglose de estadística;
- confirmaciones de habilidades.

Los paneles de Personaje/Objetos/Registro también delegan el desplazamiento móvil a su cuerpo principal; listas internas de pasivas/efectos dejan de capturar un swipe vertical separado.

## Validaciones realizadas

- `node --check` de `PanelHabilidadesMaestrias.js`: OK;
- balance estructural de `responsive.css`: OK;
- fixture Chromium 390×844: Botín tiene un único `overflow-y:auto` principal y descendientes de lista/detalle quedan sin scroll vertical propio;
- gesto táctil simulado desde un botón inferior de Botín: el contenedor volvió desde el final hasta el inicio correctamente;
- Habilidades 360×800, 390×844 y 412×915: categorías en una fila, ocho maestrías en una banda horizontal y nodos de 50 px;
- Habilidades 667×375 y 844×390: navegación superior compacta, nodos de 46 px y árbol verticalmente desplazable;
- `PanelHabilidadesMaestrias.js` sólo conserva visible la opción activa del selector horizontal; no cambia aprendizaje, XP, puntos, requisitos ni ejecución de habilidades;
- no se cambia lógica de botín, inventario, maestrías ni combate;
- las reglas están acotadas a viewport móvil/baja altura, preservando desktop.

## Pruebas manuales solicitadas

1. Abrir Botín, bajar hasta los botones y volver a subir iniciando el swipe sobre detalle y sobre botones.
2. Repetir en Comercio, Curación y Selección de mazmorra.
3. Abrir Personaje e Inventario y comprobar que el swipe no queda atrapado dentro de listas internas.
4. Abrir Habilidades → Armas: recorrer las ocho maestrías horizontalmente y confirmar que el árbol queda visible debajo.
5. Probar Habilidades en portrait y landscape y abrir el detalle de un nodo.
6. Confirmar regresión desktop: navegación y tamaños desktop sin cambios.
