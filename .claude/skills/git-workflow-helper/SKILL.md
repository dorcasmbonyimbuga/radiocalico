---
name: git-workflow-helper
description: Règles Git obligatoires du projet Radio Calico. À appliquer AVANT toute modification de code (création de branche feature/), AVANT tout commit (npm test à 100 %, message Conventional Commits) et pendant chaque édition (aucun reformatage global). Utiliser dès que la tâche consiste à coder, corriger, refactorer, committer ou pousser dans ce dépôt.
---

# Git workflow helper — Radio Calico

Quatre règles non négociables. Si l'une d'elles ne peut pas être respectée, **s'arrêter et le signaler à l'utilisateur** au lieu de la contourner.

## 1. Toujours travailler sur une branche `feature/`

Avant la première modification de fichier :

```bash
git status -sb          # arbre propre ? sur quelle branche ?
git switch main && git pull --ff-only
git switch -c feature/<description-courte-en-kebab-case>
```

- Ne jamais modifier de code directement sur `main`.
- Si une branche `feature/...` adaptée à la tâche est déjà active, continuer dessus.
- Si l'arbre de travail contient des modifications non commitées qui ne sont pas les vôtres, demander à l'utilisateur quoi en faire (ne pas les écraser, ne pas les stasher sans accord).
- Nommage : `feature/<sujet>` (ex. `feature/system-info-endpoint`). Les correctifs suivent la même règle : `feature/fix-<sujet>`.

## 2. `npm test` doit passer à 100 % avant tout commit

```bash
npm test
```

- Lire le résumé final : `ℹ fail 0` et `ℹ cancelled 0` sont obligatoires. Un seul échec bloque le commit.
- Un échec au niveau d'un fichier entier (`'test failed'` sans sous-test en échec) compte aussi comme un échec : relancer, et s'il persiste, l'investiguer.
- Interdit pour faire passer les tests : `it.skip`, `it.todo`, supprimer ou affaiblir une assertion, commenter un test, `git commit --no-verify`.
- Tout nouveau comportement est accompagné de tests dans `test/`.
- Annoncer le résultat à l'utilisateur (nombre de tests réussis / échoués) avant de committer.

## 3. Messages de commit au format Conventional Commits

```
<type>(<portée optionnelle>): <description à l'impératif, en minuscule, sans point final>

<corps optionnel : le pourquoi, lignes ≤ 72 caractères>

<pied optionnel : BREAKING CHANGE: ..., Refs #12>
```

- Types autorisés : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Portées usuelles du projet : `api`, `db`, `ui`, `player`, `ratings`, `messages`, `docker`, `ci`, `deps`.
- Rupture de compatibilité : `!` après le type/la portée (`feat(api)!: ...`) **et** un pied `BREAKING CHANGE:`.
- Langue : anglais, comme l'historique existant (`feat(api): add GET /api/info system info endpoint`).
- Un commit = un changement logique. Ne pas mélanger correctif, fonctionnalité et refactoring.
- Ajouter les fichiers explicitement (`git add <fichiers>`), jamais `git add -A` à l'aveugle ; relire `git diff --staged` avant de committer.

## 4. Aucun reformatage global de fichier

- Modifier uniquement les lignes nécessaires à la tâche. Le diff doit se limiter au changement demandé.
- Interdit : lancer Prettier/ESLint `--fix`/un formateur sur un fichier ou un dossier entier, réindenter, réordonner les imports, changer les guillemets, les points-virgules ou les fins de ligne de code non concerné.
- Respecter le style existant du fichier (indentation 2 espaces, guillemets simples, ESM) même s'il diffère d'une préférence personnelle.
- Fins de ligne : `.gitattributes` impose LF (`* text=auto eol=lf`) ; ne pas convertir de fichiers.
- Contrôle avant commit : `git diff --staged --stat` puis `git diff --staged`. Si un fichier montre bien plus de lignes modifiées que prévu, ou des lignes changées uniquement par des espaces (`git diff --staged -w` beaucoup plus court que `git diff --staged`), annuler ces changements parasites avant de committer.
- Si un reformatage paraît réellement utile, le proposer à l'utilisateur comme tâche séparée (commit `style: ...` dédié), ne jamais le faire de sa propre initiative.

## Check-list avant chaque commit

1. Sur une branche `feature/...` (`git branch --show-current`).
2. `npm test` → `fail 0`.
3. `git diff --staged` limité au changement demandé, sans reformatage.
4. Message au format Conventional Commits.

Pousser la branche et ouvrir une pull request vers `main` uniquement quand l'utilisateur le demande.
