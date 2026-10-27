# Git / GitHub — pasos

## Error 403 al hacer push
Casi siempre es que el usuario con el que haces push no es colaborador del repo `davis-pacman/Integrador1-E-commerce`, o Windows guardó credenciales de otra cuenta.
1. El dueño (Davis): Settings → Collaborators → Add people (a cada integrante).
2. Quien recibe el error: Panel de control → Administrador de credenciales → borrar `git:https://github.com` y volver a hacer push (pedirá login; usa un Personal Access Token con permiso `repo`).
3. Alternativa sin permisos de escritura: Fork → rama → Pull Request.

## Subir el programa de escritorio
Dentro de este mismo repo, en una carpeta `desktop/` (o repo aparte `skyairline-desktop`):
```bash
git checkout -b desktop-inicial
mkdir desktop && cp -r <carpeta-del-proyecto-java>/* desktop/
git add desktop && git commit -m "Agrega programa de escritorio (Java/Swing)"
git push -u origin desktop-inicial   # y abrir Pull Request
```
Incluye un `.gitignore` con `target/`, `logs/`, `config.properties`.

## Que todos participen (de verdad)
Cada integrante hace sus propios commits con su propia cuenta (`git config user.name/user.email`), en ramas por tarea (`feature/tests-baggage`, `feature/export-excel`...) y abre Pull Requests que otro revisa. No reescribas autorías: la rúbrica se evalúa con el historial real.
