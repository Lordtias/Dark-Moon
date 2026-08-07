# ENTREGA P7.3B — MENSAJES DINÁMICOS Y CIERRE BILINGÜE

Fecha: 2026-08-07  
Etapa: P7.3B  
Base exacta: `f3d27b64b782a1f9b61d1b0b3ee5486c419c67b0`  
Rama: `main`  
HEAD conservado: `f3d27b64b782a1f9b61d1b0b3ee5486c419c67b0`  
Commit realizado: no  
Estado: implementada técnicamente; pendiente de validación manual y commit

## 1. Objetivo

Completar P7.3 haciendo bilingües los mensajes que nacen durante la ejecución de la partida y el feedback textual de Phaser/Canvas, sin traducir código, variables, IDs o reglas jugables.

Regla canónica:

> Solo cambia el texto presentado al usuario. Código, nombres técnicos, claves jugables e IDs permanecen en español.

Los `nombre` y `descripcion` españoles de los catálogos funcionales continúan siendo el último respaldo seguro para contenido localizado.

## 2. Cierre de P7.3A

P7.3A fue probada y commiteada por el usuario en:

`f3d27b64b782a1f9b61d1b0b3ee5486c419c67b0`

Esa etapa dejó disponibles `es.json`, `en.json`, `Traductor`, el selector ES/EN, la preferencia persistente y la localización estructural/contenido por ID canónico.

## 3. Problema corregido

`MensajesJuego.js` clasificaba históricamente el tipo visual de un texto buscando frases españolas como `falla`, `impacta`, `fue derrotado` o `ganaste`. Traducir el texto a Inglés habría cambiado también su clasificación visual.

P7.3B elimina esa dependencia. Los mensajes nuevos transportan explícitamente:

- una clave semántica;
- parámetros;
- tipo visual `sistema`, `positivo`, `alerta` o `negativo`;
- respaldo español opcional.

El texto se resuelve recién en presentación.

Los strings heredados siguen aceptándose por compatibilidad, pero quedan clasificados como `sistema`; su contenido ya no se interpreta para descubrir significado.

## 4. Contrato semántico de mensajes

`src/juego/mensajes/MensajesJuego.js` incorpora y consolida:

- `crearMensajeTraducible()`;
- `crearParametroContenidoMensaje()`;
- `crearParametroEntidadMensaje()`;
- `crearParametroTraduccionMensaje()`;
- normalización de mensajes simples, semánticos y listas;
- validación de formato sin depender del idioma.

El dominio comunica qué ocurrió. La presentación decide cómo se dice.

## 5. Presentador común

Se agrega:

`src/interfaz/idiomas/PresentadorMensajesJuego.js`

Responsabilidades:

- traducir la clave en el idioma activo;
- interpolar parámetros;
- resolver objetos/habilidades por ID canónico;
- localizar enemigos por plantilla y variante;
- utilizar los nombres españoles transportados como fallback;
- resolver parámetros que a su vez son claves de traducción.

`Renderizador.mostrarMensaje()` utiliza este presentador antes de escribir el registro de eventos.

## 6. Combate

Se agrega `src/juego/mensajes/MensajesCombate.js` para presentar de forma semántica:

- inicio de ataque;
- golpe/fallo;
- ataque dual;
- crítico;
- bloqueo;
- componentes de daño;
- armadura;
- daño total;
- segundo golpe omitido;
- munición restante;
- ataques a casilla vacía.

Las fuentes de daño conservan sus IDs para poder mostrar nombres localizados sin modificar la resolución del ataque.

También se cubren requisitos, alcance, paredes, trayectorias, casillas inválidas, objetivos destruidos y atacante derrotado.

## 7. Enemigos e IA

`Enemigo` conserva metadata de presentación (`idPlantilla`, `idVariante`, `genero`) para que una referencia de mensaje pueda reconstruir, por ejemplo, el nombre localizado de una variante sin transportar la instancia viva.

Se localizaron mensajes de:

- detección;
- abandono de persecución;
- avance;
- cambio a ataque natural;
- reutilización de arma;
- ataques enemigos y sus resultados.

La IA no cambia decisiones por idioma.

## 8. Habilidades, estados y zonas

Se migraron los mensajes visibles de:

- selección/cancelación de habilidades;
- validación de objetivo, patrón, alcance y línea de visión;
- Maná insuficiente;
- ejecución y errores presentables;
- resultados de habilidades de objetivo único/múltiple;
- creación, renovación, entrada y vencimiento de zonas;
- aplicación, resistencia, inmunidad, renovación, intensificación y rechazo de efectos;
- daño periódico y vencimiento de estados;
- bloqueo total y Silencio.

El motor sigue conservando mensajes españoles históricos cuando forman parte de un contrato interno/fallback, pero las rutas presentadas al jugador prefieren `mensajePresentacion` semántico.

## 9. Inventario, equipamiento y consumibles

Se localizaron:

- casillas vacías;
- objetos no utilizables/equipables;
- carga y compatibilidad de munición;
- carcaj;
- equipar/desequipar;
- objetos desplazados;
- inventario lleno;
- consumo de objetos;
- recuperación de Vida/Maná;
- acciones visibles `Equipar`, `Desequipar`, `Cargar` y `Consumir`.

Las excepciones técnicas de equipamiento se registran en consola, mientras el usuario recibe un mensaje genérico traducible.

## 10. Interacciones, comercio y Lythra

Se localizaron:

- selector de interactuables;
- recogida individual y múltiple de botín;
- falta de espacio;
- proximidad requerida;
- compra/venta;
- oro insuficiente;
- transferencia comercial fallida;
- objetos no vendibles;
- cálculo y resultado de Curación lunar/Restauración lunar;
- Vida/Maná completos;
- recuperación y precio.

Los modales de Comercio y Lythra utilizan el presentador común para resultados semánticos.

## 11. Progreso, muerte y botín

Se localizaron mensajes de:

- enemigo derrotado;
- botín generado;
- objeto/cantidad/rareza obtenidos;
- experiencia;
- subida de nivel;
- puntos de atributo/habilidad/maestría;
- derrota del jugador.

La aparición visual inmediata del botín implementada en P6.4A no cambia su sincronización.

## 12. Feedback Phaser y Canvas 2D

Phaser ya no necesita textos españoles fijos para:

- `FALLO / MISS`;
- `BLOQUEO / BLOCK`;
- `CRÍTICO / CRITICAL`;
- `RENOVADO / REFRESHED`;
- `RESISTIDO / RESISTED`;
- `INMUNE / IMMUNE`;
- `YA ACTIVO / ALREADY ACTIVE`.

Los nombres visuales de estados se resuelven por ID canónico:

- Ralentización;
- Electrización;
- Congelamiento;
- Aturdimiento;
- Envenenamiento;
- Quemadura;
- Parálisis;
- Silencio.

Canvas 2D utiliza el mismo contexto de idioma para sus etiquetas transitorias y permanece operativo como fallback.

## 13. UI dinámica auditada

Además de los mensajes de partida, la auditoría final corrigió textos dinámicos que todavía podían quedar en Español:

- detalle DPS del panel Personaje;
- confirmaciones y motivos del panel de Habilidades/Maestrías;
- acciones del modal de objetos (`Equipar`, `Desequipar`, `Cargar`, `Consumir`);
- etiquetas de ranuras equipadas;
- botón `Entrar` del selector de mazmorra.

Los errores técnicos internos (`throw`, validadores y diagnósticos de consola) permanecen en español y fuera del catálogo de presentación.

La primera validación manual detectó tres textos visibles que todavía escapaban del catálogo y fueron corregidos dentro de la misma P7.3B:

- los seis nombres de atributos del panel Personaje y sus etiquetas accesibles;
- los títulos de información y nombres de enemigos del selector de mazmorra;
- la ranura de armadura mostrada en el subtítulo del detalle de objetos (por ejemplo, `Armor · Legs` en Inglés).

Como ajuste visual solicitado durante el testing, el bloque de resistencias del personaje se divide en **resistencias de daño** y **resistencias de efectos**. Fuego, Frío, Rayo y Veneno utilizan respectivamente `#ff6b2c`, `#6fd7ff`, `#b95cff` y `#75df37`, coherentes con la identidad elemental existente. El cambio es exclusivamente visual: no modifica porcentajes, fuentes, límites ni resolución de resistencias.

## 14. Catálogos ES/EN

`es.json` y `en.json` incorporan un bloque `mensajes` compartiendo exactamente la misma estructura semántica para:

- entidades;
- combate;
- alcance;
- derrotas;
- IA;
- efectos;
- zonas;
- movimiento;
- interacciones;
- inventario;
- consumibles;
- comercio;
- curación;
- habilidades;
- tiempo;
- juego;
- feedback.

Se mantienen además las traducciones de contenido de P7.3A y las etiquetas `textoEstado` por ID de efecto.

## 15. Archivos nuevos y modificados

### Nuevos

```text
docs/phaser/entregas/ENTREGA_P7_3_B.md
src/interfaz/idiomas/PresentadorMensajesJuego.js
src/juego/mensajes/MensajesCombate.js
```

### Modificados

```text
README.md
index.html
assets/estilos/paneles/panel-personaje.css
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
docs/phaser/entregas/ENTREGA_P7_3_A.md
src/aplicacion/ControladorPartida.js
src/aplicacion/EjecutorAccionesJugador.js
src/aplicacion/ProcesadorResultadoAccion.js
src/config/idiomas/en.json
src/config/idiomas/es.json
src/entidad/destructible/combatiente/ConfiguracionAtaque.js
src/entidad/destructible/combatiente/Enemigo.js
src/interfaz/MenuCreacionPersonaje.js
src/interfaz/ModalSeleccionMazmorra.js
src/interfaz/PanelPersonaje.js
src/interfaz/Renderizador.js
src/interfaz/comercio/ModalComercio.js
src/interfaz/curacion/ModalCuracion.js
src/interfaz/graficos/RenderizadorCanvas2D.js
src/interfaz/graficos/phaser/CreadorEstadosTemporalesPhaser.js
src/interfaz/graficos/phaser/RenderizadorPhaser.js
src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
src/interfaz/habilidades/PanelHabilidadesMaestrias.js
src/interfaz/objetos/ControladorEquipamientoDom.js
src/interfaz/objetos/PresentadorObjeto.js
src/juego/Juego.js
src/juego/acciones/ResultadoAccion.js
src/juego/combate/ResolutorDerrotasJugador.js
src/juego/combate/SistemaAlcanceAtaque.js
src/juego/combate/SistemaCombate.js
src/juego/combate/SistemaCombateJugador.js
src/juego/comercio/CalculadorPreciosComercio.js
src/juego/comercio/SistemaComercio.js
src/juego/curacion/SistemaCuracion.js
src/juego/efectos/SistemaEfectosTemporales.js
src/juego/fabricas/FabricaEnemigos.js
src/juego/habilidades/MotorEfectosHabilidad.js
src/juego/habilidades/SistemaHabilidadesJugador.js
src/juego/ia/SistemaAccionesEnemigos.js
src/juego/interacciones/SistemaInteraccionJugador.js
src/juego/inventario/SistemaConsumibles.js
src/juego/inventario/SistemaInventarioEquipamiento.js
src/juego/mensajes/MensajesJuego.js
src/juego/movimiento/SistemaMovimientoJugador.js
src/juego/tiempo/CoordinadorTiempoPartida.js
src/juego/zonas/SistemaZonasTemporales.js
```

En total: **50 cambios reales de contenido: 47 archivos modificados y 3 nuevos**. No hay eliminaciones.

## 16. Validaciones realizadas

### Estáticas

- 203 archivos JavaScript: sintaxis correcta;
- 29 archivos JSON: lectura correcta;
- 483 imports relativos: ninguno faltante;
- paridad ES/EN: correcta;
- 392 claves literales `traducir()` / `crearMensajeTraducible()` auditadas: 0 faltantes;
- helpers semánticos dinámicos auditados: 0 claves faltantes;
- `.mjs`: 0;
- `.patch`: 0.
- cambios reales contra HEAD normalizado: 50 (47 modificados + 3 nuevos);
- incremental aplicado sobre el SHA base: 441 archivos comparados;
- faltantes / extras / diferencias de contenido contra el ZIP completo: 0 / 0 / 0;
- `git diff --check` sobre la copia canónica de entrega: correcto;
- HEAD conservado: `f3d27b64b782a1f9b61d1b0b3ee5486c419c67b0`;
- rama: `main`; `origin/main`: mismo SHA; ahead/behind: `0/0`.

### Semánticas de i18n

- un texto legado con la palabra `falla` queda como tipo `sistema`: no existe clasificación por frase;
- un mensaje semántico conserva explícitamente su tipo visual;
- una variante enemiga se resuelve como `Rata Gigante` / `Giant Rat` desde los mismos IDs;
- `daga_hierro` se presenta como `Daga de hierro` / `Iron Dagger` sin modificar el ID;
- una traducción inglesa de contenido ausente utiliza el `nombre` español original y emite una advertencia de desarrollo;
- paridad de parámetros `{...}` ES/EN validada;
- los seis atributos del panel Personaje se resuelven en Inglés (`Strength`, `Dexterity`, `Constitution`, `Intelligence`, `Wisdom`, `Charisma`);
- los nombres de enemigos del selector de mazmorra se resuelven desde `contenido.enemigos` y sus títulos informativos desde `interfaz.mazmorras`;
- una armadura compatible con `piernas` se presenta como `Armor · Legs` en Inglés;
- el panel separa resistencias de daño y de efectos sin modificar sus valores canónicos.

### Regresión de balance

El analizador canónico completó sus informes sin resultados `incorrecto`:

- regresión general: 28 `correcto`, 8 `informativo`;
- pruebas focalizadas: 17 `correcto`, 2 `informativo`;
- efectos: 211 `correcto`, 66 `advertencia`, 0 `incorrecto` en el recorrido estructural utilizado para la comprobación.

P7.3B no modifica valores de balance.

## 17. Pruebas manuales recomendadas

1. iniciar con ES y jugar una acción de movimiento;
2. cambiar a EN desde el menú, iniciar/continuar y verificar el registro;
3. comprobar ataques exitosos, fallidos, críticos y bloqueos en EN;
4. comprobar ataque enemigo en EN;
5. aplicar/resistir/inmunizar estados y revisar texto Phaser;
6. verificar Congelamiento, Quemadura, Envenenamiento y sus renovaciones;
7. usar una habilidad básica, intermedia y avanzada;
8. crear y activar Nube tóxica;
9. matar un enemigo y revisar muerte, XP y botín;
10. recoger botín y llenar inventario;
11. equipar/desequipar/cargar munición/consumir objeto;
12. comprar y vender;
13. usar Lythra con Vida, Maná y Ambos;
14. revisar Habilidades/Maestrías en EN;
15. volver a ES y repetir al menos un combate;
16. probar `?render=canvas2d` en ambos idiomas;
17. confirmar que el mismo guardado funciona en ES y EN.

## 18. Limitaciones de entorno

Las validaciones automáticas cubren contratos, catálogos, sintaxis e integración estática. La sensación visual real, wrapping de textos ingleses y secuencias completas Phaser requieren validación manual en navegador.

## 19. Alcance excluido

P7.3B no introduce:

- nuevos idiomas;
- cambios de balance;
- nuevas habilidades/objetos/enemigos;
- traducción de IDs o variables;
- `nombreEN`/`descripcionEN` en catálogos funcionales;
- traducción de mensajes técnicos internos;
- nuevas dependencias;
- audio;
- mejoras adicionales de autosave.

## 20. Riesgos conocidos

- un productor heredado que todavía entregue texto simple seguirá viéndose en Español si no fue alcanzado por la auditoría; el texto se mostrará de forma segura como `sistema` y no romperá clasificación visual;
- el fallback deliberado puede mostrar Español en una sesión inglesa si una futura pieza de contenido se agrega sin traducción; el traductor emitirá advertencia para detectarlo;
- Inglés puede ocupar más espacio en algunos paneles, por lo que la prueba manual debe revisar wrapping y overflow.

## 21. Próximo paso

Después de validación manual y commit, P7.3 queda cerrada. La siguiente etapa prevista es:

**P7.4 — Experiencia de tester**

con ayuda consultable, revisión de tooltips/jerarquía visual, limpieza de elementos de desarrollo, diagnóstico copiable y plantilla simple de feedback.
