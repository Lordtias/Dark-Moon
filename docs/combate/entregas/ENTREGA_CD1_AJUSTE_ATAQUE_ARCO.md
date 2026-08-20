# ENTREGA CD1 — Ajuste de iconografía y etapa de carga del ataque básico

## Alcance

Ajuste incremental sobre CD1 para mejorar la lectura visual del arco en dos puntos:

1. Reemplazo del icono del estado táctico **Flecha cargada**.
2. Actualización de la habilidad básica **Atacar** para que refleje visualmente la fase de **carga** antes del disparo cuando el ataque básico usa una acción compuesta.

## Cambios implementados

### 1. Estado táctico Flecha cargada

- Se reemplazó el icono del estado táctico por un recurso dedicado:
  - `assets/imagenes/habilidades/basicas/flecha_cargada_tactica.png`
- La preparación del arco ya no reutiliza el recurso visual de la munición o del arma cuando se trata de flechas.

### 2. Icono de la habilidad básica Atacar

- La barra de habilidades ahora interpreta si el ataque básico actual requiere preparación.
- Mientras el arco todavía **no está cargado**, la habilidad básica **Atacar** muestra:
  - `assets/imagenes/habilidades/basicas/recarga_arco.png`
- Cuando la preparación ya está activa, el icono vuelve al recurso actual del arco:
  - `assets/imagenes/habilidades/basicas/ataque_arco.png`
- Para el resto de familias que no usan preparación, el comportamiento visual no cambia.

### 3. Refresco canónico de interfaz

- Activar o retirar la preparación del ataque ahora notifica al observador de cambios del jugador.
- Eso permite que la barra de habilidades y los paneles relean el estado canónico y muestren el icono correcto sin duplicar lógica en la UI.

## Archivos modificados/agregados

### Modificados
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`
- `src/juego/acciones/PreparacionAccionesCombatiente.js`
- `src/juego/habilidades/HabilidadesBasicas.js`

### Nuevos
- `assets/imagenes/habilidades/basicas/recarga_arco.png`
- `assets/imagenes/habilidades/basicas/flecha_cargada_tactica.png`

## Validación realizada

- `node --check src/juego/habilidades/HabilidadesBasicas.js`
- `node --check src/juego/acciones/PreparacionAccionesCombatiente.js`
- `node --check src/entidad/destructible/combatiente/ConfiguracionAtaque.js`

## Notas

- No se alteró la lógica temporal 60/40 ni las reglas de munición/preparación aprobadas en CD1.
- No se modificó el daño base del arco ni el contrato de Dispersión/Penetración.
