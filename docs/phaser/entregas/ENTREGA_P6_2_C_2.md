# ENTREGA P6.2C.2 — VARITAS ELEMENTALES Y DOBLE VARITA

Plan: Integración progresiva de Phaser, beta y Electron de Dark Moon  
Etapa: P6.2C.2  
Commit base: `1a3c4f4aa9585e32d5b0d3448af569d746f05a88`  
Estado: Implementada y validada técnicamente; pendiente de prueba manual y commit por el usuario

## 1. Conclusión sencilla

### Qué se analizó

Se revisaron las fuentes de ataque de varitas, los elementos transportados por `EventosAccion`, el orden real de golpes en doble varita, el caso de muerte con el primer golpe, los ataques a casillas vacías y el planificador temporal de P6.2B.1.

### Por qué

Era necesario representar fuego, frío, rayo y veneno sin duplicar reglas de magia ni asumir que siempre existen dos resultados. Una casilla vacía necesita dos proyectiles cuando hay dos varitas, mientras que una muerte con el primer golpe debe impedir visualmente el segundo disparo.

### Conclusión final

La lógica canónica ya entrega mano, elemento y resultados suficientes. P6.2C.2 puede resolverse en presentación mediante perfiles elementales, una secuencia `proyectil_dual` y un creador procedural que no conoce daño, Maná, resistencias ni habilidades.

### Acción correspondiente

Validar manualmente los cuatro elementos, combinaciones duales, fallo, bloqueo, crítico, casilla vacía, muerte con el primer golpe y regresiones; luego cerrar P6.2C.2 antes de iniciar P6.2D.

## 2. Estado inicial

- copia: `/mnt/data/p6_2c2_work/Dark-Moon`;
- `.git`: presente;
- rama: `main`;
- HEAD: `1a3c4f4aa9585e32d5b0d3448af569d746f05a88`;
- estado inicial: limpio y alineado con `origin/main`;
- commit y push: no realizados.

## 3. Alcance implementado

- nueva secuencia visual `proyectil_dual`;
- detección específica de dos fuentes de familia `varita`;
- preparación compartida de canalización;
- proyectil procedural de fuego;
- proyectil procedural de frío;
- proyectil procedural de rayo;
- proyectil procedural de veneno;
- impacto elemental específico por forma;
- orden principal, pausa y secundaria;
- conservación de elemento y mano por fuente;
- críticos integrados en la misma forma elemental;
- desviación lateral opuesta para cada mano cuando falla;
- casilla vacía con uno o dos proyectiles según fuentes;
- supresión del segundo proyectil cuando no existe segundo golpe canónico;
- cierre documental de P6.2C.1 en el SHA confirmado.

## 4. Secuencia simple

La varita simple reutiliza:

```json
{
  "preparacion": 0.40,
  "lanzamiento": 0.15,
  "trayectoria": 0.25,
  "retorno": 0.20
}
```

## 5. Secuencia dual

```json
{
  "preparacion": 0.30,
  "lanzamientoPrincipal": 0.08,
  "trayectoriaPrincipal": 0.13,
  "pausaEntreManos": 0.08,
  "lanzamientoSecundaria": 0.08,
  "trayectoriaSecundaria": 0.13,
  "retorno": 0.20
}
```

Las proporciones suman uno y distribuyen una única duración derivada del `costoFinal` canónico.

## 6. Identidad elemental

| Elemento | Proyectil | Impacto |
|---|---|---|
| Fuego | orbe irregular con brasas | expansión cálida con rayos cortos |
| Frío | fragmento angular | fractura cristalina radial |
| Rayo | núcleo violeta-blanco ramificado | pulso eléctrico quebrado |
| Veneno | gota viscosa con gotas menores | salpicadura tóxica |

Las diferencias no dependen únicamente del color.

## 7. Doble varita

Cada fuente conserva su mano y elemento. Una combinación fuego + frío reproduce:

```text
canalización compartida
→ proyectil de fuego
→ resultado principal
→ pausa proporcional
→ proyectil de frío
→ resultado secundario
→ retorno
```

Dos varitas del mismo elemento producen dos proyectiles separados, no uno fusionado.

## 8. Casilla vacía y muerte temprana

- sin objetivo: se derivan los disparos desde las fuentes y se muestran uno o dos proyectiles sin daño, fallo, bloqueo ni crítico ficticios;
- con objetivo destruido por la mano principal: `SistemaCombate` conserva un solo golpe y el reproductor genera un solo proyectil;
- no se inventan golpes para completar visualmente la cantidad programada.

## 9. Crítico

El crítico no agrega una estrella independiente. Intensifica el mismo proyectil e impacto mediante mayor escala y presencia visual, conservando el número de daño y la palabra `CRÍTICO`.

## 10. Archivo agregado

```text
src/interfaz/graficos/phaser/CreadorProyectilesElementalesPhaser.js
```

Responsabilidad:

- interpretar perfiles visuales de elemento;
- crear proyectiles, canalización e impactos temporales;
- no conocer daño, Maná, resistencias, inventario, habilidades ni nombres de armas.

## 11. Archivos principales modificados

```text
src/config/presentacion/PerfilesAtaquePorFamilia.json
src/interfaz/graficos/ContextoPerfilesAtaquePorFamilia.js
src/interfaz/graficos/ValidadorPerfilesAtaquePorFamilia.js
src/interfaz/graficos/PlanificadorRitmoVisual.js
src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
README.md
docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
docs/phaser/entregas/ENTREGA_P6_2_C_1.md
```

## 12. Fuera de alcance

- habilidades mágicas;
- áreas y muros;
- quemadura, congelamiento, aturdimiento o envenenamiento temáticos;
- iluminación dinámica elemental;
- sonidos;
- diferencias visuales por tier de varita;
- equipamiento visible permanente;
- consumibles y recuperación;
- botín inmediato.

## 13. Pruebas manuales necesarias

1. varita de fuego simple;
2. varita de frío simple;
3. varita de rayo simple;
4. varita de veneno simple;
5. disparos cardinales y diagonales;
6. alcance corto y máximo;
7. casilla vacía con una varita;
8. impacto, fallo, bloqueo y crítico por elemento;
9. muerte por varita simple;
10. fuego + fuego;
11. fuego + frío;
12. rayo + veneno;
13. principal impacta y secundaria falla;
14. principal falla y secundaria impacta;
15. primer proyectil mata al objetivo y no aparece el segundo;
16. casilla vacía con dos varitas;
17. confirmar consumo canónico de Maná sin cambios;
18. regresión de arco, lanza, cuerpo a cuerpo y ataque natural;
19. regresión `?render=canvas2d`;
20. consola sin errores.

## 14. Validaciones técnicas realizadas

| Verificación | Resultado |
|---|---|
| Perfiles elementales | fuego, frío, rayo y veneno configurados |
| Secuencia simple | `proyectil` conservada |
| Secuencia dual | `proyectil_dual` suma 1 |
| Plan simple | una varita selecciona `proyectil` |
| Plan dual | dos varitas seleccionan `proyectil_dual` |
| Casilla vacía dual | dos disparos derivados de fuentes |
| Muerte con primer golpe | un solo disparo derivado de golpes reales |
| Formas procedurales | cuatro proyectiles e impactos creados con dobles Phaser |
| Daño/Maná/tiempo | sin fórmulas nuevas |
| Dependencias | ninguna nueva |

La validación visual interactiva final queda pendiente del navegador del usuario.

## 15. Enlace para la siguiente etapa

La siguiente etapa recomendada es P6.2D: consumibles, recuperación visual genérica y cierre global de P6.2. Debe representar Vida, Maná y futuros recursos usando cantidades realmente aplicadas, sin recalcular consumo ni recuperación en Phaser.

## 16. Validaciones finales reproducibles

| Verificación | Resultado |
|---|---|
| JavaScript de producción | 175 archivos correctos |
| JSON | 22 archivos válidos |
| Imports relativos | 388 referencias; ninguna ausente |
| Validador sin veneno | rechazo correcto |
| Secuencia dual con suma incorrecta | rechazo correcto |
| Recursos HTTP | entradas principales con código 200 |
| `git diff --check` | sin errores |
| Archivos prohibidos | ninguno |
| Chromium headless | no completó el arranque dentro del entorno |

## 17. Estado Git de la copia entregada

```text
Ruta: /mnt/data/p6_2c2_work/Dark-Moon
.git: presente
Rama: main
HEAD base: 1a3c4f4aa9585e32d5b0d3448af569d746f05a88
Estado: 9 archivos modificados y 2 agregados
Commit: no realizado
Push: no realizado
```

## Ajuste de validación posterior

Tras la primera prueba manual se refinó la lectura visual de dos elementos sin alterar combate, Maná, tiempo ni secuencias:

- **Rayo:** el proyectil dejó de representarse como un núcleo y ahora se muestra como una descarga fina en zig-zag que conecta al atacante con el objetivo; en crítico se vuelve un poco más gruesa y luminosa.
- **Veneno:** el proyectil dejó de ser un orbe redondo parecido al fuego y ahora se representa como una gota tóxica alargada, con una salpicadura diferenciada en el impacto.
