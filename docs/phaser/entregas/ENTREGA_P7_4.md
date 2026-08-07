# ENTREGA P7.4 — EXPERIENCIA DE TESTER Y REGISTRO ANALÍTICO

Fecha: 2026-08-07
Etapa: P7.4
Base exacta: `497af6b1fe8c86c16c2d08a7d488e34b9a5e8d09`
Rama: `main`
HEAD conservado: `497af6b1fe8c86c16c2d08a7d488e34b9a5e8d09`
Commit realizado: no
Estado: implementada técnicamente; pendiente de validación manual y commit

## 1. Objetivo

Preparar Dark Moon para testers amateurs sin incorporar nuevas mecánicas: hacer explícita la ayuda de juego, retirar instrucciones técnicas permanentes, permitir copiar un diagnóstico útil y convertir el registro en una fuente de información rica sobre combate en lugar de un historial saturado por movimientos y colisiones rutinarias.

P7.3B fue validada y cerrada por el usuario en `497af6b1fe8c86c16c2d08a7d488e34b9a5e8d09`.

## 2. Ayuda del juego

Se agrega **Ayuda del juego / Game Help** como botón textual explícito dentro de la franja inferior de acciones, pero separado visualmente de la barra de habilidades. No utiliza una ranura de habilidad ni depende de un icono `?` ambiguo.

El botón abre un modal grande bilingüe que representa controles mediante HTML/CSS:

- WASD, flechas y teclado numérico para movimiento;
- Espacio / 5 para esperar;
- F para atacar o confirmar;
- R para interactuar;
- 1–0 para habilidades;
- IJKL para mover cámara;
- H para recentrar;
- + / − y rueda para zoom;
- arrastre de mouse para cámara.

No se agregan tooltips generales ni una plantilla de reporte: ambos quedaron deliberadamente fuera de alcance.

## 3. Diagnóstico copiable

El modal incluye un diagnóstico de solo lectura con:

- versión de Dark Moon;
- renderizador efectivo;
- versión de Phaser cuando corresponde;
- idioma;
- velocidad de animaciones;
- efectos reducidos;
- zoom inicial;
- ubicación y mapa;
- nivel del personaje;
- tamaño de ventana;
- navegador/user-agent.

No incluye inventario, guardado completo ni datos personales. La copia utiliza Clipboard API cuando está disponible y un respaldo DOM si el navegador no la ofrece.

## 4. Phaser predeterminado

Phaser queda consolidado como backend visual predeterminado cuando no existe parámetro `render`. Canvas 2D permanece como fallback técnico explícito mediante `?render=canvas2d`. Un valor desconocido vuelve a Phaser y genera advertencia.

También se actualiza la documentación local de la dependencia Phaser para no conservar la descripción histórica de Canvas 2D como valor predeterminado.

## 5. Limpieza de interfaz técnica

Se retiran:

- las instrucciones permanentes de movimiento/combate/interacción de la partida;
- el overlay permanente de ayuda de cámara Phaser.

Los cambios de zoom conservan feedback localizado y temporal (`Zoom N %`) que desaparece automáticamente.

Mientras el modal de ayuda está abierto, el teclado jugable y los controles de cámara ignoran comandos para evitar mover o actuar accidentalmente detrás del modal.

## 6. Limpieza del registro

Se eliminan mensajes que no aportan información histórica útil:

- movimiento correcto del jugador;
- avance rutinario de enemigos;
- espera básica;
- choques con pared;
- bloqueo diagonal por esquina;
- intentos de movimiento hacia una casilla ocupada/no transitable cuando solo expresaban una colisión rutinaria.

Esto no elimina los eventos canónicos de movimiento ni altera IA, agenda temporal, colisiones, selección o animación Phaser. Los mensajes de detección, combate, interacción, estados, muerte, experiencia y botín permanecen.

## 7. Registro analítico de combate

El registro de combate se vuelve deliberadamente más detallado. La presentación no recalcula reglas: `SistemaCombate`, `MotorDanioHabilidad`, `ComponentesDanio` y `SistemaEfectosTemporales` transportan los operandos/resultados realmente usados por la resolución y `MensajesCalculoCombate` solamente los formatea.

Cada daño resuelto comienza con un resultado destacado en negrita, por ejemplo **DAÑO FINAL: N / FINAL DAMAGE: N**, seguido del detalle real.

### Impacto

Se muestra la fórmula canónica:

`factor × precision/(precision+evasion) × nivelAtacante/(nivelAtacante+nivelObjetivo)`

junto con límites mínimo/máximo, probabilidad sin limitar, probabilidad final y tirada real. Los impactos automáticos quedan identificados explícitamente.

### Ataque físico

Cada componente expone:

- tirada local y rango;
- multiplicador de atributo;
- daño plano;
- multiplicador del golpe/mano;
- multiplicador global;
- multiplicador crítico;
- bloqueo y mitigación cuando intervienen;
- Armadura, factor canónico y porcentaje de reducción;
- `floor` final y daño realmente aplicado al objetivo.

### Habilidades

Se muestran:

- escalado por atributos mágicos;
- Potencia de Habilidad y su multiplicador;
- crítico y tirada real;
- daño base de cada componente;
- `round` del daño bruto;
- Armadura o resistencia elemental según tipo;
- `floor` final y daño aplicado.

### Daño periódico

Los ticks muestran daño base, acumulación/intensidad, bruto real y mitigación. Los componentes elementales usan resistencia; un componente periódico físico usa la fórmula canónica de Armadura.

## 8. Aplicación y rechazo de efectos

La aplicación de estados informa explícitamente:

- resultado destacado: aplicado, resistido, inmune, renovado o no aplicado;
- probabilidad base;
- resistencia de efecto cuando corresponde;
- ecuación `base × (1 - resistencia/100)`;
- probabilidad final;
- tirada real;
- duración cuando se aplica;
- rechazo por inmunidad o por política de acumulación/reaplicación.

Los modos de resistencia que no reducen probabilidad tienen plantillas separadas para no mostrar una ecuación que el motor no utilizó.

## 9. Formato enriquecido seguro

`MensajesJuego` admite un fragmento semántico `destacado`. `PresentadorMensajesJuego` resuelve texto normal y destacado por separado y `Renderizador` construye un nodo `<strong>` seguro; las traducciones no contienen HTML ni se utiliza `innerHTML` para el registro.

## 10. Consola de desarrollo

Se retiran `console.log`, `console.group` y `console.table` rutinarios de `src`. Se conservan advertencias, errores y `darkMoonDebug` para diagnóstico técnico.

## 11. Validación técnica

Validaciones realizadas sobre la implementación:

- 206 archivos JavaScript: sintaxis correcta;
- 29 JSON: parseo correcto;
- 492 imports relativos auditados: 0 faltantes;
- paridad completa Español/Inglés, incluidos placeholders;
- 455 referencias literales de traducción auditadas: 0 faltantes;
- selector de renderizador: sin parámetro → Phaser; `canvas2d` → Canvas 2D; `phaser` → Phaser; valor inválido → Phaser + warning;
- prueba determinista de habilidad con impacto, crítico, Potencia de Habilidad y resistencia elemental: la ecuación presentada coincide con el resultado real del motor;
- prueba de ataque físico real con `Combatiente`: la ecuación presentada utiliza tirada, atributo, Armadura, crítico e impacto devueltos por la resolución;
- prueba de daño periódico físico y elemental: cada tipo usa la mitigación correspondiente;
- aplicación/resistencia/inmunidad de efecto comprobadas con probabilidad y tirada deterministas;
- no quedan productores JS de los mensajes rutinarios eliminados ni overlay permanente de cámara;
- no quedan `console.log`, `console.group` o `console.table` rutinarios bajo `src`;
- no se agregan `.mjs`, `.patch` ni dependencias.

La validación visual interactiva completa en navegador debe realizarla el usuario. En este entorno no se dispone de una sesión gráfica de navegador confiable para validar wrapping, dimensiones finales del modal, fullscreen y comportamiento del portapapeles con permisos reales.

## 12. Pruebas manuales recomendadas

1. Abrir sin parámetros y confirmar Phaser.
2. Abrir con `?render=canvas2d` y confirmar el fallback.
3. Confirmar que **Ayuda del juego** está separado visualmente de Habilidades.
4. Abrir/cerrar el modal y verificar que no se mueve el personaje ni la cámara mientras está abierto.
5. Revisar controles dibujados en Español e Inglés.
6. Copiar diagnóstico en ambos idiomas.
7. Modificar zoom y comprobar feedback temporal sin overlay permanente.
8. Caminar, esperar y chocar contra paredes: el log no debe llenarse con mensajes triviales.
9. Hacer que un enemigo persiga al jugador: conservar detección pero no registrar cada paso.
10. Ejecutar ataques físicos con fallo, impacto, crítico, bloqueo y Armadura y revisar las ecuaciones.
11. Ejecutar habilidades de daño elemental y físico y revisar escalados/resistencias.
12. Aplicar, resistir e inmunizar efectos y revisar probabilidad/tirada.
13. Comprobar daño periódico y acumulaciones.
14. Verificar que muerte, XP, botín e interacciones relevantes siguen apareciendo.
15. Confirmar que el resultado jugable coincide entre Phaser y Canvas 2D.

## 13. Fuera de alcance

- rediseño general de UI;
- tooltips de atributos/estadísticas;
- tutorial jugable paso a paso;
- plantilla/formulario de reporte;
- cambios de balance;
- nuevas mecánicas;
- ampliación de persistencia/autosave;
- audio.

## 14. Próxima etapa

P7.5 — candidato beta web y regresión final de P7.
