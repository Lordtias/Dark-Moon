# ENTREGA P6.3F — REGRESIÓN, DOCUMENTACIÓN Y CIERRE GENERAL DE P6.3

Fecha: 2026-08-06  
Etapa: P6.3F  
Base exacta: `4ab9d468db5e77547a85be7dd4f23bd01028be42`  
Rama: `main`  
Commit realizado: no

## 1. Objetivo

Ejecutar una regresión transversal de todo P6.3, corregir únicamente defectos reales detectados por esa regresión y actualizar la documentación para dejar el hito técnicamente listo para su validación manual y cierre. No se agregan habilidades, estados, balance ni reglas jugables nuevas.

## 2. Base utilizada

El ZIP recibido contiene `.git`, rama `main`, HEAD y referencia incluida `origin/main` en `4ab9d468db5e77547a85be7dd4f23bd01028be42`. Las marcas iniciales de Git se comprobaron como diferencias exclusivas CRLF/LF; no existían diferencias reales de contenido.

P6.3E queda registrada como validada manualmente y cerrada en ese mismo SHA.

## 3. Alcance ejecutado

La regresión cubre:

- 12 habilidades canónicas del jugador y sus 40 grados;
- 2 habilidades canónicas de NPC para Lythra;
- 8 contratos de efectos temporales;
- patrones `proyectil`, `area_instantanea`, `cadena`, `zona_persistente` y `linea`;
- aplicación, renovación, intensificación, resistencia, inmunidad y vencimiento de estados;
- bloqueo total, bloqueo de habilidades y contraefectos genéricos;
- zonas temporales y activaciones `al_crear`, `al_entrar` y `por_intervalo`;
- derrotas integradas y prevención de duplicaciones visuales;
- recuperación de Vida/Maná mediante `recursosObjetivo`;
- selección Canvas 2D / Phaser y separación dominio-presentación;
- analizador real de balance, pruebas focalizadas y contratos de efectos.

## 4. Defecto encontrado y corrección

La regresión detectó un único defecto de diagnóstico en `AnalizadorBalanceCombate.js`. La tabla general de habilidades evaluaba Nube tóxica como si una sola activación representara toda la habilidad. En grado 1 eso producía un resultado `incorrecto`, aunque el mismo analizador ya posee una prueba focalizada que recorre la duración completa de la zona y demuestra que el balance canónico es el previsto.

La corrección es genérica para cualquier habilidad con `zonaTemporal`:

- la fila general de una sola activación pasa a estado informativo;
- el criterio explica que el balance definitivo corresponde al análisis focalizado de ciclo completo;
- no se cambia daño, Maná, alcance, duración, intervalo, probabilidad, intensidad ni ningún otro valor jugable.

Plaga corrosiva conserva el tratamiento informativo existente por requerir reaplicaciones. Incinerar grado 3 conserva una advertencia legítima; no se modifica su balance.

## 5. Arquitectura verificada

Phaser continúa siendo consumidor de eventos canónicos. La búsqueda estática no encontró llamadas de presentación a resolución de daño, aplicación de efectos, gasto de Maná, línea de visión, resistencias o inmunidades.

El planificador visual conserva:

- derrotas integradas en el impacto para proyectiles, cadenas y líneas;
- derrotas separadas donde el patrón de área/zona lo requiere;
- `recursosObjetivo` de habilidades NPC;
- tipo de actor canónico `npc`;
- intensidad y estados ya resueltos por dominio.

Canvas 2D sigue siendo el renderizador predeterminado y Phaser continúa seleccionable mediante su configuración existente.

## 6. Regresión funcional dirigida

La batería de módulos reales comprobó, entre otros casos:

1. catálogos: 12 habilidades, 40 grados, 2 habilidades NPC y 8 efectos;
2. 14 perfiles visuales de habilidad y familias esperadas;
3. Ráfaga glacial: 60 % y duraciones 200/250/300;
4. Congelamiento: bloqueo total sin inmunidad al daño;
5. Quemadura ↔ Congelamiento: remoción mutua solo tras aplicación aceptada;
6. resistencia/inmunidad: no remueven el efecto anterior;
7. Envenenamiento: el tick periódico continúa causando daño mientras el actor está congelado;
8. Aturdimiento y Parálisis: bloqueo total; Silencio: solo habilidades;
9. Plaga corrosiva grado 2: una única instancia llega a intensidad 3;
10. Nube tóxica: activaciones `al_crear`, `al_entrar`, `por_intervalo` y duración renovable;
11. Lythra «Ambos»: dos eventos NPC ordenados Vida → Maná;
12. recurso ya completo: no genera habilidad redundante;
13. oro insuficiente: no genera eventos ni modifica recursos;
14. habilidades NPC: duración visual fija de 820 ms sin coste temporal jugable.

Todos esos controles finalizaron correctamente.

## 7. Regresión del planificador visual

Se planificaron eventos representativos reales para:

- Ascua;
- Explosión ígnea;
- Cadena de rayos;
- Nube tóxica;
- Incinerar;
- Plaga corrosiva;
- Ráfaga glacial;
- Curación lunar.

Resultado:

- los siete casos jugables evaluados conservaron el contrato de su patrón;
- proyectil, cadena y línea integran la derrota y no dejan una segunda muerte visual;
- área y zona mantienen su derrota separada cuando corresponde;
- las habilidades NPC conservan `tipoActor: npc` y `recursosObjetivo`.

## 8. Regresión temporal y selección de renderizador

Se verificó que:

- las 12 habilidades del jugador derivan su ritmo de la duración temporal canónica;
- las 2 habilidades NPC utilizan duración visual fija;
- Canvas 2D permanece como renderizador predeterminado;
- Phaser continúa siendo seleccionable sin modificar reglas del dominio.

## 9. Analizador de balance real

Después de la corrección de diagnóstico:

### Regresión general

- correctos: 28;
- advertencias: 0;
- incorrectos: 0;
- informativos: 8.

Cobertura: 45 mapas, 9 tramos de nivel, 3 profesiones, 12 habilidades, 40 grados, 2 casos de recompensa, 6 casos de fallo y 11 controles de cobertura.

### Pruebas focalizadas

- casos: 19;
- correctos: 17;
- advertencias: 0;
- incorrectos: 0;
- informativos: 2.

### Habilidades

- filas: 40;
- correctos: 33;
- advertencias: 1;
- incorrectos: 0;
- informativos: 6;
- simulaciones: 800.

La única advertencia es Incinerar G3, con un ratio aproximado de 151,03 %, apenas por encima del umbral de resultado correcto. No se modifica porque P6.3F no autoriza cambios de balance. Nube tóxica G1–G3 queda informativa por ser zona persistente y Plaga corrosiva G1–G3 por requerir reaplicaciones.

### Efectos

- correctos: 202;
- advertencias: 34;
- incorrectos: 0.

Incluye 76 casos de probabilidad, 5 contratos, 12 inmunidades, 36 perfiles de Constitución, 89 variantes enemigas, 41 extremos, 12 afijos y 6 casos de acumulación de accesorios. Las advertencias corresponden al comportamiento informativo/limítrofe del analizador y no representan una regresión funcional detectada en P6.3F.

## 10. Validaciones globales

Sobre el árbol final de trabajo se verificó:

- sintaxis de 194 archivos JavaScript: correcta;
- lectura de 26 archivos JSON: correcta;
- 428 imports relativos: todos resueltos;
- `git diff --check`: correcto;
- archivos `.mjs`: 0;
- archivos `.patch`: 0;
- rama `main`;
- HEAD conservado en `4ab9d468db5e77547a85be7dd4f23bd01028be42`;
- ningún commit ni push realizado;
- comparación por contenido contra HEAD: solo los archivos declarados en esta entrega difieren realmente.

El `git status` bruto conserva marcas heredadas de la base por metadatos/finales de línea. No se toman como modificaciones reales: la comparación por hash de contenido contra los blobs de HEAD es la referencia utilizada para separar esos falsos positivos de los cambios de P6.3F.

La verificación de los ZIP de entrega aplicó el incremental sobre una copia limpia del SHA base y comparó el árbol resultante archivo por archivo contra el ZIP completo: 421 archivos fuera de `.git`, 0 rutas faltantes, 0 rutas extra y 0 diferencias de contenido. El ZIP completo conserva HEAD y `origin/main` en `4ab9d468db5e77547a85be7dd4f23bd01028be42`, relación 0/0 y 0 cambios staged.

## 11. Archivos modificados

- `src/herramientas/balance/AnalizadorBalanceCombate.js`;
- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- `docs/phaser/entregas/ENTREGA_P6_3_E.md`.

## 12. Archivo nuevo

- `docs/phaser/entregas/ENTREGA_P6_3_F.md`.

## 13. Pruebas manuales requeridas

Antes de declarar P6.3 cerrada, realizar en navegador al menos:

1. Ascua, Esquirla, Chispa y Aguijón tóxico: trayectoria, fallo, crítico y estados;
2. Explosión ígnea y Nova de escarcha: área, paredes y casillas vacías;
3. Cadena de rayos: saltos, paredes, Electrización y derrotas intermedias;
4. Nube tóxica: crear, entrar, intervalos, pulso vacío, resistencia, inmunidad y derrota;
5. Incinerar y Descarga fulminante: líneas, paredes, casillas vacías y derrotas;
6. Plaga corrosiva: intensidades, máximo, renovación, resistencia e inmunidad;
7. Ráfaga glacial: fragmentos dirigidos, 60 %, Congelamiento total y duraciones 200/250/300;
8. Quemadura ↔ Congelamiento y daño periódico durante Congelamiento;
9. Lythra: Vida, Maná, Ambos, recurso completo y oro insuficiente, sin sprite de poción ni avance temporal;
10. cancelación, cambio de mapa, desaparición de estados y ausencia de derrotas duplicadas;
11. `efectosReducidos`;
12. repetir casos esenciales con Canvas 2D.

## 14. Limitación de navegador

Se intentó abrir tanto `http://127.0.0.1/...` como `file://...` para automatizar la regresión visual, pero el entorno bloqueó ambas rutas con `ERR_BLOCKED_BY_ADMINISTRATOR`. Por eso no se declara validada la sensación visual real, el ritmo con cámara ni la limpieza final en navegador.

## 15. Exclusiones

P6.3F no incorpora:

- nuevas habilidades o efectos;
- cambios de daño, Maná, alcance, duración o probabilidades;
- IA enemiga con magia;
- nuevas habilidades NPC;
- sonido;
- botín;
- nuevas reglas de muerte;
- refactors no requeridos por una regresión real.

## 16. Riesgos conocidos

- Incinerar G3 permanece como advertencia de balance y debe analizarse únicamente en una etapa de balance autorizada;
- la presentación visual completa requiere validación manual en navegador;
- P6.3 no debe marcarse definitivamente cerrada hasta esa aprobación del usuario.

## 17. Próximo paso

Cierre posterior: la validación manual fue correcta y el commit final de P6.3F es `2ef2697ae2de753c305dac00082199c2e6505e63`. P6.3 queda cerrada y la continuación es P6.4.

## 18. Commit propuesto

```text
fix(balance): corregir regresión de zonas y cerrar P6.3F

- tratar zonas persistentes como informativas en el análisis general de una activación
- conservar su evaluación definitiva en las pruebas focalizadas de ciclo completo
- ejecutar la regresión integral de doce habilidades y cuarenta grados
- verificar estados, bloqueos, contraefectos, intensificación y zonas temporales
- validar las dos habilidades NPC de Lythra y recursosObjetivo
- comprobar patrones visuales y derrotas sin duplicación
- mantener Canvas 2D operativo y Phaser libre de decisiones jugables
- registrar el cierre validado de P6.3E
- documentar la matriz y resultados de regresión de P6.3F
- preparar el cierre manual de P6.3 y la transición a P6.4
```
