# ENTREGA HP5 — Reestructuración de interfaz e identidad visual

**Base:** `70f78115dffe96a223128b5cffbbab0ef58024ce`  
**Estado:** Cerrada. Implementación y pruebas manuales superadas y aprobadas por el usuario el 18/08/2026.

## Implementado

- Personaje ocupa todo el panel; Equipamiento ya no comparte esa pantalla.
- `Objetos` reúne Inventario y Equipamiento con composición responsive, sin fusionar responsabilidades.
- `Magia` se presenta como `Habilidades`; se agregan Potencia de Habilidad y Resistencia Mental.
- Pasivas aprendidas se agrupan por maestría y muestran estado Activa/Inactiva/Condicional usando condiciones canónicas.
- Efectos activos se consultan desde `Juego.obtenerEfectosTemporales` y muestran turnos de referencia restantes con `TIEMPO_REFERENCIA`.
- `ModalDetalleEstadistica` reemplaza tooltips nativos para el desglose. No calcula estadísticas; lee la misma resolución del centralizador.
- `EstadisticasDerivadas.resolucionesModificadores` y `crearContextoPotenciaHabilidad.resolucionModificador` son extensiones aditivas de lectura; no alteran resultados ni operaciones.
- Afijos muestran `Objeto/Portador` leyendo `ambito` y la comparación conserva esa información.
- Se agregan 92 iconos; el catálogo queda 104/104 con PNG 128×128.
- Las ocho Maldiciones funcionales tienen iconografía propia no elemental; las Vulnerabilidades elementales sí mantienen afinidad.
- ES/EN, responsive y documentos maestros actualizados.

## Reservado para HP6

- `OrganizadorArbolHabilidades` genérico para todas las maestrías/habilidades.
- Árbol ordenado por `requisitoNivelMaestria` y conexiones solo con relaciones canónicas.
- Auras/Maldiciones compactas alrededor de experiencia/barra rápida con turnos restantes.
- Retiro del punto brillante persistente del Player manteniendo efectos de activación/dispersión.
- regresión Web/Electron y cierre final del hito.

## Validación técnica ejecutada

- rama/base auditada: `main`, HEAD/origin `70f78115dffe96a223128b5cffbbab0ef58024ce` al inicio;
- JSON válidos;
- configuración validada con 16 maestrías y 104 habilidades;
- 104/104 iconos existentes y 128×128;
- sintaxis de JS modificados correcta;
- imports relativos sin rutas faltantes;
- sin dependencias ni cambios de persistencia.

## Pruebas manuales — resultado final

1. `Personaje`: verificar ancho completo, Habilidades, Potencia de Habilidad y Resistencia Mental.
2. Clic en estadísticas: abrir modal visual; bonificaciones/penalizaciones deben corresponder al valor visible.
3. Equipar/desequipar arma o set y verificar pasivas Activa/Inactiva sin movimiento intermedio.
4. Pasivas específicas de una habilidad deben mostrarse Condicionales, no falsamente inactivas.
5. Aplicar Aura/Maldición: aparecer en Efectos activos, actualizar tiempo y desaparecer al vencer.
6. `Objetos`: Equipamiento + Inventario juntos; equipar/desequipar, detalle y comparación siguen funcionando.
7. Ver afijos locales/de portador con píldoras Objeto/Portador correctas.
8. Revisar panel Habilidades: no debe haber fallbacks de letras por falta de iconos.
9. Verificar específicamente Ceguera, Silencio, Marchitamiento y Supresión con identidad visual propia.
10. Cambiar ES/EN y probar resolución/zoom pequeño y grande.
11. Regresión básica: movimiento, combate, habilidades, guardado/carga y consola sin errores.

## Ajuste de validación — aportes de atributos y Mitigación de bloqueo

Durante la validación manual se amplió el modal de detalle para que cada valor explique no solo su desglose de modificadores sino también **qué representa y para qué se utiliza**.

`EstadisticasDerivadas` expone ahora una consulta canónica de lectura (`obtenerAportesAtributosPrimarios`) para describir los aportes actuales de los seis atributos primarios sin ampliar ni alterar el objeto de estadísticas derivadas. Esto permite dos lecturas complementarias sin reconstruir fórmulas en la interfaz:

- al abrir Fuerza, Destreza, Constitución, Inteligencia, Sabiduría o Carisma se listan las estadísticas a las que aportan y la magnitud actual de ese aporte;
- al abrir una estadística derivada se indican los atributos primarios que forman parte de su valor base y cuánto aporta cada uno.

Los aportes incluidos en el valor base se identifican expresamente como tales para no sugerir que deban sumarse otra vez sobre el resultado del resolutor. No se modifica ninguna fórmula ni el orden canónico de resolución.

Se incorpora además **Mitigación de bloqueo** al Panel Personaje. Su valor sigue siendo el mismo `estadisticasDerivadas.mitigacionBloqueo`; únicamente se conserva su resolución mediante `resolverValorConDesglose` para que pueda presentarse el detalle sin recalcularlo en UI.


## Cierre de validación manual

El usuario confirmó la superación de las pruebas de HP5, incluido el incremental posterior de desglose de atributos. Quedan validados específicamente:

- Personaje de ancho completo y navegación `Objetos`;
- Inventario y Equipamiento funcionando conjuntamente en la misma pantalla;
- actualización inmediata de información derivada sin requerir movimiento;
- Potencia de Habilidad y Resistencia Mental;
- Pasivas Activa/Inactiva/Condicional;
- Efectos temporales y duración restante;
- modal visual de desglose con descripción funcional;
- aportes de Fuerza, Destreza, Constitución, Inteligencia, Sabiduría y Carisma hacia estadísticas derivadas, y lectura inversa desde las estadísticas;
- Mitigación de bloqueo y su detalle;
- ámbito `Objeto/Portador` de afijos;
- catálogo completo de iconos y excepción visual de las Maldiciones funcionales.

No se realizaron cambios de balance, persistencia ni contratos canónicos jugables. HP5 queda **Cerrada** y HP6 pasa a ser la siguiente etapa planificada.
