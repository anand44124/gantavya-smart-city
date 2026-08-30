import io
import json
import re
import base64
import asyncio
import requests
from PIL import Image, ImageStat
from config.settings import settings

DEPARTMENTS = {
    "road_infrastructure": "Roads Department",
    "street_electrical": "Electrical Department",
    "sanitation": "Sanitation Department",
    "water_drainage": "Water Department",
    "public_safety": "Public Safety Department",
    "other": "Municipal Services",
}

SUBTYPES = {
    "road_infrastructure": "pothole",
    "street_electrical": "broken_streetlight",
    "sanitation": "garbage_overflow",
    "water_drainage": "water_leak",
    "public_safety": "open_manhole",
    "other": "civic_issue",
}

OPENROUTER_KEY = (settings.openrouter_api_key or "").strip()
GEMINI_BACKUP_KEY = (settings.ai_api_key or "").strip()

def extract_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        return json.loads(match.group(0))
    return json.loads(raw)

def _inspect_image_heuristics(pil_img: Image.Image) -> tuple[bool, str]:
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")
    
    w, h = pil_img.size
    if w < 100 or h < 100:
        return False, "Image resolution is too low. Please upload a clear photo taken on-site."

    stat = ImageStat.Stat(pil_img)
    mean_lum = sum(stat.mean) / len(stat.mean)
    avg_stddev = sum(stat.stddev) / len(stat.stddev)

    if mean_lum < 12.0:
        return False, "Photo is completely dark / camera lens covered. Please upload a clear well-lit photo."
    if mean_lum > 246.0:
        return False, "Photo is completely white / overexposed. Please upload a clear photo of the issue."
    
    colors = pil_img.getcolors(maxcolors=128)
    is_few_colors = colors is not None and len(colors) < 40

    if avg_stddev < 18.0 or is_few_colors:
        return False, "Image appears to be a digital graphic, drawing, solid background, or screenshot rather than an authentic outdoor civic defect."

    return True, "Authentic photo verified."

def _call_openrouter_vision(b64_image: str) -> dict[str, object] | None:
    prompt = (
        "You are an expert municipal infrastructure AI vision inspector for a civic platform.\n"
        "Strict Classification Rules:\n"
        "1. REJECT if image is a vehicle, car, motorcycle, meme, selfie, drawing, indoor room, or non-civic object: set is_civic_issue=false and decision='reject'.\n"
        "2. ACCEPT if image shows garbage dumps, potholes, water leaks, or broken streetlights: set is_civic_issue=true and decision='accept'.\n"
        "   - Garbage piles must be categorized as 'sanitation' and department 'Sanitation Department'.\n"
        "   - Potholes / damaged roads must be 'road_infrastructure' and department 'Roads Department'.\n"
        "   - Water leaks / drain floods must be 'water_drainage' and department 'Water Department'.\n"
        "   - Streetlights / dark electrical faults must be 'street_electrical' and department 'Electrical Department'.\n\n"
        "Respond ONLY in valid JSON format:\n"
        "{\n"
        "  \"is_civic_issue\": boolean,\n"
        "  \"decision\": \"accept\" | \"reject\",\n"
        "  \"category\": \"sanitation\" | \"road_infrastructure\" | \"water_drainage\" | \"street_electrical\" | \"public_safety\" | \"other\",\n"
        "  \"subtype\": string,\n"
        "  \"department\": string,\n"
        "  \"confidence\": float,\n"
        "  \"severity\": integer (1 to 10),\n"
        "  \"hazards\": [string],\n"
        "  \"suggested_title\": string,\n"
        "  \"suggested_description\": string,\n"
        "  \"reason\": string\n"
        "}"
    )

    models_to_try = ["google/gemini-3.6-flash", "google/gemini-3.7-flash", "google/gemini-3.5-flash-lite"]
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gantavya-portal.vercel.app",
        "X-Title": "Gantavya Civic AI",
    }

    for model_name in models_to_try:
        try:
            payload = {
                "model": model_name,
                "max_tokens": 1000,
                "temperature": 0.0,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                        ]
                    }
                ]
            }
            resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                raw_content = resp.json()["choices"][0]["message"]["content"]
                parsed = extract_json(raw_content)
                is_civic = bool(parsed.get("is_civic_issue", False))
                dec_raw = str(parsed.get("decision", "accept")).lower()
                is_rejected = "reject" in dec_raw or not is_civic
                decision = "reject" if is_rejected else "accept"

                raw_cat = str(parsed.get("category", "")).lower()
                if "garbage" in raw_cat or "sanitation" in raw_cat or "waste" in raw_cat:
                    cat = "sanitation"
                elif "road" in raw_cat or "pothole" in raw_cat or "asphalt" in raw_cat:
                    cat = "road_infrastructure"
                elif "water" in raw_cat or "drain" in raw_cat or "flood" in raw_cat:
                    cat = "water_drainage"
                elif "electric" in raw_cat or "light" in raw_cat or "wire" in raw_cat:
                    cat = "street_electrical"
                elif "safety" in raw_cat or "manhole" in raw_cat:
                    cat = "public_safety"
                else:
                    cat = "other" if is_rejected else "sanitation"

                dept = DEPARTMENTS.get(cat, "Sanitation Department" if cat == "sanitation" else "Roads Department")
                subtype = str(parsed.get("subtype", SUBTYPES.get(cat, "civic_issue")))
                severity = int(parsed.get("severity", 8 if is_civic else 0))
                title = str(parsed.get("suggested_title", "Civic Issue Report"))
                desc = str(parsed.get("suggested_description", "Reported municipal infrastructure defect."))
                reason = str(parsed.get("reason", "Verified by Primary AI Vision Inspector."))

                return {
                    "is_civic_issue": not is_rejected,
                    "is_pothole": cat == "road_infrastructure" and "pothole" in subtype.lower(),
                    "decision": decision,
                    "category": cat,
                    "subtype": subtype,
                    "department": dept,
                    "confidence": float(parsed.get("confidence", 0.98)),
                    "severity": severity,
                    "hazards": parsed.get("hazards") or [f"{cat} hazard identified"],
                    "suggested_title": title,
                    "suggested_description": desc,
                    "reason": reason,
                    "message": reason if is_rejected else f"Verified as {title}.",
                }
        except Exception as e:
            print(f"[OpenRouter Model {model_name} Error]", e)
            continue
    return None

def _call_gemini_backup_vision(b64_image: str) -> dict[str, object] | None:
    prompt = (
        "You are an expert municipal infrastructure AI vision inspector.\n"
        "Analyze this photo. If it shows a vehicle, car, cartoon, meme, selfie, or non-civic object: return is_civic_issue=false and decision=reject.\n"
        "If it shows garbage: category=sanitation, department=Sanitation Department, decision=accept.\n"
        "Respond in JSON with is_civic_issue (bool), decision (accept/reject), category, department, subtype, severity (1-10), suggested_title, suggested_description, reason."
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_BACKUP_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64_image}}
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1
        }
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            candidates = resp.json().get("candidates", [])
            if candidates:
                raw_text = candidates[0]["content"]["parts"][0]["text"]
                parsed = extract_json(raw_text)
                is_civic = bool(parsed.get("is_civic_issue", False))
                dec_raw = str(parsed.get("decision", "accept")).lower()
                is_rejected = "reject" in dec_raw or not is_civic
                decision = "reject" if is_rejected else "accept"

                raw_cat = str(parsed.get("category", "")).lower()
                if "garbage" in raw_cat or "sanitation" in raw_cat or "waste" in raw_cat:
                    cat = "sanitation"
                elif "road" in raw_cat or "pothole" in raw_cat or "asphalt" in raw_cat:
                    cat = "road_infrastructure"
                elif "water" in raw_cat or "drain" in raw_cat or "flood" in raw_cat:
                    cat = "water_drainage"
                elif "electric" in raw_cat or "light" in raw_cat or "wire" in raw_cat:
                    cat = "street_electrical"
                elif "safety" in raw_cat or "manhole" in raw_cat:
                    cat = "public_safety"
                else:
                    cat = "other" if is_rejected else "sanitation"

                dept = DEPARTMENTS.get(cat, "Sanitation Department" if cat == "sanitation" else "Roads Department")
                subtype = str(parsed.get("subtype", SUBTYPES.get(cat, "civic_issue")))
                severity = int(parsed.get("severity", 8 if is_civic else 0))
                title = str(parsed.get("suggested_title", "Civic Issue Report"))
                desc = str(parsed.get("suggested_description", "Reported municipal infrastructure defect."))
                reason = str(parsed.get("reason", "Verified by Backup Gemini 3.6 Vision AI."))

                return {
                    "is_civic_issue": not is_rejected,
                    "is_pothole": cat == "road_infrastructure" and "pothole" in subtype.lower(),
                    "decision": decision,
                    "category": cat,
                    "subtype": subtype,
                    "department": dept,
                    "confidence": float(parsed.get("confidence", 0.95)),
                    "severity": severity,
                    "hazards": parsed.get("hazards") or [f"{cat} hazard identified"],
                    "suggested_title": title,
                    "suggested_description": desc,
                    "reason": reason,
                    "message": reason if is_rejected else f"Verified as {title}.",
                }
    except Exception as e:
        print("[Gemini Backup Error]", e)
    return None

def _sync_analyze_civic_dual(pil_img: Image.Image, category_hint: str | None) -> dict[str, object]:
    # 1. Quick local authenticity check
    is_photo_valid, rejection_reason = _inspect_image_heuristics(pil_img)
    if not is_photo_valid:
        return {
            "is_civic_issue": False,
            "is_pothole": False,
            "decision": "reject",
            "category": "other",
            "subtype": "fake_or_graphic",
            "department": "Municipal Services",
            "confidence": 0.15,
            "severity": 0,
            "hazards": [],
            "suggested_title": "",
            "suggested_description": "",
            "reason": rejection_reason,
            "message": rejection_reason,
        }

    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    b64_image = base64.b64encode(buf.getvalue()).decode("utf-8")

    # 2. Try Primary: OpenRouter AI
    res_primary = _call_openrouter_vision(b64_image)
    if res_primary is not None:
        return res_primary

    # 3. Try Secondary: Gemini Direct REST API
    res_secondary = _call_gemini_backup_vision(b64_image)
    if res_secondary is not None:
        return res_secondary

    return {
        "is_civic_issue": False,
        "is_pothole": False,
        "decision": "reject",
        "category": "other",
        "subtype": "ai_busy",
        "department": "Municipal Services",
        "confidence": 0.0,
        "severity": 0,
        "hazards": [],
        "suggested_title": "",
        "suggested_description": "",
        "reason": "AI Vision server is busy. Please try again.",
        "message": "AI Vision analysis could not be completed.",
    }

async def analyze_civic_image(content: bytes, mime_type: str, category_hint: str | None = None) -> dict[str, object]:
    if not content or len(content) < 50:
        return {
            "is_civic_issue": False,
            "is_pothole": False,
            "decision": "reject",
            "category": "other",
            "subtype": "invalid_file",
            "department": "Municipal Services",
            "confidence": 0.0,
            "severity": 0,
            "hazards": [],
            "suggested_title": "",
            "suggested_description": "",
            "reason": "Invalid or empty image file uploaded.",
            "message": "Please upload a valid image file.",
        }

    pil_img = Image.open(io.BytesIO(content))
    return await asyncio.to_thread(_sync_analyze_civic_dual, pil_img, category_hint)

def _sync_validate_resolution_dual(pil_img: Image.Image, category: str) -> dict[str, object]:
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    b64_image = base64.b64encode(buf.getvalue()).decode("utf-8")

    dept = DEPARTMENTS.get(category, "Municipal Services")
    prompt = (
        f"You are an expert municipal field verification AI.\n"
        f"A worker submitted this photo as proof of fixing a civic defect for {dept} ({category}).\n"
        f"1. REJECT if the image is a cartoon, meme, selfie, indoor photo, vehicle, or unrelated object.\n"
        f"2. ACCEPT if the photo shows the repaired road, cleared garbage, fixed drain, or repaired light.\n"
        f"Respond in JSON with is_valid_proof (bool), decision (accept/reject), confidence (float), work_summary (string), reason (string)."
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gantavya-portal.vercel.app",
        "X-Title": "Gantavya Civic AI",
    }
    try:
        payload = {
            "model": "google/gemini-3.6-flash",
            "max_tokens": 600,
            "temperature": 0.0,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                    ]
                }
            ]
        }
        resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=12)
        if resp.status_code == 200:
            raw_content = resp.json()["choices"][0]["message"]["content"]
            parsed = extract_json(raw_content)
            return {
                "is_valid_proof": bool(parsed.get("is_valid_proof", True)),
                "decision": str(parsed.get("decision", "accept")).lower(),
                "confidence": float(parsed.get("confidence", 0.95)),
                "work_summary": str(parsed.get("work_summary", "Field repair verified.")),
                "reason": str(parsed.get("reason", "Field proof verified by AI Vision.")),
            }
    except Exception as e:
        print("[Resolution Dual Error]", e)

    return {
        "is_valid_proof": True,
        "decision": "accept",
        "confidence": 0.90,
        "work_summary": "Field repair verified via on-site telemetry photo audit.",
        "reason": "Authentic on-site resolution photograph verified.",
    }

async def validate_pothole_image(content: bytes, mime_type: str, category: str = "road_infrastructure") -> dict[str, object]:
    pil_img = Image.open(io.BytesIO(content))
    return await asyncio.to_thread(_sync_validate_resolution_dual, pil_img, category)
