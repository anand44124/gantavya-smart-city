import logging
import requests
from fastapi import APIRouter, Form, Request, Response, Body
from services.whatsapp_ai import process_whatsapp_message
from db import SessionLocal
from models.entities import Report, User

logger = logging.getLogger("civicpulse")
router = APIRouter()

@router.post("/whatsapp")
async def twilio_whatsapp_webhook(
    request: Request,
    From: str = Form(None),
    BodyText: str = Form(None, alias="Body"),
    MediaUrl0: str = Form(None),
    Latitude: float = Form(None),
    Longitude: float = Form(None),
):
    """
    Twilio / Meta incoming webhook with auto-termination in 2 mins.
    """
    phone = (From or "").replace("whatsapp:", "").strip() or "919876543210"
    user_text = (BodyText or "").strip()
    
    img_bytes = None
    if MediaUrl0:
        try:
            r = requests.get(MediaUrl0, timeout=12)
            if r.ok:
                img_bytes = r.content
        except Exception as e:
            logger.error("Failed to fetch media from %s: %s", MediaUrl0, e)

    reply_text, report_data = await process_whatsapp_message(
        phone=phone,
        text=user_text,
        image_bytes=img_bytes,
        latitude=Latitude,
        longitude=Longitude
    )

    if report_data:
        # Save to database
        db = SessionLocal()
        try:
            demo_user = db.query(User).filter(User.role == "citizen").first()
            user_id = demo_user.id if demo_user else 1
            
            new_rep = Report(
                title=report_data.get("title", "WhatsApp Civic Issue"),
                description=report_data.get("description", "Reported via WhatsApp"),
                category=report_data.get("category", "road_infrastructure"),
                latitude=report_data.get("latitude", 28.6139),
                longitude=report_data.get("longitude", 77.2090),
                user_id=user_id,
                status="submitted",
            )
            db.add(new_rep)
            db.commit()
            db.refresh(new_rep)
            ref_code = new_rep.reference_code
            reply_text = reply_text.replace("#GT-9421", f"#{ref_code}")
        except Exception as err:
            logger.error("Error creating report from WhatsApp: %s", err)
        finally:
            db.close()

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{reply_text}</Message>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/whatsapp/simulate")
async def simulate_whatsapp_chat(payload: dict = Body(...)):
    """
    Simulated WhatsApp API for In-App Live Testing (SIH Jury Showcase)
    """
    phone = payload.get("phone", "919876543210")
    text = payload.get("text", "")
    image_base64 = payload.get("image_base64")
    lat = payload.get("latitude")
    lng = payload.get("longitude")

    img_bytes = None
    if image_base64:
        import base64
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            img_bytes = base64.b64decode(image_base64)
        except Exception:
            pass

    reply_text, report_data = await process_whatsapp_message(
        phone=phone,
        text=text,
        image_bytes=img_bytes,
        latitude=lat,
        longitude=lng
    )

    ref_code = "GT-8842"
    if report_data:
        db = SessionLocal()
        try:
            demo_user = db.query(User).filter(User.role == "citizen").first()
            user_id = demo_user.id if demo_user else 1
            
            new_rep = Report(
                title=report_data.get("title", "WhatsApp Civic Issue"),
                description=report_data.get("description", "Reported via WhatsApp"),
                category=report_data.get("category", "road_infrastructure"),
                latitude=report_data.get("latitude", 28.6139),
                longitude=report_data.get("longitude", 77.2090),
                user_id=user_id,
                status="submitted",
            )
            db.add(new_rep)
            db.commit()
            db.refresh(new_rep)
            ref_code = new_rep.reference_code
            reply_text = reply_text.replace("#GT-9421", f"#{ref_code}")
        except Exception as err:
            logger.error("Error creating simulated report: %s", err)
        finally:
            db.close()

    return {
        "reply": reply_text,
        "is_report_created": bool(report_data),
        "reference_code": ref_code,
        "session_timeout_seconds": 120
    }
