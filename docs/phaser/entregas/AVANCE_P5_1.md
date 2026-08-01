# AVANCE P5.1 — SOPORTE REAL DE MAPAS EN PHASER

Proyecto: Dark Moon  
Etapa: P5 — Mundo jugable y mapas grandes  
Bloque: P5.1 — Soporte real de mapas en Phaser  
Estado: **Implementado, pendiente de validación manual**  
Fecha: 1 de agosto de 2026

---

## 1. Conclusión sencilla

P5.1 elimina la suposición visual de que Phaser solamente conoce `#` como pared y un único suelo para todos los demás símbolos.

Ahora cada símbolo del mapa se resuelve mediante `apariencia.terrenos` y puede recibir recursos, decoración y opacidad de grilla propios desde `apariencia.phaser.terrenos`.

Los cinco mapas procedurales y la Ciudad Inicial comparten el mismo contrato. La ciudad conserva visualmente mampostería, adoquín, césped, madera y tierra. Las reglas de movimiento, conectividad y ocupación no fueron modificadas.

P5 todavía no está cerrada. P5.2 debe crear e integrar los tiles PNG detallados por bioma y después validar el flujo jugable completo.

---

## 2. Estado inicial

- copia local: `/mnt/data/darkmoon_p5/repo/Dark-Moon`;
- directorio `.git`: presente;
- rama: `main`;
- HEAD base: `d7f0bf618a0dba43fd55723a7260a33b4bdbc91f`;
- estado inicial: limpio y alineado con `origin/main`;
- commit y push: no realizados.

---

## 3. Arquitectura implementada

```text
Matriz canónica del mapa
          ↓
Símbolo de la casilla
          ↓
apariencia.terrenos
(tipo, color y detalle visual)
          ↓
apariencia.phaser.terrenos
(recursos y efectos opcionales)
          ↓
ResolutorTerrenosPhaser
          ↓
CompositorMundoPhaser
          ↓
Representación Phaser
```

`ResolutorTerrenosPhaser` es exclusivamente visual. No decide:

- caminabilidad;
- conectividad;
- ocupación;
- movimiento;
- combate;
- IA;
- persistencia.

---

## 4. Resultado por mapa

- **Alcantarilla:** conserva sus PNG actuales y adopta el contrato común por símbolos.
- **Cementerio:** dispone de configuración visual Phaser propia y queda preparado para sus PNG.
- **Casa del Guerrero:** dispone de configuración visual Phaser propia y queda preparada para sus PNG.
- **Fortaleza abandonada:** dispone de configuración visual Phaser propia y queda preparada para sus PNG.
- **Sala de guerra:** dispone de configuración visual Phaser propia y queda preparada para sus PNG.
- **Ciudad Inicial:** diferencia `#`, `.`, `,`, `=` y `:` mediante el mismo compositor.

---

## 5. Archivos agregados

### `src/interfaz/graficos/phaser/ResolutorTerrenosPhaser.js`

- resuelve tipo, color, detalle, recursos y configuración Phaser por símbolo;
- reúne los recursos necesarios para la precarga;
- permite que futuros símbolos de pared utilicen la clasificación existente;
- conserva respaldos cuando no existe un PNG.

### `src/juego/configuracion/ValidadorAparienciaMapa.js`

- centraliza la validación del contrato visual común;
- valida configuraciones Phaser opcionales sin convertirlas en reglas jugables;
- es reutilizado por los mapas procedurales y la Ciudad Inicial.

### `docs/phaser/entregas/AVANCE_P5_1.md`

Registra el bloque sin declarar cerrada la etapa P5.

---

## 6. Archivos modificados

- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`;
- `src/juego/configuracion/ValidadorConfiguracionMapas.js`;
- `src/juego/configuracion/ConfiguracionCiudad.js`;
- `src/config/mapas/mapas.json`;
- `src/config/mapas/CiudadInicial.json`;
- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`.

---

## 7. Validaciones realizadas

### Correctas

- JSON válido para las cinco plantillas y la Ciudad Inicial;
- contrato visual validado para `#` y `.` en todos los mapas procedurales;
- contrato visual validado para los cinco símbolos de la ciudad;
- resolución correcta de paredes y suelos sin depender exclusivamente de `#`;
- precarga de los diez recursos ambientales existentes de Alcantarilla;
- composición simulada de los tamaños máximos de los cinco mapas;
- composición simulada de la Ciudad Inicial de 28 × 18;
- copia profunda de la apariencia de la ciudad sin modificar la configuración original;
- sintaxis de los módulos modificados comprobada mediante el motor JavaScript del navegador;
- rutas relativas e imágenes configuradas validadas;
- `git diff --check` sin errores de contenido.

### Pendiente

La ejecución interactiva en navegador continúa bloqueada en este entorno con `ERR_BLOCKED_BY_ADMINISTRATOR`. No se afirma haber realizado aquí una partida manual.

Debe comprobarse en el equipo del usuario:

- inicio con `?render=phaser`;
- ciudad;
- cada una de las cinco mazmorras;
- cámara y zoom;
- movimiento y espera;
- selección;
- combate y habilidades;
- interactuables y portales;
- transición entre mapas;
- guardado y carga;
- regresión de Canvas 2D.

---

## 8. Dependencias

- Phaser: 4.2.1, sin cambios;
- dependencias nuevas: ninguna;
- Node.js, npm y Electron: no utilizados;
- recursos PNG nuevos: ninguno en P5.1.

---

## 9. Pendiente para P5.2

- crear los tiles detallados por bioma;
- dividirlos en archivos utilizables por el juego;
- declarar sus rutas en la configuración ya preparada;
- comprobar legibilidad táctica y repetición visual;
- validar todos los mapas dentro del juego;
- crear `docs/phaser/entregas/ENTREGA_P5.md`;
- proponer el Conventional Commit final de P5.
