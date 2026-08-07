# ENTREGA P7.5 — CANDIDATO BETA WEB Y REGRESIÓN FINAL DE P7

Fecha: 2026-08-07
Etapa: P7.5
Base exacta: `c9a84e48007e6bdd59e12edea357b1f0ec7f6764`
Rama: `main`
HEAD conservado durante la implementación: `c9a84e48007e6bdd59e12edea357b1f0ec7f6764`
Commit realizado: no
Versión candidata: `0.7.0-beta.2`
Estado: implementada técnicamente; pendiente de validación manual y commit

## 1. Objetivo

Cerrar P7 como candidato beta web sin incorporar mecánicas, balance ni rediseño general de interfaz. La etapa primero ejecuta regresión sobre la base validada de P7.4 y solo permite cambios si aparece un bloqueante o una regresión.

La regresión previa no detectó bloqueantes ni regresiones funcionales. Por esa razón el único cambio productivo de P7.5 es la identificación de versión `0.7.0-beta.2`; el resto del trabajo corresponde a auditoría y documentación reproducible del candidato.

## 2. Base validada

El ZIP de entrada contiene `.git` y fue comprobado antes de modificar:

- rama `main`;
- HEAD `c9a84e48007e6bdd59e12edea357b1f0ec7f6764`;
- `origin/main` en el mismo SHA;
- ahead/behind `0/0`;
- 117 marcas de `git status` atribuibles exclusivamente a CRLF/LF;
- 0 diferencias reales normalizadas respecto a HEAD.

P7.4 queda registrada como validada y cerrada en ese commit.

## 3. Versión candidata

`src/config/VersionAplicacion.js` pasa de `0.7.0-beta.1` a `0.7.0-beta.2`.

La versión continúa siendo exclusivamente una identificación visible/diagnóstica. No participa de reglas jugables ni cambia la versión del snapshot durable.

## 4. Matriz de regresión automática

| Área | Resultado |
|---|---|
| Sintaxis JavaScript | 208 archivos, 0 errores antes del cambio; revalidada al empaquetar |
| JSON | 29 archivos, 0 errores |
| Imports relativos | 498 referencias, 0 faltantes |
| Cargadores canónicos | 16 cargas/validaciones, todas correctas |
| Paridad ES/EN | correcta |
| Placeholders ES/EN | 0 diferencias |
| Referencias i18n directas auditadas | 342, 0 faltantes en ES/EN |
| Recursos declarados en JSON | 172 referencias / 138 rutas únicas, 0 faltantes y 0 errores de capitalización |
| Recursos HTTP bajo `/Dark-Moon/` | 176 rutas auditadas, 0 errores HTTP |
| Selector sin parámetro | Phaser |
| `?render=phaser` | Phaser |
| `?render=canvas2d` | Canvas 2D |
| Render inválido | Phaser + warning |
| Preferencias | ES inicial, EN persistible, reset vuelve a ES |
| Persistencia durable | round-trip correcto de personaje, recursos, oro, inventario, equipo y progreso mágico |
| Guardado corrupto | falla de validación sin borrar el contenido existente |
| Continuar | reconstruye jugador y abre `ciudad_inicial` |
| Regresión de mapas | 45 generaciones deterministas |
| Regresión general | 28 correctos, 0 advertencias, 0 incorrectos |
| Habilidades | 12 habilidades / 40 grados; 0 incorrectos |
| Pruebas focalizadas de combate | 19 casos; 0 incorrectos |
| Efectos | 202 correctos, 34 advertencias analíticas, 0 incorrectos |

Las advertencias del analizador de efectos/balance son resultados analíticos ya existentes, no regresiones técnicas de P7.5.

## 5. GitHub Pages y rutas relativas

Se auditó el candidato como si estuviera publicado bajo un subdirectorio:

`https://usuario.github.io/Dark-Moon/`

Las rutas runtime utilizadas por módulos, `fetch`, Phaser, CSS y recursos de configuración son relativas. Se verificaron mediante servidor HTTP local bajo `/Dark-Moon/`, con 0 recursos faltantes entre las 176 rutas auditadas.

También se verificó capitalización exacta en los 138 recursos únicos declarados por los JSON jugables, relevante para servidores Linux/GitHub Pages.

## 6. Arranque y preferencias sin DOM gráfico

Una instancia real de `Aplicacion` fue iniciada con presentación de prueba y `fetch` respaldado por los archivos del repo. El arranque cargó todos los catálogos, presentó la versión, inició en Español sin guardado y permitió cambiar a Inglés/persistir el override. Restablecer preferencias eliminó el override y volvió a Español.

Esto comprueba la coordinación de aplicación/configuraciones sin sustituir las reglas del dominio.

## 7. Persistencia y Continuar

La prueba de round-trip creó un jugador real, modificó oro/XP/recursos, agregó inventario y equipamiento, persistió el snapshot y reconstruyó un `Player` nuevo desde el guardado. Los campos durables comparados coincidieron.

La prueba integrada de **Continuar** utilizó una `Aplicacion` y `ControladorPartida` reales con presentación de prueba. El guardado fue validado, el jugador reconstruido y la sesión activó `ciudad_inicial`. Se confirma que la expedición no forma parte del snapshot durable.

Un guardado con JSON corrupto sigue presente después de fallar la validación: el juego no lo elimina silenciosamente.

## 8. Regresión jugable determinista

El analizador canónico se ejecutó con motores reales y configuraciones vigentes:

- 45 mapas generados;
- 9 tramos de nivel;
- 3 profesiones;
- 12 habilidades;
- 40 grados;
- 2 casos de recompensa;
- 6 casos fallidos deliberados;
- 11 comprobaciones de cobertura;
- 28 resultados correctos;
- 0 advertencias de regresión;
- 0 resultados incorrectos.

Combate focalizado mantiene 0 incorrectos y efectos mantiene 0 incorrectos. No se modificó balance como consecuencia de esta etapa.

## 9. Limitación del entorno de validación

El contenedor dispone de Chromium, pero la navegación del proceso gráfico/headless está bloqueada por una política del entorno y devuelve `net::ERR_BLOCKED_BY_ADMINISTRATOR`, incluso para localhost/file. Por ello no se utiliza ese resultado para inferir un fallo de Dark Moon.

La accesibilidad HTTP de los recursos sí pudo verificarse con un servidor local. La interacción visual final, fullscreen, clipboard y GitHub Pages real deben validarse manualmente en un navegador normal.

## 10. Checklist manual final

1. Publicar/abrir la candidata y comprobar que el menú muestra `0.7.0-beta.2`.
2. Abrir sin `render`: debe utilizar Phaser.
3. Abrir una vez con `?render=canvas2d`: debe iniciar Canvas 2D sin cargar/depender visualmente de Phaser.
4. Con almacenamiento limpio, crear un personaje de cada profesión al menos una vez entre las pruebas.
5. Confirmar ciudad inicial, movimiento y cámara Phaser.
6. Abrir **Ayuda del juego / Game Help**, revisar controles y copiar diagnóstico.
7. Entrar a una mazmorra y comprobar selección/generación.
8. Combatir físicamente: impacto/fallo, crítico/bloqueo y cálculo de daño deben mantener el log analítico.
9. Usar habilidades de daño y aplicar/resistir al menos un efecto temporal.
10. Derrotar un enemigo, comprobar XP, muerte y aparición/recogida de botín.
11. Equipar/desequipar un objeto y usar al menos un consumible.
12. Regresar a ciudad y probar mercader y Lythra.
13. Recargar/cerrar el navegador y usar **Continuar**: el personaje durable debe restaurarse desde ciudad.
14. Repetir los puntos principales en Inglés y comprobar que no aparecen `undefined` ni claves técnicas visibles.
15. Confirmar que el log no vuelve a llenarse con movimiento/colisiones rutinarias.
16. Confirmar fullscreen y zoom/cámara en la resolución habitual del tester.
17. Probar la URL real de GitHub Pages bajo el subdirectorio del repositorio.

## 11. Fuera de alcance

- rediseño general de UI y tooltips;
- balance;
- nuevas habilidades, enemigos, mapas u objetos;
- audio;
- persistencia de expedición/autosave ampliado;
- Electron;
- formulario o telemetría de feedback.

## 12. Criterio de cierre

P7 puede cerrarse cuando la checklist manual confirma que una persona puede entrar desde web, crear/continuar, jugar una expedición, combatir, obtener y equipar botín, usar habilidades, regresar a ciudad y comprender la interfaz tanto en Español como en Inglés, con Phaser como renderer normal y Canvas 2D como respaldo.

Tras esa validación, el commit de P7.5 se convierte en el candidato beta web formal y la siguiente etapa se define fuera del alcance obligatorio de P7.

## 13. Archivos de P7.5

Cambios reales respecto a `c9a84e48007e6bdd59e12edea357b1f0ec7f6764`:

- modificados: 4;
- nuevos: 1;
- eliminados: 0;
- total: 5.

Archivos:

- `src/config/VersionAplicacion.js`;
- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/entregas/ENTREGA_P7_4.md`;
- `docs/phaser/entregas/ENTREGA_P7_5.md` (nuevo).

No se modifican motores de combate, habilidades, efectos, persistencia, generación, Phaser, Canvas 2D ni configuraciones jugables.

El ZIP de entrada conserva un comportamiento heredado de CRLF/LF que puede hacer que `git status` marque archivos sin diferencias reales. La entrega completa canónica se reconstruye desde `git archive` del HEAD base y superpone únicamente estos cinco archivos para que Git muestre solo los cambios reales de P7.5.
