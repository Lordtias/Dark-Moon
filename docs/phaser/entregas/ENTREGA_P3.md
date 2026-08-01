# ENTREGA P3 — CÁMARA, ESCALA Y CONTROLES

Proyecto: Dark Moon  
Etapa: P3 — Cámara, escala y controles  
Estado: **Cerrada**  
Fecha: 31 de julio de 2026

> **Trazabilidad posterior:** el usuario aprobó las pruebas manuales y publicó P3 en el commit `5c47a48aaf45c637172930afeff3c3dac5ef8120`. Las referencias posteriores de este documento a cambios “sin commit” describen la fotografía exacta de la entrega previa a ese commit y no el estado heredado por P4. P3 está cerrada y probada.

---

## 1. Estado de la copia de trabajo

### Ruta local

`/mnt/data/dark_moon_p2_work/Dark-Moon`

### Directorio `.git`

Presente y funcional.

### Rama

`main`

### Commit base y HEAD local inicial

`2b572cf5e587c4ea1d85f2f9069255fb83938a85`

### Estado publicado consultado

GitHub publicaba `Lordtias/Dark-Moon`, rama `main`, en el mismo commit
`2b572cf5e587c4ea1d85f2f9069255fb83938a85`. La copia local inicial estaba
limpia y no presentaba adelantos ni atrasos respecto de `origin/main`.

### Estado Git de la entrega

La copia contiene los cambios completos de P3 sin commit. No se ejecutaron
`git reset`, `git clean`, `git checkout`, `git restore` masivo, commit ni push.

La implementación fue validada automáticamente y el usuario aprobó las pruebas
manuales el 31 de julio de 2026. P3 queda cerrada funcional y documentalmente.
Los cambios permanecen sin commit ni push, conforme a las restricciones del plan.

---

## 2. Decisiones aprobadas

1. Implementar P3 antes de E0 como excepción explícita, manteniendo E0 pausada.
2. Limitar P3 a controles visuales de cámara; los comandos jugables continúan
   reservados para P4.
3. Utilizar `I`, `J`, `K` y `L` para desplazar la cámara.
4. Utilizar `+` y `-` para cambiar zoom.
5. Utilizar `H`, no la tecla `Home`, para recentrar y reactivar seguimiento.
6. Conservar rueda, arrastre derecho o central y doble clic izquierdo.
7. Agregar un único conversor pantalla, mundo y casilla.
8. Dividir el trabajo solo de forma interna y proponer un único commit final.
9. Actualizar Plan Maestro, Diseño Maestro, README y trazabilidad de P2.

---

## 3. Resultado implementado

### Navegación por teclado

- `I`: cámara hacia arriba;
- `J`: cámara hacia la izquierda;
- `K`: cámara hacia abajo;
- `L`: cámara hacia la derecha;
- movimiento continuo mientras la tecla permanece presionada;
- diagonales normalizadas;
- velocidad independiente de la frecuencia de cuadros;
- velocidad ajustada al zoom para conservar una sensación visual estable;
- límites aplicados durante el desplazamiento;
- cambio automático de seguimiento a cámara libre;
- ninguna acción jugable ni consumo de turno.

### Zoom y recentrado

- `+` acerca;
- `-` aleja;
- rueda conserva su comportamiento;
- mínimo de 80 %;
- máximo de 160 %;
- pasos de 10 %;
- valor inicial de 120 %;
- `H` recentra y reactiva seguimiento;
- doble clic izquierdo conserva la misma función;
- zoom de rueda en cámara libre conserva el punto bajo el puntero;
- zoom de teclado en cámara libre conserva el centro visible;
- zoom durante seguimiento o selección mantiene al personaje centrado.

### Seguimiento y selección táctica

- el seguimiento continúa activo al cargar o cambiar de mapa;
- el movimiento manual pasa a cámara libre;
- `H` o doble clic restauran seguimiento;
- ataque, interacción o habilidad restauran seguimiento;
- la selección táctica bloquea IJKL y arrastre;
- la selección permite zoom sin perder el centro del personaje;
- redimensionamiento conserva el centro cuando hay seguimiento;
- redimensionamiento conserva el sector visible cuando la cámara está libre.

### Protección de interfaz

Los controles de cámara se ignoran cuando el evento proviene de:

- `input`;
- `textarea`;
- `select`;
- contenido editable.

También se limpian las teclas mantenidas al perder foco, ocultar la página,
cambiar de mapa o entrar en selección táctica.

---

## 4. Arquitectura final de P3

```text
Entrada de cámara
  ├─ IJKL
  ├─ + / -
  ├─ H
  ├─ rueda
  ├─ arrastre derecho o central
  └─ doble clic
          ↓
ControladorCamaraPhaser
          ↓
ConversorCoordenadasPhaser
  ├─ pantalla ↔ mundo
  └─ mundo ↔ casilla
          ↓
Cámara y representación Phaser
```

En paralelo se conserva:

```text
WASD / flechas / numérico / F / R / habilidades
          ↓
ControladorTeclado
          ↓
EjecutorAccionesJugador
          ↓
lógica canónica
```

### Responsabilidades

- `ConfiguracionPhaser.js`: valores generales y configuración de cámara.
- `ConversorCoordenadasPhaser.js`: traducción pura entre espacios visuales.
- `ControladorCamaraPhaser.js`: seguimiento, cámara libre, zoom y entrada visual.
- `CompositorMundoPhaser.js`: dibujo y ubicación de casillas mediante el conversor.
- `EscenaArranquePhaser.js`: composición de piezas y actualización por cuadro.

### Contrato conservado

Phaser no calcula ni decide:

- movimiento del jugador;
- tiempo;
- combate;
- inteligencia artificial;
- muerte;
- experiencia;
- botín;
- inventario;
- habilidades;
- persistencia.

---

## 5. Configuración de cámara

| Valor | Configuración |
|---|---:|
| Zoom inicial | 1.2 |
| Zoom mínimo | 0.8 |
| Zoom máximo | 1.6 |
| Paso de zoom | 0.1 |
| Velocidad de teclado | 420 píxeles visibles por segundo |
| Doble clic | 320 ms |
| Máximo delta procesado | 100 ms |

El máximo delta evita saltos grandes después de perder temporalmente el foco o
reanudar una pestaña.

---

## 6. Archivos modificados

- `README.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P2.md`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`
- `src/interfaz/graficos/phaser/ControladorCamaraPhaser.js`
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`

## 7. Archivos agregados

- `src/interfaz/graficos/phaser/ConversorCoordenadasPhaser.js`
- `docs/phaser/entregas/ENTREGA_P3.md`

## 8. Archivos eliminados

Ninguno.

---

## 9. Archivos que no se modificaron

- `src/controles/ControladorTeclado.js`;
- `src/aplicacion/EjecutorAccionesJugador.js`;
- `src/interfaz/graficos/RenderizadorCanvas2D.js`;
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`;
- `src/interfaz/Renderizador.js`;
- `src/config/mapas/mapas.json`;
- `game.js`;
- `index.html`;
- persistencia;
- inventario;
- equipamiento;
- combate;
- IA;
- habilidades.

---

## 10. Dependencias

| Dependencia | Versión | Estado |
|---|---:|---|
| Phaser | 4.2.1 | Ya incorporada localmente en P1 |
| Librerías nuevas | — | Ninguna |
| npm | — | No utilizado por el proyecto |
| Electron | — | No incorporado |

No se modificó la versión de Phaser, su ruta local, su licencia ni su forma de
carga condicional. La aplicación continúa sin proceso de compilación.

---

## 11. Validaciones realizadas

| Prueba | Preparación y pasos | Resultado obtenido | Estado |
|---|---|---|---|
| Git inicial | Verificar ruta, `.git`, rama, HEAD y `git -c core.autocrlf=true status` | `main`, HEAD `2b572cf5`, estado limpio y alineado con `origin/main` | Correcto |
| Estado publicado | Consultar repositorio y commits mediante conexión GitHub | Último commit publicado `2b572cf5`, coincidente con la copia | Correcto |
| Sintaxis JS | Analizar cada módulo modificado con el parser disponible, sin `node:test` ni dependencias | Todos los módulos interpretados sin errores de sintaxis | Correcto |
| Conversión | Comprobar pantalla ↔ mundo, mundo ↔ casilla y casilla ↔ pantalla con cámara simulada | Conversión reversible y límites de casilla correctos | Correcto |
| IJKL | Mantener `L`, avanzar el ciclo y soltar | Cámara desplazada, seguimiento desactivado, sin comando jugable | Correcto |
| H | Desplazar y presionar `H` | Cámara vuelve al jugador y seguimiento queda activo | Correcto |
| Zoom teclado | Presionar `+` y `-` | Pasos de 10 % dentro de límites | Correcto |
| Zoom libre | Cambiar zoom con punto de pantalla conocido | El punto de mundo bajo el cursor se conserva | Correcto |
| Selección táctica | Activar selección y presionar una tecla de cámara | Desplazamiento bloqueado y seguimiento activo | Correcto |
| Campo editable | Emitir entrada desde un elemento editable | Control de cámara ignorado | Correcto |
| Limpieza | Destruir controlador | Eventos de teclado, ratón, foco y visibilidad retirados | Correcto |
| Higiene del diff | `git -c core.autocrlf=true diff --check` | Sin errores de espacios o marcadores | Correcto |
| Navegador Phaser | Ejecutar el juego real en Chromium mediante un documento aislado que enruta las mismas rutas locales del repositorio | Phaser 4.2.1 visible; IJKL, `H`, zoom, rueda, arrastre, doble clic, selección, movimiento canónico y redimensionamiento correctos; 0 errores de consola | Correcto |
| Navegador Canvas 2D | Ejecutar el backend histórico en Chromium y realizar un movimiento canónico | Canvas 2D visible, una sola acción, tiempo avanzado una vez y 0 errores de consola | Correcto |
| Validación manual del usuario | Ejecutar Phaser y Canvas 2D en el navegador habitual y revisar los controles y regresiones propuestas | Pruebas manuales aprobadas por el usuario el 31 de julio de 2026 | Correcto |

La prueba aislada utilizó una geometría sintética de 80 × 50 casillas para
comprobar desplazamiento y conversiones en un mundo mayor que la referencia.
El archivo temporal de prueba se mantuvo fuera del repositorio.

La navegación directa de Chromium hacia `localhost` fue restringida por el
entorno. Para no sustituir la prueba por una simulación, se cargaron el
`index.html`, los módulos reales y Phaser 4.2.1 desde la copia local mediante un
documento aislado con rutas interceptadas. No se modificó ningún archivo del
repositorio para esta validación. La evidencia quedó fuera del repositorio en
`P3_VALIDACION_NAVEGADOR.json`, `P3_BROWSER_PHASER.png` y
`P3_BROWSER_CANVAS2D.png`.

---

## 12. Validación manual aprobada

### Preparación

```text
python -m http.server 8000
```

Abrir:

```text
http://localhost:8000/index.html?render=phaser
```

### Casos principales

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| Inicio | Crear personaje y entrar a Alcantarilla | Phaser visible, zoom 120 %, jugador centrado |
| IJKL | Mantener cada dirección | Solo se desplaza la cámara; no cambia personaje ni turno |
| Diagonal | Mantener dos direcciones | Diagonal sin velocidad adicional |
| Cámara libre | Desplazar y luego mover personaje con WASD | Personaje se mueve una vez; cámara no se recentra |
| H | Presionar `H` | Recentrado y seguimiento reactivado |
| Doble clic | Desplazar y hacer doble clic izquierdo | Mismo resultado que `H` |
| Zoom teclado | Usar `+` y `-` repetidamente | Rango 80 % a 160 % sin exceder límites |
| Rueda | Zoom sobre una casilla reconocible | La casilla permanece bajo el puntero en cámara libre |
| Selección | Presionar `F` y luego IJKL/arrastre | Cámara centrada y desplazamiento bloqueado |
| Cancelación | Presionar `Escape` | Selección termina; cámara continúa siguiendo |
| Campo editable | Escribir IJKL/H/+/- en un input | El texto recibe la entrada; la cámara no responde |
| Redimensionamiento | Cambiar tamaño en seguimiento y cámara libre | Sin saltos indebidos ni pérdida del mapa |
| Ventana pequeña | Probar alrededor de 900 × 700 | Panel y mapa siguen legibles |
| Canvas 2D | Abrir `?render=canvas2d` | Comportamiento histórico sin Phaser |
| Consola | Revisar DevTools | Sin errores inesperados |

### Estado

**Correcto. El usuario aprobó las pruebas manuales el 31 de julio de 2026.**

---

## 13. Compatibilidad

### Web

- conserva módulos ES y archivos estáticos;
- no requiere compilación;
- no agrega rutas absolutas;
- mantiene Canvas 2D como backend predeterminado;
- conserva Phaser local y ejecución offline mediante servidor HTTP;
- GitHub Pages deberá comprobarse después del futuro commit y push.

### Canvas 2D

No se modificó su renderizador ni su entrada. Los nuevos controles solo existen
mientras está creada la escena Phaser.

### Electron

Sin implementación ni prueba. E0 continúa pausada y pendiente. D-023 autorizó
únicamente P3 como excepción.

### Persistencia

No se modificaron claves, versiones, snapshots, inventario, equipo, oro, barra
de habilidades ni guardado. Impacto esperado: ninguno.

### Contenido nuevo

El sistema utiliza geometría y coordenadas genéricas. No contiene excepciones
por nombre de mapa, bioma, enemigo, habilidad o recurso.

---

## 14. Riesgos y pendientes

1. GitHub Pages queda pendiente de comprobación después de commit y push.
2. P3 no agrega un mapa definitivo mayor; la lógica aislada se probó con una
   geometría sintética de 80 × 50.
3. Los clics y teclas Phaser todavía no emiten intenciones jugables; corresponde
   a P4 y requiere aprobación nueva.
4. E0 continúa pausada y no se considera cumplida.
5. P4 no está autorizado automáticamente después de P3.

---

## 15. Comprobación de restricciones

- no se creó ningún `.patch` dentro del repositorio;
- no se creó ningún `.mjs` dentro del repositorio;
- no se instaló ninguna dependencia;
- no se agregó Node.js, npm o Electron al proyecto;
- no se utilizó `node:test`;
- no se realizó commit;
- no se realizó push;
- no se modificó GitHub remotamente;
- no se duplicó lógica jugable;
- no se modificó `ControladorTeclado.js`;
- no se modificó `EjecutorAccionesJugador.js`;
- no se modificó Canvas 2D;
- no se modificó persistencia;
- no se eliminó el renderizador anterior;
- no se avanzó automáticamente a P4.

---

## 16. Conventional Commit propuesto

```text
feat(camara): completar navegación y escala de Phaser

- agregar desplazamiento visual con IJKL y recentrado con H;
- incorporar zoom por teclado y conservar los controles de ratón;
- centralizar velocidad, límites y valores de zoom configurables;
- unificar conversiones entre pantalla, mundo y casilla;
- conservar seguimiento, cámara libre y bloqueo durante selección táctica;
- mantener Canvas 2D, entrada canónica y persistencia sin cambios;
- documentar la excepción temporal de E0 y el alcance real de P3;
- validar sintaxis, coordenadas, controles y limpieza de eventos.
```

La validación manual ya fue aprobada. El commit continúa siendo responsabilidad
del usuario; no se realizó commit ni push desde esta entrega.

---

## 17. Enlace para la siguiente etapa

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P3 — Cámara, escala y controles

ESTADO:
Cerrada

COMMIT BASE:
2b572cf5e587c4ea1d85f2f9069255fb83938a85

HEAD FINAL VERIFICADO:
2b572cf5e587c4ea1d85f2f9069255fb83938a85 (los cambios cerrados de P3 permanecen sin commit)

GIT STATUS FINAL:
Rama main sobre origin/main, con 8 archivos modificados y 2 archivos nuevos de P3 sin commit; validación manual aprobada.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P3.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Incorporar una cámara navegable, predecible y configurable para mapas mayores, sin mover lógica jugable a Phaser ni consumir turnos.

ARQUITECTURA HEREDADA:
Phaser consume la escena neutral y representa resultados canónicos. ControladorCamaraPhaser administra únicamente vista y entrada visual. ConversorCoordenadasPhaser centraliza pantalla, mundo y casilla. Canvas 2D continúa predeterminado y la entrada jugable sigue en ControladorTeclado y EjecutorAccionesJugador.

ARCHIVOS CLAVE:
- src/interfaz/graficos/phaser/ControladorCamaraPhaser.js: seguimiento, cámara libre, IJKL, H, zoom y límites.
- src/interfaz/graficos/phaser/ConversorCoordenadasPhaser.js: contrato único de coordenadas.
- src/interfaz/graficos/phaser/ConfiguracionPhaser.js: valores configurables de cámara.
- src/interfaz/graficos/phaser/EscenaArranquePhaser.js: ciclo visual y composición de componentes.
- docs/phaser/entregas/ENTREGA_P3.md: alcance, pruebas y pendientes.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 local. Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- IJKL desplaza únicamente la cámara y H reactiva seguimiento;
- zoom respeta 80 % a 160 % y conserva el punto visual correspondiente;
- selección táctica bloquea el desplazamiento manual;
- campos editables ignoran controles de cámara;
- conversión pantalla, mundo y casilla es reversible y genérica;
- sintaxis, higiene y limpieza de eventos son correctas;
- la regresión manual en el navegador habitual fue aprobada por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- comprobar GitHub Pages después de commit y push;
- E0 continúa pausada y pendiente;
- P4 requiere propuesta y aprobación nueva.

DECISIONES APROBADAS:
- P3 puede completarse antes de E0 como excepción puntual;
- IJKL desplaza cámara, +/- cambia zoom y H recentra;
- los controles de cámara no emiten comandos jugables;
- pantalla, mundo y casilla utilizan un conversor único;
- Canvas 2D y persistencia permanecen sin cambios.

DECISIONES QUE SIGUEN ABIERTAS:
- decidir si después de P3 se reanuda E0 o se propone otra excepción;
- definir el alcance detallado de P4 únicamente mediante nueva aprobación.

SIGUIENTE ETAPA RECOMENDADA:
E0 — Prueba técnica temprana de Electron, cuando el equipo permita instalar y validar sus herramientas.

OBJETIVO DE LA SIGUIENTE ETAPA:
Validar que Dark Moon puede ejecutarse dentro de Electron sin romper la versión web, el modo offline, las rutas, la persistencia ni el aislamiento de contexto.

PRIMEROS ARCHIVOS A REVISAR:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/entregas/ENTREGA_P3.md
- index.html
- src/interfaz/graficos/phaser/CargadorPhaser.js
- src/interfaz/graficos/phaser/ConfiguracionPhaser.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- lógica canónica de movimiento, combate, IA, tiempo, muerte, experiencia y botín;
- contrato neutral consumido por Canvas 2D y Phaser;
- persistencia y formato de guardado;
- Phaser 4.2.1;
- controles jugables directos desde Phaser;
- inicio de P4 o reanudación de E0.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Electron inicia el juego web existente de forma aislada y offline, conserva Canvas 2D y Phaser, carga recursos y JSON, mantiene persistencia, no expone Node al contenido y documenta versiones, comandos, tamaño, riesgos y alternativa.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(camara): completar navegación y escala de Phaser

- agregar desplazamiento visual con IJKL y recentrado con H;
- incorporar zoom por teclado y conservar los controles de ratón;
- centralizar velocidad, límites y valores de zoom configurables;
- unificar conversiones entre pantalla, mundo y casilla;
- conservar seguimiento, cámara libre y bloqueo durante selección táctica;
- mantener Canvas 2D, entrada canónica y persistencia sin cambios;
- documentar la excepción temporal de E0 y el alcance real de P3;
- validar sintaxis, coordenadas, controles y limpieza de eventos.

----------------- FIN DEL ENLACE -----------------
