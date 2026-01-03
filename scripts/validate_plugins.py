#!/usr/bin/env python3
"""Validate plugin integrity - unique IDs, valid manifests, directory structure.

This script is run during CI to ensure:
1. All plugin IDs are unique
2. Plugin IDs match their directory names
3. All manifest.json files are valid
4. Required files exist (__init__.py, manifest.json)
5. Tests directory exists (warning if missing)

Usage:
    python scripts/validate_plugins.py [OPTIONS]

Options:
    --strict        Fail on warnings (missing tests, etc.)
    --verbose       Show detailed output
    --plugin=ID     Validate specific plugin only

Exit codes:
    0 - All validations passed
    1 - Validation errors found
    2 - Configuration/setup error
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Project paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PLUGINS_DIR = PROJECT_ROOT / "plugins"

# Directories to skip
SKIP_DIRECTORIES = {"_template", "__pycache__"}


class ValidationResult:
    """Result of validating a single plugin."""
    
    def __init__(self, plugin_id: str):
        self.plugin_id = plugin_id
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0
    
    def add_error(self, message: str):
        self.errors.append(message)
    
    def add_warning(self, message: str):
        self.warnings.append(message)
    
    def __str__(self):
        status = "PASS" if self.is_valid else "FAIL"
        return f"{self.plugin_id}: {status}"


def discover_plugin_directories() -> List[Path]:
    """Discover all plugin directories.
    
    Returns:
        List of paths to plugin directories
    """
    plugins = []
    
    if not PLUGINS_DIR.exists():
        return plugins
    
    for item in PLUGINS_DIR.iterdir():
        if not item.is_dir():
            continue
        if item.name in SKIP_DIRECTORIES:
            continue
        if item.name.startswith("."):
            continue
        plugins.append(item)
    
    return sorted(plugins, key=lambda p: p.name)


def load_manifest(plugin_dir: Path) -> Tuple[Optional[Dict], Optional[str]]:
    """Load a plugin's manifest.json.
    
    Returns:
        Tuple of (manifest_dict, error_message)
    """
    manifest_path = plugin_dir / "manifest.json"
    
    if not manifest_path.exists():
        return None, f"manifest.json not found in {plugin_dir.name}"
    
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON in manifest.json: {e}"
    except Exception as e:
        return None, f"Failed to read manifest.json: {e}"


def validate_manifest_schema(manifest: Dict, plugin_dir_name: str) -> List[str]:
    """Validate manifest against required schema.
    
    Returns:
        List of error messages
    """
    errors = []
    
    # Required fields
    required_fields = ["id", "name", "version"]
    for field in required_fields:
        if field not in manifest:
            errors.append(f"Missing required field: {field}")
    
    if errors:
        return errors
    
    # Validate ID format
    plugin_id = manifest.get("id", "")
    if not plugin_id:
        errors.append("Plugin id cannot be empty")
    elif not plugin_id[0].islower() or not plugin_id[0].isalpha():
        errors.append("Plugin id must start with a lowercase letter")
    elif not all(c.islower() or c.isdigit() or c == '_' for c in plugin_id):
        errors.append("Plugin id must contain only lowercase letters, numbers, and underscores")
    
    # Validate ID matches directory name
    if plugin_id != plugin_dir_name:
        errors.append(f"Plugin id '{plugin_id}' does not match directory name '{plugin_dir_name}'")
    
    # Validate version format (semantic versioning)
    version = manifest.get("version", "")
    if version:
        parts = version.split(".")
        if len(parts) != 3:
            errors.append("Version must be in format X.Y.Z (semantic versioning)")
        else:
            for part in parts:
                if not part.isdigit():
                    errors.append("Version parts must be integers")
                    break
    
    # Validate settings_schema if present
    settings = manifest.get("settings_schema", {})
    if settings and not isinstance(settings, dict):
        errors.append("settings_schema must be an object")
    
    # Validate env_vars if present
    env_vars = manifest.get("env_vars", [])
    if not isinstance(env_vars, list):
        errors.append("env_vars must be an array")
    else:
        for i, env_var in enumerate(env_vars):
            if not isinstance(env_var, dict):
                errors.append(f"env_vars[{i}] must be an object")
            elif "name" not in env_var:
                errors.append(f"env_vars[{i}] missing required field: name")
    
    # Validate variables if present
    variables = manifest.get("variables", {})
    if variables and not isinstance(variables, dict):
        errors.append("variables must be an object")
    
    # Validate max_lengths if present
    max_lengths = manifest.get("max_lengths", {})
    if max_lengths:
        if not isinstance(max_lengths, dict):
            errors.append("max_lengths must be an object")
        else:
            for key, value in max_lengths.items():
                if not isinstance(value, int) or value < 1:
                    errors.append(f"max_lengths.{key} must be a positive integer")
    
    # Validate icon if present
    icon = manifest.get("icon", "")
    if icon and not isinstance(icon, str):
        errors.append("icon must be a string")
    
    # Validate category if present
    valid_categories = ["data", "transit", "weather", "entertainment", "utility", "home"]
    category = manifest.get("category", "")
    if category and category not in valid_categories:
        errors.append(f"category must be one of: {', '.join(valid_categories)}")
    
    return errors


def validate_plugin_structure(plugin_dir: Path) -> Tuple[List[str], List[str]]:
    """Validate plugin directory structure.
    
    Returns:
        Tuple of (errors, warnings)
    """
    errors = []
    warnings = []
    
    # Required files
    required_files = ["__init__.py", "manifest.json"]
    for filename in required_files:
        if not (plugin_dir / filename).exists():
            errors.append(f"Missing required file: {filename}")
    
    # Recommended files
    if not (plugin_dir / "README.md").exists():
        warnings.append("Missing recommended file: README.md")
    
    # Tests directory
    tests_dir = plugin_dir / "tests"
    if not tests_dir.exists():
        warnings.append("Missing tests/ directory - tests are required for new plugins")
    else:
        # Check for test files
        test_files = list(tests_dir.glob("test_*.py"))
        if not test_files:
            warnings.append("No test files (test_*.py) found in tests/ directory")
    
    return errors, warnings


def validate_plugin(plugin_dir: Path) -> ValidationResult:
    """Validate a single plugin.
    
    Returns:
        ValidationResult with errors and warnings
    """
    result = ValidationResult(plugin_dir.name)
    
    # Validate structure
    structure_errors, structure_warnings = validate_plugin_structure(plugin_dir)
    for error in structure_errors:
        result.add_error(error)
    for warning in structure_warnings:
        result.add_warning(warning)
    
    # Load and validate manifest
    manifest, load_error = load_manifest(plugin_dir)
    if load_error:
        result.add_error(load_error)
        return result
    
    # Validate manifest schema
    schema_errors = validate_manifest_schema(manifest, plugin_dir.name)
    for error in schema_errors:
        result.add_error(error)
    
    return result


def validate_unique_ids(plugins: List[Path]) -> List[str]:
    """Check that all plugin IDs are unique.
    
    Returns:
        List of error messages for duplicate IDs
    """
    errors = []
    id_to_dirs: Dict[str, List[str]] = {}
    
    for plugin_dir in plugins:
        manifest, _ = load_manifest(plugin_dir)
        if manifest:
            plugin_id = manifest.get("id", "")
            if plugin_id:
                if plugin_id not in id_to_dirs:
                    id_to_dirs[plugin_id] = []
                id_to_dirs[plugin_id].append(plugin_dir.name)
    
    # Check for duplicates
    for plugin_id, dirs in id_to_dirs.items():
        if len(dirs) > 1:
            errors.append(
                f"Duplicate plugin ID '{plugin_id}' found in directories: {', '.join(dirs)}"
            )
    
    return errors


def main():
    parser = argparse.ArgumentParser(
        description="Validate FiestaBoard plugin integrity"
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail on warnings (missing tests, etc.)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output"
    )
    parser.add_argument(
        "--plugin",
        type=str,
        help="Validate specific plugin only"
    )
    
    args = parser.parse_args()
    
    print("FiestaBoard Plugin Validator")
    print("=" * 50)
    print()
    
    # Discover plugins
    plugins = discover_plugin_directories()
    
    if args.plugin:
        plugins = [p for p in plugins if p.name == args.plugin]
        if not plugins:
            print(f"Error: Plugin '{args.plugin}' not found")
            sys.exit(2)
    
    if not plugins:
        print("No plugins found to validate.")
        print(f"Plugins directory: {PLUGINS_DIR}")
        sys.exit(0)
    
    print(f"Found {len(plugins)} plugin(s) to validate:")
    for p in plugins:
        print(f"  - {p.name}")
    print()
    
    # Validate each plugin
    results: List[ValidationResult] = []
    for plugin_dir in plugins:
        if args.verbose:
            print(f"Validating: {plugin_dir.name}")
        
        result = validate_plugin(plugin_dir)
        results.append(result)
        
        if args.verbose:
            if result.errors:
                for error in result.errors:
                    print(f"  ERROR: {error}")
            if result.warnings:
                for warning in result.warnings:
                    print(f"  WARNING: {warning}")
            print()
    
    # Check for duplicate IDs across all plugins
    print("Checking for duplicate plugin IDs...")
    duplicate_errors = validate_unique_ids(plugins)
    for error in duplicate_errors:
        print(f"  ERROR: {error}")
    print()
    
    # Summary
    print("=" * 50)
    print("VALIDATION SUMMARY")
    print("=" * 50)
    
    total_errors = sum(len(r.errors) for r in results) + len(duplicate_errors)
    total_warnings = sum(len(r.warnings) for r in results)
    
    passed = [r for r in results if r.is_valid]
    failed = [r for r in results if not r.is_valid]
    
    print(f"Plugins validated: {len(results)}")
    print(f"  Passed: {len(passed)}")
    print(f"  Failed: {len(failed)}")
    print(f"Total errors: {total_errors}")
    print(f"Total warnings: {total_warnings}")
    print()
    
    # List failures
    if failed:
        print("Failed plugins:")
        for result in failed:
            print(f"  - {result.plugin_id}")
            for error in result.errors:
                print(f"      ERROR: {error}")
    
    if duplicate_errors:
        print("\nDuplicate ID errors:")
        for error in duplicate_errors:
            print(f"  {error}")
    
    # List warnings
    if total_warnings > 0 and args.verbose:
        print("\nWarnings:")
        for result in results:
            for warning in result.warnings:
                print(f"  [{result.plugin_id}] {warning}")
    
    print()
    
    # Determine exit code
    if total_errors > 0:
        print("VALIDATION FAILED")
        sys.exit(1)
    elif args.strict and total_warnings > 0:
        print("VALIDATION FAILED (strict mode - warnings treated as errors)")
        sys.exit(1)
    else:
        print("VALIDATION PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()

