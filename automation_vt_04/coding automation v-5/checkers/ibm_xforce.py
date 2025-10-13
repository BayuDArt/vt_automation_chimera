from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

def check_ibm_xforce(hash_value):
    url = f"https://exchange.xforce.ibmcloud.com/malware/{hash_value}"
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument('log-level=3')
    driver = None
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        driver.get(url)
        wait = WebDriverWait(driver, 15)
        elem = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "span.scorebackgroundfilter.numtitle"))
        )
        return elem.text.strip()
    except (TimeoutException, NoSuchElementException):
        return "Not Found"
    finally:
        if driver:
            driver.quit()