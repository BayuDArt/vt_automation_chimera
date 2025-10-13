import requests

def check_otx(hash_value):
    url = f"https://otx.alienvault.com/api/v1/indicators/file/{hash_value}/analysis"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            pulses = data.get("general", {}).get("pulse_info", {}).get("count", 0)
            return {"pulses": pulses}
        elif r.status_code == 404:
            return "Not Found"
        else:
            return "Error"
    except Exception:
        return "Error"