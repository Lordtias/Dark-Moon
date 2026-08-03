# ENTREGA P5.3 — EXPANSIÓN AMBIENTAL PHASER A TODOS LOS BIOMAS

Proyecto: Dark Moon  
Plan: Integración progresiva de Phaser, beta y Electron  
Etapa: P5.3 — Expansión ambiental a todos los mapas  
Base usada: `f1ca6cca319229cfb1c4cb0b91307d5441d74ea0`  
Estado: Entregada, pendiente de validación y commit del usuario

---

## 1. Conclusión sencilla

### Qué se hizo

Se extendió Phaser para que no dependa de un único piso por mapa y para que todos los biomas actuales tengan una configuración ambiental propia.

### Por qué se hizo

P5.1 validó Alcantarilla y P5.2 preparó el contrato técnico de entidades. Faltaba que el sistema cenital pudiera escalar a Ciudad y al resto de mapas sin reescribir la lógica de vecindad ni atar el render a un solo bioma.

### Conclusión final

P5.3 quedó resuelta a nivel técnico y ambiental:

- Ciudad puede renderizar varios tipos de suelo según el símbolo lógico de cada casilla;
- todos los biomas existentes tienen recursos cenitales ambientales propios;
- las paredes siguen usando el mismo análisis genérico de vecindad aprobado en P5.1;
- no se modificó la lógica canónica de mapas, combate, IA, conectividad o persistencia.

### Qué falta para cerrar P5 completa

Aún faltan los PNG cenitales definitivos de entidades que vas a incorporar en un commit aparte `P5.3Especial`. La validación integral de todo P5 quedará para P5.4.

---

## 2. Cambios principales

### 2.1 Nuevo resolutor gráfico de terrenos

Se creó:

- `src/interfaz/graficos/mapas/ResolutorTerrenosMapa.js`

Responsabilidades:

- resolver si una casilla es pared o suelo;
- elegir recursos visuales por símbolo de terreno;
- soportar mapas con múltiples suelos dentro de la misma matriz;
- exponer un predicado reutilizable de pared para el autotiling.

### 2.2 Compositor Phaser actualizado

Se modificó:

- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`

Ahora Phaser:

- precarga recursos ambientales por terreno real;
- resuelve el piso visual por símbolo de casilla;
- conserva el autotiling de paredes aprobado en P5.1;
- usa el mismo predicado de pared tanto para muros como para sombras de contacto sobre el suelo.

### 2.3 Configuración visual por bioma

Se modificaron:

- `src/config/mapas/CiudadInicial.json`
- `src/config/mapas/mapas.json`

Se agregaron configuraciones Phaser para:

- Ciudad;
- Cementerio;
- Casa del Guerrero;
- Fortaleza abandonada;
- Sala de guerra.

Cada bioma ahora define:

- variaciones de suelo;
- masa de pared;
- borde expuesto;
- esquina interior;
- sombra de contacto;
- colores de cuadrícula, decoración, sombras e iluminación.

### 2.4 Nuevos PNG ambientales

Se agregaron familias de recursos cenitales en:

- `assets/imagenes/mundo/ciudad/cenital/`
- `assets/imagenes/mundo/cementerio/cenital/`
- `assets/imagenes/mundo/casa_guerrero/cenital/`
- `assets/imagenes/mundo/fortaleza_abandonada/cenital/`
- `assets/imagenes/mundo/sala_guerra/cenital/`

Se conservaron y reutilizaron los recursos cenitales de Alcantarilla ya validados en P5.1.

### 2.5 Documentación actualizada

Se modificaron:

- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

Además se agregó este documento:

- `docs/phaser/entregas/ENTREGA_P5_3.md`

---

## 3. Validaciones realizadas

### Validación técnica

Resultado: **Correcto**

Se comprobó mediante script:

- carga y parseo de `CiudadInicial.json` y `mapas.json`;
- resolución correcta de `#`, `.`, `,`, `=` y `:` en Ciudad;
- compatibilidad del nuevo predicado de pared con `resolverCasillaParedAutotiling` y `resolverCasillaSueloAutotiling`;
- existencia de configuración Phaser de suelo y pared en todos los biomas.

### Validación de PNG ambientales

Resultado: **Correcto**

Se comprobó que todos los PNG nuevos de biomas:

- existan;
- tengan tamaño `32 × 32`;
- puedan ser leídos correctamente.

### Validación de formato sobre archivos modificados en P5.3

Resultado: **Correcto**

Se ejecutó `git diff --check` sobre los archivos modificados específicamente en esta etapa y no se detectaron errores de espacios en blanco o formato.

---

## 4. Archivos modificados o agregados por P5.3

### Modificados

- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `src/config/mapas/CiudadInicial.json`
- `src/config/mapas/mapas.json`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`

### Agregados

- `src/interfaz/graficos/mapas/ResolutorTerrenosMapa.js`
- `docs/phaser/entregas/ENTREGA_P5_3.md`
- recursos PNG ambientales de los cinco biomas nuevos indicados arriba.

---

## 5. Lo que no se tocó

No se cambiaron:

- generación procedural;
- conectividad;
- IA;
- reglas de ocupación;
- combate;
- persistencia;
- dominio de entidades;
- `recursoVisual` de jugador, enemigos, barril, botín o NPC.

---

## 6. Estado respecto a la siguiente subetapa

### P5.3

Estado: **Lista para tu validación y commit**

### P5.3Especial

Queda a tu cargo incorporar los PNG cenitales definitivos de entidades.

### P5.4

Quedará para:

- revisar los nuevos PNG de entidades;
- ajustar Phaser si hace falta;
- validar integralmente todo P5.

---

## 7. Commit sugerido

```text
feat(phaser): expand cenital biome terrain rendering across all maps
```
