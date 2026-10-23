# Pragma-git Automated Test Suite

This framework provides automated test suites for Pragma-git, organized into modular categories under `non_gui/`.

Each subfolder contains its own independent `_run_tests` script that **only runs tests within that specific directory**. The root `_run_tests` runner (as well as `automated-tests/_run_tests`) executes all categories sequentially and displays an aggregated report.

---

> [!IMPORTANT]
> **Coding Standard**: Always write code comments, documentation, and variable/function names in **American English**.

---

## Directory Structure

```text
automated-tests/
├── _run_tests                                  # Master test runner (all categories)
├── README.md                                   # Documentation
└── non_gui/
    ├── ssh/                                    # SSH Integration
    │   ├── _run_tests                          # Runs SSH tests only
    │   ├── test_01_ssh_login.sh
    │   ├── test_02_ssh_folder_validation.sh
    │   ├── test_03_ssh_mkdir.sh
    │   ├── test_04_ssh_git_client.sh
    │   ├── test_05_ssh_put_get.sh
    │   └── test_06_ssh_lib_node.js
    │
    ├── utils/                                  # Utility Module (util_module.js)
    │   ├── _run_tests                          # Runs utils tests only
    │   ├── test_01_string_and_array.js
    │   └── test_02_parsing_and_filtering.js
    │
    ├── git_client/                             # Git Engine & Retry Logic
    │   ├── _run_tests                          # Runs git_client tests only
    │   ├── test_01_simple_git_retry.js
    │   └── test_02_conflict_markers.sh
    │
    ├── credentials/                            # Credentials & Secrets
    │   ├── _run_tests                          # Runs credentials tests only
    │   ├── test_01_secrets_keytar.js
    │   └── test_02_credentials_lib_safe.js
    │
    ├── git_configs/                            # Git Config Templates
    │   ├── _run_tests                          # Runs git_configs tests only
    │   └── test_01_git_config_syntax.sh
    │
    ├── apis/                                   # Git Provider REST APIs
    │   ├── _run_tests                          # Runs APIs tests only
    │   ├── test_01_provider_url_translation.js
    │   ├── test_02_live_provider_query.js
    │   ├── test_03_provider_classes.js
    │   ├── test_04_ci_status.js                # CI status parsing (mocked, offline)
    │   └── test_05_live_ci_status.js           # CI status for known success/failure commits (live; GITLAB_TOKEN optional)
    │
    └── app_function_calls/                     # App Core Logic Functions (from app.js)
        ├── _run_tests                          # Runs app_function_calls tests only
        ├── test_01_repo_settings.js
        └── test_02_history_message.js
```

---

## Running the Tests

### 1. Run all categories (from project root or `automated-tests/`)
```bash
./_run_tests

# Or with verbose real-time output:
./_run_tests -v
```

### 2. Run a specific category
Navigate to the desired subdirectory and execute its local `_run_tests`:
```bash
# Example: Run only utils tests
cd automated-tests/non_gui/utils && ./_run_tests

# Example: Run only git_client tests
cd automated-tests/non_gui/git_client && ./_run_tests

# Example: Run only SSH tests
cd automated-tests/non_gui/ssh && ./_run_tests
```

### 3. Help Text
All test runners provide built-in help flags using `cliHelpLine`:
```bash
./_run_tests --help
automated-tests/non_gui/ssh/_run_tests --help
automated-tests/non_gui/utils/_run_tests --help
```
