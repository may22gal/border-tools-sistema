#!/usr/bin/env python3
"""Build review-only cPanel archives. Never connects to or changes a server."""
import argparse
import hashlib
import json
import re
import stat
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UI_BLOB = "b014daa1720500958aa16590693c4f922859d5ed"


def blob_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def build(output, home, source_commit):
    if not re.fullmatch(r"/[A-Za-z0-9_/-]+", home) or "public_html" in Path(home).parts:
        raise ValueError("Account home must be an absolute private path, outside public_html")
    if not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        raise ValueError("A complete source commit SHA is required")
    home = home.rstrip("/")
    if not home:
        raise ValueError("Account home cannot be the filesystem root")
    output.mkdir(parents=True, exist_ok=True)
    names = ["private.zip", "public.zip", "manifest.json", "apache-subdomain.fragment"]
    if any((output / name).exists() for name in names):
        raise FileExistsError("Use a new empty output directory; packages are not overwritten")
    ui = (ROOT / "index.html").read_bytes()
    if blob_sha(ui) != UI_BLOB:
        raise ValueError("Original UI changed; stop and review before packaging")
    private = {"index.html": ui}
    # Explicit allowlist: no .env, config.php, credentials, databases, logs or uploads.
    for folder, suffixes in [("backend/src", {".php", ".json"}),
                             ("backend/bin", {".php"}),
                             ("backend/migrations", {".sql"})]:
        for path in sorted((ROOT / folder).iterdir()):
            if path.is_file() and path.suffix in suffixes:
                private[path.relative_to(ROOT).as_posix()] = path.read_bytes()
    for name in ["app.php", "index.php", "evidence.php"]:
        path = "backend/public/" + name
        private[path] = (ROOT / path).read_bytes()
    # Original synthetic seed is CLI-only, opt-in, and stays private.
    private["demo/seed.php"] = (ROOT / "demo/seed.php").read_bytes()
    private["launch.php"] = b"""<?php
declare(strict_types=1);
$root = __DIR__;
if (!is_file($root.'/config.php')) {
    http_response_code(503);
    header('Cache-Control: no-store');
    exit('Sistema no configurado.');
}
putenv('BT_BACKEND_ROOT='.$root.'/backend');
putenv('BT_CONFIG_FILE='.$root.'/config.php');
putenv('BT_UI_SOURCE='.$root.'/index.html');
"""
    private["config.example.php"] = b"""<?php
declare(strict_types=1);
// Copy to config.php privately. Never put actual secrets in the ZIP or repository.
return [
    'dsn' => 'mysql:host=localhost;dbname=btools_sistema;charset=utf8mb4',
    'user' => 'btools_sistema_app',
    'password' => is_readable(__DIR__.'/db-password.txt')
        ? rtrim((string)file_get_contents(__DIR__.'/db-password.txt'), "\\r\\n") : '',
    'origin' => 'https://sistema.border-tools.com',
    'storage' => __DIR__.'/storage',
    'session_path' => __DIR__.'/sessions',
    'allow_http_test' => false,
];
"""
    public = {}
    target = home + "/bt-admin-private"
    for name in ["app.php", "index.php", "evidence.php"]:
        public[name] = ("<?php\ndeclare(strict_types=1);\n"
                        "$root = '" + target + "';\n"
                        "if (!is_file($root.'/launch.php')) {\n"
                        "    http_response_code(503);\n"
                        "    header('Cache-Control: no-store');\n"
                        "    exit('Sistema no configurado.');\n}\n"
                        "require $root.'/launch.php';\n"
                        "require $root.'/backend/public/" + name + "';\n").encode()
    public["assets/connected.js"] = (ROOT / "backend/public/assets/connected.js").read_bytes()
    fragment = ("# Merge ONLY into the subdomain .htaccess after approval and a private copy.\n"
                "# Preserve all existing cPanel-generated PHP sections. Never replace the file.\n"
                "DirectoryIndex app.php\n" + (ROOT / "backend/public/.htaccess").read_text()).encode()
    manifest = {"source_commit": source_commit, "original_ui_git_blob": UI_BLOB,
                "target_home": home, "private_root": target,
                "public_root": home + "/public_html/bt-admin-public",
                "status": "review-only; no deployment or real data authorized",
                "contains_credentials": False, "files": {}}

    def archive(name, entries, prefix, mode, empty_dirs=()):
        items = {}
        for relative, data in entries.items():
            archive_path = prefix + relative
            items[archive_path] = (data, mode, False)
            parent = Path(archive_path).parent
            while str(parent) != ".":
                items[parent.as_posix() + "/"] = (b"", 0o700 if prefix else 0o755, True)
                parent = parent.parent
        for directory in empty_dirs:
            items[prefix + directory + "/"] = (b"", 0o700, True)
        with zipfile.ZipFile(output / name, "x", compression=zipfile.ZIP_DEFLATED) as z:
            for path, (data, permissions, directory) in sorted(items.items()):
                info = zipfile.ZipInfo(path, (2026, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = ((stat.S_IFDIR if directory else stat.S_IFREG) | permissions) << 16
                if directory:
                    info.external_attr |= 0x10
                z.writestr(info, data)
                if not directory:
                    manifest["files"][name + ":" + path] = hashlib.sha256(data).hexdigest()
        manifest[name + "_sha256"] = hashlib.sha256((output / name).read_bytes()).hexdigest()

    archive("private.zip", private, "bt-admin-private/", 0o600, ["storage", "sessions"])
    archive("public.zip", public, "", 0o644)
    (output / "apache-subdomain.fragment").write_bytes(fragment)
    manifest["apache_fragment_sha256"] = hashlib.sha256(fragment).hexdigest()
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    # Validate the actual ZIP contents, rather than just the in-memory layout.
    with zipfile.ZipFile(output / "public.zip") as z:
        assert set(z.namelist()) == {"app.php", "index.php", "evidence.php", "assets/", "assets/connected.js"}
        assert ".htaccess" not in z.namelist()
    with zipfile.ZipFile(output / "private.zip") as z:
        assert blob_sha(z.read("bt-admin-private/index.html")) == UI_BLOB
        assert "bt-admin-private/config.php" not in z.namelist()
        assert "bt-admin-private/db-password.txt" not in z.namelist()
        for name in z.namelist():
            assert name.startswith("bt-admin-private/") and ".." not in Path(name).parts
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--home", default="/home/btools")
    parser.add_argument("--source-commit", required=True)
    args = parser.parse_args()
    result = build(args.output, args.home, args.source_commit)
    print(json.dumps({"status": "review package built", "source_commit": result["source_commit"],
                      "public_files": 4, "packaged_files": len(result["files"]),
                      "output": str(args.output)}, ensure_ascii=False))
