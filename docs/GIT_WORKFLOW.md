# Git and GitHub workflow (Week 11)

This is the workflow the group follows. **Everything in the history must be real work done by the person who commits it**:
both members need commits showing design, programming, testing and documentation.

## 1. Repository

- Suggested name: `appointease-itdi110`. One repository, both members as collaborators.
- Layout follows the Week 11 lecture: `README.md`, `.gitignore`, source folders, `tests/`, `docs/`.
- `.gitignore` already excludes `node_modules/`, `.DS_Store` and `*.log`.

## 2. Commit messages

Short, in the imperative, saying *what changed*. One idea per commit.

Good: `Add Validator with regex rules for name, email, phone and date`
Good: `Make StorageService restore all-or-nothing`
Good: `Fix lost first click by reserving space for field errors`
Avoid: `update`, `stuff`, `final version`, `fix`

## 3. Branches

`main` always works. New work happens on a branch and is merged back after the partner has looked at it.

| Branch | What it contains | Suggested owner |
|--------|------------------|-----------------|
| `feature/bank-services` | Services menu for the bank, staff role, wording | *(choose)* |
| `feature/regex-validation` | `Validator`, `ValidationError`, field messages | *(choose)* |
| `feature/error-handling` | `AppError` classes, `#run()`, global handler | *(choose)* |
| `feature/json-storage` | `toJSON`/`fromJSON`, `StorageService`, backup and restore | *(choose)* |
| `feature/unit-tests` | `TestRunner`, test files, `tests.html` | *(choose)* |
| `docs/checkpoint3` | README, walkthroughs, Checkpoint 3 document | *(choose)* |

Change owners to match who really does the work, and swap who reviews so each of you reviews the other.

## 4. Commands, step by step

```bash
# once
git clone https://github.com/<owner>/appointease-itdi110.git
cd appointease-itdi110

# start a piece of work
git checkout main
git pull
git checkout -b feature/regex-validation

# work, then save in small steps
git status
git add models/Validator.js models/ValidationError.js
git commit -m "Add Validator with regex rules for name, email, phone and date"

# share the branch
git push -u origin feature/regex-validation
```

On GitHub: **Compare & pull request** -> your partner reads it, comments and **approves** -> **Merge pull request**
(use a merge commit so the branch stays visible in the history). Then:

```bash
git checkout main
git pull
git branch -d feature/regex-validation
```

Merge locally instead (if you prefer):

```bash
git checkout main
git merge --no-ff feature/regex-validation -m "Merge feature/regex-validation"
git push
```

**Merge conflict?** Git marks the clash with `<<<<<<<`, `=======` and `>>>>>>>` in the file. Open it, keep the right
lines, delete the markers, then `git add <file>` and `git commit`. Do this once on purpose in a test branch so you know how.

## 5. Tag a checkpoint

```bash
git tag -a checkpoint-3 -m "Checkpoint 3: validation, JSON, error handling, tests"
git push origin checkpoint-3
```

## 6. Evidence to collect for the Checkpoint 3 document

- [ ] Repository link.
- [ ] Screenshot of `git log --oneline --graph --decorate --all` showing branches and merges.
- [ ] Screenshot of GitHub **Insights -> Contributors** (or the commits page) showing both members.
- [ ] At least one merged pull request with a review comment from the other member.
- [ ] The commit table in section 12 of the document (hash, author, message, what it did).
