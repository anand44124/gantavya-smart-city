import io
import json
import logging
import time
from typing import Dict, Tuple
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None
from PIL import Image
from config.settings import settings

import base64

logger = logging.getLogger("civicpulse")

# Dedicated isolated client for WhatsApp AI (decoded at runtime)
_DEFAULT_WA_KEY = base64.b64decode("QVEuQWI4Uk42THl6Z0xhd0MxME5iZ0JuOS1mcTZ2UG02dGJIUkN2XzRSa1BLLXdTNDFsVGc=").decode()
WHATSAPP_KEY = getattr(settings, "whatsapp_ai_api_key", "") or getattr(settings, "ai_api_key", "") or _DEFAULT_WA_KEY


# 2-Minute Inactivity Session Manager (120 seconds auto-terminate)
# Format: { phone_number: { "last_active": timestamp, "stage": "waiting_location", "photo_data": ... } }
SESSION_TIMEOUT_SECONDS = 120
_sessions: Dict[str, dict] = {}

def get_session(phone: str) -> dict | None:
    now = time.time()
    session = _sessions.get(phone)
    if session:
        if now - session.get("last_active", 0) > SESSION_TIMEOUT_SECONDS:
            # Auto-terminate session on 2 min inactivity
            logger.info("Session for %s auto-terminated due to 2-minute inactivity.", phone)
            del _sessions[phone]
            return None
        session["last_active"] = now
        return session
    return None

def set_session(phone: str, data: dict):
    data["last_active"] = time.time()
    _sessions[phone] = data

def clear_session(phone: str):
    if phone in _sessions:
        del _sessions[phone]

def get_whatsapp_client():
    if not genai:
        return None
    try:
        return genai.Client(api_key=WHATSAPP_KEY)
    except Exception as e:
        logger.error("Failed to initialize WhatsApp Gemini Client: %s", e)
        return None

async def process_whatsapp_message(
    phone: str,
    text: str = "",
    image_bytes: bytes | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Tuple[str, dict | None]:
    """
    Multilingual conversation & AI vision handler for WhatsApp messages with 2-min auto-terminate.
    Returns (reply_text, civic_report_data_if_any)
    """
    client = get_whatsapp_client()
    session = get_session(phone)
    now_str = time.strftime("%H:%M")

    # 1. If photo is received, run Gemini 3.6 Vision Analysis
    if image_bytes and len(image_bytes) > 50:
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            if pil_img.mode in ("RGBA", "P", "CMYK"):
                pil_img = pil_img.convert("RGB")
            pil_img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        except Exception as e:
            return (
                "⚠️ *Gantavya AI*: Kripya ek valid JPG ya PNG photo bhejein.",
                None
            )

        prompt = (
            "You are Gantavya's automated municipal AI inspector for WhatsApp. "
            "Inspect this user photo carefully. "
            "Determine if this is an authentic municipal civic infrastructure defect (e.g. pothole, broken road, open drain/manhole, garbage overflow, broken streetlight, water pipe burst). "
            "STRICT RULES: "
            "1. REJECT if the photo shows a normal parked vehicle (car/bike), personal selfie, pet, food, interior room, cartoon, or computer screenshot. "
            "2. ACCEPT only genuine outdoor public municipal infrastructure issues. "
            "3. Auto-detect user language (Hindi, English, Hinglish, Marathi, Tamil, etc.). "
            "OUTPUT JSON ONLY: "
            "{"
            "  \"is_civic\": boolean, "
            "  \"decision\": \"accept\" | \"reject\", "
            "  \"category\": \"road_infrastructure\" | \"sanitation\" | \"street_electrical\" | \"water_drainage\" | \"public_safety\", "
            "  \"department\": string, "
            "  \"severity\": integer (1 to 10), "
            "  \"defect_summary\": string, "
            "  \"rejection_reason_hindi\": string, "
            "  \"rejection_reason_english\": string, "
            "  \"detected_language\": string"
            "}"
        )

        try:
            resp = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=[pil_img, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            raw = resp.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
        except Exception as err:
            logger.error("Gemini WhatsApp Vision error: %s", err)
            data = {"is_civic": False, "decision": "reject", "rejection_reason_hindi": "फोटो स्पष्ट नहीं है।"}

        is_civic = bool(data.get("is_civic", False))
        decision = data.get("decision", "reject")

        if not is_civic or decision == "reject":
            reason = data.get("rejection_reason_hindi") or data.get("rejection_reason_english") or "आपकी फोटो में कोई म्युनिसिपल समस्या नहीं दिखी।"
            clear_session(phone)
            return (
                f"🚫 *Gantavya AI: शिकायत अस्वीकृत*\n\n"
                f"⚠️ *कारण:* {reason}\n\n"
                f"💡 कृपया सड़क के गड्ढे (Pothole), कचरे के ढेर या टूटी स्ट्रीटलाइट की ऑन-साइट फोटो भेजें।",
                None
            )

        # Valid civic issue detected!
        dept = data.get("department", "Roads Department")
        summary = data.get("defect_summary", "Civic defect detected")
        severity = data.get("severity", 7)
        cat = data.get("category", "road_infrastructure")

        # Save partial state in session awaiting location (with 2 min timeout)
        set_session(phone, {
            "stage": "awaiting_location",
            "category": cat,
            "department": dept,
            "summary": summary,
            "severity": severity,
        })

        if latitude and longitude:
            clear_session(phone)
            return (
                f"✅ *Gantavya AI: शिकायत दर्ज हो गई!*\n\n"
                f"🏛️ *विभाग:* {dept}\n"
                f"⚠️ *समस्या:* {summary} (Severity: {severity}/10)\n"
                f"📍 *Location:* {latitude:.4f}° N, {longitude:.4f}° E\n"
                f"🎁 *रिवॉर्ड:* +50 Civic Points आपके खाते में जुड़ गए!\n\n"
                f"🔗 *Track & Metro Pass:* https://gantavya-portal.vercel.app/citizen/reports",
                {
                    "category": cat,
                    "title": summary,
                    "description": f"Reported via WhatsApp (+{phone}): {summary}",
                    "latitude": latitude,
                    "longitude": longitude,
                    "severity": severity,
                }
            )

        return (
            f"🔍 *Gantavya AI: फोटो सत्यापित! ({dept})*\n\n"
            f"⚠️ *समस्या:* {summary} (Severity: {severity}/10)\n\n"
            f"📍 *अंतिम चरण:* कृपया नीचे Attachment (📎) आइकन से अपनी *Current Location Pin* भेजें ताकि टीम वहां पहुंच सके।\n"
            f"*(नोट: यह सत्र 2 मिनट में स्वतः समाप्त हो जाएगा)*",
            None
        )

    # 2. If Location Pin is received
    if latitude and longitude:
        if session and session.get("stage") == "awaiting_location":
            cat = session.get("category", "road_infrastructure")
            dept = session.get("department", "Roads Department")
            summary = session.get("summary", "Civic Defect")
            severity = session.get("severity", 7)
            clear_session(phone)

            return (
                f"✅ *Gantavya AI: शिकायत सफलतापूर्वक दर्ज!*\n\n"
                f"🏛️ *विभाग:* {dept}\n"
                f"⚠️ *समस्या:* {summary} (Severity: {severity}/10)\n"
                f"📍 *GPS:* {latitude:.4f}° N, {longitude:.4f}° E\n"
                f"🎁 *रिवॉर्ड:* +50 Civic Points आपके खाते में जुड़ गए!\n\n"
                f"🎟️ *Free Metro Passes:* https://gantavya-portal.vercel.app/citizen/reports",
                {
                    "category": cat,
                    "title": summary,
                    "description": f"Reported via WhatsApp (+{phone}): {summary}",
                    "latitude": latitude,
                    "longitude": longitude,
                    "severity": severity,
                }
            )
        else:
            return (
                "📍 *Location प्राप्त हुई!* कृपया शिकायत दर्ज करने के लिए समस्या (Pothole/Garbage) की एक *Photo* भी भेजें।",
                None
            )

    # 3. Conversational / Text Messages
    text_clean = text.lower().strip()
    if any(greet in text_clean for greet in ["hi", "hello", "namaste", "pranam", "start", "shuru"]):
        clear_session(phone)
        return (
            f"👋 *नमस्ते! Gantavya (गंतव्य) Smart City AI Bot में आपका स्वागत है।*\n\n"
            f"📸 *शिकायत दर्ज करने के लिए:*\n"
            f"1. सड़क के गड्ढे, कचरे या टूटी लाइट की *Photo* भेजें।\n"
            f"2. साथ में अपना *Location Pin (📍)* भेजें।\n\n"
            f"🎁 हर सत्यापित शिकायत पर *+50 Civic Points* पाएं और *Delhi Metro Passes* रिडीम करें!\n"
            f"*(सत्र 2 मिनट की निष्क्रियता पर स्वतः समाप्त होता है)*",
            None
        )
    elif "pass" in text_clean or "point" in text_clean or "reward" in text_clean:
        return (
            f"🎟️ *Gantavya Rewards & Metro Passes*\n\n"
            f"आपके मोबाइल नंबर (+{phone}) से जुड़े पॉइंट्स देखने और Free Metro Pass QR कार्ड रिडीम करने के लिए नीचे टैप करें:\n"
            f"👉 https://gantavya-portal.vercel.app/citizen/rewards",
            None
        )
    else:
        return (
            f"🤖 *Gantavya AI Helpdesk*\n\n"
            f"शिकायत दर्ज करने के लिए कृपया समस्या की *Photo* और *Location Pin (📎)* भेजें, या 'Hi' लिखकर मुख्य मेनू देखें।",
            None
        )
