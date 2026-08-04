# ENTREGA P6.1 — CONTRATO VISUAL, MOVIMIENTO Y SECUENCIACIÓN ENEMIGA

Proyecto: Dark Moon  
Plan: Integración progresiva de Phaser, beta y Electron  
Etapa: P6.1 — Contrato visual, movimiento y secuenciación enemiga  
Base usada: `bfd2d1c92d3690241707d5c284808be40437f866`  
Rama: `main`  
Estado: Cerrada, validada manualmente y publicada

---

## 1. Conclusión sencilla

### Qué se analizó

Se siguió el flujo real desde una acción del jugador hasta el redibujado del mapa:

- movimiento del jugador;
- agenda temporal;
- movimiento enemigo;
- ataque del jugador;
- ataque enemigo;
- acumulación de resultados;
- procesamiento de `ResultadoAccion`;
- creación de la escena neutral;
- renderizado Canvas 2D y Phaser;
- seguimiento de cámara;
- cambio de mapa y destrucción de escena.

### Por qué se analizó

P6.1 debía crear una base para animar sin duplicar reglas. También debía resolver el problema perceptivo de varios enemigos atacando tan rápido que el jugador no puede distinguir quién actuó.

### Conclusión final

La lógica canónica continúa resolviendo inmediatamente movimiento, impacto, daño, bloqueo, crítico y tiempo. Ahora conserva además un relato estructurado y ordenado de movimientos y ataques ya ocurridos.

Phaser transforma ese relato en una cola exclusivamente visual:

- interpola jugador y enemigos entre casillas;
- desplaza conjuntamente sprite y sombra;
- mantiene el seguimiento de cámara durante el movimiento del jugador;
- reproduce los ataques enemigos uno por uno mediante una señal provisional y una pausa;
- acelera recorridos largos del jugador sin omitir casillas;
- muestra una reacción genérica cuando jugador o enemigos reciben daño;
- elimina el aura luminosa fija que quedaba atrasada durante el movimiento;
- acelera colas extensas;
- puede cancelar de forma segura al cambiar de mapa o destruir la escena;
- termina sincronizándose exactamente con el estado final.

Canvas 2D continúa dibujando inmediatamente el estado final y no depende de la cola.

### Decisión o acción siguiente

P6.1 fue validada manualmente por el usuario, cerrada y publicada en el commit `687ef42d363c308063ef5ab5f0d0b3ae8f425211`. La siguiente etapa aprobada es P6.2A — Resultados visuales del combate.

---

## 2. Fuente principal y estado Git inicial

Fuente obligatoria utilizada:

- ZIP: `Dark-Moon-P5-4.zip`;
- copia de trabajo: `/mnt/data/p6_work/Dark-Moon`;
- directorio `.git`: presente;
- rama local: `main`;
- HEAD local inicial: `bfd2d1c92d3690241707d5c284808be40437f866`;
- estado inicial: limpio, `main...origin/main`;
- HEAD publicado consultado en GitHub: `bfd2d1c92d3690241707d5c284808be40437f866`.

La copia local, `origin/main` y el último estado publicado coincidían antes de modificar archivos.

Comando utilizado para comprobar el estado sin falsos positivos por CRLF:

```bash
git -C /mnt/data/p6_work/Dark-Moon \
  -c core.autocrlf=true status --short --branch
```

---

## 3. Alcance aprobado

P6.1 incluye:

- eventos estructurados de movimiento y ataque;
- identidad visual estable en memoria;
- plan neutral de eventos para los renderizadores;
- movimiento interpolado;
- movimiento conjunto de entidad y sombra;
- seguimiento visual del jugador;
- cola ordenada de presentación;
- separación perceptible entre ataques enemigos;
- velocidades `normal`, `rapida` y `muy-rapida`;
- aceleración automática de colas extensas;
- opción de efectos reducidos;
- cancelación segura;
- conservación de Canvas 2D;
- documentación de arquitectura y diseño.

P6.1 no incluye todavía:

- animación completa de ataque cuerpo a cuerpo;
- proyectiles;
- variantes completas de impacto por arma o resultado;
- evasiones;
- bloqueos;
- críticos visuales;
- números de daño;
- sincronización expresiva de la barra de Vida con cada impacto;
- muerte y botín animados;
- habilidades y estados visuales;
- controles visibles de velocidad en la interfaz;
- sonido.

Esos elementos corresponden a P6.2, P6.3, P6.4 o P7 según el Plan Maestro.

---

## 4. Arquitectura anterior

```text
Entrada
→ lógica canónica
→ ResultadoAccion principalmente textual
→ escena neutral final
→ Phaser elimina y vuelve a dibujar las entidades
→ el jugador ve directamente el estado final
```

Problemas observados:

- la interfaz no utilizaba `ResultadoAccion.eventos`;
- el ataque físico perdía gran parte de su resultado estructurado al transformarse en mensaje;
- Phaser no podía relacionar una misma entidad entre escenas consecutivas;
- varios ataques enemigos se percibían prácticamente al mismo tiempo;
- las entidades se recreaban en cada actualización sin nodos identificables para interpolar.

---

## 5. Arquitectura final de P6.1

```text
Entrada
→ lógica canónica
→ estado final autoritativo
→ eventos estructurados en orden
→ escena neutral final
→ plan visual neutral por ID
→ cola Phaser no autoritativa
→ movimiento o señal enemiga
→ sincronización exacta con la escena final
```

### Regla central

La cola visual no modifica:

- posiciones lógicas;
- Vida;
- Maná;
- precisión;
- daño;
- bloqueo;
- crítico;
- coste temporal;
- orden de actores;
- muerte;
- experiencia;
- botín;
- persistencia.

Solo representa hechos que ya ocurrieron.

---

## 6. Contratos incorporados

### 6.1 Eventos del dominio

`src/juego/acciones/EventosAccion.js` agrega inicialmente:

- `entidad_movida`;
- `ataque_resuelto`.

Un movimiento conserva:

- referencia de la entidad;
- posición de origen;
- posición de destino.

Un ataque conserva:

- atacante;
- objetivo o casilla objetivo;
- origen del atacante;
- impacto;
- bloqueo;
- crítico;
- daño;
- destrucción del objetivo;
- información de doble arma;
- golpes programados y realizados;
- resultado individual de cada golpe.

Las posiciones y resultados se copian y congelan. No se recalculan.

### 6.2 Identidad visual

`AdaptadorEscenaJuego` asigna a cada objeto de entidad un `idVisual` estable mediante `WeakMap`.

El identificador:

- existe únicamente en memoria;
- no modifica la entidad;
- no se serializa;
- no cambia los snapshots;
- permite localizar el mismo nodo entre escenas consecutivas.

### 6.3 Plan visual neutral

`PlanificadorEventosVisuales` reemplaza las referencias del dominio por identificadores visuales y datos planos.

Phaser no recibe `Player`, `Enemigo` o `Combatiente` para decidir reglas.

### 6.4 Cola Phaser

`ReproductorEventosVisualesPhaser`:

- conserva el orden recibido;
- reproduce una actualización antes de aplicar la siguiente;
- interpola movimientos;
- secuencia señales ofensivas enemigas;
- aplica siempre la escena final al terminar;
- resuelve correctamente esperas y tweens al cancelar;
- descarta únicamente presentación pendiente, nunca estado canónico.

---

## 7. Ritmo visual incorporado

Configuración inicial en velocidad normal:

| Elemento | Duración base |
|---|---:|
| Movimiento aislado del jugador | 110 ms |
| Movimiento enemigo por casilla | 190 ms |
| Movimiento con 3–4 pasos consecutivos pendientes | 75 ms |
| Movimiento con 5 o más pasos consecutivos pendientes | 45 ms |
| Señal provisional de ataque | 320 ms |
| Reacción genérica de daño | 140 ms |
| Pausa entre ataques enemigos | 130 ms |

Un ataque enemigo ocupa aproximadamente 450 ms de lectura visual antes del siguiente.

La señal de P6.1 es deliberadamente sencilla: un pulso y una elevación mínima de la entidad atacante. Si el resultado canónico indica impacto con daño, el objetivo recibe un retroceso mínimo, un destello y una marca procedural breve. P6.2 deberá reemplazar y especializar esta base mediante animaciones físicas, proyectiles, bloqueos, críticos y evasiones sin modificar el orden de la cola.

### Velocidades disponibles

| Modo | Multiplicador aproximado de duración |
|---|---:|
| `normal` | 1,00 |
| `rapida` | 0,58 |
| `muy-rapida` | 0,34 |

Cuando existen más de cinco eventos pendientes, la cola comienza a acelerar. Cuando supera diez, aplica una aceleración mayor.

La configuración es programática en P6.1. La opción visible para el jugador queda pendiente.

---

## 8. Archivos modificados

### Dominio y aplicación

- `src/juego/acciones/ResultadoAccion.js`;
- `src/juego/movimiento/SistemaMovimientoJugador.js`;
- `src/juego/ia/SistemaAccionesEnemigos.js`;
- `src/juego/combate/SistemaCombateJugador.js`;
- `src/aplicacion/ProcesadorResultadoAccion.js`.

### Representación neutral y Phaser

- `src/interfaz/Renderizador.js`;
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`;
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`;
- `src/interfaz/graficos/phaser/ControladorCamaraPhaser.js`;
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`;
- `src/interfaz/graficos/phaser/RenderizadorPhaser.js`.

### Documentación

- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`.

---

## 9. Archivos agregados

- `src/juego/acciones/EventosAccion.js`;
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`;
- `src/interfaz/graficos/phaser/ConfiguracionAnimacionesPhaser.js`;
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`;
- `docs/phaser/entregas/ENTREGA_P6_1.md`.

Archivos eliminados: ninguno.

---

## 10. Archivos y sistemas no modificados

No se modificaron:

- `SistemaCombate.js` y sus fórmulas;
- motores de daño o efectos de habilidades;
- IA decisoria;
- búsqueda de caminos;
- agenda de `SistemaTiempo`;
- reglas de ocupación;
- generación de mapas;
- balance;
- archivos JSON de contenido;
- persistencia;
- inventario;
- experiencia y botín;
- `RenderizadorCanvas2D.js`;
- Phaser 4.2.1;
- Electron;
- Node.js o npm como dependencias de ejecución.

---

## 11. Dependencias y versiones

| Dependencia | Versión | Cambio |
|---|---:|---|
| Phaser | `4.2.1` exacta | Sin cambios |
| Node.js de desarrollo | Solo para comprobaciones locales | No forma parte del juego |
| npm | Ninguna | No agregado |
| Librerías adicionales | Ninguna | No agregadas |

No existe instalación ni desinstalación adicional.

---

## 12. Persistencia

Impacto: ninguno.

No se modificaron claves, snapshots ni contratos persistentes. La identidad visual, la cola, sus tiempos y sus nodos existen solamente durante la sesión gráfica.

No se requieren migraciones.

---

## 13. Compatibilidad con contenido nuevo

### Nuevos enemigos

Un enemigo nuevo creado mediante las fábricas actuales podrá reutilizar automáticamente:

- identidad visual;
- movimiento interpolado;
- señal secuencial de ataque;
- aceleración de cola.

No se identifica por nombre visible.

### Nuevos ataques

Todo ataque físico que continúe utilizando el resultado canónico común podrá emitir `ataque_resuelto` sin duplicar fórmulas.

### Nuevas habilidades

P6.1 no genera todavía eventos específicos de habilidad. P6.3 deberá extender el mismo enfoque con contratos genéricos de trayectoria, área, estado y zona.

---

## 14. Validaciones técnicas realizadas

### 14.1 Sintaxis JavaScript

Preparación:

- recorrer todos los `.js` fuera de `.git`;
- ejecutar `node --check` sobre cada archivo.

Resultado obtenido:

- archivos comprobados: **170**;
- errores: **0**;
- estado: **Correcto**.

### 14.2 Configuración JSON

Preparación:

- cargar todos los `.json` del repositorio mediante un parser.

Resultado obtenido:

- archivos comprobados: **21**;
- errores: **0**;
- estado: **Correcto**.

### 14.3 Imports relativos

Preparación:

- localizar imports y exports relativos;
- resolver cada ruta sobre el sistema de archivos.

Resultado obtenido:

- referencias comprobadas: **379**;
- rutas faltantes: **0**;
- estado: **Correcto**.

### 14.4 Movimiento canónico

Preparación:

- crear un `SistemaMovimientoJugador` controlado;
- mover una entidad una casilla.

Resultado esperado:

- la posición cambia mediante el sistema existente;
- se agrega un evento con origen y destino;
- el evento no modifica el coste temporal.

Resultado obtenido:

- origen y destino correctos;
- primer evento `entidad_movida`;
- estado: **Correcto**.

### 14.5 Ataque real del jugador

Preparación:

- cargar la configuración mágica como lo hace la aplicación;
- crear un Guerrero real;
- crear un Esqueleto Guardia real;
- entrar al modo de combate y confirmar el ataque.

Resultado esperado:

- el mismo ataque canónico se ejecuta;
- el turno se consume una sola vez;
- se agrega un único `ataque_resuelto`.

Resultado obtenido:

- atacante y objetivo correctos;
- resultado canónico conservado;
- un único evento;
- estado: **Correcto**.

### 14.6 Ataque real enemigo

Preparación:

- crear enemigos reales mediante `FabricaEnemigos`;
- colocar atacante y objetivo adyacentes;
- procesar la acción mediante `SistemaAccionesEnemigos`.

Resultado esperado:

- el ataque se resuelve mediante `Enemigo.atacar`;
- el evento conserva el mismo resultado;
- no se agrega una segunda tirada.

Resultado obtenido:

- evento y referencias correctos;
- copia congelada del resultado;
- estado: **Correcto**.

### 14.7 Secuencia real de varios enemigos

Preparación:

- cargar las configuraciones reales del juego;
- crear un Guerrero y dos Ratas mediante las fábricas existentes;
- ubicar ambos enemigos adyacentes al jugador;
- consumir una espera mediante `Juego.esperarTurno()`.

Resultado esperado:

- la agenda temporal conserva su orden normal;
- cada ataque enemigo produce un `ataque_resuelto` independiente;
- no se recalculan ataques para crear los eventos.

Resultado obtenido:

- cuatro ataques reales quedaron registrados en orden durante el ciclo temporal;
- intervinieron dos instancias enemigas diferentes;
- todos los eventos apuntaron al jugador y conservaron su resultado canónico;
- estado: **Correcto**.

### 14.8 Identidad y plan visual

Preparación:

- solicitar varias veces la identidad de la misma entidad;
- construir escenas anterior y final;
- convertir movimiento y ataque a plan neutral.

Resultado obtenido:

- identidad estable;
- movimiento clasificado correctamente;
- ataque enemigo reconocido por tipo visual, no por nombre;
- estado: **Correcto**.

### 14.9 Cola secuencial

Preparación:

- simular un movimiento y dos ataques enemigos;
- registrar tweens y pausas ejecutados.

Resultado esperado:

- un tween de movimiento;
- dos señales enemigas en orden;
- dos pausas;
- una sola aplicación de la escena final.

Resultado obtenido:

- tres tweens;
- dos pausas;
- una escena final;
- orden conservado;
- estado: **Correcto**.

### 14.10 Cancelación durante espera

Preparación:

- iniciar una señal enemiga con temporizador no completado;
- cancelar la cola antes de ejecutar el callback.

Resultado esperado:

- la promesa visual termina;
- no queda procesamiento bloqueado;
- no se aplica estado jugable adicional.

Resultado obtenido:

- espera resuelta al cancelar;
- estado: **Correcto**.

### 14.11 Renderizador neutral

Preparación:

- dibujar dos escenas consecutivas con el mismo jugador;
- entregar un evento de movimiento;
- utilizar un backend simulado.

Resultado obtenido:

- mismo `idVisual` en ambas escenas;
- un evento visual entregado al backend;
- configuración de velocidad delegada correctamente;
- estado: **Correcto**.

### 14.12 Compositor Phaser simulado

Preparación:

- crear una escena Phaser mínima simulada;
- componer un mapa 2 × 2;
- obtener el nodo del jugador;
- reposicionar el nodo.

Resultado obtenido:

- contenedor y sombra existentes;
- ambos terminan en el mismo centro de casilla;
- destrucción correcta del compositor;
- estado: **Correcto**.

### 14.13 Carga HTTP

Preparación:

- iniciar `python3 -m http.server` en la copia local;
- solicitar los archivos principales.

Recursos comprobados:

- `index.html`;
- `game.js`;
- `EventosAccion.js`;
- `ReproductorEventosVisualesPhaser.js`;
- Phaser 4.2.1 local;
- `Enemigos.json`.

Resultado obtenido:

- todos respondieron HTTP 200;
- ningún archivo vacío;
- estado: **Correcto**.

### 14.14 Navegador automatizado

Preparación:

- servidor HTTP local activo;
- Chromium headless con `?render=phaser`;
- límite de 20 segundos.

Resultado esperado:

- obtener el DOM cargado y ejecutar el arranque.

Resultado obtenido:

- Chromium no finalizó y fue detenido por tiempo límite con estado 124;
- no produjo DOM;
- el error del proceso se concentra en servicios DBus y zygote del contenedor;
- estado: **Pendiente por limitación del entorno**.

No se afirma haber validado visualmente una partida real en navegador.

### 14.15 Ajustes de validación de P6.1

Preparación:

- simular una racha de cinco movimientos pendientes del jugador;
- reproducir un ataque del jugador con daño sobre un enemigo;
- reproducir un ataque enemigo con daño sobre el jugador;
- reproducir un ataque con daño cero;
- componer la iluminación con un jugador presente;
- registrar duraciones, tweens, pausas y efectos temporales.

Resultado esperado:

- la racha utiliza 45 ms por casilla y transición lineal;
- el movimiento enemigo conserva 190 ms por casilla;
- ambos sentidos de ataque generan reacción sobre el objetivo;
- daño cero no genera una marca falsa;
- la pausa de 130 ms continúa aplicándose solo entre ataques enemigos;
- no se dibuja el aura circular y sí se conserva la capa ambiental;
- los efectos temporales se destruyen al finalizar.

Resultado obtenido:

- duración de racha: 45 ms;
- movimiento enemigo: 190 ms;
- dos impactos válidos representados y limpiados;
- daño cero ignorado correctamente;
- pausa enemiga conservada;
- cero círculos de aura y una capa ambiental conservada;
- estado: **Correcto**.

---

## 15. Intentos de prueba que requirieron corregir el entorno

Dos primeros intentos de simulación fallaron por preparación incompleta de la prueba, no por una falla del producto:

1. el jugador real se creó antes de inicializar el contexto de progreso mágico; la prueba se corrigió cargando la misma configuración que utiliza la aplicación;
2. el primer mock del compositor no implementaba `casillaAMundo` y `add.text`; se completó el contrato de la simulación y la prueba pasó.

Estos casos se documentan para no presentar como exitosos comandos que inicialmente estaban incompletos.

---

## 16. Pruebas manuales de cierre

### Prueba A — Movimiento del jugador

Preparación:

1. iniciar mediante servidor HTTP;
2. abrir `?render=phaser`;
3. crear o cargar una partida.

Pasos:

1. mover en direcciones cardinales;
2. mover en diagonal;
3. presionar una flecha siete u ocho veces rápidamente en un tramo libre;
4. repetir cerca de paredes;
5. probar con zoom mínimo y máximo.

Resultado esperado:

- movimiento suave entre centros de casilla;
- una racha larga acelera y recupera rápidamente la posición real;
- no existe un círculo luminoso atrasado respecto del personaje;
- sprite y sombra permanecen juntos;
- la cámara sigue al jugador sin salto final;
- la posición lógica y el alcance no cambian.

Estado: **Aprobada por el usuario durante la validación manual previa al commit**.

### Prueba B — Movimiento enemigo

Pasos:

1. entrar al rango de percepción de varios enemigos;
2. esperar o desplazarse para que avancen;
3. observar las rutas alrededor de obstáculos.

Resultado esperado:

- cada desplazamiento se interpola en el orden temporal;
- ningún enemigo atraviesa casillas nuevas;
- no cambia la búsqueda de caminos.

Estado: **Aprobada por el usuario durante la validación manual previa al commit**.

### Prueba C — Varios enemigos atacando

Pasos:

1. permitir que al menos tres enemigos alcancen al jugador;
2. consumir un turno;
3. observar la respuesta visual completa.

Resultado esperado:

- cada atacante pulsa de forma individual;
- el jugador muestra retroceso, destello y marca breve cuando recibe daño;
- existe una pausa perceptible antes del siguiente;
- el orden coincide con el registro de combate;
- no se agregan ataques ni daño;
- la cola no se vuelve excesivamente lenta.

Estado: **Aprobada por el usuario durante la validación manual previa al commit**.

### Prueba C2 — Jugador golpeando enemigos

Pasos:

1. atacar un enemigo y causar daño;
2. repetir con un ataque que falle o cause daño cero cuando sea posible.

Resultado esperado:

- el enemigo alcanzado muestra retroceso, destello y marca breve;
- un fallo o daño cero no muestra una reacción de daño falsa;
- el enemigo termina exactamente en su casilla lógica.

Estado: **Aprobada por el usuario durante la validación manual previa al commit**.

### Prueba D — Acciones rápidas

Pasos:

1. enviar varias acciones consecutivas mientras aún hay animaciones;
2. cambiar zoom;
3. intentar recentrar la cámara.

Resultado esperado:

- las actualizaciones quedan ordenadas;
- la cola se acelera cuando crece;
- siempre termina en la posición real más reciente;
- no se bloquea el control lógico.

Estado: **Aprobada por el usuario durante la validación manual previa al commit**.

### Prueba E — Cambio de mapa durante cola

Pasos:

1. generar acciones cercanas a un portal;
2. cambiar de mapa mientras haya presentación pendiente.

Resultado esperado:

- la cola anterior se cancela;
- no quedan sprites del mapa anterior;
- el mapa nuevo aparece en su estado canónico;
- no hay errores de consola.

Estado: **Aprobada por el usuario durante la validación manual previa al commit**.

### Prueba F — Canvas 2D

Pasos:

1. abrir `?render=canvas2d`;
2. mover, esperar y combatir;
3. cambiar de mapa y guardar/cargar.

Resultado esperado:

- comportamiento histórico inmediato;
- ninguna dependencia de Phaser;
- sin errores de consola.

Estado: **Aprobada por el usuario durante la validación manual previa al commit**.

---

## 17. Compatibilidad

### Web

- continúa siendo una aplicación estática;
- no requiere compilación;
- no requiere CDN;
- Phaser se carga localmente;
- los nuevos módulos respondieron correctamente por HTTP;
- GitHub Pages no requiere un proceso de build adicional.

Estado técnico: compatible.  
Validación interactiva externa: aprobada por el usuario antes del cierre.

### Canvas 2D

- no se modificó su implementación;
- recibe la escena final como antes;
- ignora las opciones adicionales de dibujo de JavaScript;
- fue validado a nivel de contrato neutral y aceptado dentro de la prueba manual de cierre.

### Electron

No corresponde a P6.1. No se agregaron Node.js, preload, IPC ni empaquetado.

---

## 18. Riesgos y pendientes

### Riesgos controlados

- una animación no decide turnos;
- una cola cancelada no deja temporizadores pendientes;
- la identidad visual no entra en la persistencia;
- las entidades no se identifican por nombre;
- una cola extensa se acelera;
- el cambio de mapa aplica el nuevo estado inmediatamente.

### Pendientes deliberados

- animaciones completas de ataques en P6.2;
- sincronización de feedback de Vida y daño en P6.2;
- muerte y botín en P6.4;
- interfaz de velocidades en etapa posterior;
- efectos de habilidades en P6.3.

### Comportamiento conocido de P6.1

Los paneles HTML muestran inmediatamente el estado final aunque Phaser todavía esté reproduciendo la secuencia. Esto no altera resultados. La coordinación visual fina de Vida, daño y muerte debe tratarse cuando existan impactos completos.

---

## 18.1. Ajustes incorporados durante la validación manual

La primera prueba manual de P6.1 detectó tres problemas de presentación:

1. el círculo luminoso del jugador se dibujaba sobre la posición lógica final y quedaba atrasado respecto del sprite interpolado;
2. una ráfaga de siete u ocho movimientos acumulaba demasiada demora visual;
3. el pulso del atacante no permitía interpretar claramente quién había recibido daño.

Correcciones aplicadas antes del commit:

- retiro del aura circular del jugador, conservando iluminación ambiental y sombra de contacto;
- reducción del movimiento aislado a 110 ms y aceleración progresiva a 75/45 ms para rachas consecutivas;
- transición lineal durante rachas para evitar frenado completo en cada casilla;
- reacción genérica de impacto sobre jugador y enemigos solo cuando el resultado canónico confirma daño mayor que cero;
- marca de golpe procedural, sin imágenes ni dependencias nuevas;
- conservación del ritmo secuencial y la pausa exclusiva entre ataques enemigos.

Estas correcciones pertenecen al alcance final de P6.1 y quedaron incluidas en el commit de cierre `687ef42d363c308063ef5ab5f0d0b3ae8f425211`.

---

## 19. Comprobación de restricciones

| Restricción | Resultado |
|---|---|
| No crear `.patch` | Correcto |
| No crear `.mjs` en el repositorio | Correcto |
| No instalar dependencias | Correcto |
| No modificar GitHub | Correcto |
| No realizar commit por el asistente | Correcto; el usuario realizó posteriormente el commit de cierre |
| No realizar push | Correcto |
| No duplicar combate | Correcto |
| No usar duración como tiempo real | Correcto |
| No modificar persistencia | Correcto |
| No romper Canvas deliberadamente | Correcto; aceptado dentro de la validación manual de cierre |
| No avanzar automáticamente a P6.2 | Correcto |

---

## 20. Estado Git final confirmado

Commit de cierre y HEAD verificado:

```text
687ef42d363c308063ef5ab5f0d0b3ae8f425211
```

Estado confirmado sobre el ZIP posterior al commit:

```text
## main...origin/main
```

La copia local, `origin/main` y el estado publicado en GitHub coinciden. El commit fue realizado y publicado por el usuario; el asistente no ejecutó commit ni push.

---

## 21. Conventional Commit confirmado

```text
feat(phaser): completar movimiento y secuenciación visual de combate

- incorporar eventos estructurados para movimientos y ataques ya resueltos;
- mantener identidades visuales estables sin modificar ni persistir entidades;
- interpolar el movimiento del jugador y enemigos junto con sus sombras;
- acelerar automáticamente las ráfagas de desplazamientos consecutivos del jugador;
- reproducir en orden los ataques de varios enemigos con pausas visuales legibles;
- agregar retroceso, destello y marca de impacto sobre jugador y enemigos dañados;
- evitar reacciones visuales falsas en ataques fallidos o con daño cero;
- retirar el aura luminosa desfasada del jugador y conservar la iluminación ambiental;
- cancelar animaciones y esperas de forma segura durante cambios de estado;
- conservar combate, IA, tiempo, persistencia, Canvas 2D y Phaser 4.2.1 sin reglas duplicadas;
- validar sintaxis, JSON, imports, eventos reales, colas visuales y recursos web;
- actualizar README, Plan Maestro, Diseño Maestro y entrega P6.1.
```

Commit confirmado:

```text
687ef42d363c308063ef5ab5f0d0b3ae8f425211
```

---

## 22. Enlace para la siguiente etapa

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P6.1 — Contrato visual, movimiento y secuenciación enemiga

ESTADO:
Cerrada

COMMIT BASE:
bfd2d1c92d3690241707d5c284808be40437f866

HEAD FINAL VERIFICADO:
687ef42d363c308063ef5ab5f0d0b3ae8f425211

GIT STATUS FINAL:
Rama main limpia y alineada con origin/main en `687ef42d363c308063ef5ab5f0d0b3ae8f425211`. Commit publicado y verificado en GitHub.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P6_1.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Crear una base visual no autoritativa que conserva movimientos y ataques ya resueltos, interpola jugador y enemigos y presenta las acciones ofensivas enemigas una por una.

ARQUITECTURA HEREDADA:
La lógica canónica resuelve inmediatamente el estado. ResultadoAccion conserva eventos ordenados. AdaptadorEscenaJuego asigna identidades visuales solo en memoria. PlanificadorEventosVisuales crea datos neutrales y ReproductorEventosVisualesPhaser reproduce una cola sin decidir reglas. Canvas 2D continúa dibujando el estado final inmediatamente.

ARCHIVOS CLAVE:
- src/juego/acciones/EventosAccion.js: define hechos canónicos ya resueltos.
- src/interfaz/graficos/PlanificadorEventosVisuales.js: elimina referencias del dominio antes de llegar a Phaser.
- src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js: conserva orden, movimiento y pausas visuales.
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js: permite localizar por identidad el nodo y la sombra activos.
- docs/phaser/entregas/ENTREGA_P6_1.md: pruebas, riesgos y alcance completo.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 exacta. Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- 170 archivos JavaScript sin errores de sintaxis y 21 JSON válidos.
- 379 imports relativos resueltos sin rutas faltantes.
- ataques reales de jugador y enemigo conservan un único resultado canónico.
- movimientos, identidades, cola secuencial y cancelación segura validados.
- compositor y renderizador neutral validados mediante simulación.
- recursos principales servidos por HTTP 200.

PROBLEMAS O RIESGOS PENDIENTES:
- Chromium headless del entorno no completó el arranque; la validación manual externa fue aprobada por el usuario;
- los paneles HTML muestran el estado final antes de terminar la cola visual;
- la señal ofensiva y la reacción genérica son provisionales y deben especializarse en P6.2.

DECISIONES APROBADAS:
- cada subetapa de P6 tiene cierre y commit propio;
- ResultadoAccion conserva hechos ya resueltos sin recalcular combate;
- Phaser permanece en 4.2.1 sin dependencias nuevas;
- P6 no incorpora sonido inicialmente;
- las acciones enemigas se presentan secuencialmente;
- Prisión glacial no crea una pared o colisión independiente.

DECISIONES QUE SIGUEN ABIERTAS:
- ritmo visual final de cuerpo a cuerpo y proyectiles después de probar P6.2;
- momento exacto de sincronización de barras HTML con impactos;
- ubicación futura de los controles visibles de velocidad y efectos reducidos.

SIGUIENTE ETAPA RECOMENDADA:
P6.2A — Resultados visuales del combate

OBJETIVO DE LA SIGUIENTE ETAPA:
Conservar por golpe el resultado canónico y representar daño, fallo, bloqueo, crítico y descenso visual de Vida sin incorporar todavía embestidas definitivas ni proyectiles.

PRIMEROS ARCHIVOS A REVISAR:
- src/juego/combate/SistemaCombate.js
- src/juego/acciones/EventosAccion.js
- src/interfaz/graficos/PlanificadorEventosVisuales.js
- src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
- src/interfaz/graficos/phaser/CompositorMundoPhaser.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- fórmulas y tiradas de SistemaCombate;
- agenda y costes de SistemaTiempo;
- resolución única de muerte, experiencia y botín;
- contratos de persistencia;
- Phaser 4.2.1;
- Canvas 2D como alternativa operativa.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Daño, fallo, bloqueo y crítico son distinguibles por golpe; doble arma muestra solo golpes realizados y sin total duplicado; la barra enemiga desciende en orden; casillas vacías no generan feedback falso; ninguna presentación recalcula combate o tiempo; Canvas 2D y persistencia continúan sin cambios canónicos.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(phaser): completar movimiento y secuenciación visual de combate

- incorporar eventos estructurados para movimientos y ataques ya resueltos;
- mantener identidades visuales estables sin modificar ni persistir entidades;
- interpolar el movimiento del jugador y enemigos junto con sus sombras;
- acelerar automáticamente las ráfagas de desplazamientos consecutivos del jugador;
- reproducir en orden los ataques de varios enemigos con pausas visuales legibles;
- agregar retroceso, destello y marca de impacto sobre jugador y enemigos dañados;
- evitar reacciones visuales falsas en ataques fallidos o con daño cero;
- retirar el aura luminosa desfasada del jugador y conservar la iluminación ambiental;
- cancelar animaciones y esperas de forma segura durante cambios de estado;
- conservar combate, IA, tiempo, persistencia, Canvas 2D y Phaser 4.2.1 sin reglas duplicadas;
- validar sintaxis, JSON, imports, eventos reales, colas visuales y recursos web;
- actualizar README, Plan Maestro, Diseño Maestro y entrega P6.1.

----------------- FIN DEL ENLACE -----------------
