import requests
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("CTX_API_KEY")

def check_ctx(hash_value):
    url = f"https://api.ctx.io/v1/file/report/{hash_value}"
    headers = {"x-api-key": API_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 404:
            return "Not Found"
        response.raise_for_status()
        data = response.json()
        detect = data.get("ctx_data", {}).get("detect")
        status = "malicious" if detect else "normal"
        return {"status": status, "detect": detect}
    except Exception:
        return "Error"