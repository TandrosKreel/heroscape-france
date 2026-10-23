#!/usr/bin/env python3
"""Préparer les WebP VF pour Heroscape France. Aucun changement du site ni de Supabase."""
import argparse
import csv
import hashlib
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path

MAX_IMAGE_BYTES = 35 * 1024 * 1024
MAX_TOTAL_BYTES = 1500 * 1024 * 1024

def normalized(value):
    value = unicodedata.normalize("NFKD", str(value)).casefold()
    value = "".join(c for c in value if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")

def image_dimensions(data):
    try:
        from PIL import Image
        from io import BytesIO
        with Image.open(BytesIO(data)) as img:
            if img.format != "WEBP":
                raise ValueError("format non WebP")
            img.verify()
        with Image.open(BytesIO(data)) as img:
            return [img.width, img.height]
    except ImportError:
        return None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True, help="ZIP des cartes WebP et miniatures")
    parser.add_argument("--mapping", type=Path, default=Path("preparation/cartes/correspondances_523_images_v2.csv"))
    parser.add_argument("--output", type=Path, default=Path("import-webp-vf"))
    parser.add_argument("--strict", action="store_true", help="Échec si un seul fichier HD ou miniature manque")
    args = parser.parse_args()
    if not args.archive.is_file() or not args.mapping.is_file():
        parser.error("Archive ou table de correspondance introuvable")
    with args.mapping.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh, delimiter=";"))
    if len(rows) != 523 or len({r["image_id"] for r in rows}) != 523:
        raise SystemExit("Inventaire inattendu : 523 identifiants uniques exigés")
    args.output.mkdir(parents=True, exist_ok=True)
    results, total = [], 0
    with zipfile.ZipFile(args.archive) as zf:
        entries = [x for x in zf.infolist() if not x.is_dir() and x.filename.lower().endswith(".webp")]
        if sum(x.file_size for x in entries) > MAX_TOTAL_BYTES:
            raise SystemExit("Archive trop volumineuse une fois décompressée")
        def locate(expected, thumbnail):
            base = Path(expected).name
            matches = []
            for entry in entries:
                name = entry.filename.replace("\\", "/").lower()
                thumb = any(k in name for k in ("miniature", "thumbnail", "thumb"))
                if thumb != thumbnail:
                    continue
                if name.endswith("/" + expected.lower()) or name == expected.lower():
                    matches.append((0, entry))
                elif name.endswith("/" + base.lower()) or name == base.lower():
                    matches.append((1, entry))
            if not matches:
                return None, "absent"
            best = min(score for score, _ in matches)
            selected = [entry for score, entry in matches if score == best]
            if len(selected) != 1:
                return None, "ambigu"
            return selected[0], "ok"
        for row in rows:
            item = {"image_id": row["image_id"], "nom_image_vf": row["nom_image_vf"],
                    "carte_site": row.get("nom_carte_site", ""), "statut_validation": "NON",
                    "hd": None, "miniature": None, "erreurs": []}
            for key, source, dest in (
                ("hd", row["chemin_webp_hd"], Path("assets/cartes/vf") / (row["image_id"] + ".webp")),
                ("miniature", row["chemin_miniature"], Path("assets/cartes/miniatures") / (row["image_id"] + ".webp"))
            ):
                member, state = locate(source, key == "miniature")
                if state != "ok":
                    item["erreurs"].append(key + ":" + state)
                    continue
                if member.file_size > MAX_IMAGE_BYTES:
                    item["erreurs"].append(key + ":trop_volumineux")
                    continue
                data = zf.read(member)
                if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
                    item["erreurs"].append(key + ":format_invalide")
                    continue
                try:
                    dimensions = image_dimensions(data)
                except Exception as exc:
                    item["erreurs"].append(key + ":image_invalide:" + str(exc))
                    continue
                target = args.output / dest
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                total += len(data)
                item[key] = {"chemin": dest.as_posix(), "octets": len(data),
                             "sha256": hashlib.sha256(data).hexdigest(), "dimensions": dimensions}
            results.append(item)
    report = {
        "version": "V2", "publication_autorisee": False, "supabase_modifie": False,
        "nombre_images": len(rows), "hd_presentes": sum(bool(x["hd"]) for x in results),
        "miniatures_presentes": sum(bool(x["miniature"]) for x in results),
        "octets_copies": total, "controle_dimensions": "Pillow si disponible",
        "note": "Les rapprochements restent des candidats à valider visuellement. Ne pas publier automatiquement.",
        "fichiers": results
    }
    (args.output / "controle_import.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("HD :", report["hd_presentes"], "/ 523 ; miniatures :", report["miniatures_presentes"], "/ 523")
    print("Rapport :", args.output / "controle_import.json")
    if args.strict and (report["hd_presentes"] != 523 or report["miniatures_presentes"] != 523):
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
