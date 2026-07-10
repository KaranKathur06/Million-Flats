# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/models/clip.py
# CLIP (Contrastive Language–Image Pre-training) model wrapper.
# Handles loading the HuggingFace model and running zero-shot classification
# for room type detection, AI image detection, and defect detection.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.logging.structured import get_logger

logger = get_logger("app.models.clip")

MODEL_ID = "openai/clip-vit-base-patch32"

# ── Label sets ────────────────────────────────────────────────────────────────

ROOM_LABELS = [
    "a living room", "a bedroom", "a kitchen", "a bathroom",
    "an exterior view", "a balcony", "a floor plan", "a lobby",
    "a dining room", "a study or home office",
]

ROOM_LABEL_MAP = {
    "living room": "LIVING_ROOM",
    "bedroom": "BEDROOM",
    "kitchen": "KITCHEN",
    "bathroom": "BATHROOM",
    "exterior view": "EXTERIOR",
    "balcony": "BALCONY",
    "floor plan": "FLOOR_PLAN",
    "lobby": "LOBBY",
    "dining room": "DINING_ROOM",
    "study or home office": "HOME_OFFICE",
}

AI_LABELS = ["a photorealistic AI generated image", "a real photograph taken by a camera"]

DEFECT_LABELS = [
    "a wall with water damage or stains",
    "a ceiling with cracks or damage",
    "a floor with visible damage or wear",
    "a room with poor lighting or very dark areas",
    "a clean, well-maintained room in good condition",
]

DEFECT_THRESHOLD = 0.40


def load_clip_model() -> Dict[str, Any]:
    """Loads CLIP model and processor from HuggingFace cache."""
    from transformers import CLIPModel, CLIPProcessor

    logger.info("Loading CLIP model", model_id=MODEL_ID)
    clip_model = CLIPModel.from_pretrained(MODEL_ID)
    clip_processor = CLIPProcessor.from_pretrained(MODEL_ID)
    clip_model.eval()  # Set to inference mode
    logger.info("CLIP model loaded", model_id=MODEL_ID)
    return {"model": clip_model, "processor": clip_processor}


def run_clip_classification(
    clip: Dict[str, Any],
    image: Any,  # PIL.Image.Image
) -> Tuple[Optional[str], bool, float, List[Dict], bool]:
    """
    Runs three zero-shot classification passes on a PIL image.

    Returns:
        room_type          str | None
        is_ai_generated    bool
        ai_prob            float [0-1]
        defects_detected   list of dicts
        has_lighting_issues bool
    """
    import torch

    model = clip["model"]
    processor = clip["processor"]

    defects_detected = []
    has_lighting_issues = False

    with torch.no_grad():
        # ── Pass 1: Room classification ────────────────────────────────────
        inputs = processor(text=ROOM_LABELS, images=image, return_tensors="pt", padding=True)
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1).squeeze()
        best_idx = int(probs.argmax().item())
        raw_label = ROOM_LABELS[best_idx].replace("a ", "").replace("an ", "")
        room_type = ROOM_LABEL_MAP.get(raw_label, "UNKNOWN")

        # ── Pass 2: AI detection ───────────────────────────────────────────
        inputs2 = processor(text=AI_LABELS, images=image, return_tensors="pt", padding=True)
        out2 = model(**inputs2)
        probs2 = out2.logits_per_image.softmax(dim=1).squeeze()
        ai_prob = float(probs2[0].item())
        is_ai_generated = ai_prob > 0.60

        # ── Pass 3: Defect detection ───────────────────────────────────────
        inputs3 = processor(text=DEFECT_LABELS, images=image, return_tensors="pt", padding=True)
        out3 = model(**inputs3)
        probs3 = out3.logits_per_image.softmax(dim=1).squeeze()

        for i, label in enumerate(DEFECT_LABELS[:-1]):  # Exclude "clean room" label
            score = float(probs3[i].item())
            if "lighting" in label or "dark" in label:
                if score > DEFECT_THRESHOLD:
                    has_lighting_issues = True
            elif score > DEFECT_THRESHOLD:
                defects_detected.append({
                    "type": label.split(" with ")[1] if " with " in label else label,
                    "confidence": round(score, 3),
                    "description": label,
                })

    return room_type, is_ai_generated, ai_prob, defects_detected, has_lighting_issues
