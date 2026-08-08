import os

import streamlit as st
from dotenv import load_dotenv

from agent import QuickShowAgent
from backend import QuickShowAPI


load_dotenv()

st.set_page_config(
    page_title="QuickShow AI",
    page_icon="🎬",
    layout="centered",
)

st.markdown(
    """
    <style>
        .stApp {
            background:
                radial-gradient(circle at top right, rgba(248, 69, 101, 0.12), transparent 30rem),
                #08090c;
        }
        [data-testid="stChatMessage"] {
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 1rem;
            background: rgba(255, 255, 255, 0.035);
        }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("QuickShow AI")
st.caption("Your read-only guide to movies currently playing on QuickShow")

groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
backend_url = os.getenv("QUICKSHOW_API_URL", "http://localhost:3000").strip()
model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
display_timezone = os.getenv("DISPLAY_TIMEZONE", "Asia/Kolkata").strip()

with st.sidebar:
    st.subheader("Phase 1")
    st.write("Movie discovery and details")
    st.caption(f"Backend: {backend_url}")
    st.caption(f"Showtimes: {display_timezone}")
    if st.button("Clear conversation", width="stretch"):
        st.session_state.messages = []
        st.rerun()

if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "Hi! Ask me what is playing, or search by title, cast, genre, "
                "language, or rating."
            ),
        }
    ]

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if not groq_api_key:
    st.warning("Add GROQ_API_KEY to ai-agent/.env, then restart the app.")

prompt = st.chat_input(
    "Try: Which action movies are currently playing?",
    disabled=not groq_api_key,
    submit_mode="disable",
)

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    try:
        api = QuickShowAPI(backend_url, display_timezone=display_timezone)
        agent = QuickShowAgent(api=api, api_key=groq_api_key, model=model_name)

        with st.chat_message("assistant"):
            with st.spinner("Checking QuickShow..."):
                response = agent.reply(st.session_state.messages)
            st.markdown(response)

        st.session_state.messages.append(
            {"role": "assistant", "content": response}
        )
    except Exception:
        message = (
            "I couldn't complete that request. Please retry, or clear the "
            "conversation if the problem continues."
        )
        with st.chat_message("assistant"):
            st.error(message)
        st.session_state.messages.append(
            {"role": "assistant", "content": message}
        )
