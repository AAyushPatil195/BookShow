import hmac
import logging
import os
from functools import lru_cache
from typing import Annotated, Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, model_validator

from agent import QuickShowAgent
from backend import QuickShowAPI


load_dotenv()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="QuickShow AI service",
    description="Private HTTP interface for the QuickShow movie agent.",
    version="0.1.0",
)


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4_000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    messages: Annotated[list[ChatMessage], Field(min_length=1, max_length=12)]
    user_id: str = Field(
        alias="userId",
        pattern=r"^user_[A-Za-z0-9]+$",
        max_length=128,
    )

    @model_validator(mode="after")
    def latest_message_must_be_from_user(self) -> "ChatRequest":
        if self.messages[-1].role != "user":
            raise ValueError("The latest message must have the user role.")
        return self


class BookingDraftAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["booking_draft"]
    showId: str = Field(pattern=r"^[0-9a-fA-F]{24}$")
    selectedSeats: Annotated[list[str], Field(min_length=1, max_length=5)]


class ChatResponse(BaseModel):
    success: bool = True
    reply: str
    action: BookingDraftAction | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["quickshow-ai"] = "quickshow-ai"


def verify_service_key(
    x_ai_service_key: Annotated[str | None, Header()] = None,
) -> None:
    expected_key = os.getenv("AI_SERVICE_SECRET", "").strip()
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service authentication is not configured.",
        )
    if not x_ai_service_key or not hmac.compare_digest(
        x_ai_service_key,
        expected_key,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AI service key.",
        )


@lru_cache(maxsize=1)
def get_agent() -> QuickShowAgent:
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    backend_url = os.getenv("QUICKSHOW_API_URL", "").strip()
    model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
    display_timezone = os.getenv("DISPLAY_TIMEZONE", "Asia/Kolkata").strip()

    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    if not backend_url:
        raise RuntimeError("QUICKSHOW_API_URL is not configured.")

    api_client = QuickShowAPI(
        backend_url,
        display_timezone=display_timezone,
        service_secret=os.getenv("AI_SERVICE_SECRET", ""),
    )
    return QuickShowAgent(
        api=api_client,
        api_key=groq_api_key,
        model=model_name,
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_service_key)],
)
def chat(request: ChatRequest) -> ChatResponse:
    conversation = [message.model_dump() for message in request.messages]

    try:
        result = get_agent().reply_with_action(
            conversation,
            user_id=request.user_id,
        )
    except Exception as error:
        logger.exception("QuickShow agent request failed", exc_info=error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI assistant could not complete the request.",
        ) from error

    return ChatResponse(reply=result.reply, action=result.action)
