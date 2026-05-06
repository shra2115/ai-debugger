from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import subprocess, sys, io, contextlib, os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="AI Code Debugger API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class DebugRequest(BaseModel):
    code: str
    language: str

class ExecuteRequest(BaseModel):
    code: str

SYSTEM_PROMPT = """You are an expert code debugger. Analyze the provided code and return ONLY a JSON object with NO markdown, no fences:
{"bugs":[{"line":NUMBER,"type":"syntax|runtime|logic","description":"..."}],"fixed_code":"corrected code","explanation":"detailed explanation","error_classification":"syntax|runtime|logic|multiple|none","summary":"one sentence","severity":"critical|high|medium|low|none"}"""

@app.post("/api/debug")
async def debug_code(req: DebugRequest):
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Language: {req.language}\n\nCode:\n```\n{req.code}\n```"}]
        )
        import json
        raw = msg.content[0].text.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/execute/python")
async def execute_python(req: ExecuteRequest):
    """Sandboxed Python execution"""
    try:
        stdout_capture = io.StringIO()
        with contextlib.redirect_stdout(stdout_capture):
            exec(req.code, {"__builtins__": {"print": print, "len": len, "range": range, "int": int, "str": str, "float": float, "list": list, "dict": dict}})
        return {"success": True, "output": stdout_capture.getvalue() or "(no output)"}
    except Exception as e:
        return {"success": False, "output": str(e)}

@app.get("/health")
def health():
    return {"status": "ok"}
