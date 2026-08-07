# ENTREGA P7.1 — ENTRADA DE BETA Y CONTINUIDAD

Fecha: 2026-08-06  
Etapa: P7.1  
Base exacta: `c48335220712a8bff1d3907176f8ea1b7fac75ad`  
Rama: `main`  
Commit realizado: no

## 1. Objetivo

Abrir P7 con un flujo de entrada adecuado para una beta web: Phaser como presentación predeterminada, Canvas 2D como respaldo explícito, versión visible y una opción **Continuar** capaz de reconstruir el personaje durable sin inventar persistencia de la expedición activa.

## 2. Cierre de P6

P6.4B fue validada manualmente y publicada en `c48335220712a8bff1d3907176f8ea1b7fac75ad`. Con ese SHA P6 queda formalmente cerrada y P7 pasa a ser el hito operativo.

## 3. Cambios funcionales

### Phaser predeterminado

`SelectorRenderizador` utiliza ahora:

- sin parámetro: `phaser`;
- `?render=phaser`: `phaser`;
- `?render=canvas2d`: `canvas2d`;
- valor desconocido: advertencia y fallback a `phaser`.

Canvas 2D continúa siendo un backend completo; solamente deja de ser la elección accidental de un tester normal.

### Continuar

El menú principal incorpora **Continuar** entre Nueva partida y Configuración. El botón comienza deshabilitado y se habilita únicamente después de cargar los catálogos y reconstruir satisfactoriamente un `Player` desde el guardado durable.

Continuar restaura:

- nombre y profesión;
- nivel, XP y puntos disponibles;
- atributos;
- Vida y Maná;
- oro;
- inventario;
- equipamiento;
- progreso mágico;
- configuración persistida de la barra mediante su contrato ya existente.

No restaura:

- posición de la expedición;
- enemigos;
- destructibles del mapa;
- botín en suelo;
- agenda temporal;
- efectos temporales activos;
- zonas;
- semilla o simulación de la mazmorra interrumpida.

El personaje restaurado siempre inicia una sesión nueva desde la ciudad. Los parámetros de prueba de mapa continúan aplicándose únicamente al inicio de un personaje nuevo.

### Guardado inválido

Un guardado presente pero incompatible/corrupto:

- deshabilita Continuar;
- muestra un mensaje breve en el menú;
- no bloquea Nueva partida ni Configuración;
- no se elimina automáticamente.

### Nueva partida

Si existe un guardado durable, pulsar **Nueva partida** solicita confirmación antes de entrar a creación. Cancelar mantiene al usuario en el menú y permite elegir Continuar. Aceptar la advertencia todavía no elimina datos: el snapshot anterior y la configuración de barra solo se eliminan al comenzar efectivamente la nueva aventura.

### Versión

Se agrega `src/config/VersionAplicacion.js` como fuente única de la versión visible:

`0.7.0-beta.1`

La versión aparece discretamente en el menú y queda disponible para diagnóstico mediante `globalThis.darkMoonVersion`.

## 4. Arquitectura

`Aplicacion` conserva la decisión de flujo. `PersistenciaJugador` solo expone presencia, lectura y reconstrucción del estado durable. `ControladorPartida` acepta tanto datos de personaje nuevo como un `jugadorRestaurado` ya validado y reutiliza el mismo arranque común de sesión.

No se introducen dos tipos de partida ni un segundo motor de persistencia.

Flujo de continuación:

```text
Menú
  ↓
validar guardado
  ↓
reconstruir Player
  ↓
ControladorPartida
  ↓
EstadoPartida
  ↓
Ciudad
```

## 5. Internacionalización futura registrada

El plan incorpora una nueva P7.3 después de Configuración (P7.2): centralización de textos y soporte Español/Inglés con selector ES/EN en la pantalla principal.

Regla aprobada: **solo se traduce el texto presentado al usuario**. Código, IDs, nombres técnicos y contratos internos permanecen en español.

## 6. Archivos nuevos

- `src/config/VersionAplicacion.js`;
- `docs/phaser/entregas/ENTREGA_P7_1.md`.

## 7. Archivos modificados

- `index.html`;
- `game.js`;
- `assets/estilos/base/style.css`;
- `src/aplicacion/Aplicacion.js`;
- `src/aplicacion/ControladorPartida.js`;
- `src/interfaz/dom/ControladorPantallasDom.js`;
- `src/interfaz/dom/PresentacionAplicacionDom.js`;
- `src/interfaz/graficos/SelectorRenderizador.js`;
- `src/partida/PersistenciaJugador.js`;
- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- `docs/phaser/entregas/ENTREGA_P6_4_B.md`.

## 8. Pruebas realizadas

### Selector de renderizador

Casos comprobados:

1. sin query → Phaser;
2. `?render=phaser` → Phaser;
3. `?render=canvas2d` → Canvas 2D;
4. valor desconocido → Phaser con advertencia.

### Control de pantallas

Con elementos DOM simulados se verificó:

- callback de Continuar;
- deshabilitación correcta;
- mensaje de error;
- transición directa menú → partida ocultando menú y creación.

### Persistencia real

Con los catálogos reales cargados mediante HTTP local se creó un Player, se guardó y se reconstruyó desde `PersistenciaJugador`. Se verificaron nombre, nivel y oro y se confirmó que el snapshot no incorpora estado del mapa.

### Guardado corrupto

Se inyectó JSON inválido en la clave durable. La aplicación:

- detectó el error;
- mantuvo el contenido sin borrarlo;
- deshabilitó Continuar;
- mantuvo disponible el resto del menú.

### Recursos HTTP

El servidor local respondió correctamente para los puntos de entrada principales. El intento de automatizar una sesión completa con Chromium headless no pudo cerrarse dentro del límite del entorno, por lo que la interacción visual completa queda como prueba manual.

## 9. Validaciones técnicas

Resultados finales:

- sintaxis de 195 archivos JavaScript: correcta;
- lectura de 26 JSON: correcta;
- 429 imports relativos comprobados: 0 faltantes;
- IDs HTML requeridos: presentes y sin duplicados;
- `.mjs`: 0;
- `.patch`: 0;
- selector de renderizador: 4/4 casos dirigidos correctos;
- prueba de control de pantallas y confirmación de Nueva partida: correcta;
- roundtrip real de persistencia y reconstrucción de Player: correcto;
- guardado corrupto: aislado, no eliminado y Continuar deshabilitado;
- HEAD de la base conservado en `c48335220712a8bff1d3907176f8ea1b7fac75ad`;
- rama `main` y referencia incluida `origin/main` sin divergencia;
- 15 rutas reales de P7.1 (13 modificadas y 2 nuevas);
- `git status` puede mostrar 64 marcas en el ZIP completo: 49 corresponden exactamente a las diferencias CRLF/LF ya heredadas de la base y 15 a P7.1; la comparación normalizada contra HEAD confirma 0 diferencias reales ajenas a la etapa;
- el `git diff --check` directo sobre `index.html` reporta únicamente los caracteres CR de sus líneas CRLF nuevas, porque ese archivo ya usa CRLF en HEAD; una copia temporal normalizada a LF no presenta errores de whitespace reales.

## 10. Pruebas manuales requeridas

1. abrir sin parámetros y confirmar Phaser;
2. abrir con `?render=canvas2d` y confirmar Canvas 2D;
3. navegador/localStorage limpio: Continuar deshabilitado;
4. crear un personaje y jugar hasta que exista guardado;
5. recargar o cerrar/reabrir;
6. confirmar Continuar habilitado;
7. continuar y verificar nombre, nivel, XP, atributos, Vida, Maná, oro, inventario, equipo, maestrías y barra;
8. confirmar que se inicia en la ciudad y no dentro de la mazmorra anterior;
9. pulsar Nueva partida con guardado existente y cancelar la confirmación: debe permanecer en el menú y el guardado anterior debe conservarse;
10. aceptar la advertencia, crear el personaje y confirmar que recién al comenzar la aventura se reemplaza el guardado anterior;
11. probar un guardado corrupto/incompatible: Continuar deshabilitado y Nueva partida disponible;
12. verificar visualmente `0.7.0-beta.1` en el menú;
13. verificar GitHub Pages/rutas relativas en el entorno publicado.

## 11. Exclusiones

P7.1 no incorpora:

- persistencia de mazmorras;
- Configuración real (P7.2);
- traducción Español/Inglés (P7.3);
- selector de idioma;
- diagnóstico para testers;
- cambios de balance;
- audio;
- nuevos sistemas Phaser.

## 12. Riesgos conocidos

- Un guardado incompatible con cambios futuros seguirá necesitando una política explícita de migración por versión.
- Continuar regenera la sesión de ciudad y los stocks transitorios de mercaderes según los contratos actuales; P7.1 no amplía la persistencia de sesión.
- La validación visual completa debe realizarse en navegador real.

## 13. Próximo paso

Tras validación manual y commit de P7.1: **P7.2 — Configuración real** (velocidad de animaciones, efectos reducidos, zoom, pantalla completa, persistencia de preferencias y restauración de valores).

Después de P7.2 está aprobada **P7.3 — Internacionalización y centralización de textos**, con Español/Inglés y selector ES/EN, manteniendo código e IDs canónicos en español.
