# Pragma-git Automated Test Suite

Detta ramverk tillhandahåller automatiserade regressionstester för Pragma-git, uppdelat i icke-grafiska (headless/CLI) tester och framtida GUI-tester.

## Katalogstruktur

```text
automated-tests/
├── _run_tests                  # Huvudskript för testexekvering
├── README.md                   # Dokumentation och instruktioner
└── non_gui/                    # Icke-grafiska integrationstester
    └── ssh/                    # SSH-specifika funktioner och verktyg
        ├── test_01_ssh_login.sh              # Inloggning, nyckelavvisning, felhantering
        ├── test_02_ssh_folder_validation.sh  # Mapp- och repovalidering (.git)
        ├── test_03_ssh_mkdir.sh              # Katalogskapande på servern (inkl. mellanslag)
        ├── test_04_ssh_git_client.sh         # Fjärr-git (init, status, add, commit, log, branch)
        ├── test_05_ssh_put_get.sh            # Filöverföring (ssh-put och ssh-get)
        └── test_06_ssh_lib_node.js           # Node.js-enhetstester för ssh-folder-lib.js
```

## Köra testerna

Du kan köra testerna från projektets rot eller direkt i `automated-tests/`:

```bash
# Kör alla tester
./_run_tests

# Eller från testkatalogen
cd automated-tests && ./_run_tests

# Filtrera på en viss testsvit (t.ex. bara login eller mkdir)
./_run_tests login
./_run_tests mkdir

# Visa detaljerad/verbose utskrift
./_run_tests --verbose

# Bevara temporära testfiler i /tmp för visuell granskning (städning hoppas över)
./_run_tests --keep
# eller kortform (t.ex. kör bara ssh-git-client och spara repot i /tmp):
./_run_tests -k git
```

## Förutsättningar för SSH-tester

Testerna körs mot `localhost` / `127.0.0.1`:
1. SSH-servern måste vara aktiv lokalt (`System Settings -> Sharing -> Remote Login`).
2. Aktuell användare ska ha lösenordsfri inloggning till `localhost` via SSH-nyckel i `~/.ssh/authorized_keys`.
3. Testerna använder isolerade temporära kataloger i `/tmp` och städar upp efter sig.
