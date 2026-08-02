# GUÍA — REEMPLAZAR P5.2R EN `main` SIN PERDERLO

Esta copia ya contiene dos referencias locales:

```text
main             → P4 + cambios nuevos sin confirmar
respaldo-p5-2r   → 1140843, implementación anterior de P5
```

GitHub continúa apuntando a `1140843`. No publicar hasta terminar las pruebas manuales.

## 1. Verificar el estado

```bash
git branch --show-current
git status
git log --oneline --decorate -5
git show --oneline --no-patch respaldo-p5-2r
```

La rama activa debe ser `main` y `respaldo-p5-2r` debe mostrar `1140843`.

## 2. Publicar primero el respaldo

```bash
git push origin respaldo-p5-2r
```

Esto conserva la implementación anterior en GitHub antes de modificar `main`.

## 3. Confirmar la nueva implementación

Solo después de aprobar las pruebas:

```bash
git add .
git commit -m "feat(render): reconstruir P5 con arquitectura modular y puertas"
```

## 4. Revisar la historia resultante

```bash
git log --oneline --decorate --graph --all -8
```

Debe verse:

```text
main: P4 → nuevo commit de P5
respaldo-p5-2r: 1140843
```

## 5. Reemplazar `main` remoto de forma protegida

```bash
git fetch origin
git push --force-with-lease origin main
```

`--force-with-lease` reemplaza el último commit de `main` únicamente si el remoto continúa en el estado esperado. Si otra persona publicó un cambio, Git rechazará la operación en lugar de sobrescribirlo.

## 6. Verificación final

```bash
git status
git branch -vv
git log --oneline --decorate --graph --all -8
```

No utilizar `git clean`, `git reset --hard` ni un `push --force` simple durante este procedimiento.
