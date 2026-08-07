# ENTREGA P6.4B — REGRESIÓN INTEGRAL Y CIERRE GENERAL DE P6

Fecha: 2026-08-06  
Etapa: P6.4B  
Base exacta: `bea2da38aad72f27a4bad4e7d491524a51289446`  
Rama: `main`  
Commit final: `c48335220712a8bff1d3907176f8ea1b7fac75ad`

## 1. Objetivo

Ejecutar la regresión transversal final del hito P6, verificar la separación entre dominio y presentación, registrar el cierre validado de P6.4A y dejar P6 técnicamente listo para su validación manual final. P6.4B no agrega contenido, reglas jugables, balance ni refactors preventivos.

## 2. Base utilizada

El ZIP recibido contiene `.git`, rama `main`, HEAD y referencia incluida `origin/main` exactamente en `bea2da38aad72f27a4bad4e7d491524a51289446`, con relación 0/0. El árbol recibido mostraba 49 marcas de Git; la comparación de cada archivo contra el blob de HEAD normalizando CRLF/LF confirmó 0 diferencias reales de contenido.

P6.4A queda registrada como validada manualmente y cerrada en ese SHA.

## 3. Resultado de la etapa

No se encontró ningún defecto funcional nuevo de P6. Por lo tanto, conforme al alcance aprobado, P6.4B no modifica código de producción ni configuración jugable. Los únicos cambios corresponden a documentación de cierre y a este documento de entrega.

La regresión visual/jugable final fue aprobada por el usuario y P6.4B se publicó en `c48335220712a8bff1d3907176f8ea1b7fac75ad`. Con ese commit P6 queda formalmente cerrada y validada.

## 4. Cobertura transversal

La regresión cubrió las fronteras construidas durante P6:

- movimiento, agenda temporal y plan visual de desplazamiento;
- ataques físicos y resultados de impacto/derrota;
- consumibles y recuperación;
- 12 habilidades canónicas del jugador y 40 grados;
- 2 habilidades NPC de Lythra;
- 8 efectos temporales;
- perfiles `proyectil`, `area_instantanea`, `cadena`, `zona_persistente` y `linea`;
- bloqueo total, bloqueo de habilidades y contraefectos;
- zonas temporales y daño periódico;
- muerte y botín inmediato;
- derrota del jugador y espera opcional de la presentación Phaser;
- selección de backend Canvas 2D / Phaser;
- persistencia libre de estado puramente visual;
- auditoría de dependencias del backend Phaser.

## 5. Regresión de catálogos y balance real

Se cargaron y validaron los motores y configuraciones reales mediante un `fetch` local de prueba, sin sustituir fórmulas del juego.

### Catálogos

- habilidades del jugador: 12;
- grados: 40;
- habilidades NPC: 2;
- efectos temporales: 8;
- perfiles visuales de habilidad: 14;
- perfiles visuales de estado: 8;
- perfiles visuales de zona: 5.

### Habilidades

- filas: 40;
- correctos: 33;
- advertencias: 1;
- incorrectos: 0;
- informativos: 6;
- simulaciones: 800.

La advertencia conocida continúa siendo Incinerar G3. No se modifica porque P6.4B no autoriza balance.

### Pruebas focalizadas

- casos: 19;
- correctos: 17;
- advertencias: 0;
- incorrectos: 0;
- informativos: 2.

### Efectos

- correctos: 202;
- advertencias: 34;
- incorrectos: 0.

### Regresión general

- correctos: 28;
- advertencias: 0;
- incorrectos: 0;
- informativos: 8;
- mapas generados: 45;
- tramos de nivel: 9;
- profesiones cubiertas: 3;
- habilidades cubiertas: 12;
- grados cubiertos: 40.

## 6. Contratos dirigidos comprobados

Una batería adicional de módulos reales confirmó:

1. movimiento neutral conserva origen, destino y ejecución temporal;
2. ataque derrotante se planifica como `ataque_resuelto → entidad_derrotada → botin_aparecido`;
3. Cadena de rayos integra `derrotaVisual` y `botinVisual` dentro del impacto derrotante y consume el evento posterior;
4. una muerte por efecto periódico conserva `entidad_derrotada → botin_aparecido`;
5. Curación lunar conserva `tipoActorCanonico: npc`, `recursosObjetivo` y cantidad realmente recuperada;
6. Ráfaga glacial conserva 60 % de Congelamiento y duraciones 200/250/300;
7. Congelamiento continúa declarado como `bloqueo_total`;
8. `SistemaTiempo` respeta una disponibilidad mínima de bloqueo antes de devolver el actor a la agenda;
9. al cierre de P6, Canvas 2D continuaba siendo el backend predeterminado y `?render=phaser` seleccionaba Phaser; P7.1 modifica deliberadamente ese criterio de entrada sin alterar los contratos de P6;
10. el modal de derrota no se presenta mientras exista una promesa visual Phaser pendiente y se presenta al resolverse esa espera.

## 7. Muerte y botín

P6.4A conserva el contrato final:

- el dominio resuelve primero la recompensa;
- `botin_generado` describe un resultado ya decidido;
- ataque directo: ataque → derrota → botín;
- daño periódico: derrota → botín;
- habilidad secuencial: derrota y botín permanecen dentro del impacto que mató;
- un evento de botín correlacionado se consume y no reaparece tarde;
- Phaser no consulta tablas, probabilidades, rarezas, XP ni reglas de consolidación.

## 8. Canvas 2D y selección de backend

El cierre de P6 verificó el selector vigente en ese momento: ausencia de parámetro en Canvas 2D y Phaser optativo. P7.1 cambia posteriormente el backend predeterminado de la beta a Phaser, manteniendo `?render=canvas2d` como respaldo explícito.

Canvas 2D sigue existiendo como backend completo e independiente de Phaser. La espera de presentación usada por el modal de derrota es opcional; un backend que no tenga espera conserva respuesta inmediata.

## 9. Auditoría arquitectura Phaser

Se revisaron todos los imports de `src/interfaz/graficos/phaser/`.

No se detectaron imports directos hacia motores de:

- daño;
- aplicación de efectos;
- botín;
- experiencia;
- línea de visión;
- resistencias;
- inmunidades;
- selección de objetivos;
- resolución temporal jugable.

El único vínculo hacia aplicación desde entrada Phaser es el contrato de comandos canónicos de `EjecutorAccionesJugador`; Phaser emite intención y no valida la acción.

Una búsqueda específica tampoco encontró llamadas de Phaser para calcular daño, aplicar efectos, gastar Maná, calcular probabilidades, resolver botín o consultar inmunidades.

Conclusión arquitectónica: Phaser continúa respondiendo únicamente **cómo representar un resultado ya resuelto**.

## 10. Persistencia y transiciones

La búsqueda sobre persistencia no encontró referencias a:

- `idVisual`;
- tweens Phaser;
- cola visual;
- `botin_aparecido`;
- eventos visuales transitorios.

La identidad gráfica sigue siendo un `WeakMap` en memoria dentro de `AdaptadorEscenaJuego`; no forma parte del snapshot jugable.

La escena final continúa siendo la autoridad de reconciliación tras cancelaciones o cambios de mapa.

## 11. Validaciones técnicas globales

Antes de construir los entregables se verificó:

- sintaxis de 194 archivos JavaScript: correcta;
- lectura de 26 JSON: correcta;
- 427 imports relativos: todos resueltos;
- `.mjs`: 0;
- `.patch`: 0;
- `git diff --check`: correcto;
- rama: `main`;
- HEAD conservado en `bea2da38aad72f27a4bad4e7d491524a51289446`;
- `origin/main`: mismo SHA;
- relación: 0/0;
- cambios staged: 0.

También se levantó un servidor HTTP local y se comprobaron respuestas 200 para:

- `index.html`;
- `game.js`;
- `ReproductorEventosVisualesPhaser.js`;
- `Habilidades.json`;
- `assets/imagenes/interactuables/botin.png`.

Esto valida disponibilidad de los puntos de entrada comprobados, pero no sustituye una sesión visual interactiva real.

## 12. Cambios de P6.4B

### Archivos modificados

- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- `docs/phaser/entregas/ENTREGA_P6_4_A.md`.

### Archivo nuevo

- `docs/phaser/entregas/ENTREGA_P6_4_B.md`.

No se modificó código, JSON de configuración jugable, balance, assets ni CSS.

## 13. Matriz manual final requerida

Antes de declarar P6 cerrada y validada, realizar al menos:

1. movimiento cardinal/diagonal, espera y varios enemigos actuando en secuencia;
2. cámara, zoom, seguimiento y velocidades de animación;
3. ataques cuerpo a cuerpo, arco, varitas, doble arma, fallo, crítico y bloqueo;
4. pociones de Vida/Maná y subida de nivel;
5. básicas: Ascua, Esquirla, Chispa y Aguijón tóxico;
6. intermedias: Explosión ígnea, Nova, Cadena de rayos y Nube tóxica;
7. avanzadas: Incinerar, Descarga fulminante, Plaga corrosiva y Ráfaga glacial;
8. Congelamiento total 200/250/300, Quemadura ↔ Congelamiento y daño periódico durante bloqueo;
9. Nube tóxica: creación, entrada, intervalo, renovación y muerte dentro de zona;
10. Lythra: Vida, Maná, Ambos, recurso completo y oro insuficiente;
11. muerte por ataque normal: desaparición → botín;
12. muerte dentro de Cadena de rayos: botín antes del salto siguiente;
13. muerte por Quemadura, Envenenamiento y Nube tóxica;
14. pila de botín existente y tabla sin recompensa;
15. derrota del jugador: animación Phaser → modal;
16. `efectosReducidos`;
17. cancelación y cambio de mapa sin proyectiles, textos, estados, zonas o bolsas transitorias residuales;
18. repetir casos esenciales con Canvas 2D;
19. guardar/continuar y comprobar que no se persiste estado visual transitorio;
20. revisar consola del navegador por errores o recursos 404.

## 14. Verificación de entregables

El incremental se aplicó sobre un árbol obtenido directamente del SHA base mediante `git archive`. El resultado se comparó archivo por archivo contra el ZIP completo, excluyendo únicamente `.git` de la comparación de contenido:

- archivos comparados: 423;
- rutas faltantes: 0;
- rutas extra: 0;
- diferencias de contenido: 0.

El ZIP completo extraído conserva:

- rama `main`;
- HEAD `bea2da38aad72f27a4bad4e7d491524a51289446`;
- `origin/main` en el mismo SHA;
- relación 0/0;
- 0 cambios staged;
- 5 cambios de P6.4B sin commit: 4 archivos modificados y 1 documento nuevo.

## 15. Limitación de la entrega

La ejecución en contenedor permite módulos, análisis, HTTP y contratos, pero no sustituye la validación visual real del juego con cámara y DOM interactivos. Por eso P6 se declara **técnicamente lista para cierre**, no manualmente validada por esta entrega.

## 16. Exclusiones

P6.4B no incorpora:

- nuevas mecánicas;
- nuevas habilidades o estados;
- cambios de daño, Maná, duración, probabilidades o XP;
- nuevos mapas o enemigos;
- cambios de botín;
- nuevos assets;
- sonido;
- IA nueva;
- refactors preventivos.

## 17. Próximo paso

Si la matriz manual final es correcta, realizar el commit de P6.4B y registrar su SHA. En ese momento **P6 — integración visual Phaser** puede declararse cerrada y validada. La continuación prevista es **P7 — candidato visual para beta web**.

## 18. Commit propuesto

```text
docs(phaser): cerrar P6 tras regresión integral

- registrar la validación y el SHA final de P6.4A
- ejecutar la regresión transversal de movimiento, combate y tiempo
- verificar las doce habilidades del jugador y las habilidades NPC de Lythra
- comprobar estados, contraefectos, zonas y efectos periódicos
- validar muertes directas, periódicas y producidas por habilidades
- comprobar la aparición inmediata y reconciliación del botín
- verificar derrota del jugador y sincronización del modal
- confirmar Canvas 2D como backend funcional y predeterminado
- comprobar persistencia, cambios de mapa y contratos de cancelación
- auditar que Phaser no contenga reglas jugables paralelas
- documentar la matriz final de regresión de P6
- preparar la transición hacia P7
```


## 16. Cierre posterior

Pruebas manuales aprobadas. Commit final: `c48335220712a8bff1d3907176f8ea1b7fac75ad`. Con este SHA P6 queda cerrada y la etapa operativa siguiente pasa a P7.1 — entrada de beta y continuidad.
