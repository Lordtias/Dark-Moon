# Correctivo móvil — Botín scroll completo + Habilidades visual dorado

## Base
Aplicado sobre el estado posterior a `12f9bb01e913fc94f2d7b90d10a429c064922afc`
y sus correctivos móviles de scroll.

## Problema 1
En Botín el swipe sólo funcionaba con confiabilidad sobre la sección superior.
La ficha inferior y algunas subzonas seguían perteneciendo a superficies con
scroll propio o con contrato táctil insuficiente.

## Solución
Se fuerza en móvil un único scroll principal para el modal y se neutraliza
específicamente el overflow vertical del detalle de objeto reutilizado dentro
 de Botín. Además se habilita `touch-action: pan-y` en los descendientes del
modal para que el gesto pueda empezar desde cualquier área.

## Problema 2
El panel de Habilidades conservaba una estética azulada, distinta del lenguaje
visual dorado/mostaza de Personaje y Objetos.

## Solución
Se unifica la estética del modal y panel de Habilidades hacia un esquema
oscuro con acentos dorado/mostaza. El cambio es visual: no altera nodos,
progresión, distribución del árbol ni contratos funcionales.

## Riesgo funcional
Bajo. No se modifica JavaScript de inventario, botín ni habilidades.
